import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { assertWritable, createUuid, enqueueMutation, roundMoney } from '@/shared'
import { useSessionStore } from '@/entities/session'
import { fetchOperationTemplates, mapOperationTemplate } from '../api/operationTemplateApi'
import type { OperationTemplate, OperationTemplateInput } from './types'

export const useOperationTemplateStore = defineStore('operation-template', () => {
  const items = ref<OperationTemplate[]>([])

  const expense = computed(() => items.value.filter((item) => item.kind === 'expense'))
  const income = computed(() => items.value.filter((item) => item.kind === 'income'))

  function upsert(template: OperationTemplate, prepend = false) {
    const index = items.value.findIndex((item) => item.id === template.id)
    if (index === -1) {
      items.value = prepend ? [template, ...items.value] : [...items.value, template]
      return
    }
    const next = [...items.value]
    next[index] = template
    items.value = next
  }

  function removeLocal(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function applyRemoteRow(row: Parameters<typeof mapOperationTemplate>[0]) {
    upsert(mapOperationTemplate(row))
  }

  function hydrate(next: OperationTemplate[]) {
    items.value = next
  }

  function forKind(kind: OperationTemplate['kind']) {
    return items.value.filter((item) => item.kind === kind)
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  async function load() {
    items.value = await fetchOperationTemplates()
  }

  async function save(input: OperationTemplateInput) {
    assertWritable()
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error('Войдите в аккаунт')
    }
    const isNew = !input.id
    const id = input.id ?? createUuid()
    const template: OperationTemplate = {
      id,
      kind: input.kind,
      categoryId: input.categoryId,
      amount: roundMoney(input.amount),
      ...(input.title?.trim() ? { title: input.title.trim() } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    }
    upsert(template, isNew)
    await enqueueMutation(userId, 'upsertOperationTemplate', { userId, input: { ...template, id } }, id)
    return template
  }

  async function remove(id: string) {
    assertWritable()
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error('Войдите в аккаунт')
    }
    removeLocal(id)
    await enqueueMutation(userId, 'deleteOperationTemplate', { id }, id)
  }

  function reset() {
    items.value = []
  }

  return {
    items,
    expense,
    income,
    upsert,
    removeLocal,
    applyRemoteRow,
    hydrate,
    forKind,
    getById,
    load,
    save,
    remove,
    reset,
  }
})
