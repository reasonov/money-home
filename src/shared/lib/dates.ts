export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year!, month! - 1, day)
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayLocal(): string {
  return formatLocalDate(new Date())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

export function compareDates(a: Date, b: Date): number {
  const aKey = a.getFullYear() * 10000 + (a.getMonth() + 1) * 100 + a.getDate()
  const bKey = b.getFullYear() * 10000 + (b.getMonth() + 1) * 100 + b.getDate()
  return aKey - bKey
}

export function isAfter(a: Date, b: Date): boolean {
  return compareDates(a, b) > 0
}

export function isBeforeOrEqual(a: Date, b: Date): boolean {
  return compareDates(a, b) <= 0
}

export function formatDisplayDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(parseLocalDate(iso))
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
    .format(parseLocalDate(iso))
    .replace('.', '')
}

export function isPastDate(iso: string, asOfIso = todayLocal()): boolean {
  return compareDates(parseLocalDate(iso), parseLocalDate(asOfIso)) < 0
}

export function formatRelativeDisplayDate(iso: string, asOfIso = todayLocal()): string {
  const date = parseLocalDate(iso)
  const asOf = parseLocalDate(asOfIso)
  const diff = compareDates(date, asOf)

  if (diff < 0) {
    return `Просрочено · ${formatDisplayDate(iso)}`
  }
  if (diff === 0) {
    return 'Сегодня'
  }
  if (formatLocalDate(addDays(asOf, 1)) === iso) {
    return 'Завтра'
  }
  return formatDisplayDate(iso)
}
