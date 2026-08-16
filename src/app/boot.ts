import { ref } from 'vue'

export const bootError = ref<string | null>(null)

export function setBootError(message: string) {
  bootError.value = message
}

export function retryBoot() {
  window.location.reload()
}
