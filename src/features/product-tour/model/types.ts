export const TOUR_STEP_IDS = [
  'home-accounts',
  'account-form',
  'nav-settings',
  'settings-theme',
  'settings-categories',
  'category-expense',
  'category-income',
  'cta-expense',
  'expense-form',
  'cta-income',
  'income-form',
  'home-account',
  'account-share',
  'settings-income',
  'income-rules',
  'nav-calendar',
  'calendar-cta',
  'purchase-form',
] as const

export type TourStepId = (typeof TOUR_STEP_IDS)[number]
export type TourStatus = 'idle' | 'active' | 'done'
export type TourMode = 'onboarding' | 'replay'
export type TourAdvanceOn = 'click' | 'submit' | 'next'

export type TourContext = {
  accountCount: number
  expenseCategoryCount: number
  incomeCategoryCount: number
  expenseCount: number
  incomeCount: number
  firstAccountId: string | null
  path: string
  mode: TourMode
}

export type TourStepDef = {
  id: TourStepId
  match: (path: string) => boolean
  selector: string
  title: string
  description: string
  advanceOn: TourAdvanceOn
  skipIf: (ctx: TourContext) => boolean
  to?: string | ((ctx: TourContext) => string | undefined)
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  nextLabel?: string
  dock?: 'bottom' | 'top'
  openSidebar?: boolean
}

export type PersistedTour = {
  status: TourStatus
  step: TourStepId
  mode: TourMode
}
