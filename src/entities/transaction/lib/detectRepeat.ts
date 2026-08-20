import { addDays, formatLocalDate, parseLocalDate, todayLocal } from '@/shared'
import type { Transaction, TransactionKind } from '../model/types'

const WINDOW_DAYS = 365
const MIN_DATES = 3

export type RepeatKind = Extract<TransactionKind, 'expense' | 'income'>

export type RepeatRuleMatch = {
  accountId: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  weekday?: number
  monthDay?: number
  active: boolean
}

export type RepeatTemplateMatch = {
  kind: RepeatKind
  categoryId: string
  amount: number
}

export type RepeatSeed = Pick<
  Transaction,
  'accountId' | 'kind' | 'amount' | 'occurredOn' | 'categoryId' | 'title' | 'notes'
>

export type RepeatSuggestion = {
  type: 'rule' | 'favorite'
  kind: RepeatKind
  accountId: string
  amount: number
  categoryId: string
  title?: string
  notes?: string
  count: number
  key: string
  frequency?: 'weekly' | 'monthly'
  weekday?: number
  monthDay?: number
}

export type DetectRepeatInput = {
  asOf?: string
  accountId?: string
  rules: RepeatRuleMatch[]
  templates: RepeatTemplateMatch[]
  dismissedKeys: string[]
}

type Cluster = {
  accountId: string
  kind: RepeatKind
  amount: number
  categoryId: string
  dates: string[]
  latest: Transaction
}

function windowFrom(asOf: string): string {
  return formatLocalDate(addDays(parseLocalDate(asOf), -WINDOW_DAYS))
}

function inWindow(occurredOn: string, from: string, asOf: string): boolean {
  return occurredOn >= from && occurredOn <= asOf
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = parseLocalDate(fromIso)
  const to = parseLocalDate(toIso)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function uniqueSortedDates(items: Transaction[]): string[] {
  return [...new Set(items.map((item) => item.occurredOn))].sort()
}

function latestTx(items: Transaction[]): Transaction {
  return [...items].sort(
    (a, b) =>
      b.occurredOn.localeCompare(a.occurredOn) ||
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '') ||
      b.id.localeCompare(a.id),
  )[0]!
}

function mostlyWeeklyGaps(sortedDates: string[]): boolean {
  const gaps: number[] = []
  for (let i = 1; i < sortedDates.length; i += 1) {
    gaps.push(daysBetween(sortedDates[i - 1]!, sortedDates[i]!))
  }
  if (!gaps.length) {
    return false
  }
  const ok = gaps.filter((gap) => gap === 7 || gap === 14).length
  return ok * 3 >= gaps.length * 2
}

function hasSevenDayStep(sortedDates: string[]): boolean {
  for (let i = 1; i < sortedDates.length; i += 1) {
    if (daysBetween(sortedDates[i - 1]!, sortedDates[i]!) === 7) {
      return true
    }
  }
  return false
}

function weeklyPattern(dates: string[]): { weekday: number; dates: string[] } | null {
  const byWeekday = new Map<number, string[]>()
  for (const iso of dates) {
    const weekday = parseLocalDate(iso).getDay()
    const list = byWeekday.get(weekday) ?? []
    list.push(iso)
    byWeekday.set(weekday, list)
  }
  let best: { weekday: number; dates: string[] } | null = null
  for (const [weekday, list] of byWeekday) {
    if (list.length < MIN_DATES || !mostlyWeeklyGaps(list)) {
      continue
    }
    if (!best || list.length > best.dates.length) {
      best = { weekday, dates: list }
    }
  }
  return best
}

function monthlyPattern(dates: string[]): { monthDay: number; dates: string[] } | null {
  const byDay = new Map<number, string[]>()
  for (const iso of dates) {
    const day = parseLocalDate(iso).getDate()
    if (day < 1 || day > 28) {
      continue
    }
    const list = byDay.get(day) ?? []
    list.push(iso)
    byDay.set(day, list)
  }
  let best: { monthDay: number; dates: string[] } | null = null
  for (const [monthDay, list] of byDay) {
    const months = new Set(list.map((iso) => iso.slice(0, 7)))
    if (list.length < MIN_DATES || months.size < MIN_DATES) {
      continue
    }
    if (!best || list.length > best.dates.length) {
      best = { monthDay, dates: list }
    }
  }
  return best
}

function ruleKey(
  cluster: Cluster,
  frequency: 'weekly' | 'monthly',
  day: number,
): string {
  return `rule:${cluster.accountId}:${cluster.kind}:${cluster.amount}:${cluster.categoryId}:${frequency}:${day}`
}

function favoriteKey(cluster: Cluster): string {
  return `favorite:${cluster.accountId}:${cluster.kind}:${cluster.amount}:${cluster.categoryId}`
}

function hasMatchingRule(
  rules: RepeatRuleMatch[],
  cluster: Cluster,
  frequency: 'weekly' | 'monthly',
  weekday?: number,
  monthDay?: number,
): boolean {
  return rules.some((rule) => {
    if (!rule.active || rule.accountId !== cluster.accountId || rule.amount !== cluster.amount) {
      return false
    }
    if (rule.frequency !== frequency) {
      return false
    }
    if (frequency === 'weekly') {
      return rule.weekday === weekday
    }
    return rule.monthDay === monthDay
  })
}

