const STORAGE_VERSION = 1;

type StorageEnvelope<T> = {
  data: T;
  version: typeof STORAGE_VERSION;
};

export function readVersionedStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorageEnvelope<T> | T;

    if (
      parsed &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      'data' in parsed &&
      parsed.version === STORAGE_VERSION
    ) {
      return parsed.data;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

export function writeVersionedStorage<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  const envelope: StorageEnvelope<T> = { data, version: STORAGE_VERSION };
  localStorage.setItem(key, JSON.stringify(envelope));
}

export function getStoredUserId() {
  const user = readVersionedStorage<{ uid?: string }>('eojob_current_user');
  return user?.uid?.trim() || undefined;
}

export function getScopedStorageKey(baseKey: string, ownerId?: string) {
  return `${baseKey}:${ownerId || getStoredUserId() || 'guest'}`;
}

export function createStableRecordId(prefix: string, ...parts: Array<string | undefined>) {
  const source = parts.map((part) => part?.trim().toLowerCase() ?? '').join('|');
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function uniqueByKey<T>(items: T[], getKey: (item: T) => string) {
  const uniqueItems = new Map<string, T>();
  for (const item of items) {
    const key = getKey(item);
    if (!uniqueItems.has(key)) uniqueItems.set(key, item);
  }
  return Array.from(uniqueItems.values());
}

export function removeUndefinedValues<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;
}
