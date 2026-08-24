import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import {
  flushAnalytics,
  getErrorMessage,
  isBrowserOnline,
  NETWORK_ERROR_MESSAGE,
  setAnalyticsUser,
  supabase,
} from '@/shared'
import { allowAuthStorageClear, denyAuthStorageClear } from '@/shared/api/authStorage'
import { setWriteBlocked } from '@/shared/lib/syncBus'
import { persistSessionUser, readPersistedSessionUser } from './persist'
import type { SessionUser } from './types'

function readDisplayName(user: User): string {
  const meta = user.user_metadata ?? {}
  const fromMeta =
    typeof meta.display_name === 'string'
      ? meta.display_name.trim()
      : typeof meta.full_name === 'string'
        ? meta.full_name.trim()
        : ''
  if (fromMeta) {
    return fromMeta
  }
  const emailLocal = (user.email ?? '').split('@')[0]?.trim()
  return emailLocal || 'Участник'
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: readDisplayName(user),
  }
}

function isSessionFresh(session: Session | null): boolean {
  if (!session) {
    return false
  }
  const expiresAt = session.expires_at
  return expiresAt == null || expiresAt * 1000 > Date.now() + 15_000
}

function isSessionUsable(session: Session | null): boolean {
  if (!session) {
    return false
  }
  const expiresAt = session.expires_at
  return expiresAt == null || expiresAt * 1000 > Date.now() + 2_000
}

const GET_SESSION_TIMEOUT_MS = 4_000

function timeoutError(message: string, ms: number): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms)
  })
}

async function readLocalSession(): Promise<Session | null> {
  try {
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      timeoutError('Session read timed out', GET_SESSION_TIMEOUT_MS),
    ])
    return data.session
  } catch {
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const ready = ref(false)
  const passwordRecovery = ref(false)
  let authSubscription: { unsubscribe: () => void } | null = null
  let networkAbort: AbortController | null = null
  let loggingOut = false

  const isAuthenticated = computed(() => user.value != null)

  function keepUser(session: Session | null) {
    if (session?.user) {
      user.value = toSessionUser(session.user)
      persistSessionUser(user.value)
      setAnalyticsUser(user.value.id)
      setWriteBlocked(false)
      return
    }
    if (loggingOut) {
      user.value = null
      persistSessionUser(null)
      setAnalyticsUser(null)
      return
    }
    if (!user.value) {
      user.value = readPersistedSessionUser()
    }
    if (user.value) {
      setAnalyticsUser(user.value.id)
    }
  }

  async function ensureFreshSession(): Promise<boolean> {
    const current = await readLocalSession()
    if (isSessionFresh(current) && current) {
      keepUser(current)
      return true
    }
    if (current?.user) {
      keepUser(current)
    }
    if (!isBrowserOnline()) {
      return isSessionUsable(current) || user.value != null
    }
    try {
      const refreshed = await Promise.race([
        supabase.auth.refreshSession(),
        timeoutError('Session refresh timed out', 15_000),
      ])
      if (refreshed.data.session) {
        keepUser(refreshed.data.session)
        return true
      }
    } catch {
      keepUser(current ?? null)
    }
    if (isSessionUsable(current)) {
      keepUser(current)
      return true
    }
    setWriteBlocked(true)
    return false
  }

  function onOffline() {
    void supabase.auth.stopAutoRefresh()
  }

  function onOnline() {
    void supabase.auth.startAutoRefresh()
    void ensureFreshSession()
  }

  async function init() {
    if (ready.value) {
      return
    }

    user.value = readPersistedSessionUser()
    if (user.value) {
      setAnalyticsUser(user.value.id)
    }

    const session = await readLocalSession()
    keepUser(session)

    if (isBrowserOnline()) {
      void supabase.auth.startAutoRefresh()
      void ensureFreshSession()
    } else {
      void supabase.auth.stopAutoRefresh()
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !loggingOut) {
        keepUser(null)
        return
      }
      keepUser(session)
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecovery.value = true
      }
    })
    authSubscription = listener.subscription

    networkAbort?.abort()
    networkAbort = new AbortController()
    window.addEventListener('offline', onOffline, { signal: networkAbort.signal })
    window.addEventListener('online', onOnline, { signal: networkAbort.signal })

    ready.value = true
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      throw new Error(getErrorMessage(error, 'Не удалось войти'))
    }
    keepUser(data.session)
    void supabase.auth.startAutoRefresh()
  }

  async function register(email: string, password: string, displayName: string) {
    const name = displayName.trim()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          display_name: name,
        },
      },
    })
    if (error) {
      throw new Error(getErrorMessage(error, 'Не удалось создать аккаунт'))
    }
    if (!data.session) {
      throw new Error('Подтвердите email по ссылке из письма, затем войдите')
    }
    keepUser(data.session)
    void supabase.auth.startAutoRefresh()
  }

  async function logout() {
    loggingOut = true
    await flushAnalytics()
    allowAuthStorageClear()
    try {
      if (isBrowserOnline()) {
        try {
          await Promise.race([
            supabase.auth.signOut(),
            new Promise<never>((_, reject) => {
              window.setTimeout(() => reject(new Error(NETWORK_ERROR_MESSAGE)), 4000)
            }),
          ])
        } catch {
          // local sign-out below
        }
      }
      await supabase.auth.signOut({ scope: 'local' })
    } finally {
      denyAuthStorageClear()
      user.value = null
      persistSessionUser(null)
      setAnalyticsUser(null)
      passwordRecovery.value = false
      setWriteBlocked(false)
      loggingOut = false
    }
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: new URL('reset-password', `${window.location.origin}${import.meta.env.BASE_URL}`).href,
    })
    if (error) {
      throw new Error(getErrorMessage(error, 'Не удалось отправить письмо'))
    }
  }

  async function updatePassword(password: string) {
    if (password.length < 6) {
      throw new Error('Пароль должен быть не короче 6 символов')
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      throw new Error(getErrorMessage(error, 'Не удалось обновить пароль'))
    }
    passwordRecovery.value = false
  }

  async function updateDisplayName(displayName: string) {
    const name = displayName.trim()
    if (!name) {
      throw new Error('Укажите имя')
    }
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: name,
      },
    })
    if (error) {
      throw new Error(getErrorMessage(error, 'Не удалось обновить имя'))
    }
    if (data.user) {
      user.value = toSessionUser(data.user)
      persistSessionUser(user.value)
      return
    }
    if (user.value) {
      user.value = { ...user.value, displayName: name }
      persistSessionUser(user.value)
    }
  }

  function dispose() {
    authSubscription?.unsubscribe()
    authSubscription = null
    networkAbort?.abort()
    networkAbort = null
  }

  return {
    user,
    ready,
    passwordRecovery,
    isAuthenticated,
    init,
    ensureFreshSession,
    login,
    register,
    logout,
    requestPasswordReset,
    updatePassword,
    updateDisplayName,
    dispose,
  }
})
