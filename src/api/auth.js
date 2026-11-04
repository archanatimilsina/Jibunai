/**
 * Auth API for the Jibunai 3-gate login flow.
 *
 * Primary endpoints live under /api/auth/... (Jibunai/backend).
 *
 * Legacy mode: the public Render server (Portfolio/backend) predates the
 * /auth/* shim, so on a 404 we fall back to its /verify-secret/ oracle,
 * which checks the same stored dream / secret code server-side (hashed
 * compare, 30 req/hour throttle). The returned legacy tokens are app-local
 * session markers only — the username is embedded in plaintext, never a
 * secret — and the deployed server (open reads/writes) ignores them.
 * The real gate (knowledge of dream + secret) is still enforced by the
 * server in both modes.
 *
 * Gate flow:
 *   1. gate1(username)        -> preauth_token   (short-lived session)
 *   2. gate2(preauth, dream)  -> ok
 *   3. gate3(preauth, secret) -> auth_token      (long-lived session)
 *
 * Secret codes are never logged or returned by these helpers.
 */
import { ApiError, apiSend, apiGet } from './http';

const AUTH_BASE = '/auth';

// Prefixes for app-local legacy session markers (see header comment).
const LEGACY_1 = 'legacy1:'; // gate 1 passed (username collected)
const LEGACY_2 = 'legacy2:'; // gate 2 passed (dream verified server-side)
const LEGACY_AUTH = 'legacy-auth:'; // gate 3 passed (secret verified server-side)

const isNotFound = (err) => err instanceof ApiError && err.status === 404;

const usernameOf = (token, prefix) =>
  typeof token === 'string' && token.startsWith(prefix)
    ? token.slice(prefix.length).split(':')[0]
    : '';

/** Server-side secret check on legacy backends (returns true when it matches). */
async function verifySecretLegacy(field, value) {
  const res = await apiSend('/verify-secret/', 'POST', { field, value });
  return !!(res && res.allowed === true);
}

export async function register(payload) {
  try {
    return await apiSend(`${AUTH_BASE}/register/`, 'POST', payload);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    // Legacy servers have no registration endpoint (single owner row).
    throw new ApiError(
      'Registration needs the updated backend — ask for a redeploy, then try again.',
      503,
    );
  }
}

export async function gate1(username) {
  try {
    return await apiSend(`${AUTH_BASE}/gate1/`, 'POST', { username });
  } catch (err) {
    if (!isNotFound(err)) throw err;
    if (!username) throw new ApiError('Name / username is required.', 400);
    return { preauth_token: `${LEGACY_1}${username}` };
  }
}

export async function gate2(preauthToken, dream) {
  try {
    return await apiSend(`${AUTH_BASE}/gate2/`, 'POST', {
      preauth_token: preauthToken,
      dream,
    });
  } catch (err) {
    if (!isNotFound(err)) throw err;
    const username = usernameOf(preauthToken, LEGACY_1);
    if (!username) throw err; // not our legacy session — surface the 404
    if (!dream) throw new ApiError('Dream is required.', 400);
    const ok = await verifySecretLegacy('dream', dream);
    if (!ok) throw new ApiError('Dream does not match our records.', 400);
    return { ok: true, preauth_token: `${LEGACY_2}${username}` };
  }
}

export async function gate3(preauthToken, secretCode) {
  try {
    return await apiSend(`${AUTH_BASE}/gate3/`, 'POST', {
      preauth_token: preauthToken,
      secret_code: secretCode,
    });
  } catch (err) {
    if (!isNotFound(err)) throw err;
    const username = usernameOf(preauthToken, LEGACY_2);
    if (!username) throw err; // gate 2 (dream check) must come first
    if (!secretCode) throw new ApiError('Invalid secret code. Try again.', 400);
    const ok = await verifySecretLegacy('gate', secretCode);
    if (!ok) throw new ApiError('Invalid secret code. Try again.', 400);
    return {
      auth_token: `${LEGACY_AUTH}${username}:${Date.now()}`,
      user: { name: username, username },
    };
  }
}

/** Call with the auth token to invalidate the session server-side. */
export async function logoutApi(authToken) {
  try {
    return await apiSend(`${AUTH_BASE}/logout/`, 'POST', { token: authToken });
  } catch (err) {
    if (isNotFound(err)) return { ok: true }; // legacy: nothing to revoke
    throw err;
  }
}

/** Fetch the current user using a Bearer auth token. */
export async function me(authToken) {
  const legacyUser = usernameOf(authToken, LEGACY_AUTH);
  if (legacyUser) return { name: legacyUser, username: legacyUser };
  return apiGet(`${AUTH_BASE}/me/`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
}
