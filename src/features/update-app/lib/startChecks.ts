import type { Pinia } from 'pinia'
import { useAppUpdateStore } from '../model/store'

export function startAppUpdateChecks(pinia: Pinia) {
  const store = useAppUpdateStore(pinia)
  void store.check()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void store.check()
    }
  })
  window.addEventListener('online', () => {
    void store.check()
  })
}
