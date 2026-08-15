<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  Apple,
  Baby,
  BadgePercent,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CarTaxiFront,
  CircleHelp,
  Clapperboard,
  Coffee,
  Cookie,
  Droplets,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Hotel,
  House,
  Landmark,
  Laptop,
  MapPin,
  Music,
  PartyPopper,
  PawPrint,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Stethoscope,
  Ticket,
  TrainFront,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
  Wine,
  Wrench,
  Zap,
} from '@lucide/vue'
import type { CategoryIconKey } from '../model/types'

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
  transport: Car,
  bus: Bus,
  train: TrainFront,
  bike: Bike,
  fuel: Fuel,
  taxi: CarTaxiFront,
  home: House,
  furniture: Sofa,
  utilities: Zap,
  water: Droplets,
  repair: Wrench,
  pets: PawPrint,
  kids: Baby,
  health: HeartPulse,
  pharmacy: Pill,
  sport: Dumbbell,
  clinic: Stethoscope,
  shopping: ShoppingBag,
  clothes: Shirt,
  gadgets: Smartphone,
  beauty: Sparkles,
  cart: ShoppingCart,
  entertainment: Clapperboard,
  games: Gamepad2,
  music: Music,
  tickets: Ticket,
  party: PartyPopper,
  education: GraduationCap,
  freelance: Laptop,
  office: Briefcase,
  books: BookOpen,
  travel: Plane,
  hotel: Hotel,
  map: MapPin,
  salary: Banknote,
  investment: TrendingUp,
  cashback: BadgePercent,
  wallet: Wallet,
  savings: PiggyBank,
  bank: Landmark,
  gifts: Gift,
  family: Users,
  phone: Phone,
  other: CircleHelp,
}

const box = computed(() => props.size ?? 32)
const glyph = computed(() => ICONS[props.icon as CategoryIconKey] ?? CircleHelp)
</script>

<template>
  <span class="cat-icon" :style="{ background: color, width: `${box}px`, height: `${box}px` }">
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
