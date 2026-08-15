import { ref } from 'vue'

export const sidebarOpen = ref(false)

export function openSidebar() {
  sidebarOpen.value = true
}

export function closeSidebar() {
  sidebarOpen.value = false
}

export function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
