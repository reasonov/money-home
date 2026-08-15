import { describe, expect, it } from 'vitest'
import { detectInstallPlatform, isIosSafari, isStandaloneDisplay } from '../detect'

describe('detectInstallPlatform', () => {
  it('detects iPhone Safari', () => {
    expect(detectInstallPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(
      'ios',
    )
  })

  it('detects iPadOS desktop UA', () => {
    expect(
      detectInstallPlatform({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe('ios')
  })

  it('detects Android', () => {
    expect(detectInstallPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0' })).toBe(
      'android',
    )
  })

  it('returns null on desktop', () => {
    expect(
      detectInstallPlatform({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBeNull()
  })
})

describe('isIosSafari', () => {
  it('is true for Safari and false for Chrome on iOS', () => {
    expect(
      isIosSafari({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0' }, 'ios'),
    ).toBe(true)
    expect(
      isIosSafari({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.0.0' }, 'ios'),
    ).toBe(false)
  })
})

describe('isStandaloneDisplay', () => {
  it('detects iOS standalone and display-mode', () => {
    expect(isStandaloneDisplay({ userAgent: 'iPhone', standalone: true })).toBe(true)
    expect(
      isStandaloneDisplay({ userAgent: 'Android' }, (query) => ({
        matches: query === '(display-mode: standalone)',
      })),
    ).toBe(true)
    expect(
      isStandaloneDisplay({ userAgent: 'Android' }, () => ({ matches: false })),
    ).toBe(false)
  })
})
