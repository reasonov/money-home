import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const MAX_TIPS = 3
const LEVER_KINDS = [
  'revert_category',
  'cut_category',
  'defer_purchase',
  'delay_date',
  'review_rule',
  'set_aside',
] as const

type LeverKind = (typeof LEVER_KINDS)[number]

type CategoryRow = {
  name: string
  categoryId?: string
  current: number
  previous: number
  delta: number
  currentCount: number
  previousCount: number
}

type LeverRow = {
  id: string
  kind: LeverKind
  impact: number
  coversGap: boolean
  fact: string
  categoryName?: string
  categoryId?: string
  purchaseId?: string
  purchaseTitle?: string
  ruleId?: string
  ruleTitle?: string
  newTargetDate?: string
  extraAfter?: number
}

type AdviceSummary = {
  accountId: string
  goal: {
    title: string
    remaining: number
    extraPerMonth: number
    targetDate: string
    savedAmount: number
    targetAmount: number
    overdue: boolean
    message: string
    monthsLeft: number
  }
  avgMonthlyManualIncome: number
  avgMonthlyManualExpense: number
  avgMonthlyManualNet: number
  historyDays: number
  plannedSpend: number
  overAllocated: boolean
  currentTotal: number
  previousTotal: number
  categories: CategoryRow[]
  increases: CategoryRow[]
  otherGoals: { title: string; remaining: number; targetDate: string }[]
  levers: LeverRow[]
}

type AdviceTip = {
  id: string
  kind: LeverKind
  title: string
  detail: string
  impact: number
  categoryName?: string
  categoryId?: string
  purchaseId?: string
  ruleId?: string
  newTargetDate?: string
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

function formatNumericDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso
}

function rewriteIsoDates(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, year, month, day) => `${day}.${month}.${year}`)
}

function money(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function intCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

function parseCategories(value: unknown, limit: number): CategoryRow[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, limit).map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    const categoryId = clip(item.categoryId, 64)
    return {
      name: clip(item.name, 80) || 'Без категории',
      ...(categoryId ? { categoryId } : {}),
      current: money(item.current),
      previous: money(item.previous),
      delta: money(item.delta),
      currentCount: intCount(item.currentCount),
      previousCount: intCount(item.previousCount),
    }
  })
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
    const purchaseId = clip(item.purchaseId, 64)
    const purchaseTitle = clip(item.purchaseTitle, 80)
    const ruleId = clip(item.ruleId, 64)
    const ruleTitle = clip(item.ruleTitle, 80)
    const newTargetDate = clip(item.newTargetDate, 10)
    levers.push({
      id,
      kind,
      impact: money(item.impact),
      coversGap: item.coversGap === true,
      fact,
      ...(categoryName ? { categoryName } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(purchaseId ? { purchaseId } : {}),
      ...(purchaseTitle ? { purchaseTitle } : {}),
      ...(ruleId ? { ruleId } : {}),
      ...(ruleTitle ? { ruleTitle } : {}),
      ...(newTargetDate ? { newTargetDate } : {}),
      ...(typeof item.extraAfter === 'number' && Number.isFinite(item.extraAfter)
        ? { extraAfter: item.extraAfter }
        : {}),
    })
  }
  return levers
}

function parseOtherGoals(value: unknown): AdviceSummary['otherGoals'] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    return {
      title: clip(item.title, 80) || 'Копилка',
      remaining: money(item.remaining),
      targetDate: clip(item.targetDate, 10),
    }
  })
}

function parseSummary(raw: unknown, accountId: string): AdviceSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const goalRaw =
    value.goal && typeof value.goal === 'object' ? (value.goal as Record<string, unknown>) : {}
  const levers = parseLevers(value.levers)
  return {
    accountId,
    goal: {
      title: clip(goalRaw.title, 80) || 'Копилка',
      remaining: money(goalRaw.remaining),
      extraPerMonth: money(goalRaw.extraPerMonth),
      targetDate: clip(goalRaw.targetDate, 10),
      savedAmount: money(goalRaw.savedAmount),
      targetAmount: money(goalRaw.targetAmount),
      overdue: goalRaw.overdue === true,
      message: clip(goalRaw.message, 160),
      monthsLeft: money(goalRaw.monthsLeft),
    },
    avgMonthlyManualIncome: money(value.avgMonthlyManualIncome),
    avgMonthlyManualExpense: money(value.avgMonthlyManualExpense),
    avgMonthlyManualNet: money(value.avgMonthlyManualNet),
    historyDays: intCount(value.historyDays),
    plannedSpend: money(value.plannedSpend),
    overAllocated: value.overAllocated === true,
    currentTotal: money(value.currentTotal),
    previousTotal: money(value.previousTotal),
    categories: parseCategories(value.categories, 8),
    increases: parseCategories(value.increases, 5),
    otherGoals: parseOtherGoals(value.otherGoals),
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
    case 'revert_category':
      return lever.categoryName
        ? `Вернуть «${lever.categoryName}» к прошлому уровню`
        : 'Вернуть категорию'
    case 'cut_category':
      return lever.categoryName ? `Урезать «${lever.categoryName}»` : 'Урезать траты'
    case 'defer_purchase':
      return lever.purchaseTitle ? `Отложить «${lever.purchaseTitle}»` : 'Отложить покупку'
    case 'delay_date':
      return 'Сдвинуть срок копилки'
    case 'review_rule':
      return lever.ruleTitle ? `Проверить «${lever.ruleTitle}»` : 'Проверить регулярный расход'
    case 'set_aside':
      return 'Откладывать каждый месяц'
  }
}

