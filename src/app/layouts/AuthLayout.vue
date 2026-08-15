<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => (route.meta.title as string | undefined) ?? '')
const subtitle = computed(() => (route.meta.subtitle as string | undefined) ?? '')
</script>

<template>
  <div class="auth">
    <div class="auth__card">
      <p class="auth__brand">Money Home</p>
      <h1 class="auth__title">{{ title }}</h1>
      <p v-if="subtitle" class="auth__subtitle">{{ subtitle }}</p>
      <div class="auth__body">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: flex;
  justify-content: center;
  min-height: 100dvh;
  padding: var(--space-5) var(--space-4);
  background:
    radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 40%),
    var(--color-bg);
}

.auth__card {
  width: 100%;
  max-width: var(--app-max-width);
  margin: auto 0;
  padding: var(--space-5);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.auth__brand {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.auth__title {
  margin-top: var(--space-3);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.auth__subtitle {
  margin-top: var(--space-2);
  color: var(--color-text-muted);
}

.auth__body {
  margin-top: var(--space-5);
}
</style>
