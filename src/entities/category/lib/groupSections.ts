import type { Category, CategoryGroup, CategoryKind } from '../model/types'

export type CategorySection = {
  group: CategoryGroup
  categories: Category[]
}

export function sortCategories(list: Category[]): Category[] {
  return [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru') || a.id.localeCompare(b.id),
  )
}

export function sortGroups(list: CategoryGroup[]): CategoryGroup[] {
  return [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru') || a.id.localeCompare(b.id),
  )
}

export function splitCategorySections(
  categories: Category[],
  groups: CategoryGroup[],
  kind: CategoryKind,
): { grouped: CategorySection[]; ungrouped: Category[] } {
  const ofKind = categories.filter((item) => item.kind === kind)
  const groupsOfKind = sortGroups(groups.filter((item) => item.kind === kind))
  const grouped: CategorySection[] = []
  const used = new Set<string>()

  for (const group of groupsOfKind) {
    const children = sortCategories(ofKind.filter((item) => item.groupId === group.id))
    grouped.push({ group, categories: children })
    for (const child of children) used.add(child.id)
  }

  const ungrouped = sortCategories(ofKind.filter((item) => !item.groupId && !used.has(item.id)))
  return { grouped, ungrouped }
}

export function filterCategorySections(
  sections: { grouped: CategorySection[]; ungrouped: Category[] },
  query: string,
): { grouped: CategorySection[]; ungrouped: Category[] } {
  const q = query.trim().toLocaleLowerCase('ru-RU')
  if (!q) return sections

  const grouped = sections.grouped
    .map((section) => {
      const groupMatch = section.group.name.toLocaleLowerCase('ru-RU').includes(q)
      const categories = groupMatch
        ? section.categories
        : section.categories.filter((item) => item.name.toLocaleLowerCase('ru-RU').includes(q))
      return { group: section.group, categories }
    })
    .filter((section) => section.categories.length > 0)

  const ungrouped = sections.ungrouped.filter((item) =>
    item.name.toLocaleLowerCase('ru-RU').includes(q),
  )
  return { grouped, ungrouped }
}
