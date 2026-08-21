import { addDays, formatLocalDate, parseLocalDate, roundMoney } from '@/shared'

export type ParseCategory = {
  id: string
  name: string
}

export interface ParsedOperationLine {
  amount?: number
  occurredOn?: string
  title?: string
  categoryId?: string
  confidence?: number
}

const DATE_WORDS: { pattern: RegExp; days: number }[] = [
  { pattern: /позавчера/giu, days: -2 },
  { pattern: /вчера/giu, days: -1 },
  { pattern: /сегодня/giu, days: 0 },
]

const MULTIPLIER_RE =
  /(\d{1,3}(?:[\s\u00a0]\d{3})*|\d+)(?:[.,](\d{1,2}))?\s*(тысяч(?:а|и)?|тыс\.?|[кk])(?=$|[^\p{L}])/giu
const GROUPED_RE = /(\d{1,3}(?:[\s\u00a0]\d{3})+)(?:[.,](\d{1,2}))?/g
const PLAIN_RE = /(\d+)(?:[.,](\d{1,2}))?/g

function digitsToNumber(integer: string, fraction?: string): number {
  const whole = integer.replace(/[\s\u00a0]/g, '')
  if (!fraction) {
    return Number(whole)
  }
  return Number(`${whole}.${fraction}`)
}

function lastMatch(
  text: string,
  regex: RegExp,
  toAmount: (match: RegExpExecArray) => number | null,
): { amount: number; start: number; end: number } | null {
  let found: { amount: number; start: number; end: number } | null = null
  regex.lastIndex = 0
  let match = regex.exec(text)
  while (match) {
    const amount = toAmount(match)
    if (amount != null && amount > 0 && Number.isFinite(amount) && match.index != null) {
      found = {
        amount: roundMoney(amount),
        start: match.index,
        end: match.index + match[0].length,
      }
    }
    match = regex.exec(text)
  }
  return found
}

function extractAmount(text: string): { amount: number; start: number; end: number } | null {
  const multiplied = lastMatch(text, MULTIPLIER_RE, (match) => {
    const base = digitsToNumber(match[1] ?? '', match[2])
    if (!Number.isFinite(base) || base <= 0) {
      return null
    }
    return base * 1000
  })
  if (multiplied) {
    return multiplied
  }

  const grouped = lastMatch(text, GROUPED_RE, (match) => {
    const value = digitsToNumber(match[1] ?? '', match[2])
    return Number.isFinite(value) && value > 0 ? value : null
  })
  if (grouped) {
    return grouped
  }

  return lastMatch(text, PLAIN_RE, (match) => {
    const value = digitsToNumber(match[1] ?? '', match[2])
    return Number.isFinite(value) && value > 0 ? value : null
  })
}

function extractDate(text: string, today: string): { occurredOn: string; pattern: RegExp } | null {
  const asOf = parseLocalDate(today)
  for (const item of DATE_WORDS) {
    item.pattern.lastIndex = 0
    if (item.pattern.test(text)) {
      return {
        occurredOn: formatLocalDate(addDays(asOf, item.days)),
        pattern: item.pattern,
      }
    }
  }
  return null
}

function extractCategory(
  text: string,
  categories: ParseCategory[],
): { categoryId: string; name: string } | null {
  const lower = text.toLocaleLowerCase('ru')
  const ranked = [...categories]
    .filter((item) => item.name.trim())
    .sort((a, b) => b.name.trim().length - a.name.trim().length)
  for (const item of ranked) {
    const name = item.name.trim().toLocaleLowerCase('ru')
    if (name && lower.includes(name)) {
      return { categoryId: item.id, name: item.name.trim() }
    }
  }
  return null
}

function stripOnce(source: string, start: number, end: number): string {
  return `${source.slice(0, start)}${source.slice(end)}`
}

function cleanupTitle(raw: string): string | undefined {
  const title = raw.replace(/\s+/g, ' ').trim()
  return title || undefined
}

function foldTitle(value: string): string {
  return value.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, '')
}

function isTitleGrounded(title: string, source: string): boolean {
  const needle = foldTitle(title)
  const haystack = foldTitle(source)
  if (!needle || !haystack) {
    return false
  }
  if (haystack.includes(needle)) {
    return true
  }
  const words = title.toLocaleLowerCase('ru').match(/\p{L}{2,}|\p{N}+/gu) ?? []
  return words.length >= 2 && words.every((word) => haystack.includes(foldTitle(word)))
}

export function isParseComplete(parsed: ParsedOperationLine): boolean {
  return (parsed.amount ?? 0) > 0 && Boolean(parsed.categoryId)
}

export function hasParseFields(parsed: ParsedOperationLine): boolean {
  return Boolean(
    (parsed.amount ?? 0) > 0 || parsed.occurredOn || parsed.title || parsed.categoryId,
  )
}

export function parseOperationLine(
  text: string,
  today: string,
  categories: ParseCategory[],
): ParsedOperationLine {
  let rest = text.trim()
  if (!rest) {
    return {}
  }

  const date = extractDate(rest, today)
  if (date) {
    date.pattern.lastIndex = 0
    rest = rest.replace(date.pattern, ' ')
  }

  const amount = extractAmount(rest)
  if (amount) {
    rest = stripOnce(rest, amount.start, amount.end)
  }

  const category = extractCategory(rest, categories)
  if (category) {
    const lower = rest.toLocaleLowerCase('ru')
    const name = category.name.toLocaleLowerCase('ru')
    const index = lower.indexOf(name)
    if (index >= 0) {
      rest = stripOnce(rest, index, index + name.length)
    }
  }

  const title = cleanupTitle(rest)
  return {
    ...(amount ? { amount: amount.amount } : {}),
    ...(date ? { occurredOn: date.occurredOn } : {}),
    ...(title ? { title } : {}),
    ...(category ? { categoryId: category.categoryId } : {}),
    ...(amount && category ? { confidence: 1 } : {}),
  }
}

export function mergeParsedOperationLine(
  local: ParsedOperationLine,
  remote: ParsedOperationLine,
  categories: ParseCategory[],
  source = '',
): ParsedOperationLine {
  const allowed = new Set(categories.map((item) => item.id))
  const categoryId =
    (local.categoryId && allowed.has(local.categoryId) ? local.categoryId : undefined) ??
    (remote.categoryId && allowed.has(remote.categoryId) ? remote.categoryId : undefined)
  const amount = local.amount ?? remote.amount
  const occurredOn = local.occurredOn ?? remote.occurredOn
  const remoteTitle = remote.title?.trim()
  const title =
    (remoteTitle && isTitleGrounded(remoteTitle, source) ? remoteTitle : undefined) ||
    local.title?.trim()
  const parsed: ParsedOperationLine = {
    ...(amount && amount > 0 ? { amount: roundMoney(amount) } : {}),
    ...(occurredOn ? { occurredOn } : {}),
    ...(title ? { title } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(typeof remote.confidence === 'number' && Number.isFinite(remote.confidence)
      ? { confidence: remote.confidence }
      : local.confidence != null
        ? { confidence: local.confidence }
        : {}),
  }
  if (isParseComplete(parsed) && parsed.confidence == null) {
    parsed.confidence = 1
  }
  return parsed
}
