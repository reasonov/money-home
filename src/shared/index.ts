export {
  supabase,
  getErrorMessage,
  NETWORK_ERROR_MESSAGE,
  isUniqueViolation,
  type Database,
} from './api'
export { APP_VERSION } from './config/version'
export { formatMoney, formatMoneyPlain } from './lib/formatMoney'
export {
  parseLocalDate,
  formatLocalDate,
  todayLocal,
  formatDisplayDate,
  formatShortDate,
  formatRelativeDisplayDate,
  isPastDate,
  addDays,
  compareDates,
} from './lib/dates'
export {
  projectBalance,
  incomeOccurrences,
  findNextAffordableDate,
  findNextIncomeDate,
  availableUntilNextIncome,
  formatProjectionDate,
  suggestTransfer,
  type ProjectBalanceInput,
  type ProjectBalanceResult,
  type AvailableUntilNextIncomeInput,
  type AvailableUntilNextIncomeResult,
  type PlannedBeforeTargetItem,
  type ProjectionIncomeRule,
  type ProjectionPurchase,
  type IncomeFrequency,
  type TransferCandidateAccount,
  type TransferSuggestion,
  forecastBalanceSeries,
  type ForecastSlice,
} from './lib/projectBalance'
export { createId, createInviteCode, createUuid } from './lib/id'
export {
  assertOnline,
  assertWritable,
  enqueueMutation,
  isBrowserOnline,
  isWriteBlocked,
  ONLINE_ONLY_MESSAGE,
  registerPendingHandler,
  registerPersistHandler,
  registerSyncHandler,
  requestPersist,
  requestSync,
  startNetworkListeners,
  WRITE_BLOCKED_MESSAGE,
} from './lib/syncBus'
export { dueKey, ruleDueDates, type DueRule } from './lib/dueDates'
export {
  accountBalanceAfterDelta,
  isConflictSyncError,
  isRetryableSyncError,
  purchaseConflictMessage,
} from './lib/conflicts'
export { showToast, hideToast, useToastState } from './lib/toast'
export { confirmAction, useConfirmState, settleConfirm } from './lib/confirm'
export {
  applyTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
  type ResolvedTheme,
} from './lib/theme'
export { sidebarOpen, openSidebar, closeSidebar, toggleSidebar } from './lib/sidebar'
export {
  formDrawer,
  formDrawerOpen,
  openFormDrawer,
  closeFormDrawer,
  type FormDrawer,
} from './lib/formDrawers'
export {
  naiveThemeOverrides,
  AppButton,
  AppInput,
  AppInputNumber,
  AppTextarea,
  AppSelect,
  AppField,
  AppBanner,
  AppDrawer,
  AppSkeleton,
  AppToastHost,
  AppConfirmDialog,
  AppEmpty,
  AppTag,
  AppCheckbox,
  AppSwitch,
  AppSegmented,
  AppPeriodSelect,
  SwipeReveal,
} from './ui'
