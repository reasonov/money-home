import type { GlobalThemeOverrides } from 'naive-ui'
import type { ResolvedTheme } from '../lib/theme'

const FONT = 'Manrope, system-ui, sans-serif'

const light: GlobalThemeOverrides = {
  common: {
    fontFamily: FONT,
    fontFamilyMono: FONT,
    primaryColor: '#0F766E',
    primaryColorHover: '#0D9488',
    primaryColorPressed: '#0F766E',
    primaryColorSuppl: '#0D9488',
    infoColor: '#075985',
    infoColorHover: '#0369A1',
    infoColorPressed: '#075985',
    infoColorSuppl: '#0369A1',
    successColor: '#15803D',
    successColorHover: '#16A34A',
    successColorPressed: '#15803D',
    successColorSuppl: '#16A34A',
    warningColor: '#C2410C',
    warningColorHover: '#EA580C',
    warningColorPressed: '#C2410C',
    warningColorSuppl: '#EA580C',
    errorColor: '#B91C1C',
    errorColorHover: '#DC2626',
    errorColorPressed: '#B91C1C',
    errorColorSuppl: '#DC2626',
    textColorBase: '#0F172A',
    textColor1: '#0F172A',
    textColor2: '#334155',
    textColor3: '#64748B',
    bodyColor: '#F2F5F7',
    cardColor: '#FFFFFF',
    modalColor: '#FFFFFF',
    popoverColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    dividerColor: '#E2E8F0',
    borderRadius: '12px',
    borderRadiusSmall: '12px',
  },
  Button: {
    heightLarge: '48px',
    fontWeightStrong: '600',
    paddingLarge: '0 16px',
  },
  Input: {
    heightLarge: '48px',
  },
  InternalSelection: {
    heightLarge: '48px',
  },
}

const dark: GlobalThemeOverrides = {
  common: {
    fontFamily: FONT,
    fontFamilyMono: FONT,
    primaryColor: '#2A9B90',
    primaryColorHover: '#34B3A6',
    primaryColorPressed: '#2A9B90',
    primaryColorSuppl: '#34B3A6',
    infoColor: '#7DD3FC',
    infoColorHover: '#BAE6FD',
    infoColorPressed: '#7DD3FC',
    infoColorSuppl: '#BAE6FD',
    successColor: '#4ADE80',
    successColorHover: '#86EFAC',
    successColorPressed: '#4ADE80',
    successColorSuppl: '#86EFAC',
    warningColor: '#FB923C',
    warningColorHover: '#FDBA74',
    warningColorPressed: '#FB923C',
    warningColorSuppl: '#FDBA74',
    errorColor: '#F87171',
    errorColorHover: '#FCA5A5',
    errorColorPressed: '#F87171',
    errorColorSuppl: '#FCA5A5',
    textColorBase: '#E8EEF2',
    textColor1: '#E8EEF2',
    textColor2: '#C5D0D8',
    textColor3: '#9AA8B5',
    bodyColor: '#14181C',
    cardColor: '#1E242A',
    modalColor: '#1E242A',
    popoverColor: '#1E242A',
    borderColor: '#2D3640',
    dividerColor: '#2D3640',
    borderRadius: '12px',
    borderRadiusSmall: '12px',
  },
  Button: {
    heightLarge: '48px',
    fontWeightStrong: '600',
    paddingLarge: '0 16px',
  },
  Input: {
    heightLarge: '48px',
  },
  InternalSelection: {
    heightLarge: '48px',
  },
}

export function naiveThemeOverrides(theme: ResolvedTheme): GlobalThemeOverrides {
  return theme === 'dark' ? dark : light
}
