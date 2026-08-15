import { describe, expect, it } from 'vitest'
import { sanitizeAmountInput } from '../parseAmount'

describe('sanitizeAmountInput', () => {
  it('rejects leading zeros', () => {
    expect(sanitizeAmountInput('012')).toBe('12')
    expect(sanitizeAmountInput('000')).toBe('0')
    expect(sanitizeAmountInput('0')).toBe('0')
  })

  it('keeps empty and non-numeric as empty', () => {
    expect(sanitizeAmountInput('')).toBe('')
    expect(sanitizeAmountInput('abc')).toBe('')
  })

  it('strips separators and keeps a valid amount', () => {
    expect(sanitizeAmountInput('1 500')).toBe('1500')
    expect(sanitizeAmountInput('1,200')).toBe('1200')
    expect(sanitizeAmountInput('100')).toBe('100')
    expect(sanitizeAmountInput('10')).toBe('10')
  })
})
