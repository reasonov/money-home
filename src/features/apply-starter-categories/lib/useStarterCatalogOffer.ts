import { computed, ref } from 'vue'
import { getErrorMessage, showToast } from '@/shared'
import { useAccountStore } from '@/entities/account'
import {
  diffStarterCatalog,
  hasMissingStarter,
  missingStarterCategoryKeys,
  STARTER_CATALOG,
  useCategoryStore,
  type StarterCatalogDiff,
} from '@/entities/category'
import { usePreferencesStore } from '@/entities/preferences'

export function useStarterCatalogOffer() {
  const accounts = useAccountStore()
  const categories = useCategoryStore()
  const prefs = usePreferencesStore()
  const drawerOpen = ref(false)
  const pending = ref(false)

  const diff = computed<StarterCatalogDiff>(() =>
    diffStarterCatalog(STARTER_CATALOG, categories.items, categories.groups),
  )
  const missingKeys = computed(() => missingStarterCategoryKeys(diff.value))
  const missing = computed(() => hasMissingStarter(diff.value))
  const catalogEmpty = computed(
    () => categories.items.length === 0 && categories.groups.length === 0,
  )
  const showBanner = computed(
    () => missing.value && !catalogEmpty.value && !prefs.starterCatalogDismissed,
  )
  const showToolbar = computed(() => missing.value)

  function openDrawer() {
    drawerOpen.value = true
  }

  function dismissBanner() {
    prefs.setStarterCatalogDismissed(true)
  }

  async function applyKeys(keys: string[]) {
    if (pending.value) return 0
    if (!accounts.items.length) {
      showToast('Сначала создайте счёт')
      return 0
    }
    pending.value = true
    try {
      const created = await categories.applyStarter(
        accounts.items.map((item) => item.id),
        diff.value,
        keys,
      )
      prefs.setStarterCatalogApplied(true)
      drawerOpen.value = false
      if (created) {
        showToast('Категории добавлены')
      }
      return created
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось добавить категории'))
      return 0
    } finally {
      pending.value = false
    }
  }

  function applyAllMissing() {
    return applyKeys(missingKeys.value)
  }

  return {
    diff,
    missing,
    catalogEmpty,
    showBanner,
    showToolbar,
    drawerOpen,
    pending,
    openDrawer,
    dismissBanner,
    applyKeys,
    applyAllMissing,
  }
}
