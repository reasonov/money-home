<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from 'vue'
import {
  Apple,
  Baby,
  BadgePercent,
  Banknote,
  Bath,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  BroomSparkles,
  Bus,
  Car,
  CarTaxiFront,
  CircleHelp,
  CircleParking,
  Clapperboard,
  Coffee,
  Cookie,
  CreditCard,
  Croissant,
  Droplets,
  Dumbbell,
  FaceSlightlySmiling,
  Flower,
  Flower2,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  Glasses,
  GraduationCap,
  Hand,
  HeartHandshake,
  HeartPulse,
  Hotel,
  House,
  Key,
  Landmark,
  Laptop,
  MapPin,
  Music,
  Package,
  Palette,
  PartyPopper,
  PawPrint,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  ReceiptRussianRuble,
  Sandwich,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  SportShoe,
  Stethoscope,
  Ticket,
  TrainFront,
  TrainFrontTunnel,
  TreePalm,
  TrendingUp,
  TvMinimal,
  Users,
  UtensilsCrossed,
  Wallet,
  WandSparkles,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from '@lucide/vue'
import { readDocumentTheme } from '@/shared'
import type { CategoryIconKey } from '../model/types'
import { resolveTone } from '../lib/colorFamilies'

const props = defineProps<{
  icon: string
  color: string
  size?: number
}>()

const ICONS: Record<CategoryIconKey, Component> = {
  grocery: ShoppingBasket,
  dining: UtensilsCrossed,
  coffee: Coffee,
  pizza: Pizza,
  wine: Wine,
  sweets: Cookie,
  fruit: Apple,
  bakery: Croissant,
  fastfood: Sandwich,
  delivery: Package,
  transport: Car,
  bus: Bus,
  train: TrainFront,
  metro: TrainFrontTunnel,
  bike: Bike,
  fuel: Fuel,
  taxi: CarTaxiFront,
  parking: CircleParking,
  home: House,
  furniture: Sofa,
  utilities: Zap,
  water: Droplets,
  internet: Wifi,
  rent: Key,
  repair: Wrench,
  cleaning: BroomSparkles,
  pets: PawPrint,
  kids: Baby,
  health: HeartPulse,
  pharmacy: Pill,
  sport: Dumbbell,
  clinic: Stethoscope,
  dentist: FaceSlightlySmiling,
  glasses: Glasses,
  psychology: Brain,
  shopping: ShoppingBag,
  clothes: Shirt,
  shoes: SportShoe,
  gadgets: Smartphone,
  jewelry: Gem,
  cart: ShoppingCart,
  beauty: Sparkles,
  manicure: Hand,
  haircut: Scissors,
  cosmetics: WandSparkles,
  care: Flower2,
  spa: Bath,
  entertainment: Clapperboard,
  games: Gamepad2,
  music: Music,
  tickets: Ticket,
  party: PartyPopper,
  hobby: Palette,
  subscriptions: TvMinimal,
  education: GraduationCap,
  freelance: Laptop,
  office: Briefcase,
  books: BookOpen,
  travel: Plane,
  hotel: Hotel,
  map: MapPin,
  vacation: TreePalm,
  salary: Banknote,
  investment: TrendingUp,
  cashback: BadgePercent,
  wallet: Wallet,
  savings: PiggyBank,
  bank: Landmark,
  credit: CreditCard,
  taxes: ReceiptRussianRuble,
  insurance: ShieldCheck,
  gifts: Gift,
  family: Users,
  phone: Phone,
  charity: HeartHandshake,
  flowers: Flower,
  other: CircleHelp,
}

const box = computed(() => props.size ?? 32)
const glyph = computed(() => ICONS[props.icon as CategoryIconKey] ?? CircleHelp)
const tick = ref(0)
let observer: MutationObserver | undefined

onMounted(() => {
  tick.value += 1
  observer = new MutationObserver(() => {
    tick.value += 1
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onUnmounted(() => observer?.disconnect())

const displayColor = computed(() => {
  void tick.value
  return resolveTone(props.color, readDocumentTheme())
})
</script>

<template>
  <span class="cat-icon" :style="{ background: displayColor, width: `${box}px`, height: `${box}px` }">
    <component :is="glyph" :size="box * 0.55" color="#fff" :stroke-width="1.8" />
  </span>
</template>

<style scoped>
.cat-icon {
  display: inline-grid;
  place-items: center;
  border-radius: 10px;
  flex-shrink: 0;
}
</style>
