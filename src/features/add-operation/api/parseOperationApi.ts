import { supabase } from '@/shared'
import {
  mergeParsedOperationLine,
  type ParseCategory,
  type ParsedOperationLine,
} from '../lib/parseOperationLine'

export type ParseOperationRequest = {
  accountId: string
  kind: 'expense' | 'income'
  today: string
  text: string
  categories: ParseCategory[]
}

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim().slice(0, max)
}

function money(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return value
}

function parseRemote(
  raw: unknown,
  categories: ParseCategory[],
  source: string,
): ParsedOperationLine {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const item = raw as Record<string, unknown>
  const occurredOn = clip(item.occurredOn, 10)
  const title = clip(item.title, 80)
  const categoryId = clip(item.categoryId, 64)
  const confidence =
    typeof item.confidence === 'number' && Number.isFinite(item.confidence)
      ? item.confidence
      : undefined
  return mergeParsedOperationLine(
    {},
    {
      ...(money(item.amount) != null ? { amount: money(item.amount) } : {}),
      ...(/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) ? { occurredOn } : {}),
      ...(title ? { title } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(confidence != null ? { confidence } : {}),
    },
    categories,
    source,
  )
}

export async function fetchParsedOperationLine(
  input: ParseOperationRequest,
): Promise<ParsedOperationLine> {
  const { data, error } = await supabase.functions.invoke<unknown>('parse-operation', {
    body: input,
  })
  if (error) {
    throw error
  }
  return parseRemote(data, input.categories, input.text)
}
