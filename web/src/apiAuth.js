/**
 * Optional editor auth for the web admin surfaces.
 *
 * The Django API is read-open but write-locked (`IsAuthenticatedOrReadOnly`):
 * browsers don't log in, so mutating requests would 403. If `VITE_API_TOKEN`
 * is set (see `web/.env.example`, minted via
 * `python manage.py make_editor_token`), this installs a thin `fetch`
 * wrapper — imported once by `main.jsx` — that attaches
 * `Authorization: Bearer …` to requests aimed at the API host.
 *
 * Reads and non-API requests pass through untouched. An explicitly provided
 * `Authorization` header always wins.
 */
const TOKEN = (import.meta.env.VITE_API_TOKEN || '').trim();
const API = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

if (TOKEN && API && !window.__jibunaiFetchPatched) {
  window.__jibunaiFetchPatched = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith(API)) return nativeFetch(input, init);
    const headers = new Headers(
      init.headers || (typeof input !== 'string' ? input.headers : undefined),
    );
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${TOKEN}`);
    }
    return nativeFetch(input, { ...init, headers });
  };
}
