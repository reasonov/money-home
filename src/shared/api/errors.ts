export function getErrorMessage(error: unknown, fallback = 'Что-то пошло не так'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    return mapAuthMessage(message) || fallback
  }
  if (typeof error === 'string' && error.trim()) {
    return mapAuthMessage(error) || fallback
  }
  return fallback
}

function mapAuthMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Неверный email или пароль'
  }
  if (lower.includes('user already registered')) {
    return 'Этот email уже зарегистрирован'
  }
  if (lower.includes('email not confirmed')) {
    return 'Подтвердите email по ссылке из письма'
  }
  if (lower.includes('password should be at least')) {
    return 'Пароль слишком короткий'
  }
  if (lower.includes('already in a household')) {
    return 'Вы уже состоите в семье'
  }
  if (lower.includes('household not found')) {
    return 'Семья с таким кодом не найдена'
  }
  if (lower.includes('invite code required')) {
    return 'Введите код приглашения'
  }
  if (lower.includes('purchase is not planned')) {
    return 'Покупка уже завершена или отменена'
  }
  if (lower.includes('not authenticated')) {
    return 'Войдите в аккаунт'
  }
  return message
}
