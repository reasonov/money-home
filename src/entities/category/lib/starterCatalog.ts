import type { CategoryIconKey, CategoryKind } from '../model/types'

export type StarterCategoryDef = {
  key: string
  name: string
  icon: CategoryIconKey
}

export type StarterGroupDef = {
  key: string
  kind: CategoryKind
  name: string
  color: string
  categories: StarterCategoryDef[]
}

export const STARTER_CATALOG: StarterGroupDef[] = [
  {
    key: 'food',
    kind: 'expense',
    name: 'Еда',
    color: '#15803D',
    categories: [
      { key: 'food-grocery', name: 'Продукты', icon: 'grocery' },
      { key: 'food-dining', name: 'Кафе', icon: 'dining' },
      { key: 'food-coffee', name: 'Кофе', icon: 'coffee' },
    ],
  },
  {
    key: 'transport',
    kind: 'expense',
    name: 'Транспорт',
    color: '#1D4ED8',
    categories: [
      { key: 'transport-car', name: 'Авто', icon: 'transport' },
      { key: 'transport-taxi', name: 'Такси', icon: 'taxi' },
      { key: 'transport-transit', name: 'Общественный транспорт', icon: 'bus' },
    ],
  },
  {
    key: 'home',
    kind: 'expense',
    name: 'Дом',
    color: '#334155',
    categories: [
      { key: 'home-utilities', name: 'Коммуналка', icon: 'utilities' },
      { key: 'home-phone', name: 'Связь', icon: 'phone' },
      { key: 'home-repair', name: 'Ремонт', icon: 'repair' },
    ],
  },
  {
    key: 'shopping',
    kind: 'expense',
    name: 'Покупки',
    color: '#C2410C',
    categories: [
      { key: 'shopping-clothes', name: 'Одежда', icon: 'clothes' },
      { key: 'shopping-gadgets', name: 'Техника', icon: 'gadgets' },
      { key: 'shopping-beauty', name: 'Красота', icon: 'beauty' },
    ],
  },
  {
    key: 'health',
    kind: 'expense',
    name: 'Здоровье',
    color: '#B91C1C',
    categories: [
      { key: 'health-pharmacy', name: 'Аптека', icon: 'pharmacy' },
      { key: 'health-sport', name: 'Спорт', icon: 'sport' },
    ],
  },
  {
    key: 'leisure',
    kind: 'expense',
    name: 'Досуг',
    color: '#7C3AED',
    categories: [
      { key: 'leisure-fun', name: 'Развлечения', icon: 'entertainment' },
      { key: 'leisure-gifts', name: 'Подарки', icon: 'gifts' },
    ],
  },
  {
    key: 'other',
    kind: 'expense',
    name: 'Другое',
    color: '#64748B',
    categories: [{ key: 'other-other', name: 'Другое', icon: 'other' }],
  },
  {
    key: 'income',
    kind: 'income',
    name: 'Поступления',
    color: '#047857',
    categories: [
      { key: 'income-salary', name: 'Зарплата', icon: 'salary' },
      { key: 'income-freelance', name: 'Подработка', icon: 'freelance' },
      { key: 'income-cashback', name: 'Кэшбэк', icon: 'cashback' },
      { key: 'income-other', name: 'Другое', icon: 'other' },
    ],
  },
]
