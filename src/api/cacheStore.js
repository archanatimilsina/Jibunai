/**
 * Persistence tier for the resource cache.
 *
 * - Memory tier: fast, synchronous, the source of truth while the app runs.
 * - Disk tier: AsyncStorage, survives app restarts.
 *
 * Only JSON-safe payloads are stored (the API returns ISO strings / plain objects,
 * so a JSON round trip is lossless).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'jibunai:cache:';
const INDEX_KEY = 'jibunai:cache:index';

export const SCHEMA_VERSION = 1;

/** Entries larger than this are kept in memory only. */
const MAX_ENTRY_BYTES = 512 * 1024;
/** Soft cap for the whole cache — AsyncStorage is ~6 MB on Android. */
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

const memory = new Map(); // key -> { v, data, fetchedAt, updatedAt }
const index = new Map(); // key -> { updatedAt, bytes }
let indexLoaded = false;
let writeChain = Promise.resolve();

const storageKey = (key) => `${PREFIX}${key}`;

const estimateBytes = (value) => {
  try {
    const s = JSON.stringify(value) ?? '';
    // JSON length counts UTF-16 code units — TextEncoder gives real bytes.
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
    return s.length;
  } catch {
    return 0;
  }
};

async function loadIndex() {
  if (indexLoaded) return;
  indexLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.entries(parsed || {}).forEach(([k, v]) => index.set(k, v));
  } catch {
    /* corrupt index — rebuild it lazily */
  }
}

async function saveIndex() {
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(Object.fromEntries(index)));
  } catch {
    /* storage full — pruning will retry later */
  }
}

/** Drop the least recently updated entries until we are back under the cap. */
async function prune() {
  await loadIndex();
  let total = 0;
  index.forEach((v) => {
    total += v.bytes || 0;
  });
  if (total <= MAX_TOTAL_BYTES) return;

  const sorted = [...index.entries()].sort((a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
  for (const [key, meta] of sorted) {
    if (total <= MAX_TOTAL_BYTES) break;
    try {
      await AsyncStorage.removeItem(storageKey(key));
    } catch { /* ignore */ }
    index.delete(key);
    total -= meta.bytes || 0;
  }
  await saveIndex();
}

/** Read an entry from disk (falls back to memory). Returns null when absent/corrupt. */
export async function hydrate(key) {
  if (memory.has(key)) return memory.get(key);
  await loadIndex();
  try {
    const raw = await AsyncStorage.getItem(storageKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || entry.v !== SCHEMA_VERSION || !('data' in entry)) {
      // stale schema or corrupt payload — drop it
      await AsyncStorage.removeItem(storageKey(key)).catch(() => {});
      index.delete(key);
      return null;
    }
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

/** Write an entry to memory + disk. */
export function persist(key, entry) {
  const record = { ...entry, v: SCHEMA_VERSION };
  memory.set(key, record);

  const bytes = estimateBytes(record.data);
  writeChain = writeChain
    .then(async () => {
      if (bytes > MAX_ENTRY_BYTES) return; // too big for disk — memory only
      try {
        await AsyncStorage.setItem(storageKey(key), JSON.stringify(record));
        index.set(key, { updatedAt: record.updatedAt || Date.now(), bytes });
        await saveIndex();
        await prune();
      } catch {
        /* storage full or unavailable — the in-memory copy still works */
      }
    })
    .catch(() => {});

  return record;
}

/** Remove one entry from both tiers. */
export async function evict(key) {
  memory.delete(key);
  index.delete(key);
  try {
    await AsyncStorage.removeItem(storageKey(key));
  } catch { /* ignore */ }
}

/** Wipe every cached entry (used by "clear cache" / sign-out style actions). */
export async function clearAll() {
  memory.clear();
  index.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch { /* ignore */ }
  await saveIndex();
}

/** Warm the memory tier with everything on disk (called during the splash). */
export async function preload() {
  await loadIndex();
  const keys = [...index.keys()];
  await Promise.all(
    keys.map(async (key) => {
      if (memory.has(key)) return;
      try {
        const raw = await AsyncStorage.getItem(storageKey(key));
        if (!raw) return;
        const entry = JSON.parse(raw);
        if (entry && entry.v === SCHEMA_VERSION) memory.set(key, entry);
      } catch { /* ignore */ }
    }),
  );
  return memory.size;
}

/** Total bytes currently persisted (diagnostics). */
export async function cacheSize() {
  await loadIndex();
  let total = 0;
  index.forEach((v) => {
    total += v.bytes || 0;
  });
  return total;
}
