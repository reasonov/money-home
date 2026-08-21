import { isBrowserOnline, ONLINE_ONLY_MESSAGE, openFormDrawer, showToast } from '@/shared'

export function openSavingsAdvice(accountId: string, goalId: string) {
  if (!isBrowserOnline()) {
    showToast(ONLINE_ONLY_MESSAGE)
    return
  }
  openFormDrawer({ name: 'savings-advice', accountId, goalId })
}
