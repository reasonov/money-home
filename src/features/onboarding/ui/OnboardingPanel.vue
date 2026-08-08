<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, AppField, AppInput, getErrorMessage, showToast } from '@/shared'
import {
  bootstrapHouseholdSession,
  loadHouseholdData,
  startHouseholdRealtime,
  useHouseholdStore,
} from '@/entities/household'

const router = useRouter()
const household = useHouseholdStore()

const mode = ref<'create' | 'join'>('create')
const step = ref<'form' | 'invite'>('form')
const name = ref('Наша семья')
const inviteCode = ref('')
const error = ref('')
const pending = ref(false)

async function onCreate() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = 'Укажите название семьи'
    return
  }

  pending.value = true
  try {
    await household.createHousehold(name.value)
    if (household.household) {
      await loadHouseholdData(household.household.id)
      startHouseholdRealtime(household.household.id)
    }
    step.value = 'invite'
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось создать семью')
  } finally {
    pending.value = false
  }
}

async function onJoin() {
  error.value = ''
  if (inviteCode.value.trim().length < 4) {
    error.value = 'Введите код приглашения'
    return
  }

  pending.value = true
  try {
    await household.joinHousehold(inviteCode.value)
    await bootstrapHouseholdSession()
    await router.push('/')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось войти в семью')
  } finally {
    pending.value = false
  }
}

async function copyInvite() {
  const code = household.inviteCode
  if (!code || !navigator.clipboard) {
    return
  }
  await navigator.clipboard.writeText(code)
  showToast('Скопировано')
}

async function shareInvite() {
  const code = household.inviteCode
  if (!code) {
    return
  }
  const text = `Присоединяйся к семье в Money Home. Код приглашения: ${code}`
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Money Home', text })
      return
    } catch {
      /* user cancelled or share failed — fall through to copy */
    }
  }
  await copyInvite()
}

function continueAfterInvite() {
  void router.push('/')
}
</script>

<template>
  <div class="onboarding">
    <div v-if="step === 'invite'" class="invite">
      <p class="invite__lead">Семья создана. Пригласите второго участника.</p>
      <p class="invite__label">Код приглашения</p>
      <p class="invite__code">{{ household.inviteCode }}</p>
      <div class="invite__actions">
        <AppButton block @click="shareInvite">Поделиться</AppButton>
        <AppButton variant="secondary" block @click="copyInvite">Скопировать</AppButton>
        <AppButton variant="ghost" block @click="continueAfterInvite">Продолжить</AppButton>
      </div>
    </div>

    <template v-else>
      <div class="onboarding__tabs" role="tablist" aria-label="Варианты входа в семью">
        <button
          type="button"
          class="onboarding__tab"
          role="tab"
          :aria-selected="mode === 'create'"
          :class="{ 'is-active': mode === 'create' }"
          @click="mode = 'create'"
        >
          Создать
        </button>
        <button
          type="button"
          class="onboarding__tab"
          role="tab"
          :aria-selected="mode === 'join'"
          :class="{ 'is-active': mode === 'join' }"
          @click="mode = 'join'"
        >
          Присоединиться
        </button>
      </div>

      <form v-if="mode === 'create'" class="form" @submit.prevent="onCreate">
        <AppField label="Название семьи" for-id="hh-name">
          <AppInput id="hh-name" v-model="name" required />
        </AppField>
        <p v-if="error" class="form__error" role="alert">{{ error }}</p>
        <AppButton type="submit" block :disabled="pending">
          {{ pending ? 'Создаём…' : 'Создать семью' }}
        </AppButton>
      </form>

      <form v-else class="form" @submit.prevent="onJoin">
        <AppField label="Код приглашения" for-id="hh-code" hint="Код от члена семьи">
          <AppInput id="hh-code" v-model="inviteCode" placeholder="ABC123" required />
        </AppField>
        <p v-if="error" class="form__error" role="alert">{{ error }}</p>
        <AppButton type="submit" block :disabled="pending">
          {{ pending ? 'Входим…' : 'Войти в семью' }}
        </AppButton>
      </form>
    </template>
  </div>
</template>

<style scoped>
.onboarding {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.onboarding__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-1);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.onboarding__tab {
  min-height: 44px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}

.onboarding__tab.is-active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-soft);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}

.invite {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: center;
}

.invite__lead {
  color: var(--color-text-muted);
  line-height: 1.45;
}

.invite__label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.invite__code {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.invite__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
</style>
