import { addDays, compareDates, formatLocalDate, parseLocalDate } from './dates'
import type { IncomeFrequency } from './projectBalance'

export interface DueRule {
  frequency: IncomeFrequency
  weekday?: number
  monthDay?: number
  anchorDate?: string
  active: boolean
  startsOn?: string
}

function collectMonthlyDates(monthDay: number, from: Date, to: Date): Date[] {
  const dates: Date[] = []
  let year = from.getFullYear()
  let month = from.getMonth()

  for (let i = 0; i < 48; i += 1) {
    const candidate = new Date(year, month, monthDay)
    if (compareDates(candidate, from) >= 0 && compareDates(candidate, to) <= 0) {
      dates.push(candidate)
    }
    if (compareDates(candidate, to) > 0) {
      break
    }
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  return dates
}

function collectWeeklyDates(weekday: number, from: Date, to: Date): Date[] {
  const dates: Date[] = []
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())

  while (compareDates(cursor, to) <= 0) {
    if (cursor.getDay() === weekday) {
      dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    }
    cursor = addDays(cursor, 1)
  }

  return dates
}

function collectBiweeklyDates(anchorDate: string, from: Date, to: Date): Date[] {
  const dates: Date[] = []
  let cursor = parseLocalDate(anchorDate)

  while (compareDates(cursor, from) < 0) {
    cursor = addDays(cursor, 14)
  }

  while (compareDates(cursor, to) <= 0) {
    dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    cursor = addDays(cursor, 14)
  }

  return dates
}

export function ruleDueDates(rule: DueRule, fromInclusive: Date, toInclusive: Date): string[] {
  if (!rule.active) {
    return []
  }

  let dates: Date[] = []
  if (rule.frequency === 'monthly' && rule.monthDay != null) {
    dates = collectMonthlyDates(rule.monthDay, fromInclusive, toInclusive)
  } else if (rule.frequency === 'weekly' && rule.weekday != null) {
    dates = collectWeeklyDates(rule.weekday, fromInclusive, toInclusive)
  } else if (rule.frequency === 'biweekly' && rule.anchorDate) {
    dates = collectBiweeklyDates(rule.anchorDate, fromInclusive, toInclusive)
  }

  return dates
    .map((date) => formatLocalDate(date))
    .filter((iso) => !rule.startsOn || iso >= rule.startsOn)
}

export function dueKey(kind: 'income' | 'expense' | 'transfer', ruleId: string, occurredOn: string): string {
  return `${kind}:${ruleId}:${occurredOn}`
}
