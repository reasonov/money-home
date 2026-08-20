import { ref } from 'vue'

const dismissedKeys = ref<string[]>([])
let boundUserId = ''

function storageKey(userId: string) {
  return `money-home.repeat-dismissed.${userId}`
}

function readKeys(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeKeys(userId: string, keys: string[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}

export function bindRepeatDismissed(userId: string) {
  if (boundUserId === userId) {
    return
  }
  boundUserId = userId
  dismissedKeys.value = readKeys(userId)
}

export function dismissRepeatKey(key: string) {
  if (!boundUserId) {
    return
  }
  const next = dismissedKeys.value.includes(key) ? dismissedKeys.value : [...dismissedKeys.value, key]
  dismissedKeys.value = next
  writeKeys(boundUserId, next)
}

export { dismissedKeys }
