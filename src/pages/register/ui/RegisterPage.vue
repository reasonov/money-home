<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { RegisterForm } from '@/features/auth'
</script>

<template>
  <div class="page">
    <RegisterForm />
    <p class="page__footer">
      Уже есть аккаунт?
      <RouterLink to="/login">Войти</RouterLink>
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
