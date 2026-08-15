import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  detectInstallPlatform,
  isIosSafari,
  isStandaloneDisplay,
  type InstallPlatform,
} from './detect'
import { dismissInstallHint, isInstallHintDismissed } from './dismissed'
import { deferredInstallPrompt, promptInstall } from './installPrompt'

export function useInstallHint() {
  const platform = ref<InstallPlatform | null>(null)
  const safari = ref(false)
  const standalone = ref(false)
  const dismissed = ref(false)
  let cleanup: (() => void) | undefined

  function refresh() {
    if (typeof navigator === 'undefined') {
      return
    }
    const nav = navigator as Navigator & { standalone?: boolean }
    const nextPlatform = detectInstallPlatform(nav)
    platform.value = nextPlatform
    safari.value = isIosSafari(nav, nextPlatform)
    standalone.value = isStandaloneDisplay(nav, window.matchMedia.bind(window))
  }

  onMounted(() => {
    dismissed.value = isInstallHintDismissed()
    refresh()

    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener('change', refresh)
    cleanup = () => {
      media.removeEventListener('change', refresh)
    }
  })

  onUnmounted(() => {
    cleanup?.()
  })

  const visible = computed(
    () => Boolean(platform.value) && !standalone.value && !dismissed.value,
  )
  const canPrompt = computed(() => platform.value === 'android' && Boolean(deferredInstallPrompt.value))

  function dismiss() {
    dismissed.value = true
    dismissInstallHint()
  }

  async function install() {
    const accepted = await promptInstall()
    if (accepted) {
      dismiss()
    }
  }

  return {
    visible,
    platform,
    safari,
    canPrompt,
    dismiss,
    install,
  }
}
