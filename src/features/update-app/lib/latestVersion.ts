export function parseVersionPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('version' in data)) {
    return null
  }
  const version = data.version
  return typeof version === 'string' && version.trim() ? version.trim() : null
}

export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      return null
    }
    return parseVersionPayload(await response.json())
  } catch {
    return null
  }
}
