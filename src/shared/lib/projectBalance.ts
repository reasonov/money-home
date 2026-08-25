import { addDays, compareDates, formatLocalDate, isAfter, parseLocalDate } from './dates'
import { formatMoneyPlain } from './formatMoney'

export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly'

export interface ProjectionIncomeRule {
  amount: number
  frequency: IncomeFrequency
  weekday?: number
  monthDay?: number
  anchorDate?: string
  startsOn?: string
  active: boolean
}

export interface ProjectionPurchase {
  id?: string
  title?: string
  amount: number
  plannedDate?: string
  status: 'planned' | 'done' | 'cancelled'
}

export interface ProjectBalanceInput {
  currentBalance: number
  asOfDate: Date
  targetDate: Date
  incomeRules: ProjectionIncomeRule[]
  plannedPurchases: ProjectionPurchase[]
  candidateAmount: number
  excludePurchaseId?: string
  postedOccurrenceDates?: string[]
  expenseRules?: ProjectionIncomeRule[]
  postedExpenseOccurrenceDates?: string[]
  incomingTransferRules?: ProjectionIncomeRule[]
  outgoingTransferRules?: ProjectionIncomeRule[]
  postedIncomingTransferDates?: string[]
  postedOutgoingTransferDates?: string[]
}

export interface PlannedBeforeTargetItem {
  title: string
  amount: number
  plannedDate: string
}

export interface ProjectBalanceResult {
  projectedBalance: number
  canAfford: boolean
  shortfall: number
  plannedBeforeTarget: PlannedBeforeTargetItem[]
  incomeTotal: number
  incomeOccurrencesCount: number
  nextAffordableDate: Date | null
  message: string | null
}

const NEXT_AFFORDABLE_HORIZON_DAYS = 365

function collectMonthlyDates(monthDay: number, asOf: Date, target: Date): Date[] {
  const dates: Date[] = []
  let year = asOf.getFullYear()
  let month = asOf.getMonth()

  for (let i = 0; i < 48; i += 1) {
    const candidate = new Date(year, month, monthDay)
    if (isAfter(candidate, asOf) && compareDates(candidate, target) <= 0) {
      dates.push(candidate)
    }
    if (compareDates(candidate, target) > 0 && month > target.getMonth() && year >= target.getFullYear()) {
      break
    }
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
    if (year > target.getFullYear() + 1) {
      break
    }
  }

  return dates
}

function collectWeeklyDates(weekday: number, asOf: Date, target: Date): Date[] {
  const dates: Date[] = []
  let cursor = addDays(asOf, 1)

  while (compareDates(cursor, target) <= 0) {
    if (cursor.getDay() === weekday) {
      dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    }
    cursor = addDays(cursor, 1)
  }

  return dates
}

function collectBiweeklyDates(anchorDate: string, asOf: Date, target: Date): Date[] {
  const dates: Date[] = []
  let cursor = parseLocalDate(anchorDate)

  while (compareDates(cursor, asOf) <= 0) {
    cursor = addDays(cursor, 14)
  }

  while (compareDates(cursor, target) <= 0) {
    dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    cursor = addDays(cursor, 14)
  }

  return dates
}

export function incomeOccurrences(
  rule: ProjectionIncomeRule,
  asOfDate: Date,
  targetDate: Date,
  postedOccurrenceDates: string[] = [],
): Date[] {
  if (!rule.active || rule.amount <= 0) {
    return []
  }

  const posted = new Set(postedOccurrenceDates)
  const keep = (dates: Date[]) =>
    dates.filter((date) => {
      const iso = formatLocalDate(date)
      if (rule.startsOn && iso < rule.startsOn) {
        return false
      }
      return !posted.has(iso)
    })

  if (rule.frequency === 'monthly' && rule.monthDay != null) {
    return keep(collectMonthlyDates(rule.monthDay, asOfDate, targetDate))
  }

  if (rule.frequency === 'weekly' && rule.weekday != null) {
    return keep(collectWeeklyDates(rule.weekday, asOfDate, targetDate))
  }

  if (rule.frequency === 'biweekly' && rule.anchorDate) {
    return keep(collectBiweeklyDates(rule.anchorDate, asOfDate, targetDate))
  }

  return []
}

