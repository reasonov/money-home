import { CATEGORY_ICON_LABELS, type CategoryIconKey } from '../model/types'

const CATEGORY_ICON_ALIASES: Record<string, CategoryIconKey> = {
  педикюр: 'manicure',
  ногти: 'manicure',
  парикмахерская: 'haircut',
  стрижка: 'haircut',
  волосы: 'haircut',
  косметология: 'cosmetics',
  косметика: 'cosmetics',
  салон: 'spa',
  'фаст-фуд': 'fastfood',
  очки: 'glasses',
  подписка: 'subscriptions',
  кредитка: 'credit',
}

export function matchCategoryIcon(name: string): CategoryIconKey | null {
  const normalized = name.trim().toLocaleLowerCase('ru-RU')
  if (!normalized) return null
  const aliased = CATEGORY_ICON_ALIASES[normalized]
  if (aliased) return aliased
  const entry = Object.entries(CATEGORY_ICON_LABELS).find(
    ([, label]) => label.toLocaleLowerCase('ru-RU') === normalized,
  )
  return entry ? (entry[0] as CategoryIconKey) : null
}
