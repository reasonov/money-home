import {
  bootstrapFromNetwork,
  loadAccountData,
  startAccountRealtime,
  stopAccountRealtime,
} from '@/entities/account/lib/accountSync'
import { useSessionStore } from '@/entities/session'
import { usePreferencesStore } from '@/entities/preferences'
import { useTransactionStore } from '@/entities/transaction'
import {
  getErrorMessage,
  isRetryableSyncError,
  refreshOnlineStatus,
  registerPendingHandler,
  registerPersistHandler,
  registerSyncHandler,
  showToast,
  startNetworkListeners,
  todayLocal,
} from '@/shared'
import { listOutbox, outboxEntityIds, removeOutbox } from '@/shared/lib/localDb'
import { applyOutboxItem } from './outboxDrain'
import { persistReplica, tryHydrateReplica } from './replica'
import { applyDueSimulation } from './simulateDue'
import { clearSkippedDueKeys } from '@/shared/lib/offlineMeta'
import { useSyncStore } from '../model/store'

let runtimeStarted = false
let syncing = false

export async function refreshPendingState(): Promise<void> {
  const session = useSessionStore()
  const sync = useSyncStore()
  const userId = session.user?.id
  sync.online = await refreshOnlineStatus()
  if (!sync.online && sync.status !== 'syncing') {
    sync.status = 'offline'
  }
  if (!userId) {
    sync.pendingCount = 0
    sync.pendingIds = []
    return
  }
  const items = await listOutbox(userId)
  sync.pendingCount = items.length
  sync.pendingIds = await outboxEntityIds(userId)
}

export async function persistCurrentReplica(): Promise<void> {
  const userId = useSessionStore().user?.id
  if (!userId) {
    return
  }
  await persistReplica(userId)
}

export async function runSync(): Promise<void> {
  const session = useSessionStore()
  const sync = useSyncStore()
  const userId = session.user?.id
  await refreshPendingState()
  if (!userId) {
    return
  }
  if (!sync.online) {
    stopAccountRealtime()
    sync.status = 'offline'
    applyDueSimulation()
    return
  }
  if (!(await session.ensureFreshSession())) {
    stopAccountRealtime()
    sync.status = (await refreshOnlineStatus()) ? 'readonly' : 'offline'
    applyDueSimulation()
    return
  }
  if (syncing) {
    return
  }
  syncing = true
  sync.status = 'syncing'
  try {
    const items = await listOutbox(userId)
    for (const item of items) {
      try {
        await applyOutboxItem(item)
        if (item.seq != null) {
          await removeOutbox(item.seq)
        }
      } catch (error) {
        const message = getErrorMessage(error)
        if (!(await refreshOnlineStatus()) || isRetryableSyncError(message)) {
          throw error
        }
        showToast(message)
        if (item.seq != null) {
          await removeOutbox(item.seq)
        }
      }
    }
    await useTransactionStore().applyDue(todayLocal())
    await usePreferencesStore().syncWithServer()
    await loadAccountData()
    startAccountRealtime()
    clearSkippedDueKeys()
    await persistReplica(userId)
    sync.status = 'idle'
    sync.lastError = null
  } catch (error) {
    const message = getErrorMessage(error)
    if (!(await refreshOnlineStatus())) {
      stopAccountRealtime()
      sync.status = 'offline'
      applyDueSimulation()
    } else {
      sync.status = 'error'
      sync.lastError = message
    }
  } finally {
    syncing = false
    await refreshPendingState()
  }
}

export function initOfflineRuntime(): void {
  if (runtimeStarted) {
    return
  }
  runtimeStarted = true
  registerSyncHandler(runSync)
  registerPersistHandler(persistCurrentReplica)
  registerPendingHandler(refreshPendingState)
  startNetworkListeners()
}

let bootstrapInFlight: { userId: string; promise: Promise<void> } | null = null

export async function bootstrapAccountSession(): Promise<void> {
  const userId = useSessionStore().user?.id
  if (!userId) {
    return
  }
  if (bootstrapInFlight?.userId === userId) {
    return bootstrapInFlight.promise
  }
  const promise = (async () => {
    initOfflineRuntime()
    usePreferencesStore().hydrateLocal(userId)
    const hydrated = await tryHydrateReplica(userId)
    if (hydrated) {
      applyDueSimulation()
      void runSync()
      return
    }
    await bootstrapFromNetwork()
    await persistReplica(userId)
  })().finally(() => {
    if (bootstrapInFlight?.promise === promise) {
      bootstrapInFlight = null
    }
  })
  bootstrapInFlight = { userId, promise }
  return promise
}

export async function bootstrapOfflineFirst(): Promise<boolean> {
  const userId = useSessionStore().user?.id
  if (!userId) {
    return false
  }
  initOfflineRuntime()
  usePreferencesStore().hydrateLocal(userId)
  const hydrated = await tryHydrateReplica(userId)
  if (hydrated) {
    applyDueSimulation()
    void runSync()
    return true
  }
  return false
}
