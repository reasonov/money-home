export type SavingsGoalStatus = 'active' | 'completed' | 'cancelled'

export interface SavingsGoal {
  id: string
  accountId: string
  title: string
  targetAmount: number
  targetDate: string
  savedAmount: number
  startedOn: string
  status: SavingsGoalStatus
  createdBy: string
}
