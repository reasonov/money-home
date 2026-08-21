import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const MAX_TIPS = 3
const ALL_ACCOUNTS_ID = 'all'
const LEVER_KINDS = ['category_increase', 'category_top', 'large_operation', 'forecast_dip'] as const

type LeverKind = (typeof LEVER_KINDS)[number]

type LeverRow = {
  id: string
  kind: LeverKind
  fact: string
  impact: number
  categoryName?: string
  categoryId?: string
  transactionId?: string
}

type InsightSummary = {
  accountId: string
  period: string
  periodLabel: string
  scopeLabel: string
  hasPrevious: boolean
  currentExpense: number
  previousExpense: number
  currentIncome: number
  previousIncome: number
  levers: LeverRow[]
}

type InsightTip = {
  id: string
  kind: LeverKind
  title: string
  detail: string
  impact: number
  categoryName?: string
  categoryId?: string
  transactionId?: string
}

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

function rewriteIsoDates(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, year, month, day) => `${day}.${month}.${year}`)
}

function money(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function parseKind(value: unknown): LeverKind | null {
  return typeof value === 'string' && (LEVER_KINDS as readonly string[]).includes(value)
    ? (value as LeverKind)
    : null
}

function parseLevers(value: unknown): LeverRow[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const levers: LeverRow[] = []
  for (const row of value.slice(0, 8)) {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    const kind = parseKind(item.kind)
    const id = clip(item.id, 96)
    const fact = clip(item.fact, 400)
    if (!kind || !id || !fact || seen.has(id)) continue
    seen.add(id)
    const categoryName = clip(item.categoryName, 80)
    const categoryId = clip(item.categoryId, 64)
    const transactionId = clip(item.transactionId, 64)
    levers.push({
      id,
      kind,
      fact,
      impact: money(item.impact),
      ...(categoryName ? { categoryName } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(transactionId ? { transactionId } : {}),
    })
  }
  return levers
}

function parseSummary(raw: unknown, accountId: string): InsightSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const levers = parseLevers(value.levers)
  return {
    accountId,
    period: clip(value.period, 16) || 'month',
    periodLabel: clip(value.periodLabel, 80),
    scopeLabel: clip(value.scopeLabel, 80) || 'на этом счёте',
    hasPrevious: value.hasPrevious === true,
    currentExpense: money(value.currentExpense),
    previousExpense: money(value.previousExpense),
    currentIncome: money(value.currentIncome),
    previousIncome: money(value.previousIncome),
    levers,
  }
}

function collectText(parts: { text?: string }[] | undefined): string {
  return (parts ?? [])
    .map((part) => part.text ?? '')
    .join('\n')
    .trim()
}

function leverTitle(lever: LeverRow): string {
  switch (lever.kind) {
    case 'category_increase':
      return lever.categoryName ? `«${lever.categoryName}» вырос` : 'Категория выросла'
    case 'category_top':
      return lever.categoryName ? `«${lever.categoryName}»` : 'Крупная категория'
    case 'large_operation':
      return lever.categoryName ? `Крупная операция «${lever.categoryName}»` : 'Крупная операция'
    case 'forecast_dip':
      return 'Прогноз уходит в минус'
  }
}

function toTip(lever: LeverRow, title: string, detail: string): InsightTip {
  return {
    id: lever.id,
    kind: lever.kind,
    title: title.slice(0, 80),
    detail: detail.slice(0, 400),
    impact: lever.impact,
    ...(lever.categoryName ? { categoryName: lever.categoryName } : {}),
    ...(lever.categoryId ? { categoryId: lever.categoryId } : {}),
    ...(lever.transactionId ? { transactionId: lever.transactionId } : {}),
  }
}

function fallbackInsight(summary: InsightSummary): { summary: string; tips: InsightTip[] } {
  const tips = summary.levers
    .slice(0, MAX_TIPS)
    .map((lever) => toTip(lever, leverTitle(lever), rewriteIsoDates(lever.fact)))
  const delta = summary.currentExpense - summary.previousExpense
  let text = 'Ниже — что видно по операциям за период.'
  if (summary.hasPrevious && delta > 0) {
    text = `Расходы выросли ${summary.scopeLabel}.`
  } else if (summary.hasPrevious && delta < 0) {
    text = `Расходы снизились ${summary.scopeLabel}.`
  }
  return { summary: text, tips }
}

function parsePicks(text: string, levers: LeverRow[]): { summary: string; tips: InsightTip[] } | null {
  const raw = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(raw) as { summary?: unknown; picks?: unknown }
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
    const byId = new Map(levers.map((lever) => [lever.id, lever]))
    const seen = new Set<string>()
    const tips: InsightTip[] = []
    if (Array.isArray(parsed.picks)) {
      for (const item of parsed.picks) {
        if (!item || typeof item !== 'object') continue
        const pick = item as { id?: unknown; title?: unknown; detail?: unknown }
        const id = typeof pick.id === 'string' ? pick.id.trim() : ''
        const lever = byId.get(id)
        if (!lever || seen.has(id)) continue
        seen.add(id)
        const title = typeof pick.title === 'string' ? pick.title.trim() : ''
        const detail = typeof pick.detail === 'string' ? pick.detail.trim() : ''
        tips.push(
          toTip(
            lever,
            rewriteIsoDates(title || leverTitle(lever)),
            rewriteIsoDates(detail || lever.fact),
          ),
        )
        if (tips.length >= MAX_TIPS) break
      }
    }
    if (!tips.length) return null
    return { summary: rewriteIsoDates(summary), tips }
  } catch {
    return null
  }
}

