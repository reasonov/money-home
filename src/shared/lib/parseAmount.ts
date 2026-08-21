export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return amount
  return Math.round(Number((amount * 100).toFixed(8))) / 100
}

export function floorMoney(amount: number): number {
  if (!Number.isFinite(amount)) return amount
  return Math.floor(Number((amount * 100).toFixed(8))) / 100
}

export function sanitizeAmountInput(raw: string): string {
  let integer = ''
  let fraction = ''
  let seenSep = false

  for (const char of raw) {
    if (char >= '0' && char <= '9') {
      if (seenSep) {
        if (fraction.length < 2) fraction += char
      } else {
        integer += char
      }
      continue
    }
    if ((char === ',' || char === '.') && !seenSep) {
      seenSep = true
    }
  }

  integer = integer.replace(/^0+(?=\d)/, '')
  if (!integer) {
    if (!seenSep && !fraction) return ''
    integer = '0'
  }

  if (!seenSep) return integer
  return fraction ? `${integer}.${fraction}` : `${integer}.`
}
