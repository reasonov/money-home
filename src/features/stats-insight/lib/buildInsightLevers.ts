import { formatMoneyPlain, formatNumericDate, roundMoney } from '@/shared'
import type { InsightLever, InsightLeverKind, InsightTip } from '../model/types'

export const INSIGHT_MAX_LEVERS = 8
export const INSIGHT_SLACK_RUB = 1

export type InsightCategory = {
  name: string
  categoryId?: string
  current: number
  previous: number
  delta: number
  currentCount: number
  previousCount: number
}

export type InsightTopExpense = {
  id: string
  amount: number
  categoryId?: string
  categoryName?: string
  occurredOn: string
}

export type InsightForecastMin = {
  balance: number
  date: string
}

export type BuildInsightLeversInput = {
  period: string
  hasPrevious: boolean
  scopeLabel: string
  currentExpense: number
  categories: InsightCategory[]
  topExpenses: InsightTopExpense[]
  forecastMin?: InsightForecastMin | null
}

const KIND_ORDER: Record<InsightLeverKind, number> = {
  forecast_dip: 0,
  category_increase: 1,
  large_operation: 2,
  category_top: 3,
}

type CountRow = {
  name: string
  categoryId?: string | null
  current: number
  previous: number
  currentCount: number
  previousCount: number
}

export type InsightSpendItem = {
  kind: string
  amount: number
  categoryId?: string | null
  categoryName?: string
}

function clipId(value: string, max = 80): string {
  return value.trim().slice(0, max)
}

function materialAmount(expense: number): number {
  return Math.max(INSIGHT_SLACK_RUB, roundMoney(Math.max(0, expense) * 0.05))
}

function compareLevers(a: InsightLever, b: InsightLever): number {
  if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) {
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  }
  return b.impact - a.impact
}

export function forecastMinBalance(
  slices: { date: string; balance: number }[],
): InsightForecastMin | null {
  if (!slices.length) {
    return null
  }
  let min = slices[0]!
  for (const slice of slices) {
    if (slice.balance < min.balance) {
      min = slice
    }
  }
  if (min.balance >= 0) {
    return null
  }
  return { balance: roundMoney(min.balance), date: min.date }
}

export function buildInsightCategories(
  current: InsightSpendItem[],
  previous: InsightSpendItem[],
): InsightCategory[] {
  const map = new Map<string, CountRow>()

  function add(item: InsightSpendItem, bucket: 'current' | 'previous') {
    if (item.kind !== 'expense') {
      return
    }
    const name = item.categoryName?.trim() || 'Без категории'
    const row = map.get(name) ?? {
      name,
      current: 0,
      previous: 0,
      currentCount: 0,
      previousCount: 0,
    }
    if (item.categoryId) {
      if (row.categoryId === undefined) {
        row.categoryId = item.categoryId
      } else if (row.categoryId !== item.categoryId) {
        row.categoryId = null
      }
    }
    if (bucket === 'current') {
      row.current += item.amount
      row.currentCount += 1
    } else {
      row.previous += item.amount
      row.previousCount += 1
    }
    map.set(name, row)
  }

  for (const item of current) {
    add(item, 'current')
  }
  for (const item of previous) {
    add(item, 'previous')
  }

  return [...map.values()]
    .map((row) => ({
      name: row.name,
      ...(row.categoryId ? { categoryId: row.categoryId } : {}),
      current: roundMoney(row.current),
      previous: roundMoney(row.previous),
      delta: roundMoney(row.current - row.previous),
      currentCount: row.currentCount,
      previousCount: row.previousCount,
    }))
    .filter((row) => row.current > 0 || row.previous > 0)
}

