import {
  addDays,
  compareDates,
  formatLocalDate,
  formatMoneyPlain,
  formatNumericDate,
  parseLocalDate,
  planSavingsGoals,
  roundMoney,
  SAVINGS_DAYS_PER_MONTH,
  type IncomeFrequency,
  type SavingsPlanInput,
} from '@/shared'
import { ADVICE_WINDOW_DAYS, type SavingsAdviceCategory } from './summarizeSpending'

export const ADVICE_MAX_LEVERS = 8
export const ADVICE_SLACK_RUB = 1

export type AdviceLeverKind =
  'revert_category' | 'cut_category' | 'defer_purchase' | 'delay_date' | 'review_rule' | 'set_aside'

export interface AdviceExpenseRule {
  id: string
  amount: number
  frequency: IncomeFrequency
  title?: string
}

export interface AdviceLever {
  id: string
  kind: AdviceLeverKind
  impact: number
  coversGap: boolean
  fact: string
  categoryName?: string
  categoryId?: string
  groupId?: string
  purchaseId?: string
  purchaseTitle?: string
  ruleId?: string
  ruleTitle?: string
  newTargetDate?: string
  extraAfter?: number
}

export interface BuildAdviceLeversInput {
  asOfDate: Date
  goalId: string
  extraPerMonth: number
  remaining: number
  targetDate: string
  overdue: boolean
  categories: SavingsAdviceCategory[]
  increases: SavingsAdviceCategory[]
  expenseRules: AdviceExpenseRule[]
  planInput: SavingsPlanInput
}

const KIND_ORDER: Record<AdviceLeverKind, number> = {
  defer_purchase: 0,
  revert_category: 1,
  review_rule: 2,
  delay_date: 3,
  cut_category: 4,
  set_aside: 5,
}

function calendarDays(from: Date, to: Date): number {
  let n = 0
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (compareDates(cursor, end) < 0) {
    cursor = addDays(cursor, 1)
    n += 1
  }
  return n
}

export function adviceMonthsLeft(asOf: Date, targetIso: string, overdue: boolean): number {
  if (overdue) {
    return 0
  }
  const days = calendarDays(asOf, parseLocalDate(targetIso))
  return roundMoney(days / SAVINGS_DAYS_PER_MONTH)
}

function toMonthly(amount: number): number {
  return roundMoney(amount * (SAVINGS_DAYS_PER_MONTH / ADVICE_WINDOW_DAYS))
}

function monthlyRuleAmount(amount: number, frequency: IncomeFrequency): number {
  if (frequency === 'weekly') {
    return roundMoney(amount * (SAVINGS_DAYS_PER_MONTH / 7))
  }
  if (frequency === 'biweekly') {
    return roundMoney(amount * (SAVINGS_DAYS_PER_MONTH / 14))
  }
  return roundMoney(amount)
}

function covers(impact: number, gap: number): boolean {
  return gap > 0 && impact + ADVICE_SLACK_RUB >= gap
}

function extraFor(planInput: SavingsPlanInput, goalId: string): number {
  const plan = planSavingsGoals(planInput)
  return plan.goals.find((item) => item.id === goalId)?.extraPerMonth ?? 0
}

function mergeCategories(
  categories: SavingsAdviceCategory[],
  increases: SavingsAdviceCategory[],
): SavingsAdviceCategory[] {
  const map = new Map<string, SavingsAdviceCategory>()
  for (const row of [...categories, ...increases]) {
    map.set(row.name, row)
  }
  return [...map.values()]
}

function compareLevers(a: AdviceLever, b: AdviceLever): number {
  if (a.coversGap !== b.coversGap) {
    return a.coversGap ? -1 : 1
  }
  if (a.kind === 'delay_date' && b.kind === 'delay_date') {
    return (a.newTargetDate ?? '').localeCompare(b.newTargetDate ?? '')
  }
  if (b.impact !== a.impact) {
    return b.impact - a.impact
  }
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
}

function clipId(value: string, max = 80): string {
  return value.trim().slice(0, max)
}

