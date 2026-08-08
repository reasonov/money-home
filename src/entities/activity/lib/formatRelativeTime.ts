export function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)

  if (diffSec < 45) {
    return 'только что'
  }

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) {
    return `${diffMin} мин назад`
  }

  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) {
    return `${diffHours} ч назад`
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (24 * 60 * 60 * 1000),
  )

  if (dayDiff === 1) {
    return 'вчера'
  }

  if (dayDiff < 7) {
    return `${dayDiff} дн назад`
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}
