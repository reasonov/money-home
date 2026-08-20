import { addDays, formatLocalDate, parseLocalDate, todayLocal } from '@/shared'
import type { Transaction, TransactionKind } from '../model/types'

export type StatsPeriod = 'this_month' | 'last_month' | 'days_90' | 'all'
export type ChartPeriod = 'day' | 'week' | 'month' | 'year' | 'custom' | 'all'
export type PeriodKey = StatsPeriod | ChartPeriod

export interface StatsFilters {
  accountId: string
  period: PeriodKey
  asOf?: string
  from?: string
  to?: string
}

export interface DateRange {
  from?: string
  to?: string
}

export interface StatsSummary {
  expenseTotal: number
  incomeTotal: number
  net: number
}

export interface CategorySpendSlice {
  categoryId: string | null
  name: string
  color?: string
  amount: number
}

export interface WeekdaySpendSlice {
  weekday: number
  label: string
  amount: number
}

export type TrendStep = 'day' | 'week' | 'month'

export interface TrendSlice {
  key: string
  label: string
  expense: number
  income: number
}

export interface AccountTotalsSlice {
  accountId: string
  expenseTotal: number
  incomeTotal: number
}

export interface HeatmapDay {
  date: string
  day: number
  amount: number
  inPeriod: boolean
  isFuture: boolean
}

export interface HeatmapWeek {
  days: HeatmapDay[]
  monthLabel?: string
}

const HEATMAP_MAX_DAYS = 366

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function startOfWeek(date: Date): Date {
  const weekday = date.getDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

export function statsDateRange(
  period: PeriodKey,
  asOf = todayLocal(),
  custom?: DateRange,
): DateRange {
  if (period === 'all') {
    return {}
  }

  if (period === 'custom') {
    const from = custom?.from
    const to = custom?.to
    if (from && to && from > to) {
      return { from: to, to: from }
    }
    return { ...(from ? { from } : {}), ...(to ? { to } : {}) }
  }

  const asOfDate = parseLocalDate(asOf)

  if (period === 'day') {
    return { from: asOf, to: asOf }
  }

  if (period === 'week') {
    const start = startOfWeek(asOfDate)
    return {
      from: formatLocalDate(start),
      to: formatLocalDate(addDays(start, 6)),
    }
  }

  if (period === 'year') {
    return {
      from: formatLocalDate(new Date(asOfDate.getFullYear(), 0, 1)),
      to: formatLocalDate(new Date(asOfDate.getFullYear(), 11, 31)),
    }
  }

  if (period === 'this_month' || period === 'month') {
    return {
      from: formatLocalDate(new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1)),
      to: formatLocalDate(new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 0)),
    }
  }

  if (period === 'last_month') {
    return {
      from: formatLocalDate(new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 1)),
      to: formatLocalDate(new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 0)),
    }
  }

  return {
    from: formatLocalDate(addDays(asOfDate, -89)),
    to: asOf,
  }
}

function inRange(iso: string, range: DateRange): boolean {
  if (range.from && iso < range.from) {
    return false
  }
  if (range.to && iso > range.to) {
    return false
  }
  return true
}

export function filterStatsTransactions(items: Transaction[], filters: StatsFilters): Transaction[] {
  const range = statsDateRange(filters.period, filters.asOf, {
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  })
  return items.filter((item) => {
    if (item.status !== 'posted') {
      return false
    }
    if (item.kind === 'transfer') {
      return false
    }
    if (filters.accountId !== 'all' && item.accountId !== filters.accountId) {
      return false
    }
    return inRange(item.occurredOn, range)
  })
}

export function statsSummary(items: Transaction[]): StatsSummary {
  let expenseTotal = 0
  let incomeTotal = 0
  for (const item of items) {
    if (item.kind === 'expense') {
      expenseTotal += item.amount
    } else if (item.kind === 'income') {
      incomeTotal += item.amount
    }
  }
  return { expenseTotal, incomeTotal, net: incomeTotal - expenseTotal }
}

