export const NETWORK_ERROR_MESSAGE =
  'Нет соединения с интернетом. Проверьте сеть и попробуйте снова'

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505'
}

export function getErrorMessage(error: unknown, fallback = 'Что-то пошло не так'): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return NETWORK_ERROR_MESSAGE
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    return mapAuthMessage(message) || fallback
  }
  if (typeof error === 'string' && error.trim()) {
    return mapAuthMessage(error) || fallback
  }
  return fallback
}

function isNetworkMessage(lower: string): boolean {
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('internet connection') ||
    lower.includes('err_internet') ||
    lower.includes('err_network') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('net::err')
  )
}

function mapAuthMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Неверная почта или пароль'
  }
  if (lower.includes('user already registered')) {
    return 'Эта почта уже зарегистрирована'
  }
  if (lower.includes('email not confirmed')) {
    return 'Подтвердите почту по ссылке из письма'
  }
  if (lower.includes('password should be at least')) {
    return 'Пароль слишком короткий'
  }
  if (lower.includes('already in a household')) {
    return 'Вы уже подключены к этому счёту'
  }
  if (lower.includes('account not found')) {
    return 'Счёт с таким кодом не найден'
  }
  if (lower.includes('invite code required')) {
    return 'Введите код счёта'
  }
  if (lower.includes('not an account member')) {
    return 'Нет доступа к счёту'
  }
  if (lower.includes('owner cannot leave')) {
    return 'Владелец не может покинуть счёт'
  }
  if (lower.includes('choose different accounts')) {
    return 'Выберите разные счета'
  }
  if (lower.includes('opening amount')) {
    return 'Стартовый баланс не может быть отрицательным'
  }
  if (lower.includes('category name required') || lower.includes('select at least one account')) {
    return 'Укажите название и хотя бы один счёт'
  }
  if (lower.includes('purchase is not planned')) {
    return 'Покупка уже завершена или отменена'
  }
  if (lower.includes('transaction not found')) {
    return 'Операция не найдена'
  }
  if (lower.includes('amount must be positive')) {
    return 'Сумма должна быть больше нуля'
  }
  if (lower.includes('category not found')) {
    return 'Категория недоступна'
  }
  if (lower.includes('not authenticated')) {
    return 'Войдите в аккаунт'
  }
  if (
    lower.includes('unable to preload') ||
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('error loading dynamically imported module')
  ) {
    return 'Приложение обновилось. Обновите страницу'
  }
  if (isNetworkMessage(lower)) {
    return NETWORK_ERROR_MESSAGE
  }
  return ''
}
