export function sanitizeAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/^0+(?=\d)/, '')
}
