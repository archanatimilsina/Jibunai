/**
 * useLocalCollection — full offline CRUD for one list resource, no server.
 *
 * Reads and writes go only to the local cache tier (AsyncStorage via
 * ../api/cache). There is no createPath/itemPath, no outbox queue, no sync
 * engine, and no network call of any kind. Everything persists to disk and
 * survives app restarts.
 *
 * @param resourceKey  cache key from RESOURCES (e.g. 'notes', 'archive', 'daylogs')
 * @param options { initial }
 */
import { useCallback, useMemo, useState, useEffect } from 'react';

import { getEntry, mutate as cacheMutate, subscribe, hydrateResource } from '../api/cache';
import { stageFile } from '../api/fileQueue';

const makeLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => new Date().toISOString();

/** True when an id was generated locally (never saw the server). */
export const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');

export default function useLocalCollection(resourceKey, options = {}) {
  const { initial = [] } = options;

  const [entry, setEntry] = useState(() => getEntry(resourceKey));

  // Hydrate from disk on mount and stay subscribed to broadcast writes.
  useEffect(() => {
    hydrateResource(resourceKey).then((stored) => {
      if (stored) setEntry(stored);
    });
    const unsub = subscribe(resourceKey, (next) => {
      if (next) setEntry(next);
    });
    return () => unsub();
  }, [resourceKey]);

  const data = entry ? entry.data : initial;

  /** Add an item to the local list. Returns { data, offline: true }. */
  const create = useCallback(
    (payload, { optimistic = null } = {}) => {
      const localId = makeLocalId();
      const item = {
        ...(optimistic || payload),
        id: localId,
        _local: true,
        created_at: stamp(),
        updated_at: stamp(),
      };
      cacheMutate(resourceKey, (prev) => [item, ...(prev || [])]);
      return { data: item, offline: true };
    },
    [resourceKey],
  );

  /** Add an item with a staged local image file. Returns { data, offline: true }. */
  const createWithFile = useCallback(
    async (fields, file = null) => {
      const localId = makeLocalId();
      let stagedUri = null;
      if (file?.uri) stagedUri = await stageFile(file.uri, file.name);
      const item = {
        ...fields,
        id: localId,
        _local: true,
        ...(stagedUri ? { image: stagedUri, _pendingFile: true } : {}),
        created_at: stamp(),
        updated_at: stamp(),
      };
      cacheMutate(resourceKey, (prev) => [item, ...(prev || [])]);
      return { data: item, offline: true };
    },
    [resourceKey],
  );

  /** Update an item in the local list. Returns { data: null, offline: true }. */
  const update = useCallback(
    (id, payload) => {
      cacheMutate(resourceKey, (list) =>
        (list || []).map((it) =>
          it && it.id === id ? { ...it, ...payload, updated_at: stamp() } : it,
        ),
      );
      return { data: null, offline: true };
    },
    [resourceKey],
  );

  /** Update an item with a staged local image file. Returns { data: null, offline: true }. */
  const updateWithFile = useCallback(
    async (id, fields, file = null, _opts = {}) => {
      let stagedUri = null;
      if (file?.uri) stagedUri = await stageFile(file.uri, file.name);
      cacheMutate(resourceKey, (list) =>
        (list || []).map((it) =>
          it && it.id === id
            ? {
                ...it,
                ...fields,
                ...(stagedUri ? { image: stagedUri } : {}),
                updated_at: stamp(),
              }
            : it,
        ),
      );
      return { data: null, offline: true };
    },
    [resourceKey],
  );

  /** Remove an item from the local list. Returns { offline: true }. */
  const remove = useCallback(
    (id) => {
      cacheMutate(resourceKey, (prev) =>
        (prev || []).filter((it) => it && it.id !== id),
      );
      return { offline: true };
    },
    [resourceKey],
  );

  return useMemo(
    () => ({
      data,
      items: data ?? initial,
      loading: false,
      refreshing: false,
      errorText: '',
      refresh: async () => {},
      isOnline: true,
      pending: 0,
      create,
      createWithFile,
      update,
      updateWithFile,
      remove,
      sync: async () => {},
      queuedOps: async () => [],
      removeQueuedOp: () => {},
    }),
    [data, initial, create, createWithFile, update, updateWithFile, remove],
  );
}
