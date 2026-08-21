import { describe, expect, it } from 'vitest'
import { floorMoney, roundMoney, sanitizeAmountInput } from '../parseAmount'

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

  it('strips thousands separators and keeps a valid amount', () => {
    expect(sanitizeAmountInput('1 500')).toBe('1500')
    expect(sanitizeAmountInput('100')).toBe('100')
    expect(sanitizeAmountInput('10')).toBe('10')
  })

  it('keeps up to two decimal digits', () => {
    expect(sanitizeAmountInput('10,5')).toBe('10.5')
    expect(sanitizeAmountInput('10.50')).toBe('10.50')
    expect(sanitizeAmountInput('1 500,50')).toBe('1500.50')
    expect(sanitizeAmountInput('1,234')).toBe('1.23')
    expect(sanitizeAmountInput('00,05')).toBe('0.05')
    expect(sanitizeAmountInput(',5')).toBe('0.5')
    expect(sanitizeAmountInput('.5')).toBe('0.5')
  })

  it('keeps a trailing decimal separator while typing', () => {
    expect(sanitizeAmountInput('10,')).toBe('10.')
    expect(sanitizeAmountInput('10.')).toBe('10.')
  })
})

describe('roundMoney', () => {
  it('rounds to kopecks', () => {
    expect(roundMoney(10.5)).toBe(10.5)
    expect(roundMoney(10.554)).toBe(10.55)
    expect(roundMoney(10.555)).toBe(10.56)
    expect(roundMoney(10)).toBe(10)
  })
})

describe('floorMoney', () => {
  it('floors to kopecks', () => {
    expect(floorMoney(10.509)).toBe(10.5)
    expect(floorMoney(10.5)).toBe(10.5)
    expect(floorMoney(10)).toBe(10)
  })
})
