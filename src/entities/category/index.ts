export { useCategoryStore } from './model/store'
export {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  CATEGORY_ICON_LABELS,
  type Category,
  type CategoryKind,
  type CategoryIconKey,
} from './model/types'
export { loadLastCategoryId, saveLastCategoryId } from './lib/lastCategory'
export { default as CategoryIcon } from './ui/CategoryIcon.vue'
export { default as CategoryIconPicker } from './ui/CategoryIconPicker.vue'
export { default as CategorySelect } from './ui/CategorySelect.vue'
export { default as CategoryForm } from './ui/CategoryForm.vue'