function modelPayload(summary: InsightSummary) {
  return {
    period: summary.periodLabel || summary.period,
    scopeLabel: summary.scopeLabel,
    hasPrevious: summary.hasPrevious,
    cashflow: {
      currentExpense: summary.currentExpense,
      previousExpense: summary.previousExpense,
      currentIncome: summary.currentIncome,
      previousIncome: summary.previousIncome,
    },
    levers: summary.levers.map((lever) => ({
      id: lever.id,
      kind: lever.kind,
      impact: lever.impact,
      fact: rewriteIsoDates(lever.fact),
      ...(lever.categoryName ? { categoryName: lever.categoryName } : {}),
    })),
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

  let payload: { accountId?: unknown; summary?: unknown }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const accountId = clip(payload.accountId, 64)
  const summary = parseSummary(payload.summary, accountId)
  if (!accountId || !summary) {
    return json({ error: 'invalid body' }, 400)
  }

  if (accountId !== ALL_ACCOUNTS_ID) {
    const { data: membership, error: memberError } = await supabase
      .from('account_members')
      .select('account_id')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (memberError || !membership) {
      return json({ error: 'not an account member' }, 403)
    }
  }

  const fallback = fallbackInsight(summary)
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey || !summary.levers.length) {
    return json(fallback)
  }

  const prompt = [
    'Ты помощник приложения учёта личных финансов.',
    'Пользователь смотрит статистику за период. В JSON уже посчитаны рычаги (levers). Не считай заново.',
    'Ответь строго JSON: { "summary": string, "picks": [{ "id": string, "title": string, "detail": string }] }.',
    'picks: 1–3 элемента, id только из levers, первый — главный факт.',
    'Не повторяй одну категорию. Не называй участников счёта.',
    'title до 60 символов, detail 1–2 предложения по полю fact этого рычага.',
    'Даты в тексте пиши как дд.мм.гггг, например 10.10.2026. Не используй YYYY-MM-DD.',
    'Не выдумывай суммы, даты, категории и проценты. Не предлагай кредиты, инвестиции, бюджеты и средние по стране.',
    'summary — 1–2 предложения, что изменилось за период.',
    'Язык — русский.',
    JSON.stringify(modelPayload(summary)),
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
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                picks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      detail: { type: 'string' },
                    },
                    required: ['id', 'title', 'detail'],
                  },
                },
              },
              required: ['summary', 'picks'],
            },
          },
        }),
      },
    )
    const geminiText = await geminiResponse.text()
    if (!geminiResponse.ok) {
      console.error('gemini', geminiResponse.status, geminiText.slice(0, 800))
      return json(fallback)
    }
    let geminiBody: { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    try {
      geminiBody = JSON.parse(geminiText) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
    } catch {
      console.error('gemini json parse failed', geminiText.slice(0, 800))
      return json(fallback)
    }
    const text = collectText(geminiBody.candidates?.[0]?.content?.parts)
    const advice = parsePicks(text, summary.levers)
    if (!advice) {
      console.error('gemini empty insight', text.slice(0, 800))
      return json(fallback)
    }
    return json(advice)
  } catch (err) {
    console.error('gemini fetch failed', err)
    return json(fallback)
  }
})
