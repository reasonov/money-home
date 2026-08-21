function fractionDigits(amount: number): number {
  return Math.round(amount * 100) % 100 === 0 ? 0 : 2
}

export function formatMoney(amount: number): string {
  const digits = fractionDigits(amount)
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

export function formatMoneyPlain(amount: number): string {
  const digits = fractionDigits(amount)
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}
