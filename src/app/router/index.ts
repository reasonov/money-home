import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/entities/session'
import { getErrorMessage, NETWORK_ERROR_MESSAGE } from '@/shared'
import { setBootError } from '../boot'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { left: 0, top: 0 }
  },
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
      path: '/reset-password',
      component: () => import('@/app/layouts/AuthLayout.vue'),
      meta: { recovery: true },
      children: [
        {
          path: '',
          name: 'reset-password',
          component: () => import('@/pages/reset-password/ui/ResetPasswordPage.vue'),
          meta: {
            title: 'Новый пароль',
            subtitle: 'Задайте пароль для входа',
            recovery: true,
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
            subtitle: 'Создайте аккаунт и начните вести счёта',
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
          name: 'history',
          component: () => import('@/pages/history/ui/HistoryPage.vue'),
          meta: { title: 'История', accountSelect: true },
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
          meta: { title: 'Регулярные операции' },
        },
        {
          path: 'savings',
          name: 'savings',
          component: () => import('@/pages/savings/ui/SavingsPage.vue'),
          meta: { title: 'Копилки', accountSelect: true },
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('@/pages/categories/ui/CategoriesPage.vue'),
          meta: { title: 'Категории' },
        },
        {
          path: 'templates',
          name: 'templates',
          component: () => import('@/pages/templates/ui/TemplatesPage.vue'),
          meta: { title: 'Избранное' },
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
        {
          path: 'settings/profile',
          name: 'profile',
          component: () => import('@/pages/profile/ui/ProfilePage.vue'),
          meta: { title: 'Профиль' },
        },
        {
          path: 'settings/personalization',
          name: 'personalization',
          component: () => import('@/pages/personalization/ui/PersonalizationPage.vue'),
          meta: { title: 'Персонализация' },
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

  const recovery = to.matched.some((record) => record.meta.recovery)

  if (recovery) {
    if (!session.isAuthenticated) {
      return { name: 'login' }
    }
    return true
  }

  if (session.passwordRecovery) {
    return { name: 'reset-password' }
  }

  if (requiresAuth && !session.isAuthenticated) {
    return { name: 'login' }
  }

  if (guestOnly && session.isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

router.onError((error) => {
  setBootError(getErrorMessage(error, NETWORK_ERROR_MESSAGE))
})

export default router
