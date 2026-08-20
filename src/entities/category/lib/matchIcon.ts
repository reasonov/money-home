import { CATEGORY_ICON_LABELS, type CategoryIconKey } from '../model/types'

export function matchCategoryIcon(name: string): CategoryIconKey | null {
  const normalized = name.trim().toLocaleLowerCase('ru-RU')
  if (!normalized) return null
  const entry = Object.entries(CATEGORY_ICON_LABELS).find(
    ([, label]) => label.toLocaleLowerCase('ru-RU') === normalized,
  )
  return entry ? (entry[0] as CategoryIconKey) : null
}
