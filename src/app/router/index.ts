import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/entities/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      component: () => import('@/app/layouts/AuthLayout.vue'),
      meta: { guestOnly: true },
      children: [
        {
          path: '',
          name: 'login',
          component: () => import('@/pages/login/ui/LoginPage.vue'),
          meta: {
            title: 'Вход',
            subtitle: 'Учёт расходов и доходов по счетам',
            guestOnly: true,
          },
        },
      ],
    },
    {
      path: '/register',
      component: () => import('@/app/layouts/AuthLayout.vue'),
      meta: { guestOnly: true },
      children: [
        {
          path: '',
          name: 'register',
          component: () => import('@/pages/register/ui/RegisterPage.vue'),
          meta: {
            title: 'Регистрация',
            subtitle: 'Создайте аккаунт и начните вести счета',
            guestOnly: true,
          },
        },
      ],
    },
    {
      path: '/',
      component: () => import('@/app/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/home/ui/HomePage.vue'),
          meta: { title: 'Главная', tab: true, accountSelect: true },
        },
        {
          path: 'accounts',
          name: 'accounts',
          component: () => import('@/pages/accounts/ui/AccountsPage.vue'),
          meta: { title: 'Счета' },
        },
        {
          path: 'accounts/new',
          redirect: { name: 'accounts' },
        },
        {
          path: 'accounts/:id',
          name: 'account-detail',
          component: () => import('@/pages/account-detail/ui/AccountDetailPage.vue'),
          meta: { title: 'Счёт' },
        },
        {
          path: 'expense/new',
          redirect: { name: 'home' },
        },
        {
          path: 'income/new',
          redirect: { name: 'home' },
        },
        {
          path: 'transfer',
          redirect: { name: 'home' },
        },
        {
          path: 'purchases/new',
          redirect: { name: 'calendar' },
        },
        {
          path: 'purchases/:id/edit',
          redirect: { name: 'calendar' },
        },
        {
          path: 'history',
          redirect: { name: 'home' },
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/pages/calendar/ui/CalendarPage.vue'),
          meta: { title: 'Планирование', tab: true, accountSelect: true },
        },
        {
          path: 'income',
          name: 'income',
          component: () => import('@/pages/income/ui/IncomePage.vue'),
          meta: { title: 'Авто-пополнения' },
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('@/pages/categories/ui/CategoriesPage.vue'),
          meta: { title: 'Категории' },
        },
        {
          path: 'stats',
          name: 'stats',
          component: () => import('@/pages/stats/ui/StatsPage.vue'),
          meta: { title: 'Статистика', tab: true, accountSelect: true },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/settings/ui/SettingsPage.vue'),
          meta: { title: 'Настройки' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const session = useSessionStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)

  if (requiresAuth && !session.isAuthenticated) {
    return { name: 'login' }
  }

  if (guestOnly && session.isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

export default router