function sumRuleAmounts(
  rules: ProjectionIncomeRule[],
  asOfDate: Date,
  targetDate: Date,
  postedOccurrenceDates: string[] = [],
): { total: number; count: number } {
  let total = 0
  let count = 0

  for (const rule of rules) {
    const dates = incomeOccurrences(rule, asOfDate, targetDate, postedOccurrenceDates)
    count += dates.length
    total += dates.length * rule.amount
  }

  return { total, count }
}

function sumIncomes(
  incomeRules: ProjectionIncomeRule[],
  asOfDate: Date,
  targetDate: Date,
  postedOccurrenceDates: string[] = [],
): { incomeTotal: number; incomeOccurrencesCount: number } {
  const { total, count } = sumRuleAmounts(
    incomeRules,
    asOfDate,
    targetDate,
    postedOccurrenceDates,
  )
  return { incomeTotal: total, incomeOccurrencesCount: count }
}

function collectPlannedBeforeTarget(
  plannedPurchases: ProjectionPurchase[],
  asOfDate: Date,
  targetDate: Date,
  excludePurchaseId?: string,
): PlannedBeforeTargetItem[] {
  const items: PlannedBeforeTargetItem[] = []

  for (const purchase of plannedPurchases) {
    if (purchase.status !== 'planned') {
      continue
    }
    if (excludePurchaseId && purchase.id === excludePurchaseId) {
      continue
    }
    if (!purchase.plannedDate) {
      continue
    }
    const plannedDate = parseLocalDate(purchase.plannedDate)
    if (isAfter(plannedDate, asOfDate) && compareDates(plannedDate, targetDate) <= 0) {
      items.push({
        title: purchase.title?.trim() || 'Покупка',
        amount: purchase.amount,
        plannedDate: purchase.plannedDate,
      })
    }
  }

  items.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
  return items
}

