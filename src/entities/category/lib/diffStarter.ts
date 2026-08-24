import type { Category, CategoryGroup, CategoryIconKey, CategoryKind } from '../model/types'
import type { StarterGroupDef } from './starterCatalog'

export type StarterDiffCategory = {
  key: string
  name: string
  icon: CategoryIconKey
  present: boolean
}

export type StarterDiffGroup = {
  key: string
  kind: CategoryKind
  name: string
  color: string
  existingGroupId?: string
  categories: StarterDiffCategory[]
}

export type StarterCatalogDiff = {
  groups: StarterDiffGroup[]
}

export function normalizeStarterName(name: string): string {
  return name.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
}

function nameKey(kind: CategoryKind, name: string): string {
  return `${kind}:${normalizeStarterName(name)}`
}

export function diffStarterCatalog(
  catalog: StarterGroupDef[],
  categories: Category[],
  groups: CategoryGroup[],
): StarterCatalogDiff {
  const categoryNames = new Set(categories.map((item) => nameKey(item.kind, item.name)))
  const groupsByName = new Map(
    groups.map((item) => [nameKey(item.kind, item.name), item] as const),
  )

  return {
    groups: catalog.map((group) => {
      const existing = groupsByName.get(nameKey(group.kind, group.name))
      return {
        key: group.key,
        kind: group.kind,
        name: group.name,
        color: existing?.color ?? group.color,
        ...(existing ? { existingGroupId: existing.id } : {}),
        categories: group.categories.map((item) => ({
          key: item.key,
          name: item.name,
          icon: item.icon,
          present: categoryNames.has(nameKey(group.kind, item.name)),
        })),
      }
    }),
  }
}

export function missingStarterCategoryKeys(diff: StarterCatalogDiff): string[] {
  const keys: string[] = []
  for (const group of diff.groups) {
    for (const item of group.categories) {
      if (!item.present) keys.push(item.key)
    }
  }
  return keys
}

export function hasMissingStarter(diff: StarterCatalogDiff): boolean {
  return missingStarterCategoryKeys(diff).length > 0
}