function toTip(lever: LeverRow, title: string, detail: string): AdviceTip {
  return {
    id: lever.id,
    kind: lever.kind,
    title: title.slice(0, 80),
    detail: detail.slice(0, 400),
    impact: lever.impact,
    ...(lever.categoryName ? { categoryName: lever.categoryName } : {}),
    ...(lever.categoryId ? { categoryId: lever.categoryId } : {}),
    ...(lever.purchaseId ? { purchaseId: lever.purchaseId } : {}),
    ...(lever.ruleId ? { ruleId: lever.ruleId } : {}),
    ...(lever.newTargetDate ? { newTargetDate: lever.newTargetDate } : {}),
  }
}

function fallbackAdvice(summary: AdviceSummary): { summary: string; tips: AdviceTip[] } {
  const tips = summary.levers
    .slice(0, MAX_TIPS)
    .map((lever) => toTip(lever, leverTitle(lever), rewriteIsoDates(lever.fact)))
  const text =
    summary.historyDays > 0
      ? 'Ниже шаги, которые уже посчитаны по вашим тратам, правилам и планам.'
      : 'Мало истории операций — опирайтесь на ежемесячный взнос и шаги ниже.'
  return { summary: text, tips }
}

function parsePicks(
  text: string,
  levers: LeverRow[],
): { summary: string; tips: AdviceTip[] } | null {
  const raw = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(raw) as { summary?: unknown; picks?: unknown }
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
    const byId = new Map(levers.map((lever) => [lever.id, lever]))
    const seen = new Set<string>()
    const tips: AdviceTip[] = []
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

function modelPayload(summary: AdviceSummary) {
  return {
    goal: {
      ...summary.goal,
      targetDate: formatNumericDate(summary.goal.targetDate),
    },
    cashflow: {
      avgMonthlyManualIncome: summary.avgMonthlyManualIncome,
      avgMonthlyManualExpense: summary.avgMonthlyManualExpense,
      avgMonthlyManualNet: summary.avgMonthlyManualNet,
      historyDays: summary.historyDays,
      plannedSpend: summary.plannedSpend,
      overAllocated: summary.overAllocated,
      currentTotal: summary.currentTotal,
      previousTotal: summary.previousTotal,
    },
    otherGoals: summary.otherGoals.map((goal) => ({
      ...goal,
      targetDate: formatNumericDate(goal.targetDate),
    })),
    levers: summary.levers.map((lever) => ({
      id: lever.id,
      kind: lever.kind,
      impact: lever.impact,
      coversGap: lever.coversGap,
      fact: rewriteIsoDates(lever.fact),
      ...(lever.categoryName ? { categoryName: lever.categoryName } : {}),
      ...(lever.purchaseTitle ? { purchaseTitle: lever.purchaseTitle } : {}),
      ...(lever.ruleTitle ? { ruleTitle: lever.ruleTitle } : {}),
      ...(lever.newTargetDate ? { newTargetDate: formatNumericDate(lever.newTargetDate) } : {}),
      extraAfter: lever.extraAfter,
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

  const { data: membership, error: memberError } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (memberError || !membership) {
    return json({ error: 'not an account member' }, 403)
  }

  const fallback = fallbackAdvice(summary)
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey || !summary.levers.length) {
    return json(fallback)
  }

  const prompt = [
    'Ты помощник приложения учёта личных финансов.',
    'Пользователь копит на цель и не успевает к выбранной дате.',
    'В JSON уже посчитаны рычаги (levers) с эффектом в рублях. Не считай заново.',
    'Ответь строго JSON: { "summary": string, "picks": [{ "id": string, "title": string, "detail": string }] }.',
    'picks: 1–3 элемента, id только из levers, первый — главный ход.',
    'Не повторяй одну категорию и не бери set_aside, если есть более конкретный рычаг.',
    'Предпочитай coversGap=true. Конкретное (defer_purchase, revert_category) важнее общего.',
    'title до 60 символов, detail 1–2 предложения по полю fact этого рычага.',
    'Даты в тексте пиши как дд.мм.гггг, например 10.10.2026. Не используй YYYY-MM-DD.',
    'Не выдумывай суммы, даты, категории и проценты. Не предлагай кредиты, инвестиции, сторонние сервисы и «завести бюджет».',
    'Если historyDays мало — скажи об этом в summary.',
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
      console.error('gemini empty advice', text.slice(0, 800))
      return json(fallback)
    }
    return json(advice)
  } catch (err) {
    console.error('gemini fetch failed', err)
    return json(fallback)
  }
})
