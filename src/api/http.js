/**
 * Tiny HTTP layer for the Django API.
 * Every request is time-boxed so a dead backend can never leave a screen spinning.
 */

export const API_BASE = `${process.env.EXPO_PUBLIC_API_URL}/api`;

const DEFAULT_TIMEOUT = 12_000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const withTimeout = async (url, options, timeout) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
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
    const parts = Object.entries(payload)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(' · ');
    if (parts) return parts;
    if (payload.detail) return String(payload.detail);
  }
  return `Server error (${status})`;
};

/** GET a JSON resource. */
export async function apiGet(path, { timeout = DEFAULT_TIMEOUT, signal, headers = {} } = {}) {
  const res = await withTimeout(
    `${API_BASE}${path}`,
    { method: 'GET', headers },
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
  const res = await withTimeout(
    `${API_BASE}${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
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
export async function apiUpload(path, formData, { timeout = 25_000, method = 'POST' } = {}) {
  const res = await withTimeout(`${API_BASE}${path}`, { method, body: formData }, timeout);
  const payload = await parseBody(res);
  if (!res.ok) throw new ApiError(errorMessage(payload, res.status), res.status);
  return payload;
}