export function totalsByCategory(
  items: Transaction[],
  kind: Extract<TransactionKind, 'expense' | 'income'>,
): CategorySpendSlice[] {
  const map = new Map<string, CategorySpendSlice>()
  for (const item of items) {
    if (item.kind !== kind) {
      continue
    }
    const key = item.categoryId ?? ''
    const existing = map.get(key)
    if (existing) {
      existing.amount += item.amount
      continue
    }
    map.set(key, {
      categoryId: item.categoryId ?? null,
      name: item.categoryName?.trim() || 'Без категории',
      ...(item.categoryColor ? { color: item.categoryColor } : {}),
      amount: item.amount,
    })
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'))
}

export function expensesByCategory(items: Transaction[]): CategorySpendSlice[] {
  return totalsByCategory(items, 'expense')
}

export function expensesByWeekday(items: Transaction[]): WeekdaySpendSlice[] {
  const totals = [0, 0, 0, 0, 0, 0, 0]
  for (const item of items) {
    if (item.kind !== 'expense') {
      continue
    }
    const day = parseLocalDate(item.occurredOn).getDay()
    totals[day] = (totals[day] ?? 0) + item.amount
  }
  return WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday]!,
    amount: totals[weekday]!,
  }))
}

function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end - start) / 86_400_000)
}

function clampRangeToAsOf(range: DateRange, asOf: string): DateRange {
  const to = !range.to || range.to > asOf ? asOf : range.to
  return { ...(range.from ? { from: range.from } : {}), to }
}

function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
}

export function previousStatsDateRange(
  period: PeriodKey,
  asOf = todayLocal(),
  custom?: DateRange,
): DateRange | null {
  if (period === 'all') {
    return null
  }

  const current = statsDateRange(period, asOf, custom)
  if (!current.from || !current.to) {
    return null
  }

  const asOfDate = parseLocalDate(asOf)

  if (period === 'this_month' || period === 'month') {
    const last = statsDateRange('last_month', asOf)
    const lastEnd = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 0)
    const day = Math.min(asOfDate.getDate(), lastEnd.getDate())
    return {
      from: last.from,
      to: formatLocalDate(new Date(lastEnd.getFullYear(), lastEnd.getMonth(), day)),
    }
  }

  if (period === 'year') {
    const prevYear = asOfDate.getFullYear() - 1
    const lastEnd = new Date(prevYear, asOfDate.getMonth() + 1, 0)
    const day = Math.min(asOfDate.getDate(), lastEnd.getDate())
    return {
      from: formatLocalDate(new Date(prevYear, 0, 1)),
      to: formatLocalDate(new Date(prevYear, asOfDate.getMonth(), day)),
    }
  }

  if (period === 'last_month') {
    return {
      from: formatLocalDate(new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 2, 1)),
      to: formatLocalDate(new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 0)),
    }
  }

  const from = parseLocalDate(current.from)
  const to = parseLocalDate(current.to)
  const length = daysBetween(from, to) + 1
  const prevTo = addDays(from, -1)
  return {
    from: formatLocalDate(addDays(prevTo, 1 - length)),
    to: formatLocalDate(prevTo),
  }
}

export function periodDayCount(
  range: DateRange,
  asOf = todayLocal(),
  items: Transaction[] = [],
): number {
  const clamped = clampRangeToAsOf(range, asOf)
  const to = clamped.to ?? asOf
  let from = clamped.from
  if (!from) {
    const dates = items.map((item) => item.occurredOn).sort()
    from = dates[0] ?? to
  }
  if (from > to) {
    return 1
  }
  return Math.max(1, daysBetween(parseLocalDate(from), parseLocalDate(to)) + 1)
}

export function averageDailyExpense(expenseTotal: number, dayCount: number): number {
  if (dayCount <= 0) {
    return 0
  }
  return expenseTotal / dayCount
}

export function expenseShare(expenseTotal: number, incomeTotal: number): number | null {
  if (incomeTotal <= 0) {
    return null
  }
  return expenseTotal / incomeTotal
}

export function totalsByAccount(items: Transaction[]): AccountTotalsSlice[] {
  const map = new Map<string, AccountTotalsSlice>()
  for (const item of items) {
    const existing = map.get(item.accountId) ?? {
      accountId: item.accountId,
      expenseTotal: 0,
      incomeTotal: 0,
    }
    if (item.kind === 'expense') {
      existing.expenseTotal += item.amount
    } else if (item.kind === 'income') {
      existing.incomeTotal += item.amount
    }
    map.set(item.accountId, existing)
  }
  return [...map.values()].sort(
    (a, b) =>
      b.expenseTotal + b.incomeTotal - (a.expenseTotal + a.incomeTotal) ||
      a.accountId.localeCompare(b.accountId),
  )
}

