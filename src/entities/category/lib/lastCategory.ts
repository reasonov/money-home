import type { CategoryKind } from '../model/types'

const STORAGE_KEY = 'money-home.last-category'

type LastCategoryMap = Partial<Record<CategoryKind, string>>

function readMap(): LastCategoryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as LastCategoryMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadLastCategoryId(kind: CategoryKind): string | null {
  const id = readMap()[kind]
  return typeof id === 'string' && id ? id : null
}

export function saveLastCategoryId(kind: CategoryKind, id: string) {
  if (!id) return
  try {
    const next = { ...readMap(), [kind]: id }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