export function buildAdviceLevers(input: BuildAdviceLeversInput): AdviceLever[] {
  const gap = Math.max(0, roundMoney(input.extraPerMonth))
  const material = gap > 0 ? Math.max(ADVICE_SLACK_RUB, roundMoney(gap * 0.05)) : ADVICE_SLACK_RUB
  const levers: AdviceLever[] = []
  const rows = mergeCategories(input.categories, input.increases)
  const reverted = new Set<string>()

  for (const row of rows) {
    const impact = toMonthly(Math.max(0, row.delta))
    if (impact < material) {
      continue
    }
    reverted.add(row.name)
    levers.push({
      id: clipId(`revert:${row.name}`),
      kind: 'revert_category',
      impact,
      coversGap: covers(impact, gap),
      fact: `«${row.name}» вырос на ${formatMoneyPlain(row.delta)} ₽ за 30 дней (${formatMoneyPlain(row.current)} против ${formatMoneyPlain(row.previous)}, операций ${row.currentCount} и ${row.previousCount}). Возврат к прошлому уровню: ${formatMoneyPlain(impact)} ₽/мес.`,
      categoryName: row.name,
      ...(row.categoryId ? { categoryId: row.categoryId } : {}),
      ...(row.groupId ? { groupId: row.groupId } : {}),
    })
  }

  const cuts = [...rows]
    .filter((row) => !reverted.has(row.name))
    .sort((a, b) => b.current - a.current)
  for (const row of cuts.slice(0, 3)) {
    const monthly = toMonthly(row.current)
    const impact = gap > 0 ? Math.min(monthly, gap) : monthly
    if (impact < material) {
      continue
    }
    levers.push({
      id: clipId(`cut:${row.name}`),
      kind: 'cut_category',
      impact,
      coversGap: covers(impact, gap),
      fact: `«${row.name}»: ${formatMoneyPlain(row.current)} ₽ за 30 дней, ${row.currentCount} операций. Сокращение на ${formatMoneyPlain(impact)} ₽/мес закроет ${covers(impact, gap) ? 'всю дыру' : `часть дыры ${formatMoneyPlain(gap)} ₽/мес`}.`,
      categoryName: row.name,
      ...(row.categoryId ? { categoryId: row.categoryId } : {}),
      ...(row.groupId ? { groupId: row.groupId } : {}),
    })
  }

  if (!input.overdue) {
    const target = parseLocalDate(input.targetDate)
    const purchases = [...input.planInput.plannedPurchases]
      .filter((item) => {
        if (item.status !== 'planned' || !item.id) {
          return false
        }
        const date = parseLocalDate(item.plannedDate)
        return compareDates(date, input.asOfDate) > 0 && compareDates(date, target) <= 0
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)

    for (const purchase of purchases) {
      const extraAfter = extraFor(
        {
          ...input.planInput,
          plannedPurchases: input.planInput.plannedPurchases.filter(
            (item) => item.id !== purchase.id,
          ),
        },
        input.goalId,
      )
      const impact = roundMoney(Math.max(0, gap - extraAfter))
      if (impact < material) {
        continue
      }
      const title = purchase.title?.trim() || 'Покупка'
      levers.push({
        id: clipId(`defer:${purchase.id}`),
        kind: 'defer_purchase',
        impact,
        coversGap: extraAfter <= ADVICE_SLACK_RUB,
        fact: `Покупка «${title}» на ${formatMoneyPlain(purchase.amount)} ₽ к ${formatNumericDate(purchase.plannedDate)}. Если отложить её после даты цели, взнос станет ${formatMoneyPlain(extraAfter)} ₽/мес вместо ${formatMoneyPlain(gap)} ₽/мес.`,
        purchaseId: purchase.id,
        purchaseTitle: title,
        extraAfter,
      })
    }
  }

  const delayBases = input.overdue
    ? [addDays(input.asOfDate, 14), addDays(input.asOfDate, 28)]
    : [addDays(parseLocalDate(input.targetDate), 14), addDays(parseLocalDate(input.targetDate), 28)]
  let alreadyCoveredByDelay = false
  for (const date of delayBases) {
    if (alreadyCoveredByDelay || compareDates(date, input.asOfDate) <= 0) {
      continue
    }
    const newTargetDate = formatLocalDate(date)
    const extraAfter = extraFor(
      {
        ...input.planInput,
        goals: input.planInput.goals.map((goal) =>
          goal.id === input.goalId ? { ...goal, targetDate: newTargetDate } : goal,
        ),
      },
      input.goalId,
    )
    const impact = roundMoney(Math.max(0, gap - extraAfter))
    if (impact < material) {
      continue
    }
    const covered = extraAfter <= ADVICE_SLACK_RUB
    alreadyCoveredByDelay = covered
    levers.push({
      id: clipId(`delay:${newTargetDate}`),
      kind: 'delay_date',
      impact,
      coversGap: covered,
      fact: `Если перенести срок с ${formatNumericDate(input.targetDate)} на ${formatNumericDate(newTargetDate)}, взнос станет ${formatMoneyPlain(extraAfter)} ₽/мес вместо ${formatMoneyPlain(gap)} ₽/мес.`,
      newTargetDate,
      extraAfter,
    })
  }

  const rules = [...input.expenseRules].sort(
    (a, b) => monthlyRuleAmount(b.amount, b.frequency) - monthlyRuleAmount(a.amount, a.frequency),
  )
  for (const rule of rules.slice(0, 2)) {
    const monthly = monthlyRuleAmount(rule.amount, rule.frequency)
    const impact = gap > 0 ? Math.min(monthly, gap) : monthly
    if (impact < material) {
      continue
    }
    const title = rule.title?.trim() || 'Регулярный расход'
    levers.push({
      id: clipId(`rule:${rule.id}`),
      kind: 'review_rule',
      impact,
      coversGap: covers(impact, gap),
      fact: `Регулярный расход «${title}»: ${formatMoneyPlain(monthly)} ₽/мес. Если снизить или отключить, это ${covers(impact, gap) ? 'закроет дыру' : `даст ${formatMoneyPlain(impact)} ₽/мес из ${formatMoneyPlain(gap)} ₽/мес`}.`,
      ruleId: rule.id,
      ruleTitle: title,
    })
  }

  const ranked = [...levers].sort(compareLevers).slice(0, ADVICE_MAX_LEVERS - 1)
  if (gap > 0) {
    ranked.push({
      id: 'set-aside',
      kind: 'set_aside',
      impact: gap,
      coversGap: true,
      fact: `Откладывать ещё ${formatMoneyPlain(gap)} ₽ каждый месяц до ${formatNumericDate(input.targetDate)}. Осталось накопить ${formatMoneyPlain(input.remaining)} ₽.`,
    })
  }

  return ranked.slice(0, ADVICE_MAX_LEVERS)
}

export function leverTitle(lever: AdviceLever): string {
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

export function leverCtaLabel(lever: AdviceLever): string {
  switch (lever.kind) {
    case 'revert_category':
    case 'cut_category':
      return lever.categoryName ? `Открыть «${lever.categoryName}»` : 'Открыть историю'
    case 'defer_purchase':
      return 'Открыть покупку'
    case 'delay_date':
      return 'Перенести срок'
    case 'review_rule':
      return 'Открыть правило'
    case 'set_aside':
      return 'Открыть копилку'
  }
}

export function fallbackTipsFromLevers(levers: AdviceLever[], limit = 3) {
  return levers.slice(0, limit).map((lever) => ({
    id: lever.id,
    kind: lever.kind,
    title: leverTitle(lever),
    detail: lever.fact,
    impact: lever.impact,
    ...(lever.categoryName ? { categoryName: lever.categoryName } : {}),
    ...(lever.categoryId ? { categoryId: lever.categoryId } : {}),
    ...(lever.groupId ? { groupId: lever.groupId } : {}),
    ...(lever.purchaseId ? { purchaseId: lever.purchaseId } : {}),
    ...(lever.ruleId ? { ruleId: lever.ruleId } : {}),
    ...(lever.newTargetDate ? { newTargetDate: lever.newTargetDate } : {}),
  }))
}