export interface MemberTotalsSlice {
  userId: string
  expenseTotal: number
  incomeTotal: number
}

export function totalsByMember(items: Transaction[]): MemberTotalsSlice[] {
  const map = new Map<string, MemberTotalsSlice>()
  for (const item of items) {
    if (item.source === 'income_rule' || item.source === 'expense_rule') {
      continue
    }
    if (item.kind === 'expense' && item.source !== 'manual' && item.source !== 'purchase') {
      continue
    }
    if (item.kind === 'income' && item.source !== 'manual') {
      continue
    }
    const existing = map.get(item.createdBy) ?? {
      userId: item.createdBy,
      expenseTotal: 0,
      incomeTotal: 0,
    }
    if (item.kind === 'expense') {
      existing.expenseTotal += item.amount
    } else if (item.kind === 'income') {
      existing.incomeTotal += item.amount
    }
    map.set(item.createdBy, existing)
  }
  return [...map.values()].sort(
    (a, b) =>
      b.expenseTotal + b.incomeTotal - (a.expenseTotal + a.incomeTotal) ||
      a.userId.localeCompare(b.userId),
  )
}

export function topTransactions(
  items: Transaction[],
  kind: Extract<TransactionKind, 'expense' | 'income'>,
  limit = 8,
): Transaction[] {
  return items
    .filter((item) => item.kind === kind)
    .sort(
      (a, b) =>
        b.amount - a.amount || b.occurredOn.localeCompare(a.occurredOn) || a.id.localeCompare(b.id),
    )
    .slice(0, limit)
}

export function trendStepForRange(range: DateRange, asOf = todayLocal()): TrendStep {
  const clamped = clampRangeToAsOf(range, asOf)
  if (!clamped.from) {
    return 'month'
  }
  const days = daysBetween(parseLocalDate(clamped.from), parseLocalDate(clamped.to ?? asOf)) + 1
  if (days <= 31) {
    return 'day'
  }
  if (days <= 120) {
    return 'week'
  }
  return 'month'
}

