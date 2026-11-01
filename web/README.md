# ArchanaArea web app (the UI inside the React Native shell)

This is the actual UI of **Archana's Secret Space** — the private ArchanaArea
extracted from the portfolio. It is a Vite + React + styled-components PWA.

It is loaded by the React Native app in the parent folder (`../App.js`) via a
WebView, so build and deploy it, then set `EXPO_PUBLIC_APP_URL` in
`../.env` to the deployed URL.

```bash
npm install
npm run build      # -> dist/  (deploy this)
npm run preview    # local preview
npm run dev        # dev server on http://localhost:5174
```

- Backend host: `VITE_API_URL` in `.env` (defaults to the live Render backend).
  Leave it empty to use the Vite proxy to `http://127.0.0.1:8000`.
- Secret checks are server-side: `/api/verify-secret/`, `/api/secret-meta/`.
- `src/ArchanaArea/` is copied from `../../frontend/src/ArchanaArea`.
