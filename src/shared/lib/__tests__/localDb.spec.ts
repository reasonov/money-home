import 'fake-indexeddb/auto'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { addOutbox, db, listOutbox, loadReplica, removeOutbox, saveReplica } from '../localDb'

describe('local replica and outbox', () => {
  beforeEach(async () => {
    await db.outbox.clear()
    await db.replicas.clear()
  })

  it('saves and loads a replica payload', async () => {
    await saveReplica('user-1', { accounts: [{ id: 'a1', name: 'Нал', amount: 100 }] })
    const record = await loadReplica('user-1')
    expect(record?.payload).toEqual({ accounts: [{ id: 'a1', name: 'Нал', amount: 100 }] })
  })

  it('stores a reactive snapshot without DataCloneError', async () => {
    const payload = reactive({
      accounts: [{ id: 'a1', name: 'Нал', amount: 100 }],
    })
    await saveReplica('user-1', payload)
    const record = await loadReplica('user-1')
    expect(record?.payload).toEqual({ accounts: [{ id: 'a1', name: 'Нал', amount: 100 }] })
  })

  it('keeps FIFO outbox order and supports replay by seq', async () => {
    await addOutbox({
      userId: 'user-1',
      type: 'insertTransaction',
      payload: { id: 't1' },
      entityId: 't1',
      createdAt: 1,
    })
    await addOutbox({
      userId: 'user-1',
      type: 'insertPurchase',
      payload: { id: 'p1' },
      entityId: 'p1',
      createdAt: 2,
    })
    await addOutbox({
      userId: 'user-1',
      type: 'completePurchase',
      payload: { id: 'p1' },
      entityId: 'p1',
      createdAt: 3,
    })

    const items = await listOutbox('user-1')
    expect(items.map((item) => item.type)).toEqual([
      'insertTransaction',
      'insertPurchase',
      'completePurchase',
    ])
    expect(items[0]?.entityId).toBe('t1')

    await removeOutbox(items[0]!.seq!)
    const rest = await listOutbox('user-1')
    expect(rest.map((item) => item.type)).toEqual(['insertPurchase', 'completePurchase'])
  })
})
