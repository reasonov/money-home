import { reactive } from 'vue'

export type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmState = ConfirmOptions & {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Отмена',
  danger: false,
  resolve: null,
})

export function useConfirmState() {
  return state
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (state.resolve) {
    state.resolve(false)
  }

  state.title = options.title
  state.message = options.message
  state.confirmLabel = options.confirmLabel ?? 'Подтвердить'
  state.cancelLabel = options.cancelLabel ?? 'Отмена'
  state.danger = options.danger ?? false
  state.open = true

  return new Promise((resolve) => {
    state.resolve = resolve
  })
}

export function settleConfirm(value: boolean) {
  state.open = false
  const resolve = state.resolve
  state.resolve = null
  resolve?.(value)
}
