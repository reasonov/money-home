export type InstallPlatform = 'ios' | 'android'

type NavigatorLike = {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
  standalone?: boolean
}

export function detectInstallPlatform(nav: NavigatorLike): InstallPlatform | null {
  const isIpadOs = nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1
  if (/iPhone|iPad|iPod/i.test(nav.userAgent) || isIpadOs) {
    return 'ios'
  }
  if (/Android/i.test(nav.userAgent)) {
    return 'android'
  }
  return null
}

export function isIosSafari(nav: NavigatorLike, platform: InstallPlatform | null): boolean {
  if (platform !== 'ios') {
    return false
  }
  return !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//i.test(nav.userAgent)
}

export function isStandaloneDisplay(
  nav: NavigatorLike,
  matchMedia?: (query: string) => { matches: boolean },
): boolean {
  if (nav.standalone === true) {
    return true
  }
  if (!matchMedia) {
    return false
  }
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    matchMedia('(display-mode: minimal-ui)').matches
  )
}
