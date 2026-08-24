import { isWriteBlocked, showToast } from '@/shared'
import {
  diffStarterCatalog,
  missingStarterCategoryKeys,
  STARTER_CATALOG,
  useCategoryStore,
} from '@/entities/category'
import { usePreferencesStore } from '@/entities/preferences'
import { useAccountStore } from '../model/store'

export async function ensureStarterCategories(): Promise<void> {
  if (isWriteBlocked()) return
  const prefs = usePreferencesStore()
  if (prefs.starterCatalogApplied) return
  const accounts = useAccountStore()
  const categories = useCategoryStore()
  if (!accounts.items.length) return
  if (categories.items.length || categories.groups.length) return

  const diff = diffStarterCatalog(STARTER_CATALOG, categories.items, categories.groups)
  const keys = missingStarterCategoryKeys(diff)
  if (!keys.length) {
    prefs.setStarterCatalogApplied(true)
    return
  }

  await categories.applyStarter(
    accounts.items.map((item) => item.id),
    diff,
    keys,
  )
  prefs.setStarterCatalogApplied(true)
  showToast('Добавили базовые категории — их можно изменить')
}
