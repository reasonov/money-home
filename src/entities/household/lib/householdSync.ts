import type { RealtimeChannel } from '@supabase/supabase-js'
import { formatMoney, supabase } from '@/shared'
import { useActivityStore } from '@/entities/activity'
import { useBalanceStore } from '@/entities/balance'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'
import { useHouseholdStore } from '../model/store'

let channel: RealtimeChannel | null = null

function formatAmount(value: unknown) {
  return formatMoney(Math.round(Number(value)))
}

export async function loadHouseholdData(householdId: string) {
  const balance = useBalanceStore()
  const purchases = usePurchaseStore()
  const incomeRules = useIncomeRuleStore()

  await Promise.all([
    balance.load(householdId),
    purchases.load(householdId),
    incomeRules.load(householdId),
  ])
}

export function stopHouseholdRealtime() {
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
}

export function startHouseholdRealtime(householdId: string) {
  stopHouseholdRealtime()

  const session = useSessionStore()
  const household = useHouseholdStore()
  const balance = useBalanceStore()
  const purchases = usePurchaseStore()
  const incomeRules = useIncomeRuleStore()
  const activity = useActivityStore()

  channel = supabase
    .channel(`household:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'households',
        filter: `id=eq.${householdId}`,
      },
      (payload) => {
        const row = payload.new as { name?: string } | null
        if (!row?.name) {
          return
        }
        household.applyRemoteName(row.name)
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'members',
        filter: `household_id=eq.${householdId}`,
      },
      () => {
        void household.loadCurrent()
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'balances',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        const row = payload.new as {
          amount?: number
          updated_by?: string | null
        } | null
        if (!row || row.amount == null) {
          return
        }
        balance.applyRemote(Number(row.amount))
        const actorId = row.updated_by
        if (!actorId || actorId === session.user?.id) {
          return
        }
        activity.push({
          kind: 'balance_updated',
          actorId,
          actorName: household.memberName(actorId),
          summary: `${household.memberName(actorId)} обновил(а) баланс: ${formatAmount(row.amount)}`,
        })
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'purchases',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        const eventType = payload.eventType
        const row = (eventType === 'DELETE' ? payload.old : payload.new) as {
          id: string
          title: string
          amount: number
          planned_date: string
          notes: string | null
          status: string
          created_by: string
          updated_by?: string | null
        } | null

        if (!row) {
          return
        }

        if (eventType === 'DELETE') {
          purchases.remove(row.id)
          return
        }

        purchases.applyRemoteRow(row)

        const actorId =
          eventType === 'INSERT' ? row.created_by : (row.updated_by ?? row.created_by)
        if (!actorId || actorId === session.user?.id) {
          return
        }

        const actorName = household.memberName(actorId)
        if (eventType === 'INSERT') {
          activity.push({
            kind: 'purchase_created',
            actorId,
            actorName,
            purchaseId: row.id,
            summary: `${actorName} добавил(а) покупку «${row.title}» на ${formatAmount(row.amount)}`,
          })
          return
        }

        if (row.status === 'done') {
          activity.push({
            kind: 'purchase_done',
            actorId,
            actorName,
            purchaseId: row.id,
            summary: `${actorName} отметил(а) «${row.title}» готовым`,
          })
          return
        }

        if (row.status === 'cancelled') {
          activity.push({
            kind: 'purchase_cancelled',
            actorId,
            actorName,
            purchaseId: row.id,
            summary: `${actorName} отменил(а) покупку «${row.title}»`,
          })
          return
        }

        activity.push({
          kind: 'purchase_updated',
          actorId,
          actorName,
          purchaseId: row.id,
          summary: `${actorName} изменил(а) покупку «${row.title}»`,
        })
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'income_rules',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        const eventType = payload.eventType
        const row = (eventType === 'DELETE' ? payload.old : payload.new) as {
          id: string
          amount: number
          frequency: string
          weekday: number | null
          month_day: number | null
          anchor_date: string | null
          active: boolean
          updated_by?: string | null
        } | null

        if (!row) {
          return
        }

        if (eventType === 'DELETE') {
          incomeRules.removeLocal(row.id)
        } else {
          incomeRules.applyRemoteRow(row)
        }

        const actorId = row.updated_by
        if (!actorId || actorId === session.user?.id) {
          return
        }

        const actorName = household.memberName(actorId)
        activity.push({
          kind: 'income_rule_changed',
          actorId,
          actorName,
          summary:
            eventType === 'DELETE'
              ? `${actorName} удалил(а) правило пополнения`
              : `${actorName} изменил(а) правила пополнения`,
        })
      },
    )
    .subscribe()
}

export async function bootstrapHouseholdSession() {
  const household = useHouseholdStore()
  const current = await household.loadCurrent()
  if (!current) {
    stopHouseholdRealtime()
    useBalanceStore().reset()
    usePurchaseStore().reset()
    useIncomeRuleStore().reset()
    return null
  }
  await loadHouseholdData(current.id)
  startHouseholdRealtime(current.id)
  return current
}

export function resetHouseholdSession() {
  stopHouseholdRealtime()
  useHouseholdStore().clearHousehold()
  useBalanceStore().reset()
  usePurchaseStore().reset()
  useIncomeRuleStore().reset()
  useActivityStore().reset()
}