export function buildInsightLevers(input: BuildInsightLeversInput): InsightLever[] {
  const forecast =
    input.forecastMin && input.forecastMin.balance < 0 ? input.forecastMin : null
  if (input.period === 'all' && !forecast) {
    return []
  }
  if (!input.hasPrevious && !forecast) {
    return []
  }

  const levers: InsightLever[] = []
  const material = materialAmount(input.currentExpense)
  const usedCategories = new Set<string>()

  if (input.hasPrevious && input.period !== 'all') {
    const increases = [...input.categories]
      .filter((row) => row.delta >= material)
      .sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name, 'ru'))
    for (const row of increases.slice(0, 4)) {
      usedCategories.add(row.name)
      levers.push({
        id: clipId(`increase:${row.name}`),
        kind: 'category_increase',
        impact: row.delta,
        fact: `«${row.name}» вырос на ${formatMoneyPlain(row.delta)} ₽ ${input.scopeLabel} (${formatMoneyPlain(row.current)} против ${formatMoneyPlain(row.previous)}, операций ${row.currentCount} и ${row.previousCount}).`,
        ...(row.categoryId ? { categoryId: row.categoryId } : {}),
        categoryName: row.name,
      })
    }

    const tops = [...input.categories]
      .filter((row) => row.current >= material && !usedCategories.has(row.name))
      .sort((a, b) => b.current - a.current || a.name.localeCompare(b.name, 'ru'))
    for (const row of tops.slice(0, 2)) {
      levers.push({
        id: clipId(`top:${row.name}`),
        kind: 'category_top',
        impact: row.current,
        fact: `«${row.name}»: ${formatMoneyPlain(row.current)} ₽ ${input.scopeLabel} — одна из крупнейших категорий за период.`,
        ...(row.categoryId ? { categoryId: row.categoryId } : {}),
        categoryName: row.name,
      })
    }

    const largeCut = Math.max(material, roundMoney(input.currentExpense * 0.15))
    for (const item of input.topExpenses.slice(0, 3)) {
      if (item.amount < largeCut) {
        continue
      }
      const name = item.categoryName?.trim() || 'Без категории'
      levers.push({
        id: clipId(`op:${item.id}`),
        kind: 'large_operation',
        impact: item.amount,
        fact: `Крупная операция «${name}» на ${formatMoneyPlain(item.amount)} ₽ ${formatNumericDate(item.occurredOn)}.`,
        ...(item.categoryId ? { categoryId: item.categoryId } : {}),
        categoryName: name,
        transactionId: item.id,
      })
    }
  }

  if (forecast) {
    levers.push({
      id: `forecast:${forecast.date}`,
      kind: 'forecast_dip',
      impact: roundMoney(Math.abs(forecast.balance)),
      fact: `Прогноз баланса уходит в минус к ${formatNumericDate(forecast.date)}: ${formatMoneyPlain(forecast.balance)} ₽.`,
    })
  }

  return [...levers].sort(compareLevers).slice(0, INSIGHT_MAX_LEVERS)
}

export function leverTitle(lever: InsightLever): string {
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

export function leverCtaLabel(lever: InsightLever): string {
  switch (lever.kind) {
    case 'category_increase':
    case 'category_top':
      return lever.categoryName ? `Открыть «${lever.categoryName}»` : 'Открыть историю'
    case 'large_operation':
      return 'Открыть операцию'
    case 'forecast_dip':
      return 'Открыть прогноз'
  }
}

export function leverChart(kind: InsightLeverKind): 'category' | 'top' | 'forecast' {
  if (kind === 'large_operation') {
    return 'top'
  }
  if (kind === 'forecast_dip') {
    return 'forecast'
  }
  return 'category'
}

export function fallbackTipsFromLevers(levers: InsightLever[], limit = 3): InsightTip[] {
  return levers.slice(0, limit).map((lever) => ({
    id: lever.id,
    kind: lever.kind,
    title: leverTitle(lever),
    detail: lever.fact,
    impact: lever.impact,
    ...(lever.categoryName ? { categoryName: lever.categoryName } : {}),
    ...(lever.categoryId ? { categoryId: lever.categoryId } : {}),
    ...(lever.transactionId ? { transactionId: lever.transactionId } : {}),
  }))
}

export function fallbackInsightSummary(input: {
  hasPrevious: boolean
  currentExpense: number
  previousExpense: number
  scopeLabel: string
}): string {
  if (!input.hasPrevious) {
    return 'Ниже — что видно по операциям и прогнозу.'
  }
  const delta = roundMoney(input.currentExpense - input.previousExpense)
  if (delta > 0) {
    return `Расходы выросли на ${formatMoneyPlain(delta)} ₽ ${input.scopeLabel}.`
  }
  if (delta < 0) {
    return `Расходы снизились на ${formatMoneyPlain(Math.abs(delta))} ₽ ${input.scopeLabel}.`
  }
  return `Расходы ${input.scopeLabel} почти как в прошлом периоде.`
}