function bucketStart(date: Date, step: TrendStep): Date {
  if (step === 'day') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }
  if (step === 'week') {
    return startOfWeek(date)
  }
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function nextBucket(date: Date, step: TrendStep): Date {
  if (step === 'day') {
    return addDays(date, 1)
  }
  if (step === 'week') {
    return addDays(date, 7)
  }
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

function bucketKey(date: Date, step: TrendStep): string {
  if (step === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  return formatLocalDate(date)
}

function bucketLabel(date: Date, step: TrendStep): string {
  if (step === 'day') {
    return formatDayMonth(date)
  }
  if (step === 'week') {
    const end = addDays(date, 6)
    if (date.getMonth() === end.getMonth()) {
      return `${date.getDate()}–${formatDayMonth(end)}`
    }
    return `${formatDayMonth(date)} – ${formatDayMonth(end)}`
  }
  return new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' }).format(date)
}

export function trendSeries(
  items: Transaction[],
  range: DateRange,
  asOf = todayLocal(),
): TrendSlice[] {
  const step = trendStepForRange(range, asOf)
  const clamped = clampRangeToAsOf(range, asOf)
  const to = parseLocalDate(clamped.to ?? asOf)
  let from = clamped.from ? parseLocalDate(clamped.from) : undefined
  if (!from) {
    const dates = items.map((item) => item.occurredOn).sort()
    from = dates[0] ? parseLocalDate(dates[0]) : to
  }
  from = bucketStart(from, step)

  const buckets = new Map<string, TrendSlice>()
  for (let cursor = from; daysBetween(cursor, to) >= 0; cursor = nextBucket(cursor, step)) {
    const key = bucketKey(cursor, step)
    buckets.set(key, { key, label: bucketLabel(cursor, step), expense: 0, income: 0 })
  }

  for (const item of items) {
    const bucket = buckets.get(bucketKey(bucketStart(parseLocalDate(item.occurredOn), step), step))
    if (!bucket) {
      continue
    }
    if (item.kind === 'expense') {
      bucket.expense += item.amount
    } else if (item.kind === 'income') {
      bucket.income += item.amount
    }
  }

  return [...buckets.values()]
}

function formatMonthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDayMonthPlain(date: Date): string {
  return formatDayMonth(date).replace(/\./g, '').replace(/\u00a0/g, ' ')
}

function formatRangeLabel(fromIso: string, toIso: string): string {
  const from = parseLocalDate(fromIso)
  const to = parseLocalDate(toIso)
  if (fromIso === toIso) {
    return formatDayMonthPlain(from)
  }
  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
    return `${from.getDate()}–${formatDayMonthPlain(to)}`
  }
  if (from.getFullYear() === to.getFullYear()) {
    return `${formatDayMonthPlain(from)} – ${formatDayMonthPlain(to)}`
  }
  return `${formatDayMonthPlain(from)} ${from.getFullYear()} – ${formatDayMonthPlain(to)} ${to.getFullYear()}`
}

export function formatPeriodLabel(
  period: ChartPeriod,
  asOf = todayLocal(),
  custom?: DateRange,
): string {
  if (period === 'all') {
    return 'За все время'
  }

  if (period === 'day') {
    return asOf === todayLocal() ? 'Сегодня' : formatDayMonthPlain(parseLocalDate(asOf))
  }

  if (period === 'week') {
    const range = statsDateRange('week', asOf)
    const current = statsDateRange('week')
    if (range.from && range.to && range.from === current.from && range.to === current.to) {
      return 'Эта неделя'
    }
    if (range.from && range.to) {
      return formatRangeLabel(range.from, range.to)
    }
    return 'Эта неделя'
  }

  if (period === 'month') {
    return formatMonthLabel(parseLocalDate(asOf))
  }

  if (period === 'year') {
    return String(parseLocalDate(asOf).getFullYear())
  }

  const range = statsDateRange('custom', asOf, custom)
  if (range.from && range.to) {
    return formatRangeLabel(range.from, range.to)
  }
  if (range.from || range.to) {
    return formatDayMonthPlain(parseLocalDate(range.from ?? range.to!))
  }
  return 'Период'
}

export function expensesByDay(items: Transaction[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const item of items) {
    if (item.kind !== 'expense') {
      continue
    }
    totals[item.occurredOn] = (totals[item.occurredOn] ?? 0) + item.amount
  }
  return totals
}

export function heatmapWindow(
  range: DateRange,
  asOf = todayLocal(),
  items: Transaction[] = [],
): { from: string; to: string; capped: boolean } {
  let to = range.to ?? asOf
  let from = range.from
  if (!from) {
    const dates = items.map((item) => item.occurredOn).sort()
    from = dates[0] ?? to
  }
  if (from > to) {
    from = to
  }
  const span = daysBetween(parseLocalDate(from), parseLocalDate(to)) + 1
  if (span > HEATMAP_MAX_DAYS) {
    const capTo = to > asOf ? asOf : to
    return {
      from: formatLocalDate(addDays(parseLocalDate(capTo), 1 - HEATMAP_MAX_DAYS)),
      to: capTo,
      capped: true,
    }
  }
  return { from, to, capped: false }
}

export function heatmapWeeks(
  items: Transaction[],
  range: DateRange,
  asOf = todayLocal(),
): { weeks: HeatmapWeek[]; capped: boolean } {
  const amounts = expensesByDay(items)
  const window = heatmapWindow(range, asOf, items)
  const start = startOfWeek(parseLocalDate(window.from))
  const endDate = parseLocalDate(window.to)
  const sundayOffset = endDate.getDay() === 0 ? 0 : 7 - endDate.getDay()
  const end = addDays(endDate, sundayOffset)

  const weeks: HeatmapWeek[] = []
  let days: HeatmapDay[] = []

  for (let cursor = start; daysBetween(cursor, end) >= 0; cursor = addDays(cursor, 1)) {
    const date = formatLocalDate(cursor)
    const inPeriod = date >= window.from && date <= window.to
    const isFuture = date > asOf
    days.push({
      date,
      day: cursor.getDate(),
      amount: inPeriod && !isFuture ? (amounts[date] ?? 0) : 0,
      inPeriod,
      isFuture,
    })

    if (days.length === 7) {
      const firstOfMonth = days.find((item) => item.day === 1 && item.inPeriod)
      const monthSource = firstOfMonth
        ? parseLocalDate(firstOfMonth.date)
        : weeks.length === 0
          ? parseLocalDate(window.from)
          : undefined
      weeks.push({
        days,
        ...(monthSource ? { monthLabel: formatMonthLabel(monthSource) } : {}),
      })
      days = []
    }
  }

  return { weeks, capped: window.capped }
}
