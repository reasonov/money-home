export const TOUR_STEP_IDS = [
  'home-create',
  'home-balance',
  'home-upcoming',
  'home-cta',
  'nav-expense',
  'home-chart',
  'header-account',
  'header-inbox',
  'header-menu',
  'history',
  'savings',
  'calendar-cta',
  'stats-chart',
  'categories',
  'account-share',
] as const

export type TourStepId = (typeof TOUR_STEP_IDS)[number]
export type TourStatus = 'idle' | 'active' | 'done'

export type TourContext = {
  accountCount: number
  firstAccountId: string | null
  hasUpcoming: boolean
  path: string
}

export type TourStepDef = {
  id: TourStepId
  match: (path: string) => boolean
  selector: string
  title: string
  description: string
  skipIf: (ctx: TourContext) => boolean
  to?: string | ((ctx: TourContext) => string | undefined)
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  nextLabel?: string
}

export type PersistedTour = {
  status: TourStatus
  step: TourStepId
}
