# GitHub migration: whole folder -> archanatimilsina/Jibunai

Done locally (Nov 2026):

- `backend/` (root Django API) is now the single source of truth.
- Legacy production hosts were merged into it so the old public
  services keep working after the swap:
  - `ALLOWED_HOSTS` += `jibunai.onrender.com`
  - `CSRF_TRUSTED_ORIGINS` += `https://jibunai.onrender.com`
  - `CORS_ALLOWED_ORIGINS` += `https://jibunai.vercel.app`
  - `CORS_ALLOWED_ORIGIN_REGEXES` += `jibunai(-preview)?` Vercel pattern
  - `web/.env.example` documents both API URLs.
- Old `Jibunai/backend/` was synced from root `backend/` (backup in
  `Archive/jibunai-backend-backup-*/`, gitignored), then the whole
  child `Jibunai/` folder (nested `.git`, old backend, old
  `frontend/`) was removed. Its frontend is backed up in
  `Archive/jibunai-frontend-backup-*/` (gitignored) and its history in
  `Archive/jibunai-git-history-*.bundle`. Root `web/` (newer: Blog,
  PDF, challenges, AboutMe, projects) is the web app to deploy.
- Outer repo remote is now `origin = https://github.com/archanatimilsina/Jibunai.git`.
  `git fetch origin` works. Histories are unrelated (local 6 commits,
  remote 11 commits), so a plain `git push` will be rejected.

## Push (pick one)

Safe (recommended): push to a new branch, verify Render, then promote:

```bash
git add -A
git commit -m "monorepo: Expo app + web/ + backend (replaces nested Jibunai/)"
git push -u origin main:monorepo
```

Then in Render, set the service's branch to `monorepo`, Root Directory
to `backend`, and deploy. In Vercel, set project root to `web/`.
Once verified, fast-forward `main` on GitHub to `monorepo`.

Replace (destructive, loses remote history on GitHub):

```bash
git add -A
git commit -m "monorepo: Expo app + web/ + backend (replaces nested Jibunai/)"
git push --force-with-lease -u origin main
```

## Production backend upgrade warning

The old production DB applied
`0012_delete_aboutme_delete_professionaldevelopment_and_more`
(which deleted AboutMe/Project/ProfessionalDevelopment). The new chain
replaces it with `0012_challenge...` → `0019_...` and reintroduces
those models with no re-creation migration. Deploying + running
`migrate` leaves those tables missing.

Fix before first new deploy, using the OLD code in
`Archive/jibunai-backend-backup-*/` with the production `DATABASE_URL`:

```bash
cd Archive/jibunai-backend-backup-*/..   # old backend copy
DATABASE_URL='<prod>' DJANGO_SECRET_KEY='<prod>' \
  python3 manage.py migrate api 0011     # reverses the delete, recreates empty tables
```

Then deploy the new backend and run `migrate` normally
(Render `render.yaml` already does this).

## Render / Vercel env

Render (Root Directory `backend/`): `DATABASE_URL`, `DJANGO_SECRET_KEY`,
`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET_NAME`,
plus optional `ALLOWED_HOSTS_EXTRA`, `CSRF_EXTRA_ORIGINS`,
`CORS_EXTRA_ORIGINS`.

Vercel (project root `web/`): `VITE_API_URL` (new
`https://portfolio-79vi.onrender.com` or legacy
`https://jibunai.onrender.com`), `VITE_API_TOKEN` (from
`python manage.py make_editor_token`).
