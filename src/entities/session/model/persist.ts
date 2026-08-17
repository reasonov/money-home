import type { SessionUser } from './types'

export const SESSION_USER_KEY = 'money-home.session-user'
export const LAST_USER_KEY = 'money-home.last-user'

export function persistSessionUser(user: SessionUser | null): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  if (!user) {
    localStorage.removeItem(SESSION_USER_KEY)
    localStorage.removeItem(LAST_USER_KEY)
    return
  }
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
  localStorage.setItem(LAST_USER_KEY, user.id)
}

export function readPersistedSessionUser(): SessionUser | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<SessionUser>
    if (typeof parsed.id !== 'string' || !parsed.id) {
      return null
    }
    return {
      id: parsed.id,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : 'Участник',
    }
  } catch {
    return null
  }
}
