import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useToastState() {
  return { message, visible }
}

export function showToast(text: string, durationMs = 2200) {
  message.value = text
  visible.value = true
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
  hideTimer = setTimeout(() => {
    visible.value = false
  }, durationMs)
}
