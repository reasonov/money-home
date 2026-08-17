import { describe, expect, it } from 'vitest'
import { parseLocalDate } from '../dates'
import { dueKey, ruleDueDates } from '../dueDates'

describe('ruleDueDates', () => {
  it('includes both ends of a weekly range', () => {
    const dates = ruleDueDates(
      { frequency: 'weekly', weekday: 1, active: true },
      parseLocalDate('2026-08-10'),
      parseLocalDate('2026-08-24'),
    )
    expect(dates).toEqual(['2026-08-10', '2026-08-17', '2026-08-24'])
  })

  it('includes today for a monthly rule', () => {
    const dates = ruleDueDates(
      { frequency: 'monthly', monthDay: 17, active: true },
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-17'),
    )
    expect(dates).toEqual(['2026-08-17'])
  })

  it('skips inactive rules', () => {
    expect(
      ruleDueDates(
        { frequency: 'weekly', weekday: 1, active: false },
        parseLocalDate('2026-08-10'),
        parseLocalDate('2026-08-24'),
      ),
    ).toEqual([])
  })
})

describe('dueKey', () => {
  it('builds a stable key', () => {
    expect(dueKey('income', 'rule-1', '2026-08-17')).toBe('income:rule-1:2026-08-17')
  })
})
