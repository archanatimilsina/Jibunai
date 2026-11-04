/**
 * Tiny HTTP layer for the Django API.
 * Every request is time-boxed so a dead backend can never leave a screen spinning.
 * The stored auth token (if any) is attached automatically.
 */
import { secureGet } from './secureStore';

const TOKEN_KEY = 'jibunai_auth_token';

const RAW_BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

export const API_BASE = RAW_BASE ? `${RAW_BASE}/api` : '';

/** Cheap liveness probe (200 + DB check). Use for connectivity, not bare `/api`. */
export const HEALTH_PATH = '/health/';

/** Read the stored auth token without throwing (missing/expired => null). */
export async function getAuthToken() {
  try {
    return await secureGet(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Merge an Authorization header unless the caller already set one. */
async function withAuth(headers = {}) {
  if (headers.Authorization) return headers;
  const token = await getAuthToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

const assertBase = () => {
  if (!API_BASE) {
    throw new ApiError(
      'Missing EXPO_PUBLIC_API_URL — add it to .env / EAS secrets (see .env.example).',
      0,
    );
  }
};

// Render's free tier sleeps: the first request after idle measured ~18 s.
// Keep the default above that so a cold start reads as "slow", not "offline".
const DEFAULT_TIMEOUT = 30_000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const NETWORK_HINT = /network|fetch failed|failed to fetch|abort|timed?\s?out|econn|enot|eai_again|socket|unreachable|offline/i;

/**
 * User-facing message for any request failure — never technical.
 * Show this in screens instead of `err.message`: raw failures like
 * "fetch failed", "Aborted" or "Server error (500)" mean nothing to
 * the user. Server/validation detail (400/401/403/404) passes through
 * because it already reads like a sentence.
 */
export function friendlyErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err instanceof ApiError) {
    if (!err.status) return err.message || fallback; // setup errors already explain themselves
    if (err.status === 408 || err.status === 504) {
      return 'The server is taking too long to respond. Try again in a moment.';
    }
    if (err.status === 429) return 'Too many attempts. Wait a moment and try again.';
    if (err.status >= 500) {
      return 'Something went wrong on the server. Please try again in a moment.';
    }
    return err.message || fallback;
  }
  const message = err?.message || '';
  if (err?.name === 'AbortError' || /abort|timed?\s?out/i.test(message)) {
    return 'The server is taking too long — it may be waking up. Try again in a moment.';
  }
  if (NETWORK_HINT.test(message) || err?.code) {
    return "Couldn't reach the server. Check your internet connection and try again.";
  }
  return message || fallback;
}

const withTimeout = async (url, options, timeout, externalSignal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener?.('abort', onExternalAbort);
  }
};

const parseBody = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const errorMessage = (payload, status) => {
  if (payload && typeof payload === 'object') {
    if (payload.detail) return String(payload.detail);
    const parts = Object.entries(payload)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(' · ');
    if (parts) return parts;
  }
  return `Server error (${status})`;
};

/** GET a JSON resource. */
export async function apiGet(path, { timeout = DEFAULT_TIMEOUT, signal, headers = {} } = {}) {
  assertBase();
  const res = await withTimeout(
    `${API_BASE}${path}`,
    { method: 'GET', headers: await withAuth(headers) },
    timeout,
    signal,
  );
  const payload = await parseBody(res);
  if (!res.ok) throw new ApiError(errorMessage(payload, res.status), res.status);
  return payload;
}

/** GET a list resource (always returns an array). */
export async function apiList(path, options) {
  const data = await apiGet(path, options);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/** POST / PATCH / PUT / DELETE with a JSON body and optional extra headers. */
export async function apiSend(
  path,
  method = 'POST',
  body = null,
  { timeout = DEFAULT_TIMEOUT, headers = {} } = {},
) {
  assertBase();
  const res = await withTimeout(
    `${API_BASE}${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json', ...(await withAuth(headers)) },
      body: body === null ? undefined : JSON.stringify(body),
    },
    timeout,
  );
  const payload = await parseBody(res);
  if (!res.ok) throw new ApiError(errorMessage(payload, res.status), res.status);
  if (res.status === 204) return null;
  return payload;
}

/** POST (or PATCH) a multipart payload (image uploads). */
export async function apiUpload(path, formData, { timeout = 60_000, method = 'POST', headers = {} } = {}) {
  assertBase();
  const res = await withTimeout(
    `${API_BASE}${path}`,
    { method, headers: await withAuth(headers), body: formData },
    timeout,
  );
  const payload = await parseBody(res);
  if (!res.ok) throw new ApiError(errorMessage(payload, res.status), res.status);
  return payload;
}
