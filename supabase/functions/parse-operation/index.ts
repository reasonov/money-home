import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const KINDS = ['expense', 'income'] as const

type Kind = (typeof KINDS)[number]

type CategoryRow = { id: string; name: string }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function parseKind(value: unknown): Kind | null {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
    ? (value as Kind)
    : null
}

function parseCategories(value: unknown): CategoryRow[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const rows: CategoryRow[] = []
  for (const row of value.slice(0, 40)) {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    const id = clip(item.id, 64)
    const name = clip(item.name, 80)
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    rows.push({ id, name })
  }
  return rows
}

function collectText(parts: { text?: string }[] | undefined): string {
  return (parts ?? [])
    .map((part) => part.text ?? '')
    .join('\n')
    .trim()
}

function foldTitle(value: string): string {
  return value.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, '')
}

function isTitleGrounded(title: string, source: string): boolean {
  const needle = foldTitle(title)
  const haystack = foldTitle(source)
  if (!needle || !haystack) return false
  if (haystack.includes(needle)) return true
  const words = title.toLocaleLowerCase('ru').match(/\p{L}{2,}|\p{N}+/gu) ?? []
  return words.length >= 2 && words.every((word) => haystack.includes(foldTitle(word)))
}

function parseModel(text: string, allowed: Set<string>, today: string, source: string) {
  const raw = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const amount =
      typeof parsed.amount === 'number' && Number.isFinite(parsed.amount) && parsed.amount > 0
        ? parsed.amount
        : undefined
    const occurredOn = clip(parsed.occurredOn, 10)
    const titleRaw = clip(parsed.title, 80)
    const title = titleRaw && isTitleGrounded(titleRaw, source) ? titleRaw : ''
    const categoryId = clip(parsed.categoryId, 64)
    const confidence =
      typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? parsed.confidence
        : undefined
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(occurredOn) && occurredOn <= today
    return {
      ...(amount ? { amount } : {}),
      ...(dateOk ? { occurredOn } : {}),
      ...(title ? { title } : {}),
      ...(categoryId && allowed.has(categoryId) ? { categoryId } : {}),
      ...(confidence != null ? { confidence } : {}),
    }
  } catch {
    return {}
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'not authenticated' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const token = authHeader.replace(/^Bearer\s+/i, '')
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return json({ error: 'not authenticated' }, 401)
  }

  let payload: {
    accountId?: unknown
    kind?: unknown
    today?: unknown
    text?: unknown
    categories?: unknown
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const accountId = clip(payload.accountId, 64)
  const kind = parseKind(payload.kind)
  const today = clip(payload.today, 10)
  const text = clip(payload.text, 200)
  const categories = parseCategories(payload.categories)
  if (!accountId || !kind || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !text) {
    return json({ error: 'invalid body' }, 400)
  }

  const { data: membership, error: memberError } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (memberError || !membership) {
    return json({ error: 'not an account member' }, 403)
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey || !categories.length) {
    return json({})
  }

  const allowed = new Set(categories.map((item) => item.id))
  const prompt = [
    'Ты разбираешь одну строку учёта личных финансов на поля формы.',
    'Ответь строго JSON. Поля, которых нет в тексте, не включай.',
    'amount — сумма в рублях > 0, только если она есть в тексте. Не выдумывай.',
    'occurredOn — YYYY-MM-DD, только если в тексте есть дата; иначе не включай поле. Не позже today.',
    'categoryId — только id из списка categories. Не выдумывай id.',
    'title — только слова из поля text, без суммы и даты. Не добавляй ничего от себя и не повторяй эти правила. Если названия нет — опусти поле.',
    'confidence от 0 до 1.',
    'Язык названия — русский.',
    JSON.stringify({ kind, today, text, categories }),
  ].join('\n')

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                occurredOn: { type: 'string' },
                title: { type: 'string' },
                categoryId: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        }),
      },
    )
    const geminiText = await geminiResponse.text()
    if (!geminiResponse.ok) {
      console.error('gemini', geminiResponse.status, geminiText.slice(0, 800))
      return json({})
    }
    let geminiBody: { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    try {
      geminiBody = JSON.parse(geminiText) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
    } catch {
      console.error('gemini json parse failed', geminiText.slice(0, 800))
      return json({})
    }
    const parsed = parseModel(
      collectText(geminiBody.candidates?.[0]?.content?.parts),
      allowed,
      today,
      text,
    )
    return json(parsed)
  } catch (err) {
    console.error('gemini fetch failed', err)
    return json({})
  }
})
