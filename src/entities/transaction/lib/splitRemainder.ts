import { roundMoney } from '@/shared'

export const MAX_SPLIT_LINES = 4

export type SplitPart = {
  categoryId: string
  amount: number
}

export type SplitRemainderLine = {
  key: string
  categoryId: string
  amount: string | number
}

export type SplitRemainderError = 'amount' | 'categories'

export type SplitRemainderResult =
  | { ok: true; remainder: number; parts: SplitPart[] }
  | { ok: false; remainder: number; error: SplitRemainderError }

export function allocatedSplitAmount(parts: { amount: number | string }[]): number {
  return roundMoney(
    parts.reduce((sum, part) => {
      const amount = roundMoney(Number(part.amount))
      if (!Number.isFinite(amount) || amount <= 0) {
        return sum
      }
      return sum + amount
    }, 0),
  )
}

export function remainderAfterSplits(
  total: number,
  parts: { amount: number | string }[],
): number {
  const value = roundMoney(Number(total))
  if (!Number.isFinite(value)) {
    return NaN
  }
  return roundMoney(value - allocatedSplitAmount(parts))
}

export function partsFromLines(lines: SplitRemainderLine[]): SplitPart[] {
  return lines.map((line) => ({
    categoryId: line.categoryId,
    amount: Number(line.amount),
  }))
}

export function splitRemainder(
  total: number,
  remainderCategoryId: string,
  parts: SplitPart[],
): SplitRemainderResult {
  const totalAmount = roundMoney(Number(total))
  const remainder = remainderAfterSplits(totalAmount, parts)

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return { ok: false, remainder, error: 'amount' }
  }

  if (parts.length === 0) {
    return { ok: true, remainder: totalAmount, parts: [] }
  }

  if (!remainderCategoryId) {
    return { ok: false, remainder, error: 'categories' }
  }

  const used = new Set<string>([remainderCategoryId])
  const normalized: SplitPart[] = []

  for (const part of parts) {
    const amount = roundMoney(Number(part.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, remainder, error: 'amount' }
    }
    const categoryId = part.categoryId.trim()
    if (!categoryId || used.has(categoryId)) {
      return { ok: false, remainder, error: 'categories' }
    }
    used.add(categoryId)
    normalized.push({ categoryId, amount })
  }

  if (!(remainder > 0)) {
    return { ok: false, remainder, error: 'amount' }
  }

  return { ok: true, remainder, parts: normalized }
}

export function splitRemainderMessage(error: SplitRemainderError): string {
  if (error === 'categories') {
    return 'Выберите разные категории'
  }
  return 'Сумма выделенного должна быть меньше итога'
}

export function splitSavedToast(kind: 'expense' | 'income', count: number): string {
  if (count <= 1) {
    return kind === 'expense' ? 'Расход сохранён' : 'Доход сохранён'
  }
  const word =
    kind === 'expense' ? (count < 5 ? 'расхода' : 'расходов') : count < 5 ? 'дохода' : 'доходов'
  return `Сохранены ${count} ${word}`
}
