import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ensureFresh,
  getEntry,
  hydrateResource,
  mutate as cacheMutate,
  refresh as cacheRefresh,
  register,
  setData,
  subscribe,
} from '../api/cache';

/**
 * Read a cached resource.
 *
 * - renders cached data on the very first frame (no spinner when we have a copy)
 * - revalidates in the background when the cached copy is stale
 * - `mutate` applies an optimistic update to the cache (persisted + broadcast)
 *
 * @param key       cache key
 * @param fetcher   async () => data
 * @param options   { ttl, enabled, errorMessage, initial }
 */
export default function useCachedResource(key, fetcher, options = {}) {
  const {
    ttl = 60_000,
    enabled = true,
    errorMessage = 'Could not load this right now.',
    offlineMessage = 'Showing your saved copy — could not reach the server.',
    initial = null,
  } = options;

  const [entry, setEntry] = useState(() => getEntry(key));
  const [refreshing, setRefreshing] = useState(false);
  const [fetching, setFetching] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const hasData = entry ? entry.data !== null && entry.data !== undefined : false;

  useEffect(() => {
    if (!enabled) return undefined;

    register(key, () => fetcherRef.current(), ttl);

    // switching resources must not show the previous resource's data
    setEntry(getEntry(key));
    setFetching(true);

    const unsub = subscribe(key, (next) => {
      if (next) setEntry(next);
    });

    let alive = true;
    hydrateResource(key).then((stored) => {
      if (!alive) return;
      if (stored) setEntry(stored);
    });

    // background revalidation — never blocks the first paint
    ensureFresh(key, () => fetcherRef.current(), { ttl })
      .then((next) => {
        if (!alive) return;
        if (next) setEntry(next);
      })
      .catch(() => {})
      .finally(() => {
        // a failed first load must not leave the screen spinning forever
        if (alive) setFetching(false);
      });

    return () => {
      alive = false;
      unsub();
    };
  }, [key, ttl, enabled]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await cacheRefresh(key, () => fetcherRef.current(), { ttl, force: true });
      if (next) setEntry(next);
      return next;
    } finally {
      setRefreshing(false);
    }
  }, [key, ttl]);

  /** Optimistic local write: updates the cache, persists it and broadcasts it. */
  const mutate = useCallback(
    (updater) => {
      const next = cacheMutate(key, updater);
      const fresh = getEntry(key);
      if (fresh) setEntry(fresh);
      return next;
    },
    [key],
  );

  /** Replace the cached data outright. */
  const replace = useCallback(
    (data) => {
      setData(key, data);
      const fresh = getEntry(key);
      if (fresh) setEntry(fresh);
    },
    [key],
  );

  const error = entry?.error || null;
  const hasCopy = hasData;

  return {
    data: hasData ? entry.data : initial,
    // only "loading" while there is genuinely nothing to show yet
    loading: enabled && !hasData && fetching,
    refreshing,
    error,
    // with a cached copy the message explains that the copy is being shown
    errorText: error ? (hasCopy ? offlineMessage : errorMessage) : '',
    stale: !!error && hasCopy,
    lastUpdated: entry?.updatedAt || 0,
    refresh,
    mutate,
    replace,
  };
}
