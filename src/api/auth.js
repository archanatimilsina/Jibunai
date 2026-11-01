/**
 * Auth API for the Jibunai 3-gate login flow.
 * Every endpoint mirrors Portfolio/backend/api/urls.py (/api/auth/...).
 *
 * Gate flow:
 *   1. gate1(username)        -> preauth_token   (short-lived session)
 *   2. gate2(preauth, dream)  -> ok
 *   3. gate3(preauth, secret) -> auth_token      (long-lived session)
 *
 * Secret codes are never logged or returned by these helpers.
 */
import { apiSend, apiGet } from './http';

const AUTH_BASE = '/auth';

export async function register(payload) {
  return apiSend(`${AUTH_BASE}/register/`, 'POST', payload);
}

export async function gate1(username) {
  return apiSend(`${AUTH_BASE}/gate1/`, 'POST', { username });
}

export async function gate2(preauthToken, dream) {
  return apiSend(`${AUTH_BASE}/gate2/`, 'POST', {
    preauth_token: preauthToken,
    dream,
  });
}

export async function gate3(preauthToken, secretCode) {
  return apiSend(`${AUTH_BASE}/gate3/`, 'POST', {
    preauth_token: preauthToken,
    secret_code: secretCode,
  });
}

/** Call with the auth token to invalidate the session server-side. */
export async function logoutApi(authToken) {
  return apiSend(`${AUTH_BASE}/logout/`, 'POST', { token: authToken });
}

/** Fetch the current user using a Bearer auth token. */
export async function me(authToken) {
  return apiGet(`${AUTH_BASE}/me/`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
}
