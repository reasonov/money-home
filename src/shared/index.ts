export {
  supabase,
  getErrorMessage,
  NETWORK_ERROR_MESSAGE,
  OFFLINE_NO_DATA_MESSAGE,
  isUniqueViolation,
  type Database,
  type Json,
} from './api'
export { APP_VERSION } from './config/version'
export {
  NAV_ITEMS,
  NAV_ITEM_BY_ID,
  NAV_ITEM_IDS,
  SIDEBAR_SECTION_IDS,
  DEFAULT_BOTTOM_NAV,
  DEFAULT_SIDEBAR_SECTIONS,
  MAX_SIDEBAR_ACCOUNTS,
  BOTTOM_NAV_SLOT_COUNT,
  assignBottomNavSlot,
  normalizeBottomNav,
  normalizeSidebarSections,
  parseAccountOrder,
  parseSidebarAccountIds,
  sortAccountsByOrder,
  resolveSidebarAccounts,
  resolvePinnedAccountIds,
  isNavItemId,
  isSidebarSectionId,
  type NavItemId,
  type SidebarSectionId,
  type NavItem,
} from './config/appNav'
export { usePointerDrag } from './lib/usePointerDrag'
export { usePointerReorder, moveItem } from './lib/usePointerReorder'
export type { DragGhost } from './lib/pointerDrag'
export { formatMoney, formatMoneyPlain } from './lib/formatMoney'
export { roundMoney, floorMoney } from './lib/parseAmount'
export {
  parseLocalDate,
  formatLocalDate,
  todayLocal,
  formatDisplayDate,
  formatShortDate,
  formatNumericDate,
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
  transferProjectionForAccount,
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
export {
  planSavingsGoals,
  SAVINGS_AVERAGE_WINDOW_DAYS,
  SAVINGS_DAYS_PER_MONTH,
  type SavingsPlanGoalInput,
  type SavingsPlanInput,
  type SavingsPlanResult,
  type SavingsPlanTransaction,
  type SavingsGoalPlan,
} from './lib/planSavingsGoals'
export { createId, createInviteCode, createUuid } from './lib/id'
export {
  assertOnline,
  assertWritable,
  enqueueMutation,
  isBrowserOnline,
  isWriteBlocked,
  refreshOnlineStatus,
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
  readDocumentTheme,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
  type ResolvedTheme,
} from './lib/theme'
export { sidebarOpen, openSidebar, closeSidebar, toggleSidebar } from './lib/sidebar'
export {
  formDrawer,
  formDrawerOpen,
  lastFormDrawerCloseReason,
  openFormDrawer,
  closeFormDrawer,
  type FormDrawer,
  type FormDrawerCloseReason,
  type RuleFormDraft,
} from './lib/formDrawers'
export { track, flushAnalytics, setAnalyticsUser, trackSessionStart } from './lib/analytics'
export {
  naiveThemeOverrides,
  AppButton,
  AppInput,
  AppInputNumber,
  AppTextarea,
  AppSelect,
  AppField,
  AppHelpTip,
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
  AppDragGhost,
} from './ui'