function hasMatchingTemplate(templates: RepeatTemplateMatch[], cluster: Cluster): boolean {
  return templates.some(
    (item) =>
      item.kind === cluster.kind &&
      item.categoryId === cluster.categoryId &&
      item.amount === cluster.amount,
  )
}

function fromFields(cluster: Cluster, count: number) {
  return {
    kind: cluster.kind,
    accountId: cluster.accountId,
    amount: cluster.amount,
    categoryId: cluster.categoryId,
    count,
    ...(cluster.latest.title ? { title: cluster.latest.title } : {}),
    ...(cluster.latest.notes ? { notes: cluster.latest.notes } : {}),
  }
}

function suggestionForCluster(
  cluster: Cluster,
  input: Pick<DetectRepeatInput, 'rules' | 'templates' | 'dismissedKeys'>,
): RepeatSuggestion | null {
  const dismissed = new Set(input.dismissedKeys)
  const weekly = weeklyPattern(cluster.dates)
  const monthly = monthlyPattern(cluster.dates)

  let rule: RepeatSuggestion | null = null
  if (weekly && monthly) {
    if (hasSevenDayStep(weekly.dates)) {
      rule = {
        type: 'rule',
        ...fromFields(cluster, weekly.dates.length),
        frequency: 'weekly',
        weekday: weekly.weekday,
        key: ruleKey(cluster, 'weekly', weekly.weekday),
      }
    } else {
      rule = {
        type: 'rule',
        ...fromFields(cluster, monthly.dates.length),
        frequency: 'monthly',
        monthDay: monthly.monthDay,
        key: ruleKey(cluster, 'monthly', monthly.monthDay),
      }
    }
  } else if (weekly) {
    rule = {
      type: 'rule',
      ...fromFields(cluster, weekly.dates.length),
      frequency: 'weekly',
      weekday: weekly.weekday,
      key: ruleKey(cluster, 'weekly', weekly.weekday),
    }
  } else if (monthly) {
    rule = {
      type: 'rule',
      ...fromFields(cluster, monthly.dates.length),
      frequency: 'monthly',
      monthDay: monthly.monthDay,
      key: ruleKey(cluster, 'monthly', monthly.monthDay),
    }
  }

  if (rule) {
    if (
      dismissed.has(rule.key) ||
      hasMatchingRule(input.rules, cluster, rule.frequency!, rule.weekday, rule.monthDay)
    ) {
      return null
    }
    return rule
  }

  if (cluster.dates.length < MIN_DATES || hasMatchingTemplate(input.templates, cluster)) {
    return null
  }
  const key = favoriteKey(cluster)
  if (dismissed.has(key)) {
    return null
  }
  return {
    type: 'favorite',
    ...fromFields(cluster, cluster.dates.length),
    key,
  }
}

function collectClusters(
  items: Transaction[],
  from: string,
  asOf: string,
  accountId?: string,
  seed?: RepeatSeed,
): Cluster[] {
  const groups = new Map<string, Transaction[]>()
  for (const item of items) {
    if (item.status !== 'posted' || item.source !== 'manual') {
      continue
    }
    if (item.kind !== 'expense' && item.kind !== 'income') {
      continue
    }
    if (!item.categoryId || !inWindow(item.occurredOn, from, asOf)) {
      continue
    }
    if (accountId && item.accountId !== accountId) {
      continue
    }
    if (
      seed &&
      (item.accountId !== seed.accountId ||
        item.kind !== seed.kind ||
        item.amount !== seed.amount ||
        item.categoryId !== seed.categoryId)
    ) {
      continue
    }
    const key = `${item.accountId}|${item.kind}|${item.amount}|${item.categoryId}`
    const list = groups.get(key)
    if (list) {
      list.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  const clusters: Cluster[] = []
  for (const list of groups.values()) {
    const dates = uniqueSortedDates(list)
    if (dates.length < MIN_DATES) {
      continue
    }
    const latest = latestTx(list)
    clusters.push({
      accountId: latest.accountId,
      kind: latest.kind as RepeatKind,
      amount: latest.amount,
      categoryId: latest.categoryId!,
      dates,
      latest,
    })
  }
  return clusters
}

export function detectRepeatSuggestions(
  items: Transaction[],
  input: DetectRepeatInput,
  seed?: RepeatSeed,
): RepeatSuggestion[] {
  const asOf = input.asOf ?? todayLocal()
  const from = windowFrom(asOf)
  const clusters = collectClusters(items, from, asOf, input.accountId, seed)
  return clusters
    .map((cluster) => suggestionForCluster(cluster, input))
    .filter((item): item is RepeatSuggestion => item != null)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

export function detectRepeatSuggestion(
  items: Transaction[],
  input: DetectRepeatInput & { seed: RepeatSeed },
): RepeatSuggestion | null {
  const seed = input.seed
  if (seed.kind !== 'expense' && seed.kind !== 'income') {
    return null
  }
  if (!seed.categoryId) {
    return null
  }
  const asOf = input.asOf ?? todayLocal()
  if (!inWindow(seed.occurredOn, windowFrom(asOf), asOf)) {
    return null
  }
  return detectRepeatSuggestions(items, input, seed)[0] ?? null
}
