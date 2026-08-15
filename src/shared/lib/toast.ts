import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
const ticket = ref(0)
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useToastState() {
  return { message, visible, ticket }
}

export function showToast(text: string, durationMs = 2200) {
  message.value = text
  visible.value = true
  ticket.value += 1
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
  hideTimer = setTimeout(() => {
    visible.value = false
  }, durationMs)
}

export function hideToast() {
  visible.value = false
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}