function formatTargetLabel(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function withTransferRules<T extends {
  incomeRules: ProjectionIncomeRule[]
  expenseRules?: ProjectionIncomeRule[]
  postedOccurrenceDates?: string[]
  postedExpenseOccurrenceDates?: string[]
  incomingTransferRules?: ProjectionIncomeRule[]
  outgoingTransferRules?: ProjectionIncomeRule[]
  postedIncomingTransferDates?: string[]
  postedOutgoingTransferDates?: string[]
}>(input: T): T {
  return {
    ...input,
    incomeRules: [...input.incomeRules, ...(input.incomingTransferRules ?? [])],
    expenseRules: [...(input.expenseRules ?? []), ...(input.outgoingTransferRules ?? [])],
    postedOccurrenceDates: [
      ...(input.postedOccurrenceDates ?? []),
      ...(input.postedIncomingTransferDates ?? []),
    ],
    postedExpenseOccurrenceDates: [
      ...(input.postedExpenseOccurrenceDates ?? []),
      ...(input.postedOutgoingTransferDates ?? []),
    ],
  }
}

export function transferProjectionForAccount(
  rules: Array<
    ProjectionIncomeRule & { id: string; fromAccountId: string; toAccountId: string }
  >,
  accountId: string,
  postedDatesFor: (ruleId: string) => string[],
) {
  const incoming = rules.filter((rule) => rule.active && rule.toAccountId === accountId)
  const outgoing = rules.filter((rule) => rule.active && rule.fromAccountId === accountId)
  return {
    incomingTransferRules: incoming,
    outgoingTransferRules: outgoing,
    postedIncomingTransferDates: incoming.flatMap((rule) => postedDatesFor(rule.id)),
    postedOutgoingTransferDates: outgoing.flatMap((rule) => postedDatesFor(rule.id)),
  }
}

function computeProjectionCore(
  input: ProjectBalanceInput,
  targetDate: Date,
): {
  projectedBalance: number
  canAfford: boolean
  shortfall: number
  plannedBeforeTarget: PlannedBeforeTargetItem[]
  incomeTotal: number
  incomeOccurrencesCount: number
} {
  const {
    currentBalance,
    asOfDate,
    incomeRules,
    plannedPurchases,
    candidateAmount,
    excludePurchaseId,
    postedOccurrenceDates,
    expenseRules = [],
    postedExpenseOccurrenceDates,
  } = withTransferRules(input)

  const { incomeTotal, incomeOccurrencesCount } = sumIncomes(
    incomeRules,
    asOfDate,
    targetDate,
    postedOccurrenceDates,
  )
  const plannedBeforeTarget = collectPlannedBeforeTarget(
    plannedPurchases,
    asOfDate,
    targetDate,
    excludePurchaseId,
  )
  const plannedSpend = plannedBeforeTarget.reduce((sum, item) => sum + item.amount, 0)
  const expenseRuleSpend = sumRuleAmounts(
    expenseRules,
    asOfDate,
    targetDate,
    postedExpenseOccurrenceDates,
  ).total
  const projectedBalance = currentBalance + incomeTotal - plannedSpend - expenseRuleSpend
  const canAfford = projectedBalance >= candidateAmount
  const shortfall = canAfford ? 0 : candidateAmount - projectedBalance

  return {
    projectedBalance,
    canAfford,
    shortfall,
    plannedBeforeTarget,
    incomeTotal,
    incomeOccurrencesCount,
  }
}

export function findNextAffordableDate(input: ProjectBalanceInput): Date | null {
  const horizonEnd = addDays(input.asOfDate, NEXT_AFFORDABLE_HORIZON_DAYS)
  let cursor = new Date(
    input.targetDate.getFullYear(),
    input.targetDate.getMonth(),
    input.targetDate.getDate(),
  )

  while (compareDates(cursor, horizonEnd) <= 0) {
    const core = computeProjectionCore(input, cursor)
    if (core.canAfford) {
      return cursor
    }
    cursor = addDays(cursor, 1)
  }

  return null
}

export function projectBalance(input: ProjectBalanceInput): ProjectBalanceResult {
  const core = computeProjectionCore(input, input.targetDate)
  const nextAffordableDate = core.canAfford ? null : findNextAffordableDate(input)

  return {
    ...core,
    nextAffordableDate,
    message: core.canAfford
      ? null
      : `К ${formatTargetLabel(input.targetDate)} на счёте будет ${formatMoneyPlain(core.projectedBalance)} ₽ — не хватает ${formatMoneyPlain(core.shortfall)} ₽.`,
  }
}

export function formatProjectionDate(date: Date): string {
  return formatTargetLabel(date)
}

export interface AvailableUntilNextIncomeInput {
  currentBalance: number
  asOfDate: Date
  incomeRules: ProjectionIncomeRule[]
  plannedPurchases: ProjectionPurchase[]
  postedOccurrenceDates?: string[]
  expenseRules?: ProjectionIncomeRule[]
  postedExpenseOccurrenceDates?: string[]
  incomingTransferRules?: ProjectionIncomeRule[]
  outgoingTransferRules?: ProjectionIncomeRule[]
  postedIncomingTransferDates?: string[]
  postedOutgoingTransferDates?: string[]
}

export interface AvailableUntilNextIncomeResult {
  available: number
  plannedSpend: number
  nextIncomeDate: Date | null
}

export function findNextIncomeDate(
  incomeRules: ProjectionIncomeRule[],
  asOfDate: Date,
  postedOccurrenceDates: string[] = [],
): Date | null {
  const horizonEnd = addDays(asOfDate, NEXT_AFFORDABLE_HORIZON_DAYS)
  let earliest: Date | null = null

  for (const rule of incomeRules) {
    const dates = incomeOccurrences(rule, asOfDate, horizonEnd, postedOccurrenceDates)
    const first = dates[0]
    if (!first) {
      continue
    }
    if (!earliest || compareDates(first, earliest) < 0) {
      earliest = first
    }
  }

  return earliest
}

export function availableUntilNextIncome(
  input: AvailableUntilNextIncomeInput,
): AvailableUntilNextIncomeResult {
  const {
    currentBalance,
    asOfDate,
    incomeRules,
    plannedPurchases,
    postedOccurrenceDates,
    expenseRules = [],
    postedExpenseOccurrenceDates,
  } = withTransferRules(input)
  const nextIncomeDate = findNextIncomeDate(incomeRules, asOfDate, postedOccurrenceDates)
  const spendUntil = nextIncomeDate ?? addDays(asOfDate, NEXT_AFFORDABLE_HORIZON_DAYS)

  let plannedSpend = 0
  for (const purchase of plannedPurchases) {
    if (purchase.status !== 'planned') {
      continue
    }
    if (!purchase.plannedDate) {
      continue
    }
    const plannedDate = parseLocalDate(purchase.plannedDate)
    if (nextIncomeDate) {
      if (compareDates(plannedDate, nextIncomeDate) < 0) {
        plannedSpend += purchase.amount
      }
      continue
    }
    if (compareDates(plannedDate, spendUntil) <= 0) {
      plannedSpend += purchase.amount
    }
  }

  let expenseSpend = 0
  if (nextIncomeDate) {
    for (const rule of expenseRules) {
      const dates = incomeOccurrences(rule, asOfDate, nextIncomeDate, postedExpenseOccurrenceDates)
      for (const date of dates) {
        if (compareDates(date, nextIncomeDate) < 0) {
          expenseSpend += rule.amount
        }
      }
    }
  }

  const reserved = plannedSpend + expenseSpend
  return {
    available: currentBalance - reserved,
    plannedSpend: reserved,
    nextIncomeDate,
  }
}

export interface TransferCandidateAccount {
  id: string
  name: string
  currentBalance: number
  plannedPurchases: ProjectionPurchase[]
  incomeRules?: ProjectionIncomeRule[]
  postedOccurrenceDates?: string[]
  expenseRules?: ProjectionIncomeRule[]
  postedExpenseOccurrenceDates?: string[]
  incomingTransferRules?: ProjectionIncomeRule[]
  outgoingTransferRules?: ProjectionIncomeRule[]
  postedIncomingTransferDates?: string[]
  postedOutgoingTransferDates?: string[]
}

export interface TransferSuggestion {
  accountId: string
  accountName: string
  available: number
  amount: number
}

export function suggestTransfer(
  shortfall: number,
  asOfDate: Date,
  targetDate: Date,
  otherAccounts: TransferCandidateAccount[],
): TransferSuggestion | null {
  if (shortfall <= 0) {
    return null
  }

  const matches: TransferSuggestion[] = []

  for (const account of otherAccounts) {
    const core = computeProjectionCore(
      {
        currentBalance: account.currentBalance,
        asOfDate,
        targetDate,
        incomeRules: account.incomeRules ?? [],
        plannedPurchases: account.plannedPurchases,
        candidateAmount: shortfall,
        postedOccurrenceDates: account.postedOccurrenceDates,
        expenseRules: account.expenseRules,
        postedExpenseOccurrenceDates: account.postedExpenseOccurrenceDates,
        incomingTransferRules: account.incomingTransferRules,
        outgoingTransferRules: account.outgoingTransferRules,
        postedIncomingTransferDates: account.postedIncomingTransferDates,
        postedOutgoingTransferDates: account.postedOutgoingTransferDates,
      },
      targetDate,
    )
    if (core.projectedBalance >= shortfall) {
      matches.push({
        accountId: account.id,
        accountName: account.name,
        available: core.projectedBalance,
        amount: shortfall,
      })
    }
  }

  matches.sort((a, b) => b.available - a.available)
  return matches[0] ?? null
}

export interface ForecastSlice {
  date: string
  label: string
  balance: number
}

const FORECAST_LABEL = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
})

