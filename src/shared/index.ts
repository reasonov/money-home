export { supabase, getErrorMessage, type Database } from './api'
export { APP_VERSION } from './config/version'
export { formatMoney, formatMoneyPlain } from './lib/formatMoney'
export {
  parseLocalDate,
  formatLocalDate,
  todayLocal,
  formatDisplayDate,
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
  type ProjectBalanceInput,
  type ProjectBalanceResult,
  type AvailableUntilNextIncomeInput,
  type AvailableUntilNextIncomeResult,
  type PlannedBeforeTargetItem,
  type ProjectionIncomeRule,
  type ProjectionPurchase,
  type IncomeFrequency,
} from './lib/projectBalance'
export { createId, createInviteCode } from './lib/id'
export { showToast, useToastState } from './lib/toast'
export { confirmAction, useConfirmState, settleConfirm } from './lib/confirm'
export {
  applyTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
  type ResolvedTheme,
} from './lib/theme'
export {
  AppButton,
  AppInput,
  AppTextarea,
  AppSelect,
  AppField,
  AppBanner,
  AppDrawer,
  AppSkeleton,
  AppToastHost,
  AppConfirmDialog,
  SwipeReveal,
} from './ui'
