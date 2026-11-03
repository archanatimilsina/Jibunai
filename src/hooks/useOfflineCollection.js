/**
 * useOfflineCollection — full offline CRUD for one list resource.
 *
 * Read path reuses useCachedResource (disk-persisted, stale-while-revalidate:
 * history is always visible offline). Writes are optimistic:
 *   - online  -> applied to the server, cache reconciled with the response
 *   - offline -> applied to the cache instantly + queued in the outbox,
 *                replayed FIFO by the sync engine when connectivity returns
 *
 * Offline-created items get temp ids (`local-…`). Edits to a still-unsynced
 * item merge into the queued POST body instead of queueing a PATCH the server
 * could never resolve; deleting one just drops its queued POST.
 *
 * @param resourceKey  cache key from RESOURCES (e.g. 'notes')
 * @param options { ttl, initial, createPath, itemPath, fromServer?,
 *   updateMethod?, imageField? }
 *   - createPath: POST collection path, e.g. '/goals/'
 *   - itemPath:   (id) => '/goals/123/' for update/remove
 *   - fromServer: optional normalizer (server) => cache item
 *   - updateMethod: 'PATCH' (default) or 'PUT' for servers that need full replace
 *   - imageField: cache field holding the image URL (for file preview optimisms)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import useCachedResource from './useCachedResource';
import { fetchResource } from '../api/resources';
import { getEntry } from '../api/cache';
import { apiSend } from '../api/http';
import { apiSendOffline, isRetryableError } from '../api/offlineSend';
import { apiUpload } from '../api/http';
import { stageFile, cleanupStagedFile } from '../api/fileQueue';
import {
  mergeIntoQueuedCreate,
  mergeUploadIntoQueuedCreate,
  pendingCount,
  removeOp,
  removeOpsForLocalId,
  subscribeOutbox,
  listOps,
  enqueueOp,
} from '../api/outbox';
import { syncNow } from '../api/syncEngine';
import { useOnlineStatus } from '../api/connectivity';

export const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');
const makeLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => new Date().toISOString();

/** Build a multipart body: plain fields as strings + one optional file part. */
function toFormData(fields, file) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    fd.append(k, typeof v === 'string' ? v : Array.isArray(v) ? JSON.stringify(v) : String(v));
  });
  if (file?.uri) {
    fd.append(file.field || 'image', {
      uri: file.uri,
      name: file.name || `upload-${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
    });
  }
  return fd;
}

export default function useOfflineCollection(resourceKey, options = {}) {
  const {
    ttl = 60_000,
    initial = [],
    createPath = null,
    itemPath = null,
    fromServer = null,
    updateMethod = 'PATCH',
    imageField = null,
  } = options;

  const collection = useCachedResource(resourceKey, () => fetchResource(resourceKey), {
    ttl,
    initial,
    errorMessage: 'Could not load. Check your connection.',
    offlineMessage: 'Offline — showing your saved copy.',
  });

  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState(() => pendingCount(resourceKey));

  useEffect(
    () =>
      subscribeOutbox((ops) => {
        setPending(ops.filter((o) => o.resourceKey === resourceKey).length);
      }),
    [resourceKey],
  );

  const normalize = useCallback(
    (server) => (typeof fromServer === 'function' ? fromServer(server) : server),
    [fromServer],
  );

  const create = useCallback(
    async (payload, { optimistic = null } = {}) => {
      if (!createPath) throw new Error(`useOfflineCollection(${resourceKey}): missing createPath`);
      const localId = makeLocalId();
      const optimisticItem = {
        ...(optimistic || payload),
        id: localId,
        _local: true,
        _pending: true,
        created_at: (optimistic || {}).created_at || stamp(),
        updated_at: stamp(),
      };
      collection.mutate((prev) => [optimisticItem, ...(prev || [])]);
      try {
        const res = await apiSendOffline(createPath, 'POST', payload, { resourceKey, localId });
        if (!res.offline) {
          const saved = normalize(res.data);
          collection.mutate((prev) => (prev || []).map((it) => (it && it.id === localId ? saved : it)));
          return { data: saved, offline: false };
        }
        return { data: optimisticItem, offline: true };
      } catch (e) {
        // Validation error — roll back the optimistic row.
        collection.mutate((prev) => (prev || []).filter((it) => it && it.id !== localId));
        throw e;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resourceKey, createPath, normalize],
  );

  const update = useCallback(
    async (id, payload, { patchPath = null, method = null } = {}) => {
      const opMethod = method || updateMethod;
      const path = patchPath || (itemPath ? itemPath(id) : null);
      if (!path) throw new Error(`useOfflineCollection(${resourceKey}): missing itemPath`);
      // Still-unsynced item: fold the edit into its queued POST.
      if (isLocalId(id)) {
        collection.mutate((prev) =>
          (prev || []).map((it) =>
            it && it.id === id ? { ...it, ...payload, _pending: true, updated_at: stamp() } : it,
          ),
        );
        await mergeIntoQueuedCreate(id, payload);
        return { data: null, offline: true };
      }
      const prev = getEntry(resourceKey)?.data || [];
      const snapshot = prev.find((it) => it && it.id === id);
      collection.mutate((list) =>
        (list || []).map((it) =>
          it && it.id === id ? { ...it, ...payload, _pending: true, updated_at: stamp() } : it,
        ),
      );
      try {
        const res = await apiSendOffline(path, opMethod, payload, { resourceKey, targetId: id });
        if (!res.offline) {
          const saved = normalize(res.data);
          collection.mutate((list) => (list || []).map((it) => (it && it.id === id ? saved : it)));
          return { data: saved, offline: false };
        }
        return { data: null, offline: true };
      } catch (e) {
        if (isRetryableError(e)) throw e; // already queued by apiSendOffline
        // Validation error — restore the snapshot.
        collection.mutate((list) => (list || []).map((it) => (it && it.id === id ? snapshot : it)));
        throw e;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resourceKey, itemPath, updateMethod],
  );

  const remove = useCallback(
    async (id, { deletePath = null } = {}) => {
      const path = deletePath || (itemPath ? itemPath(id) : null);
      if (!path) throw new Error(`useOfflineCollection(${resourceKey}): missing itemPath`);
      if (isLocalId(id)) {
        collection.mutate((prev) => (prev || []).filter((it) => it && it.id !== id));
        await removeOpsForLocalId(id);
        return { offline: true };
      }
      const snapshot = getEntry(resourceKey)?.data;
      collection.mutate((prev) => (prev || []).filter((it) => it && it.id !== id));
      try {
        const res = await apiSendOffline(path, 'DELETE', null, { resourceKey, targetId: id });
        if (!res.offline) return { offline: false };
        return { offline: true };
      } catch (e) {
        if (e?.status === 404) return { offline: false }; // already gone server-side
        if (isRetryableError(e)) throw e; // already queued
        collection.replace(snapshot ?? initial);
        throw e;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resourceKey, itemPath],
  );

  /**
   * Multipart create with an optional image (archive memories, day logs).
   * The file is staged into persistent storage first, shown instantly as a
   * local preview, uploaded now when online, or queued with the fields when
   * offline and uploaded by the sync engine on replay.
   *
   * @param fields plain text fields
   * @param file   { uri, name, type, field } | null
   */
  const createWithFile = useCallback(
    async (fields, file = null) => {
      if (!createPath) throw new Error(`useOfflineCollection(${resourceKey}): missing createPath`);
      const localId = makeLocalId();
      let stagedUri = null;
      if (file?.uri) stagedUri = await stageFile(file.uri, file.name);
      const optimisticItem = {
        ...fields,
        id: localId,
        _local: true,
        _pending: true,
        ...(imageField && stagedUri ? { [imageField]: stagedUri, _pendingFile: true } : {}),
        created_at: stamp(),
        updated_at: stamp(),
      };
      collection.mutate((prev) => [optimisticItem, ...(prev || [])]);
      const uploadNow = async () => {
        const fd = toFormData(fields, file ? { ...file, uri: stagedUri || file.uri } : null);
        return apiUpload(createPath, fd, { method: 'POST' });
      };
      try {
        const saved = normalize(await uploadNow());
        collection.mutate((prev) => (prev || []).map((it) => (it && it.id === localId ? saved : it)));
        if (stagedUri) cleanupStagedFile(stagedUri);
        return { data: saved, offline: false };
      } catch (e) {
        if (!isRetryableError(e)) {
          collection.mutate((prev) => (prev || []).filter((it) => it && it.id !== localId));
          if (stagedUri) cleanupStagedFile(stagedUri);
          throw e;
        }
        await enqueueOp({
          resourceKey,
          method: 'POST',
          path: createPath,
          body: fields,
          localId,
          upload: file ? { field: file.field, fileUri: stagedUri || file.uri, fileName: file.name, mimeType: file.type } : null,
        });
        return { data: optimisticItem, offline: true };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resourceKey, createPath, imageField],
  );

  /**
   * Multipart update with an optional replacement image.
   * @param method 'PATCH' (default) or 'PUT'
   */
  const updateWithFile = useCallback(
    async (id, fields, file = null, { patchPath = null, method = null } = {}) => {
      const opMethod = method || updateMethod;
      const path = patchPath || (itemPath ? itemPath(id) : null);
      if (!path) throw new Error(`useOfflineCollection(${resourceKey}): missing itemPath`);
      let stagedUri = null;
      if (file?.uri) stagedUri = await stageFile(file.uri, file.name);
      if (isLocalId(id)) {
        collection.mutate((prev) =>
          (prev || []).map((it) =>
            it && it.id === id
              ? {
                  ...it, ...fields, _pending: true, updated_at: stamp(),
                  ...(imageField && stagedUri ? { [imageField]: stagedUri, _pendingFile: true } : {}),
                }
              : it,
          ),
        );
        // Fold text into the queued POST; the queued upload keeps the newest file.
        await mergeIntoQueuedCreate(id, fields);
        if (stagedUri) {
          await mergeUploadIntoQueuedCreate(id, {
            field: file.field, fileUri: stagedUri, fileName: file.name, mimeType: file.type,
          });
        }
        return { data: null, offline: true };
      }
      const snapshot = (getEntry(resourceKey)?.data || []).find((it) => it && it.id === id);
      collection.mutate((list) =>
        (list || []).map((it) =>
          it && it.id === id
            ? {
                ...it, ...fields, _pending: true, updated_at: stamp(),
                ...(imageField && stagedUri ? { [imageField]: stagedUri, _pendingFile: true } : {}),
              }
            : it,
        ),
      );
      try {
        const fd = toFormData(fields, file ? { ...file, uri: stagedUri || file.uri } : null);
        const saved = normalize(await apiUpload(path, fd, { method: opMethod }));
        collection.mutate((list) => (list || []).map((it) => (it && it.id === id ? saved : it)));
        if (stagedUri) cleanupStagedFile(stagedUri);
        return { data: saved, offline: false };
      } catch (e) {
        if (!isRetryableError(e)) {
          collection.mutate((list) => (list || []).map((it) => (it && it.id === id ? snapshot : it)));
          if (stagedUri) cleanupStagedFile(stagedUri);
          throw e;
        }
        await enqueueOp({
          resourceKey,
          method: opMethod,
          path,
          body: fields,
          targetId: id,
          upload: file ? { field: file.field, fileUri: stagedUri || file.uri, fileName: file.name, mimeType: file.type } : null,
        });
        return { data: null, offline: true };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resourceKey, itemPath, updateMethod, imageField],
  );
  /**
   * Custom nested write (e.g. /goals/3/days/4/toggle/) with an optimistic
   * list updater. Queued on retryable failure; the resource is invalidated
   * after the replay so server truth wins.
   * Pass `targetId` when the replayed response identifies the parent object,
   * so a PATCH/PUT can merge instead of invalidating.
   */
  const runCustom = useCallback(
    async (path, method, body, { updater = null, targetId = null } = {}) => {
      const snapshot = getEntry(resourceKey)?.data ?? initial;
      if (typeof updater === 'function') {
        collection.mutate(updater);
      }
      try {
        const saved = await apiSend(path, method, body ?? null);
        const normalized = saved && saved.id !== undefined ? normalize(saved) : null;
        if (normalized && typeof updater === 'function') {
          collection.mutate((prev) =>
            Array.isArray(prev)
              ? prev.map((it) => (it && it.id === normalized.id ? normalized : it))
              : normalized,
          );
        }
        return { data: saved, offline: false };
      } catch (e) {
        if (!isRetryableError(e)) {
          if (typeof updater === 'function') collection.replace(snapshot ?? initial);
          throw e;
        }
        await enqueueOp({ resourceKey, method, path, body: body ?? null, targetId });
        return { data: null, offline: true };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resourceKey],
  );

  const sync = useCallback(async () => {
    await syncNow();
    await collection.refresh();
  }, [collection]);

  const queuedOps = useCallback(async () => (await listOps()).filter((o) => o.resourceKey === resourceKey), [resourceKey]);

  return useMemo(
    () => ({
      ...collection,
      items: collection.data ?? initial,
      isOnline,
      pending,
      create,
      createWithFile,
      update,
      updateWithFile,
      remove,
      runCustom,
      sync,
      queuedOps,
      removeQueuedOp: removeOp,
    }),
    [collection, isOnline, pending, create, createWithFile, update, updateWithFile, remove, runCustom, sync, queuedOps, initial],
  );
}
