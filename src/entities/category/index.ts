export { deleteCategory, deleteCategoryGroup, upsertCategory, upsertCategoryGroup } from './api/categoryApi'
export { useCategoryStore } from './model/store'
export {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  CATEGORY_ICON_LABELS,
  type Category,
  type CategoryGroup,
  type CategoryKind,
  type CategoryIconKey,
} from './model/types'
export {
  applyGroupRecolor,
  colorForJoinGroup,
  familyByBase,
  familyPalette,
  nextFreeShade,
  resolveTone,
  ungroupedPalette,
} from './lib/colorFamilies'
export { default as GroupColorMark } from './ui/GroupColorMark.vue'
export { loadLastCategoryId, saveLastCategoryId } from './lib/lastCategory'
export { splitCategorySections, filterCategorySections } from './lib/groupSections'
export { STARTER_CATALOG } from './lib/starterCatalog'
export {
  diffStarterCatalog,
  hasMissingStarter,
  missingStarterCategoryKeys,
  type StarterCatalogDiff,
  type StarterDiffGroup,
} from './lib/diffStarter'
export { default as CategoryIcon } from './ui/CategoryIcon.vue'
export { default as CategoryIconPicker } from './ui/CategoryIconPicker.vue'
export { default as CategorySelect } from './ui/CategorySelect.vue'
export { default as CategoryForm } from './ui/CategoryForm.vue'
export { default as CategoryGroupForm } from './ui/CategoryGroupForm.vue'
