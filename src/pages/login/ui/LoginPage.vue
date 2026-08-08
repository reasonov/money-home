<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LoginForm } from '@/features/auth'
</script>

<template>
  <div class="page">
    <LoginForm />
    <p class="page__footer">
      Нет аккаунта?
      <RouterLink to="/register">Зарегистрироваться</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page__footer {
  font-size: 0.9375rem;
  color: var(--color-text-muted);
}
</style>
