/**
 * Sync engine: replays the offline outbox FIFO when the backend is reachable.
 *
 * Each op runs through apiSend. Results are reconciled into the resource cache:
 *   - POST with localId  -> swap the temp item for the server object
 *   - PATCH/PUT          -> merge the server object over the optimistic one
 *   - DELETE             -> ensure the item stays gone
 *   - nested actions (e.g. /goals/3/days/4/toggle/) return a parent object or
 *     nothing useful -> invalidate the resource so the next read refetches it
 *
 * Validation errors (4xx) drop the op and invalidate the resource so the UI
 * snaps back to server truth. Auth errors (401) stop the run — the session is
 * broken and replaying would just burn through the queue.
 */
import { ApiError, apiSend, apiUpload } from './http';
import { RESOURCES } from './resources';
import { getEntry, invalidatePrefix, mutate as cacheMutate, refresh as cacheRefresh } from './cache';
import { resourceFetcher } from './resources';
import { cleanupStagedFile, stagedFileExists } from './fileQueue';
import {
  bumpRetries,
  listOps,
  removeOp,
  removeOpsForLocalId,
} from './outbox';
import { isOnlineNow, probeOnline, subscribeOnline } from './connectivity';
import { AppState } from 'react-native';

let running = false;
let started = false;
let retryTimer = null;

const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');

const fetcherFor = (resourceKey) => {
  try {
    return resourceFetcher(resourceKey);
  } catch {
    return null;
  }
};

function reconcileSuccess(resourceKey, op, serverData) {
  if (!resourceKey) return;
  try {
    const cached = getEntry(resourceKey)?.data;
    const isList = Array.isArray(cached);
    // Paginated/object caches (blog pages, stats) can't merge item-wise —
    // mark them stale so the next read refetches server truth.
    if (!isList) {
      invalidatePrefix(resourceKey);
      return;
    }
    if (op.method === 'POST' && op.localId && serverData && serverData.id !== undefined) {
      cacheMutate(resourceKey, (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (!list.some((it) => it && it.id === serverData.id)) {
          return list.map((it) => (it && it.id === op.localId ? serverData : it));
        }
        return list.filter((it) => it && it.id !== op.localId);
      });
      return;
    }
    const id = serverData && serverData.id !== undefined ? serverData.id : op.targetId;
    if ((op.method === 'PATCH' || op.method === 'PUT') && id !== undefined && serverData) {
      cacheMutate(resourceKey, (prev) => {
        if (Array.isArray(prev)) {
          return prev.map((it) => (it && it.id === id ? { ...it, ...serverData } : it));
        }
        return prev && typeof prev === 'object' ? { ...prev, ...serverData } : serverData;
      });
      return;
    }
    if (op.method === 'DELETE' && id !== undefined) {
      cacheMutate(resourceKey, (prev) => {
        if (Array.isArray(prev)) return prev.filter((it) => it && it.id !== id);
        return prev;
      });
      return;
    }
    // Unrecognized shape (nested action, stats object, …) — mark stale.
    invalidatePrefix(resourceKey);
  } catch {
    invalidatePrefix(resourceKey);
  }
}

function reconcileFailure(resourceKey) {
  if (resourceKey) invalidatePrefix(resourceKey);
}

/**
 * Replay a queued multipart op: rebuild the FormData from the stored fields
 * plus the staged file (when it still exists) and upload it.
 */
async function replayUpload(op) {
  const fd = new FormData();
  Object.entries(op.body || {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    fd.append(k, typeof v === 'string' ? v : Array.isArray(v) ? JSON.stringify(v) : String(v));
  });
  const up = op.upload || {};
  if (up.fileUri && (await stagedFileExists(up.fileUri))) {
    fd.append(up.field || 'image', {
      uri: up.fileUri,
      name: up.fileName || `upload-${Date.now()}.jpg`,
      type: up.mimeType || 'image/jpeg',
    });
  }
  // If the staged file is gone (OS purge), the text fields still sync —
  // the entry keeps its local preview until the user re-attaches the image.
  return apiUpload(op.path, fd, { method: op.method });
}

/** Replay every queued op in order. Returns the number of ops applied. */
export async function processOutbox() {
  if (running) return 0;
  if (!isOnlineNow()) {
    const reachable = await probeOnline().catch(() => false);
    if (!reachable) return 0;
  }
  running = true;
  let applied = 0;
  try {
    const ops = await listOps();
    for (const op of ops) {
      // A DELETE for an item whose create never synced cancels the create.
      if (op.method === 'DELETE' && isLocalId(op.targetId)) {
        await removeOpsForLocalId(op.targetId);
        await removeOp(op.id);
        if (op.resourceKey) {
          cacheMutate(op.resourceKey, (prev) =>
            Array.isArray(prev) ? prev.filter((it) => it && it.id !== op.targetId) : prev,
          );
        }
        applied += 1;
        continue;
      }
      try {
        let serverData;
        if (op.upload) {
          serverData = await replayUpload(op);
          if (op.upload.fileUri) cleanupStagedFile(op.upload.fileUri);
        } else {
          serverData = await apiSend(op.path, op.method, op.body ?? null);
        }
        await removeOp(op.id);
        reconcileSuccess(op.resourceKey, op, serverData);
        applied += 1;
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 401) break; // session broken — keep the queue, stop burning it
        if (status === 404 && (op.method === 'DELETE' || op.method === 'PATCH' || op.method === 'PUT')) {
          await removeOp(op.id); // already gone server-side — treat as applied
          reconcileFailure(op.resourceKey);
          applied += 1;
          continue;
        }
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          await removeOp(op.id); // validation error — never retry, restore server truth
          reconcileFailure(op.resourceKey);
          continue;
        }
        // Network / timeout / 5xx / 429 — keep queued, back off, try again later.
        await bumpRetries(op.id);
        break;
      }
    }
  } finally {
    running = false;
  }
  return applied;
}

export async function syncNow() {
  await probeOnline().catch(() => {});
  return processOutbox();
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    processOutbox().catch(() => {});
  }, 15_000);
}

export function startSyncEngine() {
  if (started) return;
  started = true;
  subscribeOnline((online) => {
    if (online) {
      processOutbox()
        .catch(() => scheduleRetry());
    }
  });
  AppState.addEventListener('change', (next) => {
    if (next === 'active') processOutbox().catch(() => {});
  });
}

export function refreshResource(resourceKey) {
  const fetcher = fetcherFor(resourceKey);
  if (!fetcher) return Promise.resolve(null);
  const meta = RESOURCES[resourceKey] || {};
  return cacheRefresh(resourceKey, fetcher, { ttl: meta.ttl }).catch(() => null);
}
