<script setup lang="ts">
import { AppConfirmDialog, AppToastHost } from '@/shared'
</script>

<template>
  <RouterView />
  <AppToastHost />
  <AppConfirmDialog />
</template>
