import { readonly, ref } from 'vue'
import { track } from '@/shared'

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferred = ref<BeforeInstallPromptEvent | null>(null)

export const deferredInstallPrompt = readonly(deferred)

export function listenForInstallPrompt() {
  if (typeof window === 'undefined') {
    return
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred.value = event as BeforeInstallPromptEvent
  })

  window.addEventListener('appinstalled', () => {
    deferred.value = null
    track('pwa_installed', { source: 'browser' })
  })
}

export async function promptInstall(): Promise<boolean> {
  const event = deferred.value
  if (!event) {
    return false
  }
  await event.prompt()
  const { outcome } = await event.userChoice
  deferred.value = null
  return outcome === 'accepted'
}
