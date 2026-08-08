import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { getErrorMessage, supabase } from '@/shared'
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

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const ready = ref(false)
  let authSubscription: { unsubscribe: () => void } | null = null

  const isAuthenticated = computed(() => user.value != null)

  function applySession(session: Session | null) {
    user.value = session?.user ? toSessionUser(session.user) : null
  }

  async function init() {
    if (ready.value) {
      return
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error(error)
    }
    applySession(data.session)

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })
    authSubscription = listener.subscription
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
    applySession(data.session)
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
    applySession(data.session)
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(getErrorMessage(error, 'Не удалось выйти'))
    }
    user.value = null
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
      return
    }
    if (user.value) {
      user.value = { ...user.value, displayName: name }
    }
  }

  function dispose() {
    authSubscription?.unsubscribe()
    authSubscription = null
  }

  return {
    user,
    ready,
    isAuthenticated,
    init,
    login,
    register,
    logout,
    updateDisplayName,
    dispose,
  }
})
