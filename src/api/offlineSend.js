/**
 * Offline-aware write helper.
 *
 * Tries the network first; when the failure is retryable (no connection,
 * timeout, abort, 5xx, 408/429) the op is appended to the persistent outbox
 * and `{ offline: true, queued: true }` is returned so callers keep their
 * optimistic UI. Validation errors (other 4xx) are rethrown — those must
 * surface to the user, never silently queue.
 */
import { ApiError, apiSend } from './http';
import { enqueueOp } from './outbox';

const NETWORK_HINT = /network|fetch|timed?\s?out|abort|offline|econn|enot|eai_again|socket|failed/i;

export function isRetryableError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  if (err instanceof ApiError) {
    if (!err.status) return true; // thrown before/without an HTTP status
    if (err.status === 408 || err.status === 429) return true;
    if (err.status >= 500) return true;
    return false;
  }
  if (typeof err.message === 'string' && NETWORK_HINT.test(err.message)) return true;
  if (err.code && NETWORK_HINT.test(String(err.code))) return true;
  return false;
}

/**
 * @returns { data, offline, queued }
 * @throws validation / auth errors (never queued)
 */
export async function apiSendOffline(path, method = 'POST', body = null, opts = {}) {
  const { resourceKey = null, localId = null, targetId = null } = opts;
  try {
    const data = await apiSend(path, method, body);
    return { data, offline: false, queued: false };
  } catch (err) {
    if (!isRetryableError(err)) throw err;
    await enqueueOp({ resourceKey, method, path, body, localId, targetId });
    return { data: null, offline: true, queued: true };
  }
}
