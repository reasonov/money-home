import { formatMoney } from '@/shared'
import type { RepeatSuggestion } from '@/entities/transaction'

const WEEKDAY_DATIVE = [
  'воскресеньям',
  'понедельникам',
  'вторникам',
  'средам',
  'четвергам',
  'пятницам',
  'субботам',
]

export function repeatSuggestionTitle(item: RepeatSuggestion): string {
  if (item.type === 'favorite') {
    return 'Добавить в избранное?'
  }
  return item.kind === 'income' ? 'Регулярное пополнение?' : 'Регулярный расход?'
}

export function repeatSuggestionMessage(item: RepeatSuggestion): string {
  const money = formatMoney(item.amount)
  if (item.type === 'favorite') {
    const name = item.title ? `«${item.title}» ` : ''
    return `Операция ${name}на ${money} повторяется. Добавить в избранное?`
  }
  const kindLabel = item.kind === 'income' ? 'доход' : 'расход'
  const action =
    item.kind === 'income' ? 'Добавить регулярное пополнение?' : 'Добавить регулярный расход?'
  if (item.frequency === 'weekly' && item.weekday != null) {
    return `Похоже, ${kindLabel} ${money} по ${WEEKDAY_DATIVE[item.weekday]} повторяется. ${action}`
  }
  return `Похоже, ${kindLabel} ${money} ${item.monthDay}-го числа повторяется. ${action}`
}
