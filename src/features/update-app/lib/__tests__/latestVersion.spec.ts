import { describe, expect, it } from 'vitest'
import { parseVersionPayload } from '../latestVersion'

describe('parseVersionPayload', () => {
  it('reads a version string', () => {
    expect(parseVersionPayload({ version: 'v1.2.3' })).toBe('v1.2.3')
  })

  it('trims whitespace', () => {
    expect(parseVersionPayload({ version: '  v1.2.3  ' })).toBe('v1.2.3')
  })

  it('rejects empty or invalid payloads', () => {
    expect(parseVersionPayload(null)).toBeNull()
    expect(parseVersionPayload({})).toBeNull()
    expect(parseVersionPayload({ version: '' })).toBeNull()
    expect(parseVersionPayload({ version: 12 })).toBeNull()
  })
})
