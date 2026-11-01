# Jibunai — 3-Gate Authentication Plan (Backend: `Portfolio/backend`)

## 0. EAS feasibility — can the EAS build use `Portfolio/backend`?

- [x] **YES**, but only if the backend is publicly reachable. An EAS production binary on a device/emulator CANNOT call `localhost` or `10.0.2.2` (that points at the device itself).
- [x] Deploy target: your existing `portfolio-79vi.onrender.com` (or any public host).
- [x] `eas.json` created with `EXPO_PUBLIC_API_URL` sourced from an EAS secret for preview/production builds.
- [ ] **You must run:** `eas secret:create EXPO_PUBLIC_API_URL https://<your-deployed-backend>` before building preview/production.
- [x] Backend `ALLOWED_HOSTS` updated — add your deployed API host to the list in `soul/settings.py`.
- [x] `expo-secure-store@~12.0.0` installed (EAS-compatible native module) for token storage.

---

## Phase 1 — Backend: multi-user auth (Portfolio/backend) — DONE + verified

- [x] `PortalUser` model: `full_name`, `username` (unique), `date_of_birth`, `dream`, `secret_code` (PBKDF2-hashed via Django `make_password`), `is_active`, `created_at`.
- [x] `AuthToken` model: `token`, `user` FK, `type` (`preauth` / `auth`), `expires_at`. `create_for_user` issues short-lived pre-auth tokens (10 min) and long-lived auth tokens (7 days); invalidates same-type tokens per user.
- [x] `POST /api/auth/register/` — `full_name, username, date_of_birth, dream, secret_code`. Unique username, secret code 4–8 chars, hashed. **No password field — secret code IS the credential.**
- [x] `POST /api/auth/gate1/` — `{ username }` → generic failure (no user enumeration) → preauth token.
- [x] `POST /api/auth/gate2/` — `{ preauth_token, dream }` → case-insensitive dream match.
- [x] `POST /api/auth/gate3/` — `{ preauth_token, secret_code }` → server re-checks 4–8 length + `check_password` → auth token + user.
- [x] `POST /api/auth/logout/` — deletes auth token.
- [x] `GET /api/auth/me/` — Bearer token → current user (401 if invalid/expired).
- [x] `urls.py`: all mounted under `/api/auth/...`.
- [x] `settings.py`: `ALLOWED_HOSTS` + `CORS_ALLOWED_ORIGINS` documented; DRF JSON-only.
- [x] Migration `api/migrations/0017_portaluser_authtoken.py` created and `manage.py check` passes.
- [x] Migration applied to the Supabase database.
- [x] **Live smoke-tested** against `http://127.0.0.1:8000`:
  - register ✅ → gate1 ✅ → gate2 ✅ → gate3 ✅ → me ✅ → logout ✅ → me returns 401 ✅
  - wrong secret code → generic "Invalid credentials." ✅
  - secret code 3 chars / 9 chars → validation error ✅
  - wrong dream → generic "Invalid credentials." ✅
  - duplicate username → error ✅
  - unknown username (gate1) → generic "Invalid credentials." (no enumeration) ✅

---

## Phase 2 — Frontend: API layer + auth context — DONE

- [x] `src/api/http.js`: `apiGet`/`apiSend` now accept custom headers (used for `Authorization: Bearer`).
- [x] `src/api/auth.js`: `register`, `gate1`, `gate2`, `gate3`, `logoutApi`, `me` wrappers.
- [x] `src/utils/validation.js`: `validateSecretCode` (4–8 chars, any symbol/letter/number), `validateUsername`, `validateDateOfBirth`, `validateRequired` — mirror the server rules.
- [x] `src/context/AuthContext.jsx`: SecureStore-backed `token`/`user`, `login`, `logout`, `refreshUser`, `ready`/`isAuthenticated`.

---

## Phase 3 — Frontend: screens + navigation — DONE

- [x] `src/screens/RegisterScreen.jsx`: full_name, username, date_of_birth (date picker), dream, secret_code (secure entry, max 8).
- [x] `src/screens/Gate1Screen.jsx`: name/username → gate 1.
- [x] `src/screens/Gate2Screen.jsx`: dream → gate 2 (back to gate 1).
- [x] `src/screens/Gate3Screen.jsx`: secret code (4–8, obscured) → gate 3 → `login()`.
- [x] `src/navigation/routes.jsx`: `register`, `gate1`, `gate2`, `gate3` added to `SCREENS` + `AUTH_ROUTE_MAP` (excluded from the wheel nav).
- [x] `App.js`: splash → fonts + SecureStore hydration → `authenticated ? AppShell : AuthFlow`; `AuthFlow` orchestrates register → gate1 → gate2 → gate3 → `login()` → shell; shell has a Logout button.

---

## Phase 4 — EAS build configuration — DONE (needs your secret)

- [x] `eas.json`: development (`http://10.0.2.2:8000`), preview/production (`${{EXPO_PUBLIC_API_URL}}`).
- [ ] **You must run:** `eas secret:create EXPO_PUBLIC_API_URL https://<your-deployed-backend>`
- [ ] Then: `eas build --platform android` / `eas build --platform ios` / `eas build --platform all`.
- [ ] Documented: dev builds can point at LAN IP; production builds MUST use the public HTTPS backend (never localhost on a device).

---

## Phase 5 — Security hardening + verification — DONE (backend verified; frontend mirrors rules)

- [x] Server-side validation on every gate (client length check is UX only).
- [x] Secret codes stored hashed (PBKDF2), never returned by any API.
- [x] Tokens expire (pre-auth 10 min, auth 7 days); logout deletes token server-side + locally.
- [x] Generic error messages — no user enumeration.
- [x] HTTPS required in production (EAS production build must not use localhost).
- [ ] End-to-end device test after you set the EAS secret and build (recommended).

---

## How to build with EAS

```bash
# 1. Deploy Portfolio/backend to a public host (Render/Railway/fly.io), note the URL.
# 2. Add that host to ALLOWED_HOSTS in Portfolio/backend/soul/settings.py and redeploy.
# 3. Create the EAS secret:
eas secret:create EXPO_PUBLIC_API_URL https://<your-deployed-backend>
# 4. Build:
eas build --platform android   # or ios / all
```
