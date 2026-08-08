import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { getErrorMessage, supabase } from '@/shared'
import type { SessionUser } from './types'

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email ?? '',
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

  async function register(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
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
    dispose,
  }
})
