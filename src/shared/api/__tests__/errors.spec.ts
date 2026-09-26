import { describe, expect, it } from 'vitest'
import { shouldDropOutboxItem } from '../../lib/conflicts'
import { getErrorMessage } from '../errors'

describe('getErrorMessage', () => {
  it('keeps an already translated message', () => {
    expect(getErrorMessage(new Error('Операция не найдена'))).toBe('Операция не найдена')
    expect(getErrorMessage(new Error('Не удалось сохранить операцию'))).toBe(
      'Не удалось сохранить операцию',
    )
  })

  it('maps a raw conflict and still drops it after a second pass', () => {
    const translated = getErrorMessage({ message: 'Transaction not found' }, 'Не удалось удалить операцию')
    expect(translated).toBe('Операция не найдена')
    expect(shouldDropOutboxItem(getErrorMessage(new Error(translated)))).toBe(true)
  })

  it('hides an unknown server message behind the fallback', () => {
    expect(getErrorMessage({ message: 'duplicate key value' }, 'Не удалось сохранить операцию')).toBe(
      'Не удалось сохранить операцию',
    )
  })
})
