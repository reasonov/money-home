let sessionClearAllowed = false

export function allowAuthStorageClear(): void {
  sessionClearAllowed = true
}

export function denyAuthStorageClear(): void {
  sessionClearAllowed = false
}

export const authStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(key)
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value)
  },
  removeItem(key: string): void {
    if (!sessionClearAllowed) {
      return
    }
    localStorage.removeItem(key)
  },
}
