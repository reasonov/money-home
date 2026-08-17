import { beforeEach, describe, expect, it } from 'vitest'
import { persistSessionUser, readPersistedSessionUser, SESSION_USER_KEY } from '../persist'

describe('session persist', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a session user', () => {
    persistSessionUser({ id: 'u1', email: 'a@b.c', displayName: 'Анна' })
    expect(readPersistedSessionUser()).toEqual({
      id: 'u1',
      email: 'a@b.c',
      displayName: 'Анна',
    })
  })

  it('ignores invalid json', () => {
    localStorage.setItem(SESSION_USER_KEY, '{')
    expect(readPersistedSessionUser()).toBeNull()
  })

  it('clears storage on logout', () => {
    persistSessionUser({ id: 'u1', email: 'a@b.c', displayName: 'Анна' })
    persistSessionUser(null)
    expect(readPersistedSessionUser()).toBeNull()
  })
})
