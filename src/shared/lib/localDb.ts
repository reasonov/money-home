import Dexie, { type Table } from 'dexie'

export interface ReplicaRecord {
  userId: string
  payload: unknown
  savedAt: number
}

export interface OutboxRecord {
  seq?: number
  userId: string
  type: string
  payload: Record<string, unknown>
  entityId?: string
  createdAt: number
}

class MoneyHomeDB extends Dexie {
  replicas!: Table<ReplicaRecord, string>
  outbox!: Table<OutboxRecord, number>

  constructor() {
    super('money-home')
    this.version(1).stores({
      replicas: 'userId',
      outbox: '++seq, userId',
    })
  }
}

export const db = new MoneyHomeDB()

function cloneForIdb<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export async function saveReplica(userId: string, payload: unknown): Promise<void> {
  await db.replicas.put({ userId, payload: cloneForIdb(payload), savedAt: Date.now() })
}

export async function loadReplica(userId: string): Promise<ReplicaRecord | undefined> {
  return db.replicas.get(userId)
}

export async function addOutbox(record: Omit<OutboxRecord, 'seq'>): Promise<number> {
  return db.outbox.add({
    ...record,
    payload: cloneForIdb(record.payload),
  })
}

export async function listOutbox(userId: string): Promise<OutboxRecord[]> {
  return db.outbox.where('userId').equals(userId).sortBy('seq')
}

export async function removeOutbox(seq: number): Promise<void> {
  await db.outbox.delete(seq)
}

export async function outboxEntityIds(userId: string): Promise<string[]> {
  const items = await listOutbox(userId)
  return items.map((item) => item.entityId).filter((id): id is string => Boolean(id))
}
