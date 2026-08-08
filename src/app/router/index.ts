import { createRouter, createWebHistory } from 'vue-router'
import { useHouseholdStore } from '@/entities/household'
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
            subtitle: 'Планируйте покупки семьи из общего бюджета',
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
            subtitle: 'Создайте аккаунт и соберите семью в одном плане',
            guestOnly: true,
          },
        },
      ],
    },
    {
      path: '/onboarding',
      component: () => import('@/app/layouts/AuthLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'onboarding',
          component: () => import('@/pages/onboarding/ui/OnboardingPage.vue'),
          meta: {
            title: 'Ваша семья',
            subtitle: 'Создайте семью или войдите по коду приглашения',
            requiresAuth: true,
          },
        },
      ],
    },
    {
      path: '/',
      component: () => import('@/app/layouts/MainLayout.vue'),
      meta: { requiresAuth: true, requiresHousehold: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/home/ui/HomePage.vue'),
          meta: { title: 'Календарь покупок' },
        },
        {
          path: 'purchases/new',
          name: 'purchase-new',
          component: () => import('@/pages/purchase-new/ui/PurchaseNewPage.vue'),
          meta: { title: 'Новая покупка' },
        },
        {
          path: 'purchases/:id/edit',
          name: 'purchase-edit',
          component: () => import('@/pages/purchase-edit/ui/PurchaseEditPage.vue'),
          meta: { title: 'Изменить покупку' },
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/pages/history/ui/HistoryPage.vue'),
          meta: { title: 'История покупок' },
        },
        {
          path: 'income',
          name: 'income',
          component: () => import('@/pages/income/ui/IncomePage.vue'),
          meta: { title: 'Пополнения' },
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
  const household = useHouseholdStore()

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresHousehold = to.matched.some((record) => record.meta.requiresHousehold)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)

  if (requiresAuth && !session.isAuthenticated) {
    return { name: 'login' }
  }

  if (guestOnly && session.isAuthenticated) {
    return household.hasHousehold ? { name: 'home' } : { name: 'onboarding' }
  }

  if (requiresHousehold && session.isAuthenticated && !household.hasHousehold) {
    return { name: 'onboarding' }
  }

  if (to.name === 'onboarding' && session.isAuthenticated && household.hasHousehold) {
    return { name: 'home' }
  }

  return true
})

export default router
