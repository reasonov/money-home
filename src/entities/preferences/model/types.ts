import type { NavItemId, SidebarSectionId } from '@/shared'

export interface Preferences {
  amountSuggestions: boolean
  starterCatalogApplied: boolean
  starterCatalogDismissed: boolean
  bottomNav: [NavItemId, NavItemId, NavItemId, NavItemId]
  sidebarSections: SidebarSectionId[]
  sidebarAccountIds: string[] | null
  accountOrder: string[]
}
