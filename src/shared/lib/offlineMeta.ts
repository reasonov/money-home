const localOnlyIds = new Set<string>()
const skippedDueKeys = new Set<string>()

export function getLocalOnlyIds(): Set<string> {
  return localOnlyIds
}

export function getSkippedDueKeys(): Set<string> {
  return skippedDueKeys
}

export function setSkippedDueKeys(keys: string[]): void {
  skippedDueKeys.clear()
  for (const key of keys) {
    skippedDueKeys.add(key)
  }
}

export function rememberSkippedDue(key: string): void {
  skippedDueKeys.add(key)
}

export function clearSkippedDueKeys(): void {
  skippedDueKeys.clear()
}

export function isLocalOnlyId(id: string): boolean {
  return localOnlyIds.has(id)
}

export function addLocalOnlyId(id: string): void {
  localOnlyIds.add(id)
}

export function clearLocalOnlyIds(): void {
  localOnlyIds.clear()
}
