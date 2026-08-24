import { supabase } from '../api/supabase'
import { isUniqueViolation } from '../api/errors'
import { createUuid } from './id'
import {
  addAnalyticsEvent,
  listAnalyticsEvents,
  removeAnalyticsEvents,
  type AnalyticsEventRecord,
} from './localDb'
import { isBrowserOnline } from './syncBus'

export const ANALYTICS_EVENT_NAMES = [
  'screen_view',
  'session_start',
  'form_opened',
  'form_submitted',
  'form_dismissed',
  'purchase_projection_refused',
  'transfer_suggestion_clicked',
  'tour_completed',
  'tour_skipped',
  'pwa_installed',
  'parse_line_shown',
  'parse_line_applied',
  'stats_advice_opened',
  'sync_error',
  'sync_retry',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]

export type AnalyticsProps = {
  screen?: string
  source?: string
  online?: boolean
  standalone?: boolean
  form?: string
  outcome?: string
  step?: number
  kind?: string
}

const PROP_KEYS = [
  'screen',
  'source',
  'online',
  'standalone',
  'form',
  'outcome',
  'step',
  'kind',
] as const

const EVENT_NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES)

const FLUSH_DELAY_MS = 2500
const FLUSH_BATCH = 80

let analyticsUserId: string | null = null
let flushing = false
let flushTimer: number | null = null
let sessionTracked = false

export function setAnalyticsUser(userId: string | null) {
  if (analyticsUserId !== userId) {
    sessionTracked = false
  }
  analyticsUserId = userId
}

export function getAnalyticsUser(): string | null {
  return analyticsUserId
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  )
}

function sanitizeProps(props?: AnalyticsProps): Record<string, string | number | boolean> {
  const next: Record<string, string | number | boolean> = {
    online: isBrowserOnline(),
    standalone: isStandalone(),
  }
  if (!props) {
    return next
  }
  for (const key of PROP_KEYS) {
    const value = props[key]
    if (value == null) {
      continue
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      if (Number.isFinite(value)) {
        next[key] = value
      }
      continue
    }
    if (typeof value === 'string') {
      const trimmed = value.trim().slice(0, 64)
      if (trimmed) {
        next[key] = trimmed
      }
    }
  }
  return next
}

function scheduleFlush() {
  if (typeof window === 'undefined' || flushTimer != null) {
    return
  }
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushAnalytics()
  }, FLUSH_DELAY_MS)
}

export function track(name: AnalyticsEventName, props?: AnalyticsProps): void {
  const userId = analyticsUserId
  if (!userId || !EVENT_NAME_SET.has(name)) {
    return
  }
  const record: AnalyticsEventRecord = {
    id: createUuid(),
    userId,
    name,
    props: sanitizeProps(props),
    createdAt: Date.now(),
  }
  void addAnalyticsEvent(record).then(() => {
    if (isBrowserOnline()) {
      scheduleFlush()
    }
  })
}

export function trackSessionStart(): void {
  if (sessionTracked || !analyticsUserId) {
    return
  }
  sessionTracked = true
  track('session_start')
}

export async function flushAnalytics(): Promise<void> {
  const userId = analyticsUserId
  if (!userId || flushing || !isBrowserOnline()) {
    return
  }
  flushing = true
  try {
    const items = await listAnalyticsEvents(userId)
    if (!items.length) {
      return
    }
    const batch = items.slice(0, FLUSH_BATCH)
    const { error } = await supabase.from('app_events').upsert(
      batch.map((item) => ({
        id: item.id,
        user_id: item.userId,
        name: item.name,
        props: item.props,
        created_at: new Date(item.createdAt).toISOString(),
      })),
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (error && !isUniqueViolation(error)) {
      return
    }
    await removeAnalyticsEvents(batch.map((item) => item.id))
    if (items.length > batch.length) {
      flushing = false
      await flushAnalytics()
    }
  } catch {
    return
  } finally {
    flushing = false
  }
}
