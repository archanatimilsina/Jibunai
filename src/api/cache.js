/**
 * Resource cache engine.
 *
 * Behaviour: stale-while-revalidate.
 *   - a fresh entry (age < ttl) is served without touching the network
 *   - a stale entry is served instantly and refreshed in the background
 *   - writes are optimistic: the cache is updated + persisted first, the server is
 *     reconciled right after
 *
 * Every screen reads through `useCachedResource`, so a write anywhere in the app
 * updates every open screen instantly.
 */
import { evict, hydrate, persist, preload } from './cacheStore';

const entries = new Map(); // key -> { data, fetchedAt, updatedAt, error }
const inflight = new Map(); // key -> Promise
const subscribers = new Map(); // key -> Set<listener>
const registry = new Map(); // key -> { fetcher, ttl }
const seq = new Map(); // key -> request sequence number

const now = () => Date.now();

const notify = (key) => {
  const entry = entries.get(key);
  const set = subscribers.get(key);
  if (set) set.forEach((cb) => cb(entry));
};

/** Subscribe to a resource key. Returns an unsubscribe function. */
export function subscribe(key, listener) {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(listener);
  return () => {
    const set = subscribers.get(key);
    if (!set) return;
    set.delete(listener);
    if (!set.size) subscribers.delete(key);
  };
}

/** Register a resource so the lifecycle controller can refresh it in the background. */
export function register(key, fetcher, ttl) {
  const prev = registry.get(key);
  registry.set(key, { fetcher, ttl, refs: (prev?.refs || 0) + 1 });
}

/** Release a registration; the key drops out once its last user unmounts. */
export function unregister(key) {
  const prev = registry.get(key);
  if (!prev) return;
  if (prev.refs > 1) registry.set(key, { ...prev, refs: prev.refs - 1 });
  else registry.delete(key);
}

export function getRegistered() {
  return registry;
}

/** Current entry (memory only). */
export function getEntry(key) {
  return entries.get(key) || null;
}

/** Read an entry, hydrating from disk on first access. */
export async function read(key) {
  if (entries.has(key)) return entries.get(key);
  const stored = await hydrate(key);
  if (!stored) return null;
  const entry = {
    data: stored.data,
    fetchedAt: stored.fetchedAt || 0,
    updatedAt: stored.updatedAt || 0,
    error: null,
  };
  entries.set(key, entry);
  return entry;
}

/** Write data into the cache and broadcast it. */
export function setData(key, data, { fetchedAt = now(), persist: shouldPersist = true } = {}) {
  const entry = {
    data,
    fetchedAt,
    updatedAt: now(),
    error: null,
  };
  entries.set(key, entry);
  if (shouldPersist) persist(key, entry);
  notify(key);
  return entry;
}

/**
 * Optimistic local update.
 * `updater` receives the current data and returns the next data.
 * Returns the new data (or the old data when there was nothing cached).
 */
export function mutate(key, updater) {
  const current = entries.get(key);
  const prev = current ? current.data : null;
  const next = typeof updater === 'function' ? updater(prev) : updater;
  if (next === undefined) return prev;
  setData(key, next, { fetchedAt: current ? current.fetchedAt : now() });
  return next;
}

/** Mark a resource as needing a refresh (the next read revalidates). */
export function invalidate(key) {
  const entry = entries.get(key);
  if (!entry) return;
  entry.fetchedAt = 0;
  entry.error = null;
  notify(key);
}

/** Invalidate every known resource. */
export function invalidateAll() {
  entries.forEach((entry) => {
    entry.fetchedAt = 0;
    entry.error = null;
  });
  subscribers.forEach((set, key) => {
    set.forEach((cb) => cb(entries.get(key)));
  });
}

/**
 * Invalidate every resource whose key starts with `prefix`
 * (e.g. every cached variant of the blog list).
 */
export function invalidatePrefix(prefix) {
  entries.forEach((entry, key) => {
    if (!key.startsWith(prefix)) return;
    entry.fetchedAt = 0;
    entry.error = null;
  });
  subscribers.forEach((set, key) => {
    if (!key.startsWith(prefix)) return;
    set.forEach((cb) => cb(entries.get(key)));
  });
}

/**
 * Fetch a resource, deduping concurrent calls and ignoring out-of-order responses.
 */
async function fetchInto(key, fetcher) {
  const token = (seq.get(key) || 0) + 1;
  seq.set(key, token);

  try {
    const data = await fetcher();
    if (seq.get(key) !== token) return entries.get(key); // a newer request won
    setData(key, data, { fetchedAt: now() });
    return entries.get(key);
  } catch (error) {
    if (seq.get(key) !== token) return entries.get(key);
    const entry = entries.get(key) || { data: null, fetchedAt: 0, updatedAt: 0 };
    entry.error = error;
    entries.set(key, entry);
    notify(key);
    throw error;
  }
}

/**
 * Make sure the resource is fresh.
 * @returns the current entry (never null once data exists)
 */
export function ensureFresh(key, fetcher, { ttl = 60_000, force = false } = {}) {
  const entry = entries.get(key);
  const fresh = entry && entry.fetchedAt && now() - entry.fetchedAt < ttl;

  if (fresh && !force) return Promise.resolve(entry);
  if (inflight.has(key)) return inflight.get(key);

  const promise = fetchInto(key, fetcher)
    .catch(() => entries.get(key) || null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Force a refresh (pull-to-refresh / after a write). */
export function refresh(key, fetcher, opts = {}) {
  return ensureFresh(key, fetcher, { ...opts, force: true });
}

/** Re-read a resource from disk (cold start hydration). */
export async function hydrateResource(key) {
  const entry = await read(key);
  if (entry) notify(key);
  return entry;
}

/** Warm every persisted entry into memory. */
export function preloadCache() {
  return preload();
}

/** Drop a resource completely (memory + disk). */
export async function dropResource(key) {
  entries.delete(key);
  inflight.delete(key);
  await evict(key);
  notify(key);
}

/**
 * Revalidate every resource whose TTL has expired.
 * @returns the number of resources that were refreshed
 */
export async function refreshStale() {
  const pending = [];
  for (const [key, meta] of registry.entries()) {
    const entry = entries.get(key);
    const expired = !entry || !entry.fetchedAt || now() - entry.fetchedAt >= (meta.ttl || 60_000);
    if (!expired) continue;
    pending.push(
      ensureFresh(key, meta.fetcher, { ttl: meta.ttl })
        .then(() => 1)
        .catch(() => 0),
    );
  }
  const results = await Promise.all(pending);
  return results.reduce((sum, n) => sum + n, 0);
}

/** Force a refresh of every registered resource. */
export function refreshAll() {
  const pending = [];
  for (const [key, meta] of registry.entries()) {
    pending.push(
      ensureFresh(key, meta.fetcher, { ttl: meta.ttl, force: true })
        .then(() => 1)
        .catch(() => 0),
    );
  }
  return Promise.all(pending).then((r) => r.reduce((sum, n) => sum + n, 0));
}
