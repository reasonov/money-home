export interface Account {
  id: string
  name: string
  amount: number
  ownerId: string
  inviteCode: string | null
}

export interface AccountMember {
  accountId: string
  userId: string
  displayName: string
}
