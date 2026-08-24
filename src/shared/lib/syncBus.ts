import { addOutbox } from './localDb'

export const ONLINE_ONLY_MESSAGE = 'Нужен интернет для этого действия'
export const WRITE_BLOCKED_MESSAGE = 'Сессия истекла. Войдите, когда появится сеть'

type AsyncHandler = () => Promise<void>

let syncHandler: AsyncHandler | null = null
let persistHandler: AsyncHandler | null = null
let pendingHandler: AsyncHandler | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let writeBlocked = false
let listenersBound = false

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true
  }
  return navigator.onLine !== false
}

export async function refreshOnlineStatus(): Promise<boolean> {
  return isBrowserOnline()
}

export function setWriteBlocked(value: boolean): void {
  writeBlocked = value
}

export function isWriteBlocked(): boolean {
  return writeBlocked
}

export function assertWritable(): void {}

export function assertOnline(): void {
  if (!isBrowserOnline()) {
    throw new Error(ONLINE_ONLY_MESSAGE)
  }
}

export function registerSyncHandler(handler: AsyncHandler): void {
  syncHandler = handler
}

export function registerPersistHandler(handler: AsyncHandler): void {
  persistHandler = handler
}

export function registerPendingHandler(handler: AsyncHandler): void {
  pendingHandler = handler
}

export function requestPersist(): void {
  if (!persistHandler) {
    return
  }
  if (persistTimer) {
    clearTimeout(persistTimer)
  }
  persistTimer = setTimeout(() => {
    persistTimer = null
    void persistHandler?.()
  }, 50)
}

export function requestSync(): void {
  void pendingHandler?.()
  if (!syncHandler) {
    return
  }
  if (syncTimer) {
    clearTimeout(syncTimer)
  }
  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncHandler?.()
  }, 100)
}

export function startNetworkListeners(): void {
  if (listenersBound || typeof window === 'undefined') {
    return
  }
  listenersBound = true
  window.addEventListener('online', () => {
    requestSync()
  })
  window.addEventListener('offline', () => {
    requestSync()
  })
}

export async function enqueueMutation(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
  entityId?: string,
): Promise<void> {
  assertWritable()
  await addOutbox({
    userId,
    type,
    payload,
    ...(entityId ? { entityId } : {}),
    createdAt: Date.now(),
  })
  requestPersist()
  requestSync()
}