export function forecastBalanceSeries(input: {
  currentBalance: number
  asOfDate: Date
  horizonDays: number
  incomeRules: ProjectionIncomeRule[]
  plannedPurchases: ProjectionPurchase[]
  expenseRules?: ProjectionIncomeRule[]
  postedOccurrenceDates?: string[]
  postedExpenseOccurrenceDates?: string[]
  incomingTransferRules?: ProjectionIncomeRule[]
  outgoingTransferRules?: ProjectionIncomeRule[]
  postedIncomingTransferDates?: string[]
  postedOutgoingTransferDates?: string[]
}): ForecastSlice[] {
  const slices: ForecastSlice[] = []
  const days = Math.max(0, Math.floor(input.horizonDays))

  for (let i = 0; i <= days; i += 1) {
    const targetDate = addDays(input.asOfDate, i)
    const core = computeProjectionCore(
      {
        currentBalance: input.currentBalance,
        asOfDate: input.asOfDate,
        targetDate,
        incomeRules: input.incomeRules,
        plannedPurchases: input.plannedPurchases,
        candidateAmount: 0,
        postedOccurrenceDates: input.postedOccurrenceDates,
        expenseRules: input.expenseRules,
        postedExpenseOccurrenceDates: input.postedExpenseOccurrenceDates,
        incomingTransferRules: input.incomingTransferRules,
        outgoingTransferRules: input.outgoingTransferRules,
        postedIncomingTransferDates: input.postedIncomingTransferDates,
        postedOutgoingTransferDates: input.postedOutgoingTransferDates,
      },
      targetDate,
    )
    slices.push({
      date: formatLocalDate(targetDate),
      label: FORECAST_LABEL.format(targetDate).replace('.', ''),
      balance: core.projectedBalance,
    })
  }

  return slices
}

