# Jibunai — Complete Project Map

> A self-check reference for the whole app. Every screen, every file, every branch,
> every option list, every variable — so you can trace any path from the launcher icon
> down to the last API call without re-reading the code.
>
> **Written:** 2026-10-20 · **Covers:** mobile app (Expo/React Native), web app (Vite/React), backend (Django REST)
> **Repo root:** `/Users/archanatimilsina/Desktop/Jibunai`

---

## Table of contents

| # | Section | What you'll find |
|---|---------|------------------|
| 0 | [How to read this](#0-how-to-read-this) | Conventions, symbols, the 4 branch types |
| 1 | [The file tree](#1-the-file-tree) | Every file in the repo, grouped |
| 2 | [The runtime tree](#2-the-runtime-tree-launcher--onward) | The tree diagram: launcher → splash → home → every screen |
| 3 | [The spine files](#3-the-spine-files) | `index.js`, `App.js`, `routes.jsx`, `theme.js`, `Drawer`, `ScreenFrame`, `AppSplash`, `HomeScreen` |
| 4 | [Mobile screens in depth](#4-mobile-screens-in-depth) | All 12 Expo screens, file by file |
| 5 | [Web app in depth](#5-web-app-in-depth) | All 19 web components + the PDF module |
| 6 | [Backend in depth](#6-backend-in-depth) | URLs, models, serializers, views |
| 7 | [Option reference](#7-option-reference-all-choices-in-one-place) | Every dropdown/choice/tab value in one table |
| 8 | [Variables reference](#8-variables-reference-the-glossary) | What each variable actually holds |
| 9 | [Dead / unwired code](#9-dead--unwired-code) | Files that exist but are never reached |
| 10 | [Where do I change X?](#10-where-do-i-change-x) | Task → file lookup table |

---

## 0. How to read this

### 0.1 What "a way" means here

A **way** = one distinct path a user (or the code) can take. There are exactly four kinds in this project:

| Type | Symbol | Meaning | Example |
|------|--------|---------|---------|
| **Route way** | `→` | A different screen becomes visible | Home → Notes → Drawer → Blog |
| **Branch way** | `⑂` | Same screen, different rendering | `loading` ⑂ true → spinner, false → list |
| **Menu way** | `☰` | A choice inside a menu/list changes state | Category picker: `Work` / `Study` / `Personal` |
| **State way** | `◈` | Same screen, same render, different *data* | Task list filtered by `filter === 'open'` |

> The rule you asked for: **the same start can reach the same end by different ways.**
> A file can be entered from 3 places, and each entry can branch differently.
> The "Bottom line" box at the end of every file lists every numbered way through it.

### 0.2 Symbols used

- `⇢` hard jump (code always does this)
- `⇢*` soft jump (happens only if a condition holds)
- `⑂` a conditional fork — both sides are documented
- `☰` a menu / option list
- `◈` a data-variant of the same view
- `🔑` a state variable that decides a branch
- `⚠` a known bug / gotcha / dead code path

### 0.3 Reading order

If you want the 5-minute version, read **§2 (Runtime tree)** and **§7 (Option reference)**.
If you want to debug, jump to **§4/§5/§6** for the file and read its "Branches" block.

---

## 1. The file tree

```
Jibunai/
│
├── index.js                     ← Expo entry point (registerRootComponent)
├── App.js                       ← Root component: splash → home/screen → drawer
├── app.json                     ← Expo config (name, icon, splash, android pkg id)
├── package.json                 ← Mobile scripts + deps
├── .env                         ← EXPO_PUBLIC_API_URL, EXPO_PUBLIC_APP_URL
├── .env.example
├── compose.yml                  ← docker compose for mongo
├── PROMPTS.md                   ← Issue tracker (launcher icon, splash, responsiveness)
├── tasks.md                     ← Task list
├── README.md
│
├── assets/                      ← All images used by the app
│   ├── jibunai.png              ← Splash logo (the "cage" image)
│   ├── jibunai-logo.png         ← Home hero logo + Drawer header logo
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   ├── android-icon-monochrome.png
│   ├── favicon.png  icon.png  splash-icon.png
│
├── src/                         ← MOBILE APP SOURCE (Expo / React Native)
│   ├── theme.js                 ← Colors C, fonts F, radii, shadow()
│   ├── navigation/
│   │   └── routes.jsx           ← ROUTES array (the master menu), GROUPS, getRoute()
│   ├── screens/
│   │   ├── HomeScreen.jsx       ← The dashboard (root of the tree)
│   │   └── WebsiteShell.jsx     ← ⚠ NOT WIRED — orphan WebView wrapper
│   └── components/
│       ├── AppSplash.jsx        ← Animated splash shown at launch
│       ├── Drawer.jsx           ← Slide-out right menu (all routes)
│       ├── ScreenFrame.jsx      ← Chrome around every non-home screen
│       ├── Mydaylogpage.jsx     ← route: myday
│       ├── Chronostaskflow.jsx  ← route: chronos
│       ├── Goalsscreen.jsx      ← route: goals
│       ├── Challengetrackerscreen.jsx ← route: challenge
│       ├── Notes.jsx            ← route: notes
│       ├── Blogscreen.jsx       ← route: blog
│       ├── Gesturedraw.jsx      ← route: gesture
│       ├── Archivescreen.jsx    ← route: archive
│       ├── Musicvibes.jsx       ← route: music
│       ├── Hobbiesscreen.jsx    ← route: hobbies
│       ├── Wishlist.jsx         ← route: wishlist
│       ├── Watchlistscreen.jsx  ← route: watchlist
│       └── Pdfmanager.jsx       ← ⚠ EMPTY FILE (0 bytes)
│
├── web/                         ← WEB APP (Vite + React, "type": "module")
│   ├── index.html               ← HTML shell + boot loader
│   ├── vite.config.js           ← port 5174, /api proxy → 127.0.0.1:8000
│   ├── public/
│   │   ├── manifest.webmanifest ← PWA manifest
│   │   ├── sw.js                ← Service worker
│   │   └── icons/…              ← PWA icons
│   └── src/
│       ├── main.jsx             ← React root, mounts <App/>
│       ├── js/
│       │   └── noteMarkdownPdf.js← Markdown → PDF (jsPDF) helper
│       └── ArchanaArea/
│           ├── Dairy.jpg
│           └── components/
│               ├── MyArea.jsx          ← Web shell / nav (root of the web tree)
│               ├── AboutMe.jsx
│               ├── Tellme.jsx
│               ├── Goals.jsx
│               ├── Hobbies.jsx
│               ├── ProfessionalDev.jsx
│               ├── TodoArea.jsx
│               ├── Notes.jsx
│               ├── Blog.jsx
│               ├── dramalist.jsx
│               ├── Challengetracker.jsx
│               ├── ProjectDetail.jsx
│               ├── Gallery.jsx
│               ├── WishList.jsx
│               ├── GestureDraw.jsx
│               ├── music.jsx
│               └── PdfChecker.jsx
│
├── backend/                     ← DJANGO REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── soul/                    ← Django project
│   │   ├── settings.py  urls.py  asgi.py  wsgi.py
│   │   └── supabase_storage.py  ← Supabase file upload helper
│   └── api/                     ← Django app
│       ├── models.py  serializers.py  views.py  urls.py  admin.py  apps.py
│       └── migrations/ (0001 → 0015)
│
└── android/                     ← Generated native Android project
    ├── app/src/main/java/com/archanatimilsina/secretspace/{MainActivity,MainApplication}.kt
    ├── app/src/main/res/mipmap-*/ic_launcher*.webp  ← launcher icon variants
    ├── app/src/main/res/drawable*/splashscreen_logo.png
    └── app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml  ← adaptive icon
```

---

## 2. The runtime tree (launcher → onward)

This is the master diagram. Each node is a **file**, and the branches below it are the
**ways** out of that file.

```
📱 HOME SCREEN (Android launcher)
│
└─ tap "Jibunai" launcher icon
   │
   ├─ OS reads android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
   │  ├─→ ic_launcher_foreground.webp  (assets/android-icon-foreground.png)
   │  ├─→ ic_launcher_background.webp  (assets/android-icon-background.png)
   │  └─→ ic_launcher_monochrome.webp  (themed icons, API 33+)
   │
   └─→ launches MainActivity.kt → MainApplication.kt
      │
      └─→ index.js ─ registerRootComponent(App)
         │
         └─→ App.js  ⭐ ROOT COMPONENT
            │
            ├─⑂ booted === false
            │  │
            │  └─→ <AppSplash onDone={() => setBooted(true)} />
            │     │
            │     ├─⑂ fontsLoaded === false
            │     │  └─→ splash animation runs anyway; logo/word/rule animate
            │     ├─⑂ splashDone === false
            │     │  └─→ stays on splash (MIN_SPLASH_MS = 1400ms minimum)
            │     └─⑂ intro animation finished === true
            │        └─→ onDone() → setBooted(true) → leaves splash
            │
            └─⑂ booted === true
               │
               ├─⑂ activeKey === 'home'
               │  │
               │  └─→ <HomeScreen onOpenMenu onNavigate activeKey />
               │     │
               │     ├─→ HERO: logo image + "Jibunai" + "yours, quietly"
               │     ├─→ MENU RAIL (horizontal scroll) — 12 route chips
               │     │   └─ tap chip ⇢ onNavigate(r.key) ⇢ changes activeKey
               │     ├─→ "Recent done things" (3 hardcoded rows)
               │     └─→ "Everything in here" — grouped grid of 12 cards
               │         │
               │         ├─☰ GROUPS: Everyday (4) | Write (4) | Life (4)
               │         └─ tap card ⇢ onNavigate(r.key)
               │
               └─⑂ activeKey !== 'home'
                  │
                  └─→ <ScreenFrame title subtitle onOpenMenu onHome>
                     │   │
                     │   ├─→ left chevron ⇢ onHome() ⇢ activeKey='home'
                     │   ├─→ right hamburger ⇢ onOpenDrawer() ⇢ drawerOpen=true
                     │   └─→ children = <Screen {...props} />
                     │
                     └─⑂ activeKey is one of 12:
                        │
                        ├─ 'myday'     ⇢ Mydaylogpage.jsx
                        ├─ 'chronos'   ⇢ Chronostaskflow.jsx
                        ├─ 'goals'     ⇢ Goalsscreen.jsx
                        ├─ 'challenge' ⇢ Challengetrackerscreen.jsx
                        ├─ 'notes'     ⇢ Notes.jsx
                        ├─ 'blog'      ⇢ Blogscreen.jsx
                        ├─ 'gesture'   ⇢ Gesturedraw.jsx
                        ├─ 'archive'   ⇢ Archivescreen.jsx
                        ├─ 'music'     ⇢ Musicvibes.jsx
                        ├─ 'hobbies'   ⇢ Hobbiesscreen.jsx
                        ├─ 'wishlist'  ⇢ Wishlist.jsx
                        └─ 'watchlist' ⇢ Watchlistscreen.jsx

        ═══════════════ DRAWER (overlay, available from ANY screen) ═══════════════
        │
        └─→ Drawer.jsx
           │
           ├─ OPEN WAYS (3 different ways to open it, same result):
           │   1. HomeScreen hamburger / ScreenFrame hamburger → onOpenMenu()
           │   2. Edge swipe: drag left from right edge (40px zone, EDGE=40)
           │      ├─⑂ g.dx < -6  OR  (|g.dx| > 14 AND |g.dx| > |g.dy| * 1.5)
           │      └─→ panel follows finger, clamped to [0, W]
           │   3. Android hardware BACK button while drawer closed → no-op
           │
           ├─ CLOSE WAYS (4 different ways to close it):
           │   1. Tap the dimmed backdrop
           │   2. Tap a route item → pick(key) → animate out + onClose()
           │   3. Tap "Swipe right or tap to hide" footer row
           │   4. Swipe panel right: g.dx < -10 AND |g.dx| > |g.dy| * 1.2
           │      ├─⑂ g.dx < -W*0.32  OR  g.vx < -0.35 → close
           │      └─⑂ else → snap back open
           │
           └─ MENU CONTENT (☰ 4 groups × routes):
              Start     → Home
              Everyday  → My Day, Chronos, Goals, Challenges
              Write     → Notes, Blog, Gesture Draw, Archive
              Life      → Music Vibes, Hobbies, Wishlist, Watchlist
              │
              └─ tap item ⇢ onSelect(key) ⇢ setActiveKey(key) + setDrawerOpen(false)

        ═══════════════ ANDROID BACK BUTTON (App.js) ═══════════════
        │
        └─⑂ drawerOpen === true  → close drawer, consume event (return true)
        └─⑂ drawerOpen === false AND activeKey !== 'home' → go home, consume (true)
        └─⑂ drawerOpen === false AND activeKey === 'home'  → return false (app exits)
```

### 2.1 The same start, different ways — quick proof

**Start:** Home screen → **End:** the Notes screen.

| # | Way | Path |
|---|-----|------|
| 1 | Home → grid card "Notes" | `HomeScreen` card `onPress` → `onNavigate('notes')` |
| 2 | Home → menu rail chip "Notes" | `HomeScreen` rail chip `onPress` → `onNavigate('notes')` |
| 3 | Home → drawer → "Notes" | `Drawer` item → `pick('notes')` → `onSelect` → `onNavigate` |
| 4 | Notes → drawer → "Goals" → drawer → "Notes" | re-enter `notes` while already there (re-mount) |

**Start:** Home screen → **End:** the Drawer open.

| # | Way | Path |
|---|-----|------|
| 1 | Hamburger button | `onOpenMenu()` → `setDrawerOpen(true)` |
| 2 | Edge swipe from right | `edgePan` `onPanResponderRelease` → `onOpen()` |
| 3 | Android BACK on a sub-screen | App.js handler: `activeKey !== 'home'` → goes home (drawer stays closed) — **does not** open drawer |

---

## 3. The spine files

### `index.js`

**Purpose:** Expo/React Native entry point.
**Branches:** none.

```
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

---

### `App.js` — ROOT COMPONENT

**Purpose:** Owns the whole app: splash gate, which screen is active, the drawer.

**Props:** none (root).

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `booted` | `false` | Splash vs. app. `false` → render `<AppSplash>` only. `true` → render the real UI. |
| `splashDone` | `false` | Gate for the minimum splash time |
| `drawerOpen` | `false` | Drawer visibility |
| `activeKey` | `'home'` | Which route is on screen |

**Refs**

| Ref | Purpose |
|-----|---------|
| `openRef` | Mirror of `drawerOpen`, so the BackHandler closure always reads the *current* value without re-subscribing |
| `keyRef` | Mirror of `activeKey`, same reason |

**Other variables**

| Name | Value | Meaning |
|------|-------|---------|
| `MIN_SPLASH_MS` | `1400` | Minimum time the splash stays up |
| `ACCEPTS_BACK` | `new Set(['blog', 'watchlist'])` | Screens that receive an extra `onBack` prop |
| `ready` | `fontsLoaded && splashDone` | Computed but **not used in the render** (the gate is `booted`) ⚠ |

**Branches / ways**

| Condition | TRUE | FALSE |
|-----------|------|-------|
| `!booted` | renders `<SafeAreaProvider>` + `<AppSplash onDone={() => setBooted(true)} />` | renders the main UI below |
| `!fontsLoaded \|\| splashDone` (in useEffect) | effect returns `undefined` — no timer | starts a 1400ms timer → `setSplashDone(true)` |
| `activeKey === 'home'` | `<Screen onOpenMenu onNavigate activeKey />` (bare, no top bar) | `<ScreenFrame title subtitle onOpenMenu onHome>` wrapping `<Screen {...(ACCEPTS_BACK.has(activeKey) ? { onBack: goHome } : {})} onOpenMenu onNavigate />` |
| `Platform.OS !== 'android'` | BackHandler not registered | BackHandler registered |
| Back pressed, `openRef.current === true` | closes drawer, returns `true` (event consumed) | falls through |
| Back pressed, `keyRef.current !== 'home'` | `setActiveKey('home')`, returns `true` | returns `false` → OS closes the app |
| `getRoute(activeKey)` | returns the matching route, or `ROUTE_MAP.home` if the key is unknown | — |

**Callbacks (the navigation verbs)**

| Function | Does |
|----------|------|
| `navigate(key)` | `setActiveKey(key)` + `setDrawerOpen(false)` — used by Home cards, rail chips, Drawer items |
| `goHome()` | `setActiveKey('home')` + `setDrawerOpen(false)` — used by ScreenFrame chevron and Android back |
| `openDrawer()` | `setDrawerOpen(true)` |
| `closeDrawer()` | `setDrawerOpen(false)` |

**Bottom line — the ways through `App.js`**

1. **Cold launch** → splash → home.
2. **Cold launch, slow fonts** → splash stays until fonts load *and* 1400ms pass.
3. **Home → sub-screen** → the sub-screen gets wrapped in `ScreenFrame` (top bar with title, group, back chevron, menu).
4. **Home → sub-screen → back chevron** → home.
5. **Home → sub-screen → Android back** → home (not app exit).
6. **Home → Android back** → app exits (returns `false`).
7. **Any screen → drawer open → pick a route** → new screen, drawer auto-closes.
8. **Any screen → drawer open → Android back** → drawer closes only, stays on the same screen.

---

### `src/navigation/routes.jsx` — THE MASTER MENU

**Purpose:** Single source of truth for every screen, its label, caption, group and icon.

**Exports**

| Export | Shape |
|--------|-------|
| `ROUTES` | Array of 13 route objects (Home + 12) |
| `ROUTE_MAP` | `{ key → route }` built by `reduce` |
| `GROUPS` | `['Start', 'Everyday', 'Write', 'Life']` |
| `getRoute(key)` | `ROUTE_MAP[key] \|\| ROUTE_MAP.home` — **unknown key silently falls back to Home** |

**The route table (☰ the complete menu)**

| key | label | caption | group | icon | screen file |
|-----|-------|---------|-------|------|-------------|
| `home` | Home | Your landing page | Start | `home` | `src/screens/HomeScreen.jsx` |
| `myday` | My Day | Plan and log today | Everyday | `sun` | `Mydaylogpage.jsx` |
| `chronos` | Chronos | Task flow by day | Everyday | `clock` | `Chronostaskflow.jsx` |
| `goals` | Goals | Daily streaks | Everyday | `target` | `Goalsscreen.jsx` |
| `challenge` | Challenges | Track a challenge | Everyday | `award` | `Challengetrackerscreen.jsx` |
| `notes` | Notes | Markdown node matrix | Write | `file-text` | `Notes.jsx` |
| `blog` | Blog | Write and publish | Write | `edit-2` | `Blogscreen.jsx` |
| `gesture` | Gesture Draw | Sketch ideas | Write | `pen-tool` | `Gesturedraw.jsx` |
| `archive` | Archive | Everything saved | Write | `archive` | `Archivescreen.jsx` |
| `music` | Music Vibes | Listen and log | Life | `music` | `Musicvibes.jsx` |
| `hobbies` | Hobbies | What you build | Life | `heart` | `Hobbiesscreen.jsx` |
| `wishlist` | Wishlist | Things to get | Life | `star` | `Wishlist.jsx` |
| `watchlist` | Watchlist | Shows and films | Life | `tv` | `Watchlistscreen.jsx` |

**Branches**

| Condition | Result |
|-----------|--------|
| `getRoute('nonsense')` | returns the **home** route (silent fallback, no error) |
| `HomeScreen` filters `g !== 'Start'` | the "Start" group is **not** shown as a section on Home (Home is the page itself) |
| `Drawer` filters `items.length` | groups with no routes are skipped (`return null`) |
| `total = ROUTES.length - 1` | Home shows "12 places" (13 routes minus Home itself) |

---

### `src/theme.js` — DESIGN TOKENS

**Purpose:** Every colour, font, radius and shadow in the mobile app.

| Export | Contents |
|--------|----------|
| `C` | 14 colours: `bg #f6f5f0`, `surface #ffffff`, `surfaceAlt #fbfaf7`, `dark #1a1a2e`, `ink #2b2b3a`, `green #2d6a4f`, `greenLt #e4f1ea`, `soft #7a7567`, `muted #eceae3`, `border #d8d4cc`, `borderLt #e8e5dd`, `white #ffffff`, `danger #c0392b`, `ph #bdb8ad` |
| `shadow(level = 1)` | Returns `{ shadowColor, shadowOpacity: 0.05 + level*0.025, shadowRadius: 8 + level*8, shadowOffset: {height: 3 + level*3}, elevation: level*2 + 1 }` |
| `mono` | `Platform.select({ ios: 'Menlo', android: 'monospace' })` — the mono font family |
| `F` | Font families: `sans` = DMSans_400Regular, `sansMed` = DMSans_500Medium, `sansBold` = DMSans_700Bold, `mono` = DMMono_400Regular |
| `radii` | `sm 10, md 14, lg 20, xl 28, pill 999` |

> ⚠ **Known inconsistency (from `PROMPTS.md` ISSUE 2):** `PROMPTS.md` asks for tokens in
> `src/theme/tokens.ts` with `useTokens()`. The project still uses `src/theme.js` with the
> `C` object, and several screens hard-code hex values. This is an open issue, not a bug in
> the current behaviour.

---

### `src/components/AppSplash.jsx`

**Purpose:** The animated splash screen at launch.

**Props**

| Prop | Default | Meaning |
|------|---------|---------|
| `onDone` | — (called as `onDone?.()`) | Called when the intro animation finishes |
| `hold` | `1100` | Extra `Animated.delay` in ms at the end of the sequence |

**Animated values (all `useRef(new Animated.Value(0))`)**

| Name | Drives |
|------|--------|
| `logo` | logo opacity, scale `0.86 → 1`, translateY `14 → 0` |
| `word` | "Jibunai" opacity, letterSpacing `10 → 2.4`, translateY `10 → 0` |
| `rule` | the green rule width `0 → 64` and opacity |
| `fade` | "yours, quietly" opacity |

**The animation sequence (in order)**

1. `logo` → 1, **620ms**, `Easing.bezier(0.16, 1, 0.3, 1)`
2. `word` → 1, **420ms**, `Easing.out(Easing.cubic)`
3. **parallel:** `rule` → 1 (420ms, out-cubic) **and** `fade` → 1 (300ms)
4. `Animated.delay(hold)` — default 1100ms

**Branches**

| Condition | Result |
|-----------|--------|
| `intro.start(({ finished }) => ...)` → `finished === true` | `onDone?.()` → App.js sets `booted = true` |
| `finished === false` (animation interrupted/unmounted) | `onDone` is NOT called — the effect cleanup calls `intro.stop()` |
| `onDone` is undefined | `onDone?.()` is a no-op (optional-call) |

**Layout:** `logoSize = Math.min(width * 0.46, 220)` — the logo scales with screen width, capped at 220.

---

### `src/components/Drawer.jsx` — THE SIDE MENU

**Purpose:** Slide-out right-hand menu listing every route, grouped.

**Props**

| Prop | Type | Meaning |
|------|------|---------|
| `open` | bool | Is the drawer open (controlled by `App.js`) |
| `onOpen` | fn | Request open (edge-swipe release) |
| `onClose` | fn | Request close (backdrop, footer, swipe) |
| `activeKey` | string | Which route is highlighted |
| `onSelect` | fn | Called with a route key when an item is tapped |

**State / refs / constants**

| Name | Value | Purpose |
|------|-------|---------|
| `EDGE` | `40` | Width of the invisible right-edge swipe zone (px) |
| `VELOCITY` | `0.35` | Flick velocity threshold to open/close |
| `W` | `Math.min(330, Math.max(256, width * 0.82))` | Drawer panel width |
| `x` | `Animated.Value(W)` | Panel translateX (W = closed, 0 = open) |
| `mounted` | `false` | Whether the panel is rendered at all (unmounts 250ms after close) |
| `openRef` | mirror of `open` | Lets the PanResponders read the live value |
| `backdrop` | interpolate `[0, W] → [1, 0]` | Dim overlay opacity |
| `clamp(v, lo, hi)` | helper | `Math.max(lo, Math.min(hi, v))` |

**☰ Menu content:** `GROUPS.map(...)` → for each group, `ROUTES.filter(r => r.group === group)`.
Groups with zero routes are skipped. The active route gets `st.itemActive` (dark pill) + a white dot.

**Branches**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| open/close effect | `open === true` | `setMounted(true)`, animate to 0 over **300ms** (bezier 0.16,1,0.3,1) | animate to W over **230ms**, unmount after **250ms** |
| edge pan | `onMoveShouldSetPanResponder` | `!open && (g.dx < -6 \|\| (\|g.dx\| > 14 && \|g.dx\| > \|g.dy\| * 1.5))` → grab the gesture | let it bubble |
| edge pan release | `v < W * 0.55 \|\| g.vx < -0.35` | animate open (220ms) + `onOpen()` | animate closed (220ms) |
| edge pan terminate | always | animate closed (200ms) | — |
| panel pan | `onMoveShouldSetPanResponder` | `open && g.dx < -10 && \|g.dx\| > \|g.dy\| * 1.2` | ignore |
| panel pan release | `g.dx < -W * 0.32 \|\| g.vx < -0.35` | animate closed (230ms) + `onClose()` | snap back open (200ms) |
| panel pan terminate | always | animate open (200ms) | — |
| backdrop | `open ? 'auto' : 'none'` | backdrop tappable | backdrop ignores touches |
| edge zone | `open ? 'none' : 'auto'` | swipe zone live | swipe zone disabled |
| panel render | `mounted === true` | panel exists in the tree | panel not rendered (perf) |
| item press | `pressed && !active` | grey press highlight | no highlight on active item |

**Bottom line — ways to open:** (1) hamburger button, (2) edge swipe from the right, (3) — nothing else.
**Ways to close:** (1) tap backdrop, (2) tap a route item, (3) tap the "Swipe right or tap to hide" footer, (4) swipe the panel right, (5) Android back (handled in `App.js`).

---

### `src/components/ScreenFrame.jsx` — THE SCREEN CHROME

**Purpose:** The top bar shown on every non-home screen.

**Props**

| Prop | Meaning |
|------|---------|
| `title` | Screen name (from `route.label`) |
| `subtitle` | Group name (from `route.group`), shown uppercase in mono |
| `onOpenMenu` | Opens the drawer |
| `onHome` | Back-to-home (chevron) |
| `children` | The screen component itself |

**Branches**

| Condition | Result |
|-----------|--------|
| `!!subtitle` (truthy) | renders the subtitle `<Text>` | subtitle row is hidden |
| `pressed` on the chevron | opacity 0.65 |
| `pressed` on the hamburger | opacity 0.7 + scale 0.96 |

**Insets trick:** `innerInsets = { ...insets, top: 0 }` is provided via `SafeAreaInsetsContext.Provider`, so children can use `useSafeAreaInsets()` and get **top = 0** (the top bar already consumed the top inset).

---

### `src/screens/HomeScreen.jsx` — THE DASHBOARD

**Purpose:** The landing page. Hero, quick-rail, recent items, and the full grouped grid.

**Props**

| Prop | Default | Meaning |
|------|---------|---------|
| `onOpenMenu` | — | Opens the drawer (rendered by the menu button in the app shell) |
| `onNavigate` | — | `onNavigate(key)` switches screens |
| `activeKey` | `'home'` | Highlights the active card |

**Variables**

| Name | Value / expression | Meaning |
|------|--------------------|---------|
| `width` | `useWindowDimensions().width` | Screen width |
| `insets` | `useSafeAreaInsets()` | Safe-area padding |
| `cols` | `columnsFor(width)` → 3 / 2 / 1 | Grid columns |
| `compact` | `width < 380` | Small-phone mode (smaller logo, 34px brand) |
| `wide` | `width >= 700` | Tablet/landscape mode (max width 1180, centred, bigger hero) |
| `sections` | `GROUPS.filter(g => g !== 'Start').map(...)` | The 3 non-Start groups with their routes |
| `total` | `ROUTES.length - 1` = 12 | Shown as "12 places" |
| `CARD_W` | `{1:'100%', 2:'48.5%', 3:'31.5%'}` | Card width per column count |

**`columnsFor(width)` breakpoints (⑂ responsive branches)**

| Width | Columns | Card width |
|-------|---------|------------|
| `>= 1100` | 3 | 31.5% |
| `>= 700` | 2 | 48.5% |
| `< 700` | 1 | 100% |

**Other layout branches**

| Condition | Result |
|-----------|--------|
| `compact === true` (`width < 380`) | hero logo height 116 instead of 148; brand font 34 instead of 40 |
| `wide === true` (`width >= 700`) | content maxWidth 1180, `alignSelf:'center'`, hero gets extra top/bottom padding (30/40 vs 18/26) |

**☰ Menus / lists on Home**

1. **Menu rail** — a horizontal `ScrollView` of all 12 non-home routes (icon + label). Tap → `onNavigate(r.key)`.
2. **Recent done things** — 3 hardcoded strings: `Completed a study session`, `Logged daily goals`, `Updated notes` (⚠ static, not real data).
3. **Everything in here** — grouped grid, 3 sections × 4 cards.

**User actions**

| Action | Outcome |
|--------|---------|
| Tap a rail chip | `onNavigate(r.key)` |
| Tap a grid card | `onNavigate(r.key)` |
| Card of the active route | gets green border + green icon tile (`r.key === activeKey`) |

**Bottom line — ways through Home**

1. **Browse** — scroll the hero → rail → recent → grid.
2. **Quick jump** — horizontal rail to any of the 12 screens.
3. **Browse by group** — scroll to Everyday / Write / Life and pick a card.
4. **Responsive variant** — 1 column on a phone, 2 on a small tablet, 3 on a wide tablet/desktop; the layout itself changes.

---

---

## 4. Mobile screens in depth

> Every screen below is reachable from **Home** (rail chip or grid card) or from the **Drawer**.
> All of them talk to the same Django backend at `process.env.EXPO_PUBLIC_API_URL`.

### 4.1 `src/components/Mydaylogpage.jsx` — route `myday` ("My Day")

**Purpose:** A masonry grid of polaroid-style memory cards (day logs). Create / edit / delete entries with a title, date, mood and image (local upload **or** remote URL).

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `entries` | `[]` | The daylog objects from the API |
| `formData` | `EMPTY_FORM` | `{ title:'', date: todayISO(), mood:'Neutral', remote_url:'', source:'remote' }` |
| `pickedFile` | `null` | The `expo-image-picker` asset (when set, the remote-URL field is hidden) |
| `isEditing` | `false` | `false` = "Log New Memory" (POST), `true` = "Edit Day Stamp" (PUT) |
| `currentId` | `null` | Id of the entry being edited → builds the PUT URL |
| `isModalOpen` | `false` | Visibility of `EntryModal` |
| `loading` | `false` | "Developing memories…" row during the initial fetch |
| `refreshing` | `false` | Pull-to-refresh spinner |
| `submitting` | `false` | True while POST/PUT is in flight |
| `fetchError` | `''` | Red banner: "Cannot reach backend. Check that the Django server is running." |
| `toast` | `null` | `{ msg, type:'success'\|'error', k }` |
| `activeId` | `null` | Which polaroid card is "open" (shows Edit/Delete). One at a time. |
| `showDate` (in modal) | `false` | Inline `DateTimePicker` visibility |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `sorted` | `entries` sorted by `new Date(b.date) - new Date(a.date)` | Newest first |
| `columns` | round-robin distribution of `sorted` into `cols` columns | Masonry layout |
| `cols` | `width >= 1024 ? 3 : width >= 600 ? 2 : 1` | Responsive column count |
| `gap` | `cols === 1 ? 0 : 24` | Column gap |
| `sidePad` | `width >= 600 ? 32 : 18` | Page padding |
| `contentWidth` | `Math.min(width, 1320) - sidePad*2` | Max content width |
| `wideModal` | `width >= 700` | Centered dialog vs bottom sheet |
| `heroSize` | `84 / 66 / 46` by breakpoint | Hero image size |
| `tilt` | `tiltFor(entry.id)` | Deterministic polaroid rotation |
| `tapeLeft` | `idNumber(entry.id) % 2 === 0` | Even id → tape on the left |
| `mood` | `MOOD_PALETTE[entry.mood] \|\| MOOD_PALETTE.Neutral` | Card tint |
| `aspect` | `useState(4/3)`, updated from the image's intrinsic size | Photo aspect ratio |
| `previewSrc` | `pickedFile?.uri \|\| formData.remote_url` | Modal image preview |
| `canSubmit` | `!!formData.title.trim() && !!formData.date && !submitting` | Submit button enabled |

**☰ Mood options (the chip selector in the modal)**

| Mood | bg | fg |
|------|----|----|
| `Happy` | `#d1f0e0` | `#1a5c36` |
| `Okay` | `#fde9cc` | `#7a4010` |
| `Neutral` | `#e8e2d8` | `#5a4f40` |
| `Sad` | `#d5e8f7` | `#1e3f6a` |
| `Wired` | `#fce8e8` | `#8b1a1a` |
| `Tired` | `#eaedf2` | `#374050` |

**Image source options** — two mutually exclusive ways: **local file upload** (`pickedFile`) or **remote URL** (`formData.remote_url`). Picking a file hides the URL field; the payload then carries `source: 'local'` + `file`. Otherwise `source: 'remote'` + `remote_url`.

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| render | `!fontsLoaded` | centered `ActivityIndicator` only | full screen |
| render | `!!fetchError` | red error banner + "Try again" | no banner |
| render | `loading` | "Developing memories…" + 3 bouncing dots | hidden |
| render | `!loading && !fetchError && entries.length === 0` | dashed empty frame "Your archive is empty." (tap → openAdd) | hidden |
| render | `sorted.length > 0` | masonry grid | no grid |
| card | `entry.url` truthy | `<Image>` + overlay (Edit/Delete) shown only when `active` | `noPhoto` block with Edit/Delete always visible |
| card | `active` | bigger shadow, `zIndex 10`, un-rotates to `0deg`, scale `1.025` | keeps its tilt, scale `1` |
| card | `tapeLeft` | tape at `left:14`, rotated `-12deg` | tape at `right:14`, rotated `10deg` |
| modal | `wide` | centered dialog, `animationType:'fade'`, toast anchored right | bottom sheet, `animationType:'slide'`, full-width toast |
| modal | `isEditing` | title "Edit Day Stamp", dark button | title "Log New Memory", green button |
| modal | `showDate` | inline `DateTimePicker` (iOS `inline`, Android `default`) | just the date button |
| modal | `pickedFile` truthy | button reads "↺ Replace File", URL field hidden, file name shown | button reads "↑ Upload File", URL field shown |
| modal | `canSubmit` | button enabled | disabled, `opacity 0.45` |
| date change | `Platform.OS === 'android'` | picker closes immediately | picker stays open |
| date change | `event?.type === 'dismissed'` | ignored, no date change | — |
| date change | `selected` truthy | `formData.date = toISODate(selected)` | date unchanged |
| submit | `!formData.title.trim() \|\| !formData.date` | early return, nothing sent | request sent |
| submit | `pickedFile` truthy | multipart with `file` + `source:'local'` | multipart with `source:'remote'` + `remote_url` |
| submit | `!res.ok` | error toast built from the first error key: `"<key>: <message>"`, or `'Submission failed.'` | success path |
| submit success | `isEditing` | toast "Day updated." | toast "Day logged." |
| image pick | permission not granted (iOS) | toast "Allow photo access in Settings to pick an image." | picker opens |
| image pick | `res.canceled \|\| !res.assets?.length` | nothing happens | file set, `source:'local'`, `remote_url` cleared |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| Tap "+ Log New Day" | `openAdd()` → modal in add mode, today's date, mood Neutral |
| Tap the empty frame | `openAdd()` (same path) |
| Tap a card | `toggleActive(id)` → shows/hides the Edit/Delete overlay |
| Tap "Edit" on a card | `openEdit(entry)` → modal pre-filled in edit mode |
| Tap "Delete" on a card | native Alert "Remove this memory?" → "Remove" → `DELETE /api/daylogs/{id}/` → toast "Memory removed."; "Cancel" → nothing |
| Type in the title | updates `formData.title` |
| Tap the date button | toggles the date picker |
| Tap a mood chip | sets `formData.mood` |
| Tap "Upload File" / "Replace File" | opens the gallery |
| Type a remote URL | sets `formData.remote_url` (only when no file is picked) |
| Tap "Cancel" / the × / the overlay / Android back | `closeModal()` |
| Tap "Archive Memory" / "Save Changes" | POST / PUT → silent refresh → toast |
| Pull to refresh | `fetchEntries({silent:true})` |
| Tap "Try again" | `fetchEntries()` (full reload) |

**Modals / overlays:** `EntryModal` (the only `Modal`), native `Alert` (delete), `Toast` (absolute overlay, not a Modal), `RefreshControl`.

**API endpoints**

| Method | URL | Body |
|--------|-----|------|
| GET | `${API_BASE}/api/daylogs/` | — |
| POST | `${API_BASE}/api/daylogs/` | multipart: `title`, `date`, `mood`, (`file`+`source=local` \| `source=remote`+`remote_url`) |
| PUT | `${API_BASE}/api/daylogs/{id}/` | same multipart shape |
| DELETE | `${API_BASE}/api/daylogs/{id}/` | — |

**Storage keys:** none.

**Bottom line — the ways**

1. **Browse** — open → `GET /api/daylogs/` → masonry grid newest-first (1/2/3 columns by width) → tap a card to reveal Edit/Delete.
2. **Create** — "+ Log New Day" or the empty frame → fill title/date/mood/image → "Archive Memory" → POST multipart → silent refresh + "Day logged."
3. **Edit** — card → "Edit" → modal pre-filled → "Save Changes" → PUT → "Day updated."
4. **Delete** — card → "Delete" → Alert "Remove" → DELETE → card disappears + "Memory removed."
5. **Error recovery** — backend down → red banner + "Try again"; genuinely empty → dashed empty frame.

---

### 4.2 `src/components/Chronostaskflow.jsx` — route `chronos` ("Chronos")

**Purpose:** A horizontal timeline of per-day task columns with per-day progress bars. Inject, complete, edit and delete tasks — and delete a whole day at once.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `allTasks` | `[]` | The master task array |
| `loading` | `true` | "Loading pipeline…" state |
| `apiError` | `''` | Pulsing red `ErrorPill` |
| `savingId` | `null` | Which task has a request in flight (that card dims + spins) |
| `submitting` | `false` | True while POST is in flight (disables input, date chip, submit) |
| `taskInput` | `''` | The text in the bottom control bar |
| `dateInput` | `today()` | Due date for the next task (ISO `YYYY-MM-DD`) |
| `showDate` | `false` | `DatePickerControl` visibility |
| `timelineH` | `null` | Measured timeline height → column `maxHeight` |
| `pageIndex` | `0` | Which day column is visible (drives the dot pager) |
| `isEditing` (in TaskCard) | `false` | Inline text edit mode |
| `editText` (in TaskCard) | `task.text` | Edit buffer |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `visibleDayGroups` | group by `dueDate` → **keep only days with ≥1 incomplete task** → sort dates ascending → sort tasks by `completed` then `createdAt` desc | What the timeline shows |
| `pendingCount` | `allTasks.filter(t => !t.completed).length` | Header "Active Pipeline: N Pending" |
| `canSubmit` | `!!taskInput.trim() && !submitting` | Submit button enabled |
| `snap` | `colWidth + colGap` | Horizontal snap distance |
| `wide` | `width >= 700` | Control-bar layout (row vs stacked) |
| `colWidth` | `wide ? 320 : Math.min(width - sidePad*2, 380)` | Column width |
| `barSpace` | `wide ? 120 : 170` | Space reserved for the floating control bar |
| `colorForDate(dateStr)` | deterministic index into `DAY_COLORS` (8 palettes) from the UTC day number | Per-day colour |

**☰ Options / vocabularies**

- **Date picker** (`DateTimePicker`, `mode="date"`) → sets `dateInput`. iOS opens a `Modal` with an inline picker + "Done"; Android opens the native dialog inline.
- **Alert buttons** — "Cancel" vs "Delete day".
- `DAY_COLORS` — 8 day palettes (name / strong / tint / tintDeep / line).

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| render | `!fontsLoaded` | spinner only | full screen |
| render | `!!apiError` | pulsing `ErrorPill` with dismiss × | hidden |
| main body | `loading` | centered spinner + "Loading pipeline..." | — |
| main body | `visibleDayGroups.length === 0` | empty state: "All pipelines clear." / "Your timeline is empty. Use the control bar below to inject a new task." | — |
| main body | else | dot pager (narrow, >1 column) + horizontal `ScrollView` of `DayColumn`s | — |
| card | `task.completed` | faded bg `rgba(255,255,255,0.55)`, transparent border, grey struck-through text | white bg, coloured left border |
| card | `isSaving` | `opacity 0.55`, checkbox spinner, controls disabled | normal |
| card | `isEditing` | inline `TextInput` (auto-focus after 30ms) with "Save edit" + "Cancel edit" | text label (long-pressable) + pencil (only when not completed) + trash |
| card | `startEdit()` and (`isSaving` or `task.completed`) | editing blocked | edit starts |
| card | `submitEdit()` and the cancel flag is set | ignored (cancel that races with blur) | empty/unchanged text is not sent; otherwise `onEdit` |
| day column | `dayGroup.date === today()` | "TODAY" badge | no badge |
| day column | `savingId === task.id` | that card only shows `isSaving` | others don't |
| control bar | `wide` | one row: [input, date chip, submit] | stacked: [input] over [date chip, submit] |
| date chip | `dateInput === today()` | "Today · Mon, Oct 20" | "Mon, Oct 20" |
| timeline height | `timelineH` measured | `Math.max(220, timelineH - barSpace - 16)` | `undefined` (unconstrained) |
| group filter | day has ≥1 incomplete task | the day is shown | **the whole day column is hidden** |
| dot pager | `!wide && visibleDayGroups.length > 1` | shown (active dot is 22px wide, others 8px) | hidden |
| iOS picker | — | `Modal` + inline picker + "Done" | Android inline native picker |
| iOS picker | `event?.type === 'dismissed'` | ignored | date updates via `onChange(toISODate(selected))` |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| Type in "Inject new objective..." | `setTaskInput`; keyboard "done" → `handleAddTask` |
| Tap the date chip | opens the picker; picking a date sets `dateInput` |
| Tap "Archive Objective" | `POST /api/tasks/` `{text, dueDate, completed:false}` → task prepended, input cleared |
| Tap the checkbox | `PATCH /api/tasks/{id}/` `{completed: !completed}` → card fades/strikes; **if it was the last pending task that day, the whole day column disappears** |
| Long-press the task text / tap the pencil | inline edit mode (blocked for completed tasks) |
| Tap the check (or blur) | `PUT /api/tasks/{id}/` `{text, dueDate, completed}` |
| Tap the × | cancels the edit, no request |
| Tap the trash | `DELETE /api/tasks/{id}/` → card removed |
| Tap the column × | Alert "Delete this day? / All N task(s) on <date> will be removed." → "Delete day" → optimistic removal + parallel DELETEs; "Cancel" → nothing |
| Tap the refresh icon | `fetchTasks()` |
| Tap the error pill's × | `setApiError('')` |

**Modals / overlays:** iOS `Modal` date picker, native `Alert` (delete day), `ErrorPill` (inline banner), the floating bottom control bar (`zIndex 100`).

**API endpoints**

| Method | URL | Body |
|--------|-----|------|
| GET | `${BASE_URL}/tasks/` | — |
| POST | `${BASE_URL}/tasks/` | `{ text, dueDate, completed }` |
| PATCH | `${BASE_URL}/tasks/{id}/` | `{ completed }` |
| PUT | `${BASE_URL}/tasks/{id}/` | `{ text, dueDate, completed }` |
| DELETE | `${BASE_URL}/tasks/{id}/` | — |

`BASE_URL = ${EXPO_PUBLIC_API_URL}/api`. **Storage keys:** none.

**Bottom line — the ways**

1. **Create** — type → optional date → "Archive Objective" → POST → task appears at the top of its due-date column.
2. **Complete** — tap the checkbox → PATCH → the card greys out; completing the last pending task of a day removes that day column.
3. **Edit** — long-press the text (or the pencil) → inline input → check to PUT, × to cancel.
4. **Delete one** — trash icon → DELETE.
5. **Delete a day** — column × → Alert → parallel DELETEs of every task on that date.
6. **Navigate** — swipe the timeline, or tap a dot (narrow, >1 day) → `pageIndex` changes.

---

### 4.3 `src/components/Goalsscreen.jsx` — route `goals` ("Goals")

**Purpose:** CRUD list of goals with a **per-day check-in grid** and an overall completion toggle.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `goals` | `[]` | Goal objects `{ id, title, timeline, done, day_statuses:[{id,day_number,done}], days_completed? }` |
| `loading` | `true` | "Loading goals..." row |
| `refreshing` | `false` | Pull-to-refresh spinner |
| `error` | `''` | Dismissible red banner |
| `isCreating` | `false` | Shows/hides the new-goal form; flips the header button label |
| `editingId` | `null` | Which goal is in inline-edit mode |
| `savingId` | `null` | Which goal is mutating; `'new'` = create request in flight |
| `togglingDay` | `null` | Key `` `${goal.id}-${day_number}` `` of the day being toggled |
| `newGoal` | `{ title:'', timeline:'' }` | Create form values |
| `editGoal` | `{ title:'', timeline:'' }` | Edit form values |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `summary` | `{ total: goals.length, done: goals.filter(g => g.done).length }` | Header "X of Y goals complete" |
| `doneOf(g)` | `g.days_completed ?? g.day_statuses?.filter(d => d.done).length ?? 0` | Completed days |
| `pct` | `g.timeline ? Math.min(100, (completed / g.timeline) * 100) : 0` | Progress bar fill % |
| `isNewSaving` | `savingId === 'new'` | Disables the create form |
| `editingThis` | `editingId === g.id` | Card shows edit form instead of display row |
| `busy` | `savingId === g.id` | Dims the card, disables controls |
| `narrow` | `width < 500` | Stacks the header row; title font 30 vs 35 |
| `stackForm` | `width < 600` | Stacks the create form fields |
| `pad` | `width >= 600 ? 24 : 16` | Page padding |
| `daySize` | `width >= 600 ? 28 : 34` | Day-square size |
| `validTimeline(n)` | `n && n > 0 && n <= 365` | Timeline must be 1–365 days |

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| fetch | `!silent` | `loading = true` → spinner row | list stays visible (pull-to-refresh) |
| fetch | `!res.ok` | `error = 'Failed to load goals. Check your network connection.'` | goals set (`Array.isArray(data) ? data : data.results \|\| []`) |
| create | `!newGoal.title.trim()` | `error = 'Add an objective for your goal.'`, no request | continues |
| create | `!validTimeline(t)` | `error = 'Timeline must be between 1 and 365 days.'`, no request | POST sent |
| create | `!res.ok` | server error message in the banner | goal prepended, form reset & closed |
| toggle goal | `!res.ok` | `error = 'Toggle failed.'` | `replaceGoal(...)` → check ✓ / strike-through / green border |
| toggle day | `!res.ok` | `error = 'Could not update that day.'` | that square turns green/white |
| update | `!editGoal.title.trim()` | same title error | continues |
| update | `!validTimeline(t)` | same timeline error | PATCH sent → card collapses out of edit mode |
| delete | `!res.ok && res.status !== 204` | `error = 'Delete failed.'`, goal stays | goal removed from the list |
| render | `!!error` | red banner (tap to dismiss) | hidden |
| render | `isCreating` | the OBJECTIVE / TIMELINE form block shows | hidden |
| header button | `isCreating` | label "Cancel" (ghost style) | label "+ Add Goal" (dark) |
| render | `loading` | spinner + "Loading goals..." | hidden |
| render | `!loading && goals.length === 0 && !error` | "No goals yet. Add your first one above." | hidden |
| render | `!loading && goals.length > 0` | summary line + goal cards | hidden |
| card | `editingThis` | two inputs + Update/Cancel | display row |
| card | `g.done` | light green border | default border |
| card | `busy` | `opacity 0.6` | full opacity |
| card | `busy` | controls are no-ops | check square PATCHes `{done: !g.done}` |
| card | `g.done` | title muted + line-through | normal title |
| card | `g.timeline` truthy | progress fill = capped % | fill 0% |
| card | `g.day_statuses` exists | one `DayBox` per day | empty grid |
| DayBox | `day.done` | green fill, white number | muted fill, soft number |
| DayBox | `busy` | spinner instead of the number, `opacity 0.6` | number |
| timeline input | onChangeText | digits only (`v.replace(/\D/g,'')`), `maxLength 3`, number-pad | — |
| inputs | `editable={!busy}` / `editable={!isNewSaving}` | editable | read-only |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| "+ Add Goal" / "Cancel" | toggles the create form, clears the error, animates |
| Save (create form) | `POST /api/Goals/` → prepended, form closes & resets |
| Tap the round check square | `PATCH /api/Goals/{id}/` `{done}` → toggles ✓ / strike-through |
| Tap a day square | `PATCH /api/Goals/{id}/days/{n}/toggle/` → that square flips |
| Tap ✏️ | `startEditing(g)` → the card becomes two inputs (pre-filled) |
| Tap "Update" | `PATCH /api/Goals/{id}/` → saved, edit form collapses |
| Tap "Cancel" (edit) | `editingId = null` → no request |
| Tap ✕ | Alert "Delete this goal permanently? / "<title>" and its day check-ins will be removed." → "Delete" → `DELETE /api/Goals/{id}/`; "Cancel" → nothing |
| Tap the error banner | clears it |
| Pull to refresh | silent re-fetch |

**☰ Options:** none — there is no dropdown/tab/chip picker. The only "menu" is the day-number grid supplied by the server (`day_statuses`), and the Alert's two buttons.

**API endpoints**

| Method | URL | Body |
|--------|-----|------|
| GET | `${BASE_URL}/Goals/` | — |
| POST | `${BASE_URL}/Goals/` | `{ title, timeline }` |
| PATCH | `${BASE_URL}/Goals/{id}/` | `{ title, timeline }` or `{ done }` |
| PATCH | `${BASE_URL}/Goals/{id}/days/{dayNumber}/toggle/` | — |
| DELETE | `${BASE_URL}/Goals/{id}/` | — |

`BASE_URL = ${EXPO_PUBLIC_API_URL}/api`. **Storage keys:** none.

**Bottom line — the ways**

1. **Load** — `GET /api/Goals/` → spinner / error banner / empty state / list.
2. **Create** — "+ Add Goal" → OBJECTIVE + TIMELINE(1–365) → Save → POST → prepended.
3. **Track** — tap the round check (whole goal) **or** tap individual day squares (per-day) → the progress bar and "X/Y days done" update in place.
4. **Edit** — ✏️ → two inputs → Update (PATCH) or Cancel (no request).
5. **Delete** — ✕ → Alert → DELETE → gone.

---

### 4.4 `src/components/Challengetrackerscreen.jsx` — route `challenge` ("Challenges")

**Purpose:** Tracks two kinds of challenge — **days** (a calendar grid you can only tick for *today*) and **instant** (a three-way status). Create / edit / delete, and share a completion badge.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `challenges` | `[]` | Transformed challenges `{ id, title, type, startDate, durationDays, endDate, instantStatus, log, backendStats }` |
| `loading` | `true` | Spinner |
| `refreshing` | `false` | Pull-to-refresh |
| `loadError` | `''` | "Couldn't load challenges: …" banner + Retry |
| `actionError` | `''` | Dismissible red banner for mutating-action failures |
| `showForm` | `false` | Visibility of `ChallengeForm` |
| `editingChallenge` | `null` | The challenge being edited (`null` = create mode) |
| `badgeData` | `null` | `{ challenge, stats }` → triggers badge capture + share |

**`ChallengeForm` state**

| Variable | Initial | Controls |
|----------|---------|----------|
| `title` | `editingChallenge?.title ?? ''` | Challenge title |
| `type` | `editingChallenge?.type ?? 'days'` | `'days'` or `'instant'` |
| `startDate` | `editingChallenge?.startDate ?? todayISO()` | Start date |
| `durationDays` | `String(editingChallenge?.type === 'days' ? editingChallenge.durationDays : 30)` | Duration text |
| `instantEnd` | `editingChallenge?.type === 'instant' ? editingChallenge.endDate : addDays(todayISO(), 9)` | End date |
| `submitting` | `false` | Spinner + disables the button |
| `formError` | `''` | Inline validation/API error |
| `open` (DateField) | `false` | Date picker visibility |

**`ChallengeCard` state:** `expanded` (`false`) — whether the stats + day grid body is open.

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `ongoing` | `c.type === 'instant' \|\| c.backendStats?.status !== 'ended'` | The ONGOING section |
| `ended` | `c.type === 'days' && c.backendStats?.status === 'ended'` | The ENDED section |
| `endDate` (form) | `type === 'days' ? calculateEndDate(startDate, Number(durationDays) \|\| 0) : instantEnd` | End date |
| `totalDays` (form) | inclusive day count between start and end | Shown in the info strip |
| `stats` (card) | `null` unless `type === 'days'` **and** `backendStats` exists | Everything stats-related |
| `clickable` | `challenge.type === 'days'` | Header expands |
| `isEnded` | `clickable && stats?.status === 'ended'` | "Ended" pill + badge row |
| `getDayStatus(iso, log)` | `'completed'` if `log[iso]==='completed'`; else `'missed'` if `iso < today`; else `'today'` if `iso === today`; else `'upcoming'` | Cell colour |
| `isEditable(iso)` | `iso === todayISO()` | **Only today is toggleable** |
| `cols` | `wide ? 10 : 7` | Day cells per row (`wide` = width ≥ 640) |
| `pad` | `width >= 640 ? 24 : 16` | Page padding |

**☰ Option lists**

1. **Challenge type (segmented buttons):**
   - `'days'` → label **"Days challenge"** → second field becomes `Duration (days)` (number pad) and `endDate = start + duration − 1`.
   - `'instant'` → label **"Instant challenge"** → second field becomes `End date` (picker, `min = startDate`).
2. **Instant status (3 buttons) — the exact keys sent to the API:**

   | Key | Label | Icon | bg | border | fg |
   |-----|-------|------|----|--------|----|
   | `completed` | Completed | Check | `C.greenLt` | `C.green` | `C.greenDark` |
   | `not_completed` | Not done | X | `C.dangerLt` | `#f87171` | `#dc2626` |
   | `pending` | Pending | Clock | `C.amberLt` | `C.amber` | `#b45309` |

3. **Stats grid (read-only, 5 rows):** `Done`, `Missed`, `Remaining`, `Best streak`, `Complete` (`${completionPct}%`).
4. **Day-cell status vocabulary:** `completed`, `missed`, `today`, `upcoming`.
5. **Sections:** `ONGOING` and `ENDED` (static sections, not interactive tabs).

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| `apiRequest` | `!res.ok` | throws with `b.detail \|\| JSON.stringify(b)` or `Request failed (${status})` | continues |
| `apiRequest` | `res.status === 204` | returns `null` | returns `await res.json()` |
| load | `!silent` | `loading = true` → spinner | list stays |
| load | catch | `loadError` banner + Retry | challenges set |
| New button | `showForm && !editingChallenge` | closes the form | opens a blank create form (or resets to create if the form was open in edit mode) |
| submit | `!title.trim() \|\| !startDate \|\| !endDate` | `formError = 'Add a title and valid dates.'` | continues |
| submit | `totalDays < 1` | `formError = 'End date must be on or after the start date.'` | continues |
| submit | `isEditing` | PATCH `/challenges/{id}/` | POST `/challenges/` |
| submit | catch | inline `formError = e.message` | — |
| submit button | `submitting` | spinner + "Saving..." / "Creating..." | "Save changes" / "Create challenge" |
| type chip | selected | green border + `greenLt` bg | default |
| form field | `type === 'days'` | `Duration (days)` number input | `End date` DateField |
| DateField | `Platform.OS !== 'ios'` | closes on pick | stays open (Modal + Done) |
| DateField | `d` truthy | `onChange(formatISODate(d))` | unchanged |
| DateField | `min` provided | picker disables earlier dates | no minimum |
| card `stats` | `type !== 'days' \|\| !backendStats` | `stats = null` → **no stats grid, no day grid, no streak, no progress, no chevron, no badge** | full card |
| card header | `clickable` | expands/collapses | `disabled`, nothing |
| card | `wide` | small inline progress track in the header | full-width track below the header |
| status pill | `stats` truthy | "Ended" (green) or "Ongoing" (amber) | no pill |
| chevron | `expanded` | rotated 180° | 0° |
| instant body | `type === 'instant'` | the 3-button control renders | not rendered |
| DayCell | `editable` (today) | pressable, pulsing ring, `Lock` absent | disabled; `upcoming` shows a `Lock`, `missed` shows a grey dot |
| DayCell pulse | `editable && status === 'today'` | infinite 2200ms pulse, green ring `#22c55e` | no ring, no animation |
| toggle day | `!isEditable(iso)` | nothing happens (no request) | POST `mark-day/` |
| delete | `editingChallenge?.id === id` | the form closes too | only the card disappears |
| badge effect | `badgeData` null | nothing | after 120ms → capture 800×500 PNG → share sheet |
| badge effect | `Sharing.isAvailableAsync()` true | `shareAsync(uri, {mimeType:'image/png', dialogTitle:'Share your badge'})` | `actionError = 'Sharing is not available on this device.'` |
| render | `ongoing.length === 0` | "No ongoing challenges. Start one above 🌱" | hidden |
| render | `ended.length > 0` | the ENDED section renders | the section is omitted entirely |
| render | `badgeData` | an off-screen view at `left: -2000` hosts `BadgeArt` for capture | nothing |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| Tap "New" | opens a blank create form (or closes it if a create form was open) |
| Tap "Days challenge" / "Instant challenge" | swaps the type → swaps the second field and how `endDate` is computed |
| Tap the start-date field | picker → sets `startDate` |
| Type in Duration | sets `durationDays` (digits only) → `endDate` recomputes |
| Tap the end-date field (instant) | picker with `min = startDate` → sets `instantEnd` |
| "Create challenge" / "Save changes" | POST / PATCH → list updates, form closes |
| "Cancel" in the form | closes the form, no request |
| Tap the card header (days) | expands/collapses the stats + day grid (layout animation) |
| Tap **today's** cell | POST `mark-day/` → toggles completed + stats/streak update |
| Tap a past/future cell | disabled (missed dot / lock icon) |
| Tap Completed / Not done / Pending | PATCH `instant-status/` `{instant_status: key}` |
| Tap ✏️ | opens the form pre-filled |
| Tap 🗑 | Alert "Delete this challenge? / This cannot be undone." → Delete → DELETE; Cancel → nothing |
| Tap "Share badge" (ended) | captures an 800×500 PNG badge and opens the OS share sheet |
| Tap the action-error banner | clears it |
| Tap "Retry" | reloads |
| Pull to refresh | silent reload |

**Modals / overlays:** iOS-only `Modal` date picker (overlay + sheet + "Done"), native `Alert` (delete), the hidden off-screen `BadgeArt`, the OS share sheet.

**API endpoints**

| Method | URL | Body |
|--------|-----|------|
| GET | `${API_BASE}/challenges/` | — |
| POST | `${API_BASE}/challenges/` | `{ title, type, start_date, duration_days\|end_date }` |
| PATCH | `${API_BASE}/challenges/{id}/` | same |
| DELETE | `${API_BASE}/challenges/{id}/` | — |
| POST | `${API_BASE}/challenges/{id}/mark-day/` | — |
| PATCH | `${API_BASE}/challenges/{id}/instant-status/` | `{ instant_status }` |

**Storage keys:** none.

**Bottom line — the ways**

1. **Create** — New → type (Days = start + duration, Instant = start + end) → Create → POST → the card lands at the top of ONGOING.
2. **Days challenge** — expand the card → stats + calendar grid → tap **only today's** cell → POST `mark-day/` → stats/streak update. Past cells show a missed dot; future cells are locked.
3. **Instant challenge** — the 3-button control (Completed / Not done / Pending) → PATCH `instant_status` → the button highlights.
4. **End of challenge** — `status === 'ended'` → the card moves to ENDED, shows "Ended" + "Finished at N% completion. Nice work!" + "Share badge" → PNG capture → share sheet.
5. **Maintenance** — ✏️ edit (PATCH), 🗑 delete (DELETE via Alert), pull-to-refresh / Retry.

---

### 4.5 `src/components/Notes.jsx` — route `notes` ("Notes")

**Purpose:** A two-pane notes app — list + markdown-ish editor with autosave, pinning, search, duplicate/copy/PDF export and delete.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `notes` | `[]` | Note objects `{ id, title, text, created_at, ... }` |
| `loading` | `true` | Skeleton rows instead of the list |
| `refreshing` | `false` | Pull-to-refresh spinner |
| `fetchErr` | `null` | "Couldn't load notes" banner in the sidebar |
| `selectedId` | `null` | `null` = nothing open; `'draft'` = unsaved new note; number = a real note id |
| `content` | `''` | The full text of the open note (`title\nbody`) |
| `saveStatus` | `'idle'` | `'idle' \| 'saving' \| 'saved'` → the topbar indicator |
| `saveErr` | `null` | Inline red error bar above the editor |
| `confirmDeleteId` | `null` | Note pending delete confirmation |
| `deletingId` | `null` | Note currently being deleted |
| `toasts` | `[]` | `{ id, msg, err }` — max 2 kept |
| `query` | `''` | Raw search text |
| `debouncedQuery` | `''` | Lower-cased/trimmed query after a 150ms debounce — this is what filters |
| `filter` | `'all'` | `'all' \| 'pinned'` |
| `pinned` | `new Set()` | Pinned note ids (persisted in AsyncStorage) |
| `menuNote` | `null` | The note whose long-press context menu is open |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `wide` | `width >= 900` (`WIDE_BREAKPOINT`) | Two-pane vs one-pane |
| `showLabels` | `width >= 640` | Toolbar buttons show their text label |
| `filteredSortedNotes` | filter by pin → filter by search → sort pinned-first then `created_at` desc | The list |
| `draftRow` | fake row `{ id:'draft', title, text, created_at, isDraft:true }` while `selectedId === 'draft'` | The synthetic first row |
| `listItems` | `draftRow ? [draftRow, ...filteredSortedNotes] : filteredSortedNotes` | What the FlatList renders |
| `emptyState` | `{title, desc}` | The empty-list placeholder |
| `isPinnedSelected` | `typeof selectedId === 'number' && pinned.has(selectedId)` | Pin button state |
| `showList` / `showDetail` | `wide \|\| selectedId === null` / `wide \|\| selectedId !== null` | Which pane renders |
| `cmNote` | `menuNote ? notes.find(n => n.id === menuNote.id) : null` | The resolved context-menu note |

**☰ Option lists**

1. **Filter chips:** `['all','All Notes']`, `['pinned','Pinned']`.
2. **Long-press context menu (exact labels):**

   | Label | Icon | Effect |
   |-------|------|--------|
   | `Open` | `book-open` | opens the note |
   | `Duplicate` | `layers` | POST a copy titled `<title> copy`, then opens it |
   | `Copy` | `copy` | copies `title\nbody` to the clipboard |
   | `Download as PDF` | `download` | prints to PDF + share sheet |
   | `Pin note` / `Unpin note` | `bookmark` | toggles the pin set |
   | `Delete note` | `trash-2` (danger) | opens the delete-confirm modal |

3. **Editor toolbar:** `copy`/"Copy", `download`/"PDF", `bookmark`/"Pin"|"Pinned", `layers`/"Duplicate", `trash-2`/"Delete".
4. **Delete modal buttons:** "Cancel" (secondary), "Delete"/"Deleting…" (danger).

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| `deleteNote` | `!res.ok && res.status >= 500 && i < attempts-1` | records the error and retries (2 attempts, 90s timeout) | returns the response |
| `noteStillExists` | `!res.ok` or a thrown error | returns `true` (treat delete as failed) | `list.some(n => n.id === id)` |
| `parseError` | body is an object | joins `key: value` pairs with `' · '` | `String(data)`; non-JSON → `Server error (${status})` |
| `splitTitleBody` | no newline | title = whole string, body = `''` | title = before the first newline, body = after |
| `splitTitleBody` | `title.length > 140` | the overflow is pushed into the body, title truncated to 140 | title kept |
| `fetchNotes(silent)` | `!silent` | `loading = true` → skeletons | silent refresh (no skeleton) |
| `commitSave` | `!text \|\| !text.trim()` | returns `true` (blank = no-op success) | proceeds |
| `commitSave` | `id === 'draft'` | **creation path** (POST) | **update path** (PATCH) |
| `commitSave` (draft) | `draftCreatingRef.current` | the text is queued in `draftQueuedRef` and replayed after creation | POST is sent |
| `commitSave` | `!res.ok` | `saveErr` = parsed error, status `'idle'`, returns `false` | replaces the note, status `'saved'` |
| `commitSave` | network throw | `saveErr = 'Network error — not saved.'` (create) / `'Network error — changes are not saved.'` (update) | — |
| `selectNote` | `selectedId === item.id` | no-op | continues |
| `selectNote` | `flushPending()` failed | toast "Couldn't save your last note — staying here so nothing is lost." and **does not switch notes** | switches and focuses the editor (wide) |
| `onContentChange` | `selectedId === null` | no save | schedules a save (700ms debounce) |
| `BackHandler` | `wide \|\| selectedId === null` | not intercepted | intercepted → `handleBack()` (flush, then close the editor) |
| `filteredSortedNotes` | `filter === 'pinned'` | only pinned notes | all notes |
| `filteredSortedNotes` | `q` truthy | matches on lower-cased title **or** text | no text filter |
| sort | pinned flags differ | pinned first | else `created_at` descending |
| `draftRow` | `selectedId !== 'draft'` | `null` | the synthetic row |
| `emptyState` | `notes.length === 0 && !draftRow` | "No notes yet" / "Create your first note to get started." | — |
| `emptyState` | `q` truthy | "No notes found" / "Try a different keyword." | — |
| `emptyState` | `filter === 'pinned'` | "No pinned notes" / "Long-press a note and choose Pin to see it here." | — |
| `requestDelete` | `id === 'draft'` | discards the draft, no modal | opens the confirm modal |
| `handleDelete` | `res.ok \|\| 204 \|\| 404` | removes the note, clears the editor if it was open, toast "Note deleted" | toast "Delete failed. Please try again." |
| `handleDelete` | network throw | treats as deleted **only if** the server no longer lists it | toast "Network error — could not delete." |
| `confirmDeleteNow` | `id == null` | no-op | deletes; the modal closes **only on success** |
| `togglePin` | id already in the set | removes it | adds it |
| `duplicateNote` | `!note` | no-op | flush → POST `{emoji:'📝', title:'<title> copy', text}` → opens the copy, toast "Note duplicated" |
| `downloadNotePdf` | `Sharing.isAvailableAsync()` | shares the PDF (`application/pdf`, UTI `com.adobe.pdf`) | the PDF is created but not shared |
| sidebar | `!loading` | the "N notes / 1 note" counter shows | hidden |
| sidebar | `!!query` | a ✕ clear button appears | hidden |
| sidebar | `!!fetchErr` | the error banner + "Retry" | hidden |
| detail | `selectedId === null` | "Select a note" empty state | the editor |
| detail | `!wide` | a back chevron is rendered | hidden |
| detail | `!!content.trim()` | Copy + PDF toolbar buttons | hidden |
| detail | `typeof selectedId === 'number'` | Pin / Duplicate / Delete toolbar | hidden for the `'draft'` id |
| detail | `saveStatus !== 'idle'` | the status dot + "Saving…"/"Saved" | hidden |
| detail | `keyboardUp && !wide` | a "Done" button to dismiss the keyboard | hidden |
| context menu | `!!cmNote` | open | closed (a deleted note closes the menu) |
| context menu | `wide` | `animationType:'fade'`, centred card | `animationType:'slide'`, bottom sheet + grab handle |
| delete modal | `deletingId === null` | the modal can be dismissed | it cannot be dismissed mid-delete |
| delete modal | `deletingId === confirmDeleteId` | button reads "Deleting…" + spinner, plus "The server may take a moment to wake up." | button reads "Delete" |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| Tap "New Note" | `startCreate()` → flush → `selectedId='draft'` → the editor auto-focuses (120ms) |
| Tap a note row | `selectNote(item)` → flush → the editor fills with `title\nbody` |
| Long-press a row (not a draft) | opens the context menu |
| Type in the search field | 150ms debounce → the list filters and highlights matches |
| Tap the search ✕ | clears the query |
| Tap a filter chip | All / Pinned |
| Pull to refresh | silent re-fetch |
| Tap "Retry" | `fetchNotes()` |
| Type in the editor | autosave after 700ms (POST for a draft, PATCH otherwise) |
| Copy / PDF / Pin / Duplicate / Delete | as in the toolbar table |
| "Cancel" in the delete modal | closes it |
| "Delete" in the modal | DELETE → spinner → "Note deleted" toast |
| Back chevron (narrow) or Android back | `handleBack()` → flush → back to the list |
| "Done" (keyboard up, narrow) | `Keyboard.dismiss()` |

**Storage keys / endpoints**

- AsyncStorage key: **`notes:pinned-ids`** (JSON array of ids)
- `GET ${API_BASE}/api/node-matrix/`, `POST .../node-matrix/`, `PATCH .../node-matrix/{id}/`, `DELETE .../node-matrix/{id}/`
- Payload on create/update: `{ emoji:'📝', title, text }`
- Constants: `WIDE_BREAKPOINT = 900`, `DELETE_TIMEOUT = 90000`

**Bottom line — the ways**

1. **Browse → open → edit → save** — list loads → tap a row → the editor fills → typing autosaves after 700ms via PATCH → the "Saving…/Saved" indicator → back to the list.
2. **Create** — "New Note" → a synthetic `'draft'` row appears at the top → the editor auto-focuses empty → the first autosave POSTs → the editor switches to the real id → further typing PATCHes.
3. **Context menu** — long-press → Open / Duplicate / Copy / Download as PDF / Pin-Unpin / Delete.
4. **Search & filter** — debounced search + All/Pinned chips → the list filters and highlights; pinned notes always sort first, newest first within each group.

---

### 4.6 `src/components/Blogscreen.jsx` — route `blog` ("Blog")

**Purpose:** "Blog Studio" — a paginated post grid with search/filter/sort, a markdown post editor with cover images, publish/feature controls, likes and comments.

**Props:** `onBack` — optional. When provided, a back chevron is rendered in the top bar that exits the screen. (App.js supplies `onBack: goHome` for `blog` because `ACCEPTS_BACK = new Set(['blog','watchlist'])`.)

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `posts` | `[]` | The post list |
| `categories` | `[]` | `{ id, name, ... }` from the categories endpoint |
| `loading` | `true` | Skeleton cards |
| `refreshing` | `false` | Pull-to-refresh |
| `listError` | `''` | Red banner + Retry |
| `stats` | `{total:0, published:0, drafts:0, views:0, likes:0}` | Dashboard counters |
| `total` | `0` | Server-reported total (for pagination + empty state) |
| `page` | `1` | Current page |
| `loadingMore` | `false` | "Load more" append fetch |
| `query` | `''` | The "Search posts…" text → `search` param |
| `statusFilter` | `'all'` | `'all' \| 'published' \| 'draft'` → `status` param |
| `categoryFilter` | `'all'` | `'all'` or a category id → `category` param |
| `sort` | `'newest'` | → `ordering` param |
| `mode` | `null` | `null` = list; `'new'`; `'edit'`; `'view'` |
| `activeId` | `null` | The open post's id |
| `form` | `blankForm()` | `{ title:'', excerpt:'', content:'', category:'', tags:'', author:'Archana Timilsina', status:'draft', isFeatured:false }` |
| `post` | `null` | The full server post object |
| `comments` | `[]` | Comments of the open post |
| `tab` | `'write'` | `'write'` (markdown source) \| `'preview'` (rendered) |
| `saving` | `false` | Spinner + disabled buttons |
| `saveError` | `''` | Red banner in the editor header |
| `dirty` | `false` | Triggers the "Unsaved changes" alert on exit |
| `coverFile` | `null` | The newly picked cover `{uri,name,type}` |
| `removeCover` | `false` | The user asked to remove the existing cover |
| `uploadingImage` | `false` | Inline image upload spinner |
| `sel` | `{start:0,end:0}` | The text selection (used by the markdown toolbar) |
| `commentName` | `''` | Optional commenter name |
| `commentBody` | `''` | The comment text |
| `postingComment` | `false` | Comment POST in flight |
| `confirmDelete` | `null` | The post pending delete |
| `deleting` | `false` | Delete in flight |
| `toasts` | `[]` | Max 3 kept |
| `liked` | `new Set()` | Liked post ids (AsyncStorage) |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `cols` | `width >= 1100 ? 3 : width >= 680 ? 2 : 1` | Grid columns |
| `wide` | `width >= 900` | Editor side-by-side vs stacked |
| `pad` | `width >= 680 ? 28 : 16` | Padding |
| `isEditing` | `mode === 'new' \|\| mode === 'edit'` | Which fields are editable |
| `coverUri` | `coverFile?.uri \|\| (!removeCover && post?.cover_image_url) \|\| null` | Which cover image shows |
| `catOptions` | `[{value:'all',label:'All categories'}, ...categories]` | Filter picker |
| `sortOptions` | 5 entries (below) | Sort picker |
| `catFormOptions` | `[{value:'',label:'Uncategorised'}, ...categories]` | Editor category picker |
| `wc` | `words(form.content)` | Word count |
| `isLikedActive` | `post ? liked.has(post.id) : false` | Like button state |
| `viewedRef` | `useRef(new Set())` | Posts already counted as viewed this session |

**☰ Option lists**

1. **Status filter chips:** `'all'` → "All", `'published'` → "Published", `'draft'` → "Drafts".
2. **Category filter picker:** `All categories` + every category name.
3. **Sort picker:** `newest` → "Newest", `oldest` → "Oldest", `popular` → "Most viewed", `liked` → "Most liked", `title` → "Title A–Z".
4. **Editor category picker:** `Uncategorised` + every category name.
5. **Editor status picker:** `draft` → "Draft", `published` → "Published".
6. **Editor tabs:** "Write" / "Preview".
7. **Markdown toolbar:** `B` (bold), `I` (italic), `H` (heading), `•` (list), `❝` (quote), `</>` (inline code), `Link`, `Insert image` (green).
8. **Publish card:** "Save changes"/"Saving…", "Publish"/"Unpublish", the featured toggle ("Mark as featured" / "Featured post").
9. **Stats card rows:** Status, Published, Reading time, Views, Likes, Comments.
10. **Comments card:** name field ("Your name (optional)"), body field ("Add a comment…"), "Comment"/"Posting…".
11. **Delete modal:** "Cancel", "Delete"/"Deleting…".

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| `fetchPosts` | `append` | `loadingMore = true`, appends to the list | `loading = true`, replaces the list |
| `fetchPosts` | `statusFilter !== 'all'` | the `status` param is sent | omitted |
| `fetchPosts` | `categoryFilter !== 'all'` | the `category` param is sent | omitted |
| `fetchPosts` | `query.trim()` | the `search` param is sent | omitted |
| `fetchPosts` | `sort` truthy | the `ordering` param is sent | omitted |
| `fetchPosts` | `!res.ok` | `append` → toast "Could not load more posts."; else `listError` | posts set |
| `fetchPosts` | response shape | `Array.isArray(d)` → `total = results.length` | `total = d.count ?? results.length` |
| Markdown block | line starts with ```` ``` ```` | collects until the closing fence → a scrollable `<pre>` | — |
| Markdown block | blank line | skipped | — |
| Markdown block | `/^---+$/` | horizontal rule | — |
| Markdown block | `![alt](url)` | an `<Image>` with the alt as the accessibility label | — |
| Markdown block | `#{1,6}` heading | heading, level capped at **3** | — |
| Markdown block | `>` | blockquote (consecutive lines joined with a space) | — |
| Markdown block | list marker | bullet; ordered lists use `n.` | — |
| Markdown block | otherwise | paragraph (consecutive plain lines joined with `' '`) | — |
| Markdown | `!text \|\| !text.trim()` | "Nothing to preview yet — start writing your story." | rendered markdown |
| inline | `m[2]` | bold | — |
| inline | `m[3]` | italic | — |
| inline | `m[4]` | inline code | — |
| inline | else | a link → `Linking.openURL(m[6])` | — |
| `Btn` | `disabled \|\| busy` | disabled, `opacity 0.6` | enabled |
| `Btn` | `busy` | `ActivityIndicator` | the icon (if any) |
| `Picker` | an option matches `value` | green bg, bold, a `check` icon | plain |
| `Picker` | `disabled` | greyed, cannot open | tappable |
| `Picker` | no matching option | shows the placeholder `'—'` | shows the option label |
| `coverUri` | a new file is picked | the file wins | else the server URL, unless removal was requested |
| `startNew` | — | resets the editor, `mode='new'`, tab "write" | — |
| `openPost(item, asEdit)` | `asEdit` | `mode='edit'`, tab "write" | `mode='view'`, tab "preview" |
| `openPost` | `res.ok` | post + comments + form set | silent catch |
| `openPost` | `!viewedRef.current.has(id)` | POSTs `/view/` and updates the views count | the same post opened again does **not** re-post |
| `backToList` | `dirty` | Alert "Unsaved changes / Leave without saving?" → "Keep editing" (cancel) / "Leave" (destructive) | closes directly |
| `pickImage` | permission not granted | toast "Allow photo access to add images." | — |
| `pickImage` | `r.canceled \|\| !r.assets?.[0]` | returns `null` | the asset is used |
| `wrapSelection` | no selection | wraps the literal word `'text'` | wraps the selection |
| `insertImage` | `!f` | returns | — |
| `insertImage` | `!res.ok` | toast with the parsed error | inserts `\n\n![alt](url)\n\n` |
| `buildPayload` | `coverFile \|\| removeCover` | builds a `FormData` (tags as JSON, `category` only when non-null, `cover_image` when a file, `remove_cover='true'` when removing) | a plain JSON body |
| `savePost` | `!title.trim()` | `saveError = 'Give your post a title before saving.'`, tab switches to "write", nothing sent | — |
| `savePost` | `mode === 'new'` | POST | PATCH |
| `savePost` | `!res.ok` | `saveError` = parsed error, the editor stays open | saved: post/form/comments updated, `dirty=false`, `mode='edit'`, toast "Post created"/"Post saved", stats refetched |
| `savePost` | network throw | `saveError = 'Network error — changes were not saved.'` | — |
| `togglePublish` | `form.status === 'published'` | flips to `'draft'` | flips to `'published'` |
| `deletePost` | `!res.ok && 204 && 404` all false | toast "Delete failed. Please try again." | removes it, `total--`, stats refetched, the editor closes if it was open, toast "Post deleted" |
| `toggleLike` | already liked | the count goes **down** by 1 | up by 1 (min 0) |
| `addComment` | `!commentBody.trim() \|\| !post` | returns | POSTs `{post, author_name: name \|\| 'Anonymous', body}` |
| card | `p.cover_image_url` | the cover image | a fallback letter avatar (first letter of the title, uppercased) |
| card | `p.status === 'published'` | badge "● Published" (green) | "○ Draft" (dark) |
| card | `p.is_featured` | a gold star badge | hidden |
| card | `!!p.category_name` | the category pill | hidden |
| card | `!!p.excerpt` | the excerpt (2 lines) | hidden |
| card | `tags.length > 0` | up to 4 `#tag` chips | hidden |
| list | `posts.length < total` | the "Load more (X/Y)" button | hidden |
| editor | `isEditing` | the cover zone, all fields editable | the cover zone is inert, fields read-only |
| editor | `isEditing && !!coverUri` | "Change" + "Remove" overlay | hidden |
| editor | `tab === 'write'` | the markdown source editor | the rendered preview |
| editor | `tab === 'write' && isEditing` | the markdown toolbar | hidden |
| editor | `activeId` | the delete (trash) button | hidden |
| editor | `mode === 'view'` | an "Edit" button | a "Save"/"Saving…" button |
| editor | `post` | the stats card + the comments card | hidden |
| editor | `comments.length === 0` | "No comments yet." | the comment list |
| root | `onBack \|\| mode` | the top-left chevron appears | hidden |
| root | `mode === null` | the "New Post" button + the search field | hidden |
| root | `mode === null` | the list | the editor |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| "New Post" / "Write a post" | `startNew()` → blank form, Write tab |
| Tap a card | `openPost(p)` → view mode, preview tab, detail fetched, a view registered once |
| Tap the pencil on a card | `openPost(p, true)` → edit mode, Write tab |
| Tap the trash (card or editor header) | the delete modal opens |
| "Cancel" / "Delete" in the modal | cancel / DELETE → removed, `total--`, stats refetched, editor closed if open |
| Type in "Search posts…" | 280ms debounce → refetch with `search=` |
| Tap the search ✕ | clears it |
| Tap a status chip | refetch with `status=` |
| Choose a category / a sort option | refetch with `category=` / `ordering=` |
| "Retry" | `fetchPosts(1,false)` |
| Pull to refresh | refetch + `fetchStats()` |
| "Load more (X/Y)" | `fetchPosts(page+1, true)` (disabled while loading) |
| "Close" / the top-left chevron | `backToList()` → Alert if dirty |
| "Edit" in the header | `mode='edit'` |
| "Save" / "Save changes" | POST or PATCH → toast |
| "Publish" / "Unpublish" | flips the status and saves immediately |
| The featured star | toggles `is_featured` in the form (saved on the next save) |
| The cover zone / "Change" | image picker (16:9 crop) → `coverFile` → uploaded as multipart on save |
| "Remove" on the cover | `removeCover = true` → `remove_cover=true` on save |
| A markdown toolbar button | inserts/wraps at the caret; "Insert image" uploads then inserts `![alt](url)` |
| "Write" / "Preview" | switches the tab |
| The like button | toggles the heart, adjusts the count, POSTs `/like/` |
| A comment's trash | deletes the comment, `comment_count--` |
| "Comment" | POSTs the comment, appends it, `comment_count++` |

**Modals / overlays:** `Picker` dropdown modals (×4 instances), the delete-confirm modal, the native `Alert` ("Unsaved changes"), the toast overlay (max 3).

**Storage keys / endpoints**

- AsyncStorage key: **`blog:liked-ids`**
- `GET/POST ${BASE}/blog/posts/`, `GET/PATCH/DELETE ${BASE}/blog/posts/{id}/`
- `GET ${BASE}/blog/posts/stats/`, `POST ${BASE}/blog/posts/{id}/view/`, `POST ${BASE}/blog/posts/{id}/like/`
- `GET ${BASE}/blog/categories/`, `GET/POST ${BASE}/blog/comments/`, `DELETE ${BASE}/blog/comments/{id}/`
- `POST ${BASE}/blog/images/` (multipart `image`)
- `BASE = ${EXPO_PUBLIC_API_URL}/api`

**Bottom line — the ways**

1. **Browse** — stats tiles + status chips + category picker + sort picker + search drive `GET /api/blog/posts/?…` (280ms debounce) → cards page with "Load more" → empty/error states offer "Write a post" / "Retry".
2. **Create** — "New Post" → fill everything → the markdown toolbar shapes the body → optionally a cover image → "Save" POSTs; "Publish" flips the status to published; the star toggles featured.
3. **Read/edit** — tap a card → view mode (rendered markdown + stats + comments) → "Edit" → fields editable → "Save" PATCHes → leaving with unsaved changes triggers the Alert.
4. **Engage/delete** — like (persisted to AsyncStorage + POST `/like/`), comment (POST), delete a comment, then trash the post → DELETE → removed from the grid, editor closed.

---

### 4.7 `src/components/Wishlist.jsx` — route `wishlist` ("Wishlist")

**Purpose:** "Wish List" manager — create, inline-edit and delete wishes; responsive card grid.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `fontsLoaded` | `false` | Gates the whole render (spinner until loaded) |
| `wishes` | `[]` | `{ id, emoji, wish }` objects |
| `loading` | `false` | The three-dot loader row |
| `refreshing` | `false` | Pull-to-refresh |
| `fetchError` | `''` | Red banner + "Try again" |
| `toast` | `null` | `{ msg, type:'success'\|'error', k }` |
| `isCreating` | `false` | The "add wish" panel |
| `newWish` | `{ emoji:'', wish:'' }` | Create-form values |
| `creating` | `false` | POST in flight |
| `editingId` | `null` | Which wish is in inline edit mode |
| `editWish` | `{ emoji:'', wish:'' }` | Edit-form values |
| `updating` | `false` | PUT in flight |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `wide` | `width >= 768` | Desktop layout |
| `stackHeader` | `width < 640` | Header stacks vertically |
| `sidePad` | `wide ? 48 : 20` | Page padding |
| `contentWidth` | `Math.min(width, 1280) - sidePad*2` | Content width |
| `cols` | `Math.max(1, Math.floor((contentWidth + GAP) / (MIN_CARD + GAP)))` | Grid columns |
| `cardWidth` | `Math.floor((contentWidth - GAP*(cols-1)) / cols)` | Card width |
| `titleSize` | `width >= 900 ? 38 : width >= 500 ? 30 : 26` | Title size |
| `canCreate` | `!!newWish.wish.trim() && !creating` | Save button enabled |

**☰ Options:** none — the only fields are an **emoji** text input (maxLength 2, placeholder `"✨"`) and a **wish** text input (placeholder `"Describe your daydream…"`). A blank emoji is sent as `'✨'`.

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| render | `!fontsLoaded` | spinner only | full screen |
| fetch | `!silent` | `loading = true` → the dots + "Loading wishes…" | silent refresh |
| fetch | `!res.ok` | `fetchError = 'Could not load wishes. Make sure the backend is running.'` | wishes set |
| create | `!newWish.wish.trim() \|\| creating` | nothing happens (no request, no toast) | POST |
| create | `!res.ok` | error toast (server message or 'Failed to save.') | prepended + toast "Wish added ✨" + panel closes |
| update | `!editWish.wish.trim()` | silently does nothing | PUT |
| update | `!res.ok` | error toast | item replaced, `editingId` cleared, toast "Wish updated." |
| delete | `!res.ok` | error toast **"Delete failed. Do you see that?? I told you."** | item removed, toast "Wish removed." |
| toggle panel | `isCreating` | button reads "Close Panel" (muted) | "+ Add Dream Wish" |
| toggle panel | always | `newWish` resets to `EMPTY_NEW` | — |
| render | `isCreating` | the create form block (with a `FadeUp` animation) | hidden |
| render | `stackHeader` | the header stacks vertically | a row |
| render | `!wide` | the form fields stack | a row |
| render | `wide` | emoji field `flex 0.12, minWidth 84`; wish field `flex 1` | defaults |
| render | `!canCreate` | the Save button is greyed (opacity 0.5) | enabled |
| render | `creating` | the button shows a spinner | shows "Save Wish" |
| render | `!!fetchError` | the banner + "Try again" | hidden |
| render | `loading` | the dot row + "Loading wishes…" | hidden |
| render | `!loading && !fetchError && wishes.length === 0` | "✨ No wishes yet. Add your first daydream above." | hidden |
| render | `list.length > 0` | the grid | no grid |
| card | `isEditing` | the inline edit UI (2 inputs + Update/Cancel) | the display UI (emoji, text, ✏️, ✕) |
| card | `wish.emoji` falsy | shows `'✨'` | shows the stored emoji |
| card | `!isEditing` | the card lifts 3px on press-in | no lift |
| card | `!isEditing` | long-press (350ms) starts the edit | nothing |
| card | `isEditing` | green border | default border |
| card | `updating \|\| !editWish.wish.trim()` | the Update button is disabled | enabled |
| Toast | `toast.type === 'error'` | red bg/border/text | green |
| Toast | `wide` | anchored right | full-width centred |
| Toast | — | auto-dismissed after 3000ms | — |
| Platform | iOS | `KeyboardAvoidingView` behaviour `'padding'` | `undefined` |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| "+ Add Dream Wish" / "Close Panel" | toggles the panel, resets the form |
| Type in the emoji / wish field | updates `newWish` |
| Keyboard "done" in the wish field | `handleCreate` → POST |
| "Save Wish" | POST → prepended + toast "Wish added ✨" |
| Pull to refresh | silent re-fetch |
| "Try again" | full re-fetch |
| Long-press a card (350ms) / tap ✏️ | inline edit mode |
| "Update" / keyboard done | PUT → replaced in place + toast "Wish updated." |
| "Cancel" on the card | back to display, no request |
| Tap ✕ | native Alert "Remove this wish? / This will remove it permanently." → "Remove" → DELETE + toast "Wish removed."; "Cancel" → nothing |

**Modals / overlays:** no `Modal`. Overlays = `Toast` (absolute, `pointerEvents="none"`) + the native `Alert`.

**API endpoints:** `GET/POST ${API_BASE}/api/wishes/`, `PUT/DELETE ${API_BASE}/api/wishes/{id}/`. **Storage keys:** none.

**Bottom line — the ways**

1. **Load & browse** — `GET /api/wishes/` → "Loading wishes…" dots → grid / empty state / error banner with "Try again".
2. **Create** — "+ Add Dream Wish" → emoji (optional, blank ⇒ `'✨'`) + wish → "Save Wish" → POST → prepended + "Wish added ✨".
3. **Edit** — long-press (or ✏️) → inline edit → "Update" → PUT → "Wish updated." (Cancel = no request).
4. **Delete** — ✕ → Alert "Remove" → DELETE → "Wish removed."

---

### 4.8 `src/components/Watchlistscreen.jsx` — route `watchlist` ("Watchlist")

**Purpose:** "My Watchlist" — dramas/movies/anime/books/manga with type tabs, status tabs, search, sort, add/edit modals, delete confirm, and a stats overlay.

**Props:** `onBack` — optional. When truthy, a "← Back" pill is rendered in the top bar. (App.js supplies it because `watchlist` ∈ `ACCEPTS_BACK`.)

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `items` | `[]` | `{ id, type, title, genre, status }` |
| `loading` | `true` | "Loading watchlist..." spinner row |
| `refreshing` | `false` | Pull-to-refresh |
| `savingId` | `null` | The item being saved/deleted; `'new'` for a create |
| `apiError` | `''` | Banner (main screen) **or** an inline box inside the modal |
| `tab` | `'All'` | The **type** filter tab |
| `statusTab` | `'All'` | The **status** filter tab |
| `search` | `''` | Free-text search (title or genre) |
| `sort` | `'default'` | Sort option |
| `modal` | `null` | `'add'` \| `'edit'` \| `null` |
| `editItem` | `null` | The item being edited |
| `delTarget` | `null` | The item pending delete |
| `showInfo` | `false` | The "Collection Info" overlay |
| `form` | `EMPTY_FORM` | `{ type:'drama', title:'', genre:'', status:'Plan to Watch' }` |
| `errors` | `{}` | Per-field validation flags `{title:true}` / `{genre:true}` |
| `toast` | `null` | `{ msg, icon }` |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `visible` | type filter → status filter → text filter → sort | What the grid renders |
| `counts` | `{total, watching, completed, planned, drama, movie, anime, book, manga}` | The stats overlay |
| `isSavingForm` | `savingId === 'new' \|\| (editItem && savingId === editItem.id)` | The modal save spinner |
| `cols` | `width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1` | Grid columns |
| `pad` | `width >= 600 ? 28 : 16` | Padding |
| `setF` | `(k) => (v) => setForm(p => ({...p, [k]: v}))` | Field updater factory |

**☰ Option lists (exact values)**

1. **TYPE_TABS:** `['All', 'drama', 'movie', 'anime', 'book', 'manga']`
2. **STATUS_TABS:** `['All', 'Watching', 'Plan to Watch', 'On Hold', 'Completed', 'Dropped']`
3. **SORT_OPT (dropdown):** `default` → "Sort: Default", `title-az` → "Title: A → Z", `title-za` → "Title: Z → A"
4. **TYPE_OPT (form dropdown):** `['drama','movie','anime','book','manga']`
5. **STATUS_OPT (form dropdown):** `['Watching','Completed','Plan to Watch','On Hold','Dropped']`
6. **GENRE_OPT (form dropdown):** `['Bromance','BL','Crime','Detective','Thriller','Romance','Action','Drama','Fantasy','Horror','Historical','Adventure','Sci-Fi','Comedy','Sad']`

**Colour maps**

| Set | Values |
|-----|--------|
| `STATUS_COLOR` | `Watching` `#d8f3dc`/`#2d6a4f`/`#b7e4c7`; `Completed` `C.muted`/`C.soft`/`C.border`; `Plan to Watch` `#e8f4fd`/`#1a6fa8`/`#b3d9f5`; `On Hold` `#fdf6dc`/`#9a7a00`/`#f0d96a`; `Dropped` `#fdecea`/`#6137a9`/`#f5b7b1` |
| `TYPE_COLOR` | `drama` `#ede7f6`/`#5e35b1`/`#c5b4e8`; `movie` `#fce4ec`/`#c2185b`/`#f48fb1`; `anime` `#e0f7fa`/`#00838f`/`#80deea`; `book` `#fff3e0`/`#e65100`/`#ffcc80`; `manga` `#f1f8e9`/`#558b2f`/`#c5e1a5` |
| `TYPE_SURFACE` | `drama #f7f4fd`, `movie #fdf1f6`, `anime #effbfc`, `book #fff8f0`, `manga #f6faf0` |

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| `Select` | `open` | the option-sheet Modal is visible | only the trigger shows |
| `Select` | the option is a plain string | built as `{value:o, label: cap(o)}` | used as-is |
| `Select` | a matching option exists | the trigger shows its label | the placeholder `'Select'` in the placeholder colour |
| `Select` | `error` | red border | default |
| `Select` | the option is selected | green bg, bold, green ✓ | plain |
| `Select` | `compact` | the sort-pill styling | the full input styling |
| render | `onBack` truthy | the "← Back" pill | no pill |
| fetch | `!silent` | the loader row | refresh only |
| fetch | `!res.ok` | `apiError = 'Failed to load watchlist. Check your connection.'` | items set (`Array.isArray(data) ? data : data.results \|\| []`) |
| save | `!form.title.trim()` | `errors.title = true` (red border) | — |
| save | `!form.genre.trim()` | `errors.genre = true` | — |
| save | `Object.keys(e).length` | the save is **aborted**, no request | the request is sent |
| save | `!res.ok` | `apiError` inside the modal | success |
| save | `isEdit` | PUT → the item is replaced in place, toast `"<title>" updated!` | POST → the item is prepended, toast `"<title>" added!` |
| delete | `!res.ok && res.status !== 204` | `apiError = 'Delete failed.'` | the item is removed, toast `"<title>" removed.` (icon 🗑) |
| `visible` | `tab === 'All' \|\| x.type === tab` | kept | filtered out |
| `visible` | `statusTab === 'All' \|\| x.status === statusTab` | kept | filtered out |
| `visible` | title **or** genre contains `q` | kept | filtered out |
| sort | `title-az` | ascending by title | `title-za` → descending; `default` → the original order is kept |
| render | `!!apiError && !modal` | the dismissible banner | hidden (⚠ even if `apiError` is set, the banner is not shown while a modal is open) |
| render | `!!search` | a round ✕ clear button | hidden |
| render | `visible.length === 1` | "1 TITLE" | "N TITLES" |
| render | `loading` | the spinner row | — |
| render | `!loading && visible.length === 0` | the empty state | the grid |
| empty state | `search` truthy | `No results for "<search>"` | else `tab !== 'All' \|\| statusTab !== 'All'` → "Nothing matches these filters yet."; else "Add your first entry to get started." |
| card | a known type | the tinted background/border/accent | white bg, default borders |
| card | `busy` (`savingId === item.id`) | `opacity 0.5`, the controls disabled, the Edit button shows a spinner | the ✏️ emoji |
| card | an unknown type/status | the grey `Completed` palette | its own palette |
| modal | `modal === 'add'` | title "➕ Add New Entry", button "Add to Watchlist" | title "✏️ Edit Entry", button "Save Changes" |
| modal | `isSavingForm` | spinner + dimmed + disabled, label "Saving..." | normal |
| modal | `!!apiError` | the inline error box | hidden |
| modal | `errors.title` | red border on the title input | default |
| modal | `errors.genre` | red border on the genre select | default |
| typing | in the title / genre | the error flag is cleared as you type | — |
| stats bar | `counts.total` | the proportional fill | 0% width |
| stats overlay | `showInfo` | visible | hidden |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| "+ Add" | opens the add modal (blank form, `type:'drama'`, `status:'Plan to Watch'`) |
| "← Back" | `onBack()` |
| "Collection Info" (ℹ️) | opens the stats overlay |
| Type in the search field | live-filters by title or genre; the ✕ appears |
| Tap the search ✕ | resets the query |
| Choose a sort option | re-sorts the grid |
| Tap a type tab / a status tab | filters the grid |
| Pull to refresh | silent re-fetch |
| Tap the error banner | clears it |
| "✏️ Edit" on a card | opens the edit modal prefilled |
| "🗑 Delete" on a card | opens the delete-confirm modal |
| Choose TYPE / STATUS / GENRE in the form | sets `form.type` / `form.status` / `form.genre` |
| "Add to Watchlist" / "Save Changes" | validates (title + genre required) then POST/PUT |
| "Cancel" / the ✕ / the overlay | closes the modal |
| "Yes, Remove" | DELETE → removed + toast |
| "Keep It" / the ✕ / the overlay | cancels the delete |
| The Collection Info ✕ / overlay / hardware back | closes the overlay |

**Modals / overlays:** the Collection Info modal, the add/edit form modal, the delete-confirm modal, four `Select` dropdown modals, and a bottom toast overlay (auto-dismiss after ~2600ms).

**API endpoints:** `GET/POST ${BASE_URL}/watchlist/`, `PUT/DELETE ${BASE_URL}/watchlist/{id}/` where `BASE_URL = ${EXPO_PUBLIC_API_URL}/api`. **Storage keys:** none.

**Bottom line — the ways**

1. **Browse & filter** — `GET /api/watchlist/` → type tab / status tab / search / sort (3 options) → pull-to-refresh.
2. **Add** — "+ Add" → TITLE (required) + GENRE (required) + optional TYPE/STATUS → POST → prepended + `"<title>" added!` (validation failures keep the modal open with red fields).
3. **Edit** — "✏️ Edit" → the same modal prefilled → PUT → replaced in place + `"<title>" updated!`.
4. **Delete** — "🗑 Delete" → "Yes, Remove" → DELETE + `"<title>" removed.`; "Keep It" cancels.
5. **Inspect** — "Collection Info" → the stats overlay (total + status breakdown + type breakdown).

---

---

### 4.9 `src/components/Archivescreen.jsx` — route `archive` ("Archive")

**Purpose:** A "Visual Scrapbook" — a masonry grid of saved memory stamps with create, edit, preview (lightbox), download-to-gallery and delete.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `stamps` | `[]` | The archive records `{ id, title, image, timestamp, remote_url, source }` |
| `loading` | `true` | The skeleton grid |
| `refreshing` | `false` | Pull-to-refresh |
| `fetchError` | `null` | Error banner + "Retry" |
| `modal` | `false` | The create/edit form modal |
| `editing` | `null` | `null` = create mode; a stamp = edit mode |
| `form` | `EMPTY_FORM` | `{ title:'', remoteUrl:'', source:'remote', file:null, previewUrl:'' }` |
| `formErr` | `null` | Inline validation/server error |
| `submitting` | `false` | Spinner + "Saving…" |
| `deletingId` | `null` | The stamp being deleted |
| `toasts` | `[]` | Max 3 |
| `previewIndex` | `null` | The stamp open in the Lightbox |
| `downloadingId` | `null` | The stamp being saved to the device gallery |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `cols` | `width >= 1024 ? 3 : width >= 580 ? 2 : 1` | Masonry columns |
| `pad` | `width >= 700 ? 32 : 18` | Padding |
| `columns` | round-robin distribution of `stamps` into `cols` | Masonry layout |
| `isEdit` | `!!editing` | Create vs edit |
| `canSubmit` | `!submitting && form.title.trim()` | Submit enabled |
| `tilt` (card) | `(((stamp.id * 7919) % 100) / 100 - 0.5) * 5` | Deterministic card rotation |
| `tapeLeft` (card) | `stamp.id % 2 === 0` | Tape side |
| `ratio` (card) | `4/3`, updated to `Math.min(1.8, Math.max(0.65, w/h))` on image load | Aspect ratio |
| `status` (Slide) | `'loading' \| 'loaded' \| 'failed'` | Lightbox image state |

**☰ Option lists**

1. **Image source chips:** `['local','Local Upload']`, `['remote','Remote URL']` — mutually exclusive; switching clears the other source's data.
2. **Lightbox navigation:** swipe, or the `‹ ›` arrows (only when `stamps.length > 1 && width >= 620`).
3. **Alert buttons:** "Keep it" (cancel) / "Remove" (destructive).

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| render | `!!fetchError` | red banner "⚠ Could not load archive — {err}." + "Retry" | hidden |
| render | `loading` | skeleton masonry (heights `[220,280,190]` offset by `((c*37 + i*23) % 50)`) | — |
| render | `stamps.length === 0` | the empty state "Your scrapbook is empty." / "Tap here to capture your first memory." (tap → openCreate) | — |
| render | else | the masonry of `MemoryCard`s | — |
| render | `previewIndex !== null && stamps[previewIndex]` | the Lightbox | no lightbox |
| toast | `t.err` | red bg `#fff5f5`, border `#fecaca`, glyph `✗` | green `#f0fdf9` / `#a7f3d0` / `✓` |
| card | `stamp.image` | the `<Image>` with the computed `aspectRatio` | a "no image" placeholder box |
| card | `tapeLeft` | tape left, rotated `-14deg` | tape right, rotated `14deg` |
| card | `deleting` | the trash button shows a spinner and is disabled | the trash icon |
| Slide | `stamp.image && status !== 'failed'` | the image (`opacity 1` when loaded, `0` while loading) | no image |
| Slide | `status !== 'loaded'` | the overlay: "⚠ This image could not be loaded" when failed, else a spinner | no overlay |
| Lightbox | `!stamp` | renders `null` | — |
| Lightbox | `downloadingId === stamp.id` | the Save button shows a spinner and is disabled | the download icon |
| Lightbox | `width >= 620` | the "Save"/"Close" text labels appear | icon-only |
| Lightbox | `stamps.length > 1 && width >= 620` | the `‹ ›` arrows | swipe only |
| Lightbox | `width >= 620` | caption "Use ‹ › to move between images" | "Swipe to move between images" |
| modal | `isEdit` | title "Modify Memory Stamp", submit "Commit Update", dark button | "Log New Memory Node", "Archive Memory", green button |
| modal | `form.source === 'local'` | the file-picker group | the remote-URL group |
| modal | `form.file` | "✓ {name}" shown; in edit mode without a file, "Keeping existing image" | — |
| modal | `!!form.previewUrl` | the PREVIEW image | no preview |
| modal | `!!formErr` | the red error box | hidden |
| modal | `!canSubmit` | the submit button is disabled (`opacity 0.5`) | enabled |
| create | `!form.title.trim()` | "Title is required." | continues |
| create | `source==='local' && !form.file` | "Please select an image file." | continues |
| create | `source==='remote' && !form.remoteUrl.trim()` | "Please enter a remote image URL." | continues |
| create | `source === 'local'` | `FormData` (title, source=local, image) | JSON `{title, source:'remote', url}` |
| update | `source==='local' && form.file` | `FormData` PATCH | else if `source==='remote' && remoteUrl !== editing.remote_url` → JSON `{title, source, url}` PATCH | else JSON `{title}` PATCH |
| delete | `!res.ok && res.status !== 204` | toast "Delete failed." | removed + toast "Memory removed" |
| download | permission not granted | toast "Allow photo access to save images." | — |
| download | the extension isn't 2–4 alphanumeric chars | falls back to `jpg` | the real extension |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| "Log New Memory Stamp" / the empty state | `openCreate()` → the modal in create mode |
| "Retry" | `fetchStamps()` |
| Pull to refresh | a silent re-fetch |
| Tap the card image / "Preview" | the Lightbox opens at that stamp |
| "Edit" | the modal opens pre-filled |
| "Delete" | Alert → "Remove" → DELETE → toast "Memory removed"; "Keep it" → nothing |
| "Local Upload" / "Remote URL" | `switchSource(k)` → swaps the group, clears the other source |
| "Choose File" / "Replace Image" | the gallery; denied → "Allow photo access to choose an image." |
| Type the remote URL | sets `remoteUrl` **and** `previewUrl` (live preview) |
| "Archive Memory" | POST → prepended + toast "Memory archived ✓" |
| "Commit Update" | PATCH → replaced + toast "Memory updated ✓" |
| "Save" in the lightbox | downloads to the gallery + toast "Saved to your photos ✓" |
| "Close" / ✕ | closes the lightbox |
| `‹` / `›` | scroll with wrap-around |

**Modals / overlays:** the create/edit modal (`Modal transparent animationType="fade"`), the Lightbox modal (`statusBarTranslucent`), the native `Alert`, the toast overlay.

**API endpoints:** `GET/POST ${API_BASE}/api/archive/`, `PATCH/DELETE ${API_BASE}/api/archive/{id}/`. **Storage keys:** none.

**Bottom line — the ways**

1. **Browse** — skeleton → masonry → tap an image → the full-screen Lightbox carousel → swipe or `‹ ›` → optionally "Save" to the gallery.
2. **Create** — "Log New Memory Stamp" → pick Local Upload **or** Remote URL → type a title → "Archive Memory" → POST → the card appears first.
3. **Edit** — "Edit" → pre-filled modal → optionally switch source / attach a new file → "Commit Update" → PATCH.
4. **Delete** — "Delete" → Alert "Remove" → DELETE → the card disappears.

---

### 4.10 `src/components/Gesturedraw.jsx` — route `gesture` ("Gesture Draw")

**Purpose:** A finger-drawing canvas (SVG) with a colour/size toolbar, a point-debug overlay and live stroke/point statistics.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `strokeColor` | `COLORS[0].value` = `'#1a1a2e'` | The colour of new strokes |
| `strokeSize` | `3` (= `SIZES[1].value`, "mid") | The width of new strokes |
| `showPoints` | `false` | The debug point overlay + the points panel |
| `showHint` | `true` | The centred "draw anything here" hint |
| `lastStrokePts` | `[]` | The points of the last finished stroke |
| `scrollOn` | `true` | Whether the outer ScrollView accepts vertical scroll |
| `canvasSize` | `{w:0,h:0}` | Measured canvas size (the SVG only renders when `w > 0`) |
| `force` | `useReducer(n => n+1, 0)` | A dummy re-render trigger (the value is discarded) |

**Refs**

| Ref | Purpose |
|-----|---------|
| `data` | `{ drawing, allStrokes:[], currentPoints:[], totalPoints:0, start:{x,y}, raf }` — the mutable drawing model |
| `settings` | `{ color, size }` — reassigned each render so the pan responder always reads the latest values |
| `autosaveTimer` equivalent | `scheduleRender` — throttles re-renders to one per animation frame |

**☰ Option lists**

1. **Colours (5):** `#1a1a2e` Dark (default), `#185FA5` Blue, `#0F6E56` Teal, `#993C1D` Coral, `#993556` Pink.
2. **Sizes (3):** `2` thin, `3` mid (default), `6` thick.
3. **Toolbar chips:** "show points" (toggles the debug overlay), "undo" (disabled when empty), "clear".
4. **Stats (4 read-only):** `strokes`, `total points`, `this stroke`, `last point`.

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| `StrokeShape` | `pts.length === 1` | a `<Circle>` (a tap) | an SVG `<Path>` built by `toPath` |
| `toPath` | `< 2` points | `''` | 2 points → `M…L…`; more → quadratic `Q` segments through midpoints |
| `dotColor(i,n)` | `i === 0` | `T.info` (blue start dot) | `i === n-1` → `T.success` (green end dot); else `T.dot` |
| `ChipButton` | `tone === 'info'` | info palette | neutral palette |
| `ChipButton` | `active` | highlighted bg/border | transparent |
| `ChipButton` | `pressed && !active` | a press flash | none |
| `ChipButton` | `disabled` | `opacity 0.4` (the undo chip when empty) | normal |
| colour swatch | `strokeColor === c.value` | dark border + `scale 1.2` | transparent border, no scale |
| size chip | `strokeSize === s.value` | highlighted | plain |
| canvas | `showPoints` | a circle at every point of every finished stroke | no dots |
| canvas | `showPoints && liveStroke` | live dots for the in-progress stroke | no live dots |
| canvas | `liveStroke` | the in-progress stroke on top | — |
| canvas | `canvasSize.w > 0` | the SVG (grid pattern + strokes + points) | an empty canvas area |
| canvas | `showHint` | the dashed hint badge | none |
| move | `!d.drawing` | ignored | a point is appended |
| move | the previous point equals the new one | skipped (no duplicate) | appended |
| `finishStroke` | `!d.drawing` | nothing | the stroke is committed, `totalPoints` grows, `lastStrokePts` set, `scrollOn` restored |
| `handleUndo` | `!popped` | nothing | the last stroke is removed, `totalPoints` shrinks, the hint returns if the canvas is now empty |
| layout | `width >= 900` | canvas + a 300px side panel | the canvas, stats and points panel stacked |
| layout | `wide` | the stat cards are `width: '48%'` | `flexGrow 1, flexBasis '46%'` (<520) or `'22%'` |
| points panel | `showPoints && lastStrokePts.length > 0` | the panel renders | hidden |
| points panel | `wide` | uncapped height | `maxHeight: 180` and scrollable |
| point chip | `first` | info palette | `last && !first` → success palette; else default |
| stats | no stroke / no last point | the em dash `—` | the value |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| Draw on the canvas | grant → the stroke appears live in the current colour/size, page scroll is suspended; release → the stroke is committed, the counters update |
| Tap a colour swatch | the next strokes use it (existing strokes keep their colour) |
| Tap a size chip | the next strokes use it |
| "show points" | toggles the canvas point overlay and the points panel |
| "undo" | removes only the newest stroke |
| "clear" | removes everything, resets the counters, restores the hint |
| Swipe outside the canvas | the page scrolls (only when `scrollOn`) |

**Modals / overlays:** the hint overlay only. **Storage keys / API endpoints:** none — everything is in-memory and lost on unmount.

**Bottom line — the ways**

1. **Draw** — touch → a live stroke → release → committed, counters updated.
2. **Configure** — pick a colour and/or size → the next strokes use it.
3. **Inspect** — "show points" → per-point circles + a "Points in last stroke" chip list (first blue, last green).
4. **Clean up** — "undo" (one stroke) or "clear" (everything + the hint returns).

---

### 4.11 `src/components/Musicvibes.jsx` — route `music` ("Music Vibes")

**Purpose:** A responsive card grid of "music vibes" tracks (artist, track, mood, accent colour) with create, inline-edit and delete.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `fontsLoaded` | `false` | Gates the render (spinner) |
| `vibes` | `[]` | `{ id, artist, track, mood, color }` |
| `loading` | `true` | The skeleton grid |
| `refreshing` | `false` | Pull-to-refresh |
| `fetchErr` | `null` | The list error banner + "Retry" |
| `isCreating` | `false` | The "NEW TRACK ENTRY" panel; the Add button label |
| `newForm` | `EMPTY_FORM` | `{ artist:'', track:'', mood:'', color:'#10b981' }` |
| `createErr` | `null` | The error inside the create panel |
| `creating` | `false` | POST in flight |
| `editId` | `null` | The track being edited inline |
| `editForm` | `EMPTY_FORM` | The inline-edit values |
| `editErr` | `null` | The error inside the editing card |
| `saving` | `false` | PATCH in flight |
| `deletingId` | `null` | The track being deleted |
| `toasts` | `[]` | Max 3 |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `wide` | `width >= 768` | Desktop layout |
| `stackHeader` | `width < 640` | The header stacks |
| `sidePad` | `wide ? 48 : 20` | Padding |
| `contentWidth` | `Math.min(width, 1320) - sidePad*2` | Content width |
| `cols` | `Math.max(1, Math.floor((contentWidth + GAP) / (MIN_CARD + GAP)))` | Grid columns |
| `cardWidth` | `Math.floor((contentWidth - GAP*(cols-1)) / cols)` | Card width |
| `titleSize` | `width >= 900 ? 46 : width >= 500 ? 36 : 30` | Title size |
| `skeletons` | `Array.from({length: Math.max(4, cols*3)})` | The number of placeholder cards |
| `accent` (card) | `isValidHex(vibe.color) ? fullHex(vibe.color) : C.accent` | The card accent (3-digit hex expanded) |

**☰ Colour presets (8):** `#10b981`, `#6366f1`, `#f43f5e`, `#f59e0b`, `#0ea5e9`, `#a855f7`, `#2d6a4f`, `#ec4899`.

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| render | `!fontsLoaded` | a spinner only | the screen |
| render | `isCreating` | the "NEW TRACK ENTRY" panel (4 fields) | no panel |
| render | `!!createErr` | the red banner inside the panel | hidden |
| render | `!!fetchErr` | the banner + "Retry" | hidden |
| render | `loading` | `skeletons` placeholder cards | — |
| render | `vibes.length === 0` | "🎧 No tracks yet" / "Add your first song above." | the cards |
| card | `isEditing` | 3 inputs + a compact colour picker + an error banner + Update/Cancel | the equaliser dot, artist/track/mood and the ✏ ✕ buttons |
| card | `isValidHex(vibe.color)` | the track's colour | `C.accent` (`#2d6a4f`) |
| card | `!!vibe.mood` | the mood line | hidden |
| card | `deleting` | the delete button shows a spinner and is disabled | the red ✕ |
| create | `!artist.trim() \|\| !track.trim()` | "Artist and track are required." | continues |
| create | `!isValidHex(color)` | "Color must be a valid hex code (e.g. #6366f1)." | continues |
| create | `!res.ok` | the parsed server error | the track is prepended, the panel closes, toast "Track added ✓" |
| create | network throw | "Network error — check that Django is running and /api/music-vibes/ is reachable." | — |
| update | `!artist.trim() \|\| !track.trim()` | "Artist and track are required." | continues |
| update | `!isValidHex(color)` | "Color must be a valid hex code." | continues |
| update | `!res.ok` | the parsed server error, the card stays in edit mode | the track is replaced, edit mode exits, toast "Track updated ✓" |
| delete | `!res.ok && res.status !== 204` | toast "Delete failed." | removed + toast "Track removed" |
| AddButton | `open` | the label "✕ Close", muted background, **no** pulsing ring | "+ Add Track", green, the ring pulses (2500ms loop) |
| `ColorPicker` | the value is a valid hex | the swatch shows it | the swatch shows `DEFAULT_COLOR` |
| `ColorPicker` | `!valid && !!value` | the input has a red border | the normal border |
| `ColorPicker` | `value.toLowerCase() === p` | the chip is selected (dark border + scale 1.15) | plain |
| toast | `t.err` | red bg/border/text + `✗` | green + `✓` |
| layout | `wide` | `sidePad 48`, the toast anchored right, the colour field `width: 250` | `sidePad 20`, the toast full-width, the colour field `flexBasis '100%'` |
| layout | `stackHeader` | the header stacks | a row |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| "+ Add Track" / "✕ Close" | `togglePanel()` → the panel opens/closes, the form resets |
| Type in ARTIST / TRACK / MOOD | updates `newForm` |
| Type a hex colour | the swatch + a red border if invalid |
| Tap a preset chip | the colour is applied, the chip is highlighted |
| "Save Track" | POST → the card appears first, the panel closes, toast "Track added ✓" |
| "Cancel" in the create panel | the panel closes, the form is discarded |
| Long-press a card (350ms) / ✏ | the card becomes an inline editor |
| "Update" | PATCH → the card updates in place, toast "Track updated ✓" |
| "Cancel" in the inline editor | back to read-only, no request |
| ✕ | Alert "Remove this track?" → "Remove" → DELETE → toast "Track removed"; "Cancel" → nothing |
| "Retry" | `fetchVibes()` |
| Pull to refresh | a silent re-fetch |

**Modals / overlays:** the toast stack (max 3, 3500ms), the native `Alert`. The create panel and the inline editor are **not** modals.

**API endpoints:** `GET/POST ${API_BASE}/api/music-vibes/`, `PATCH/DELETE ${API_BASE}/api/music-vibes/{id}/` with body `{ artist, track, mood, color }`. **Storage keys:** none.

**Bottom line — the ways**

1. **Browse** — fonts → the grid from `GET /api/music-vibes/`; skeletons → empty state → error banner + Retry → pull-to-refresh.
2. **Create** — "+ Add Track" → ARTIST/TRACK/MOOD/ACCENT (hex + 8 presets) → "Save Track" → POST → the card appears first + "Track added ✓".
3. **Edit in place** — long-press (or ✏) → the card becomes a form → "Update" → PATCH → "Track updated ✓".
4. **Delete** — ✕ → Alert "Remove" → DELETE → "Track removed".

---

### 4.12 `src/components/Hobbiesscreen.jsx` — route `hobbies` ("Hobbies")

**Purpose:** A collapsible accordion list of hobbies (emoji, title, description) with a create panel, inline edit and delete.

**Props:** none.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `hobbies` | `[]` | `{ id, emoji, title, text }` |
| `loading` | `false` | 3 skeleton rows |
| `refreshing` | `false` | Pull-to-refresh |
| `fetchError` | `''` | The error banner |
| `toast` | `null` | `{ msg, type:'success'\|'error' }` |
| `isCreating` | `false` | The create form block; the header button label |
| `newHobby` | `EMPTY_FORM` | `{ emoji:'', title:'', text:'' }` |
| `creating` | `false` | POST in flight |
| `editingId` | `null` | The hobby in inline edit mode |
| `editHobby` | `EMPTY_FORM` | The inline-edit values |
| `updating` | `false` | PATCH in flight |
| `openId` | `null` | The expanded accordion item (one at a time) |

**Derived variables**

| Name | Expression | Meaning |
|------|------------|---------|
| `cols` | `width >= 900 ? 2 : 1` | Accordion columns |
| `columns` | round-robin distribution into `cols` | The layout |
| `stackForm` | `width < 768` | The create form stacks |
| `stackHeader` | `width < 640` | The header stacks |
| `pad` | `width >= 768 ? 40 : 20` | Padding |
| `toastErr` | `toast?.type === 'error'` | Toast colouring |

**☰ Options:** none — the only fields are EMOJI (maxLength 12), TITLE, DESCRIPTION. A blank emoji is sent as `'✨'`.

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| fetch | `Array.isArray(data)` | the array is the list | `data.results` is used (or `[]`) |
| fetch | `!silent` | `loading = true` → skeletons | the list stays visible |
| header button | `isCreating` | "Close Panel" (ghost style) | "+ Add New Hobby" (dark) |
| render | `isCreating` | the EMOJI / TITLE / DESCRIPTION form block | hidden |
| form layout | `stackForm` | the block stacks; the description becomes multiline (`minHeight 76`) | a row with flex `0.12 / 0.35 / 1`; single-line description |
| create | `!title.trim() \|\| !text.trim()` | toast "Add a title and a description." | continues |
| create | `!res.ok` | the server error as a toast | appended to the list, **auto-expanded**, the form closes, toast "Hobby added." |
| update | `!title.trim() \|\| !text.trim()` | "Add a title and a description." | continues |
| update | `!res.ok` | "Update failed." | replaced in place, edit mode exits, toast "Hobby updated." |
| delete | `!res.ok && res.status !== 204` | "Delete failed." | removed, collapsed if open, toast "Hobby removed." |
| render | `!!fetchError` | the red banner | hidden |
| render | `loading` | 3 skeleton rows | hidden |
| render | `!loading && !fetchError && hobbies.length === 0` | "🌱 No hobbies yet. Add something you love above." | hidden |
| render | `!loading && hobbies.length > 0` | the accordion columns | hidden |
| `toggleOpen` | the same id | `openId = null` (collapse) | `openId = id` (expand; the previous one collapses) |
| item | `open` | a green border + a shadow | the default card |
| item | `open` | the expandable panel renders | nothing below the header |
| item | `editing` | the edit form (EMOJI & TITLE + DESCRIPTION + Update/Cancel) | the description + the ✏️/✕ controls |
| item | `hobby.emoji` falsy | shows `'✨'` | the stored emoji |
| chevron | `open` | rotated 180° | 0° |
| toast | `toastErr` | the danger palette | the success palette |

**User actions → outcomes**

| Action | Outcome |
|--------|---------|
| "+ Add New Hobby" / "Close Panel" | toggles the form, resets it |
| Type EMOJI / TITLE / DESCRIPTION | updates `newHobby` |
| "Save Hobby" | POST → appended + auto-expanded + "Hobby added." |
| Tap an accordion header | expands/collapses it |
| ✏️ | expands the item and switches it to the edit form |
| "Update" | PATCH → "Hobby updated." |
| "Cancel" | exits edit mode, stays expanded |
| ✕ | Alert "Remove this hobby permanently?" → "Remove" → DELETE → "Hobby removed."; "Cancel" → nothing |
| Pull to refresh | a silent re-fetch |

**Modals / overlays:** the native `Alert` + the toast overlay (3000ms). The create panel and inline editor are not modals.

**API endpoints:** `GET/POST ${API_BASE}/api/hobbies/`, `PATCH/DELETE ${API_BASE}/api/hobbies/{id}/` with body `{ emoji, title, text }`. **Storage keys:** none.

**Bottom line — the ways**

1. **Browse** — `GET /api/hobbies/` → a 1- or 2-column accordion; skeletons → error banner → empty state → pull-to-refresh.
2. **Expand** — tap a row → the description + ✏️/✕ appear (one at a time).
3. **Create** — "+ Add New Hobby" → emoji/title/description → "Save Hobby" → POST → appended + auto-expanded.
4. **Edit / delete** — ✏️ → inline form → "Update" → PATCH; ✕ → Alert → DELETE.

---

---

## 5. Web app in depth

> The web app is a **separate Vite/React SPA** in `web/`. It is a *parallel* implementation of
> most screens — the same Django API, but with a completely different navigation model
> (a hidden PIN-locked sidebar instead of the mobile drawer).
> `npm run dev:web` → `http://localhost:5174`; `npm run build:web` → `web/dist`.

### 5.0 The web tree (the branch that is different from mobile)

```
web/index.html  →  #root  →  web/src/main.jsx
                                  │
                                  └─→ <MyArea />  (web/src/ArchanaArea/components/MyArea.jsx)
                                     │
                                     ├─⑂ activeSection === null
                                     │  └─→ HERO dashboard (greeting, Projects, Professional Development)
                                     │
                                     └─⑂ activeSection === <id>
                                        └─→ <SectionPage id onBack />  → one of 16 pages
```

### 5.1 `web/src/main.jsx`

**Purpose:** React root + service-worker registration.

**Branches**

| Condition | TRUE | FALSE |
|-----------|------|-------|
| `"serviceWorker" in navigator` | registers `/sw.js` on the window `load` event | nothing happens |
| the registration promise rejects | swallowed by `.catch(() => {})` — silent | — |

**Storage keys / endpoints:** `/sw.js`. No API.

---

### 5.2 `web/src/ArchanaArea/components/MyArea.jsx` — THE WEB ROOT

**Purpose:** The web shell — hero dashboard, the **hidden unlock mechanism** (secret dot + PIN), the slide-in sidebar, and the section dispatcher.

**Props:** `onBack` — optional. When truthy a "← Portfolio" button appears in the top bar.

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `sidebarOpen` | `false` | The sidebar slide-in + the main content shift |
| `sidebarRendered` | `false` | Whether the sidebar markup is mounted at all |
| `activeSection` | `null` | `null` = the Hero; a string id = a section page |
| `burst` | `false` | The celebration animation |
| `sparkles` | `[]` | 60 sparkle elements |
| `showSidebarPin` | `false` | The PIN pad modal |
| `projects` | `[]` | The Projects block |
| `pdItems` | `[]` | The Professional Development block |
| `dataLoading` | `true` | The spinner vs the data blocks |

**Other variables**

| Name | Value | Purpose |
|------|-------|---------|
| `sidebarLenRef` | `4` | The required PIN length (from `/api/secret-meta/`) |
| `SIDEBAR_HOLD_MS` | `1200` | The press-and-hold threshold |
| `SIDEBAR_TAP_MS` | `1200` | The double-tap window |
| `SIDEBAR_TAPS` | `2` | The number of taps needed |
| `PIN_KEYS` | `['1','2','3','4','5','6','7','8','9','clear','0','back']` | The PIN pad grid |

**☰ The 16 sidebar sections (SECTIONS)**

| id | icon | label | group |
|----|------|-------|-------|
| `gallery` | 🐸 | Gallery | Explore |
| `dramalist` | 🍀 | Drug Collection | Explore |
| `hobbies` | 🐙 | Hobbies | Explore |
| `blog` | 📰 | Blog | Explore |
| `goals` | 🐞 | Plan | Life |
| `challenges` | 🌠 | Challenges | Life |
| `notes` | 🎨 | Note | Life |
| `wishlist` | 🐳 | Wish | Life |
| `tellme` | 🐣 | My Day | Life |
| `todo` | ☃️ | Todo | Life |
| `aboutme` | 🐉 | Configuration | Life |
| `project` | 🦏 | Project | Life |
| `professionalDev` | 🦜 | Participation | Life |
| `music` | 🐋 | Music | Life |
| `gestureDraw` | 🦒 | Gesture Drawing | Life |
| `pdfchecker` | 🫟 | PDF Manager | Life |
| — | 🔒 | Lock Sidebar | Security |

**`SectionPage` — the dispatcher (16 branches)**

| id | Component | id | Component |
|----|-----------|----|-----------|
| `gallery` | `GalleryPage` | `project` | `ProjectsPage` |
| `goals` | `Goals` | `professionalDev` | `ProfessionalDevPage` |
| `hobbies` | `Hobbies` | `music` | `MusicVibes` |
| `notes` | `Notes` | `gestureDraw` | `GestureDraw` |
| `wishlist` | `WishList` | `challenges` | `ChallengeTracker` |
| `dramalist` | `Drama` | `pdfchecker` | `PDFManager` |
| `tellme` | `MyDayLogPage` | `blog` | `Blog` |
| `todo` | `ChronosTaskFlow` | *(no match)* | the 🚧 "under construction" placeholder |
| `aboutme` | `AboutMe` | | |

**The two ways to unlock the sidebar**

| # | Way | Steps | Branch conditions |
|---|-----|-------|-------------------|
| 1 | **Secret dot + PIN pad** | hold the green dot 1200ms → tap twice within 1200ms → the PIN pad opens → type the PIN | hold reached → `armed = true` + a 4000ms disarm timer; 2 taps within the window → `onUnlock()`; correct PIN → `onSuccess()`; wrong → shake + clear after 750ms |
| 2 | **Keyboard PIN** | type the PIN digits anywhere outside an INPUT/TEXTAREA | only digits; the buffer keeps the last `len` digits; a full buffer → `verifySecret('sidebar', buf)` → allowed → the sidebar opens directly with the burst; **not** allowed → the buffer is *not* reset (the window slides) |

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| root | `activeSection` | the section page (the Hero is not rendered) | the full dashboard |
| root | `sidebarRendered` | the sidebar markup exists | it is not mounted |
| `SidebarSecretTrigger` | the hold timer fires | `heldRef = true`, taps reset, `armed = true`, the 4000ms disarm timer starts | — |
| `SidebarSecretTrigger` | pointerup after a completed hold | the flag resets and the tap is **not** counted | — |
| `SidebarSecretTrigger` | `!armed` | nothing happens | the tap is recorded |
| `SidebarSecretTrigger` | `taps.length >= 2` | the taps reset, `armed = false`, `onUnlock()` (the PIN pad opens) | — |
| `SidebarSecretTrigger` | `onPointerCancel` | the hold timer clears, the flag resets | — |
| `SidebarPinPad` | `status === 'checking'` | every key press is ignored | keys work |
| `SidebarPinPad` | the key is `clear` | the PIN resets | — |
| `SidebarPinPad` | the key is `back` | the last digit is removed | — |
| `SidebarPinPad` | `pin.length >= len` | further digits are rejected | — |
| `SidebarPinPad` | `next.length === len` | it auto-submits | — |
| `SidebarPinPad` | `verifySecret` returns allowed | `onSuccess()` → the sidebar opens with the burst | the dots turn red, "Incorrect PIN", the panel shakes, the input clears after 750ms |
| `SidebarPinPad` | the overlay is clicked | `onClose()` (the panel click does not close it) | — |
| the global keydown | the key is not a digit | ignored | — |
| the global keydown | the focus is in an INPUT/TEXTAREA | ignored | — |
| the global keydown | the buffer is full and allowed | the sidebar opens + the burst | the buffer is not reset |
| greeting | `hour < 12` | "Good morning" / "A fresh start — let's make today count." | `hour < 17` → "Good afternoon" / "Hope your day is unfolding beautifully."; else "Good evening" / "Time to relax and create something you love." |
| dashboard | `dataLoading` | the spinner + "Fetching your work…" | the data blocks |
| dashboard | `projects.length > 0` | the Projects block | hidden |
| dashboard | `pdItems.length > 0` | the PD block | hidden |
| dashboard | both lists empty | the 🌱 empty state | hidden |
| dashboard | `p.github_link` | the "↗ GitHub" link | hidden |
| dashboard | `p.features.length > 0` | the first 3 features + "+N more" | hidden |
| dashboard | `pd.learnings.length > 0` | the first 3 learnings + "+N" | hidden |
| dashboard | `pd.skills_acquired.length > 0` | the first 4 skills + "+N" | hidden |
| sidebar | `activeSection` | the sidebar sits at `top: 0` | at `top: 56` (below the top bar) |
| sidebar | `sidebarOpen` | the slide-in animation | the slide-out; it unmounts after 350ms |
| main | `sidebarOpen` | `margin-left: 268px` | `0` |

**API endpoints**

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `${VITE_API_URL}/api/projectListView/` | The Projects block |
| GET | `${VITE_API_URL}/api/pdListView/` | The PD block |
| GET | `${VITE_API_URL}/api/secret-meta/` | `{ sidebar_length }` |
| POST | `${VITE_API_URL}/api/verify-secret/` | `{ field:'sidebar', value }` → `{ allowed }` |

**Bottom line — the ways**

1. **Hero** — boot → the greeting → the spinner → the Projects + PD blocks (or the 🌱 empty state).
2. **Secret dot + PIN** — hold → double-tap → the PIN pad → correct → the sidebar opens with a burst.
3. **Keyboard PIN** — type the digits → the sidebar opens directly.
4. **Section navigation** — sidebar → any of the 16 sections → `SectionPage` renders it → "← Back to Hero".

---

### 5.3 `web/src/ArchanaArea/components/AboutMe.jsx` — "Configuration"

**Purpose:** The identity record ("operative profile") — read-only card, or a terminal-styled create/patch form.

**Props:** none (it ignores the `onBack` that `SectionPage` passes).

**State variables**

| Variable | Initial | Controls |
|----------|---------|----------|
| `mode` | `'idle'` | `'loading' \| 'loaded' \| 'creating' \| 'submitting' \| 'success'` |
| `existingRecord` | `null` | The API record `{ id, name, address, phone, email, sidebarCode, portalDream, timestamp }` |
| `errorMsg` | `''` | The red status banner |
| `isEditing` | `false` | Edit mode vs create mode |
| `formData` | all-empty | `{ name, address, phone, email, baseSecretCode, sidebarCode, portalDream }` |

**Derived:** `isSubmitting = mode === 'submitting'`, `showForm = mode === 'creating' || isEditing`, `submitHandler = existingRecord && isEditing ? handleUpdate : handleCreate`.

**☰ Options:** none. The form has 7 fields in two sections: "01 — STANDARD PROTOCOL DETAILS" (name, email, phone, address) and "02 — CLEARANCE & VISION MATRIX" (baseSecretCode, sidebarCode, portalDream).

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| load | `records.length > 0` | the record + the form are filled, `mode='loaded'` | `mode='creating'` |
| load | the response is not OK / throws | `mode='creating'` | — |
| create | `!baseSecretCode \|\| !portalDream` | "BASE SECRET CODE and PORTAL DREAM are required for clearance." — no request | continues |
| create | `res.ok` | the record is set, `mode='success'` for 2500ms then `'loaded'` | the flattened error message, `mode='creating'` |
| create | a network throw | "Critical network failure. Packet loss detected." | — |
| update | `!existingRecord?.id` | aborted | continues |
| update | `formData.baseSecretCode` non-empty | it is included in the payload | **omitted** (the server keeps the old code) |
| update | `res.ok` | `mode='success'` for 2500ms then `'loaded'` | "Update transmission failed." + `mode='loaded'` |
| delete | `window.confirm` is cancelled | aborted | DELETE |
| delete | `res.ok \|\| res.status === 204` | the record is cleared, the form resets, `mode='creating'` | "Deletion failed. Access may be restricted." |
| render | `mode === 'loading'` | "▶ INITIALIZING SECURE CHANNEL..." | — |
| render | `mode === 'success'` | "✓ SYNCHRONIZATION COMPLETE — DATA ARCHIVED SUCCESSFULLY" | — |
| render | `mode === 'loaded' && !isEditing && existingRecord` | the read-only card | — |
| render | `showForm` | the terminal form | — |
| form header | `existingRecord` | "// PATCH OPERATIVE RECORD" | "// NEW OPERATIVE RECORD" |
| the code input | `required={!existingRecord}` | required on create | optional on edit (placeholder "•••• (leave blank to keep)") |

**User actions → outcomes:** "[ EDIT RECORD ]" → the PATCH form; "[ CANCEL ]" → back to the card; "[ DELETE ]" → `window.confirm` → DELETE → the create form reappears; submit → POST/PUT.

**Modals / overlays:** the record card, the terminal form, the `window.confirm`, and the `StatusBanner` strips.

**API endpoints:** `GET/POST ${VITE_API_URL}/api/aboutme`, `PUT/DELETE ${VITE_API_URL}/api/aboutme/{id}/`. **Storage keys:** none. Exports `revalidate = 60`.

---

### 5.4 `web/src/ArchanaArea/components/Tellme.jsx` — "My Day"

**Purpose:** The web version of the day-log masonry — create/edit modal, file upload or remote URL, delete.

**Props:** none (it ignores `onBack`).

**State variables:** `entries[]`, `formData` (`EMPTY_FORM`), `isEditing`, `currentId`, `isModalOpen`, `loading`, `submitting`, `fetchError`, `toast`, `localPreview`.

**☰ Options:** the mood dropdown `['Happy','Okay','Neutral','Sad','Wired','Tired']` (default `Neutral`) with the same palettes as mobile; the image source choice (local file **or** remote URL, mutually exclusive).

**Branches / ways**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| fetch | `!res.ok` | the error banner "Cannot reach backend. Check that the Django server is running." | the entries are set |
| submit | `!title.trim() \|\| !date` | aborted silently | continues |
| submit | a file is selected | `FormData` with `file` + `source='local'` (no `remote_url`) | `FormData` with `source='remote'` + `remote_url` |
| submit | `isEditing` | PUT `/api/daylogs/{id}/` | POST `/api/daylogs/` |
| submit | `!res.ok` | the first-key error message → an error toast | the list is refetched, the modal closes, a toast "Day logged." / "Day updated." |
| delete | `window.confirm` cancelled | aborted | DELETE → removed + "Memory removed." |
| file change | `localPreview` starts with `blob:` | the old object URL is revoked | a new blob URL is created, `source='local'`, `remote_url` cleared |
| render | `!loading && !fetchError && entries.length === 0` | the empty frame | hidden |
| render | `sorted.length > 0` | the masonry (sorted newest-first) | hidden |
| modal | `isEditing` | "Edit Day Stamp" + "Save Changes" | "Log New Memory" + "Archive Memory" |
| modal | a file is selected | the URL field is hidden, the file name is shown | the URL field is visible |
| card | `entry.url` | the photo (the Edit/Delete overlay appears on hover) | the no-photo panel (the buttons are always visible) |

**API endpoints:** `GET/POST ${VITE_API_URL}/api/daylogs/`, `PUT/DELETE ${VITE_API_URL}/api/daylogs/{id}/` (multipart).

---

### 5.5 `web/src/ArchanaArea/components/Notes.jsx` — "Note"

**Purpose:** The web twin of the mobile Notes screen — two-pane list + autosaving editor, with a **right-click** context menu instead of a long-press.

**Props:** none.

**State variables:** `notes[]`, `loading`, `fetchErr`, `selectedId` (`null` | `'draft'` | number), `content`, `saveStatus` (`idle|saving|saved`), `saveErr`, `confirmDeleteId`, `deletingId`, `toasts` (max 2), `query`, `debouncedQuery` (150ms), `filter` (`all|pinned`), `pinned` (Set), `contextMenu` (`{id,x,y}`).

**☰ Options**

- **Filter chips:** "All Notes" (`all`), "Pinned" (`pinned`).
- **Right-click context menu:** Open, Duplicate, Copy, Download as PDF, ─, Pin note / Unpin note, ─, Delete note.
- **Delete modal:** Cancel, Delete.

**Extra vs mobile:** keyboard shortcuts — `Cmd/Ctrl+F` focuses the search, `Cmd/Ctrl+N` creates a note, `Escape` closes the menu/modal or blurs the field. The context menu is positioned at the cursor and clamped to the window.

**Branches / ways:** identical to the mobile Notes screen (`src/components/Notes.jsx` §4.5) for save/filter/sort/delete, with these differences:
- The context menu opens on **right-click** (`openContextMenu(e, note)` → `e.preventDefault()`), is **disabled for the draft row**, and closes on any outside click or scroll.
- The menu disappears silently if the note no longer exists in `notes`.
- The PDF export uses the web module `exportNotePdf` from `web/src/js/noteMarkdownPdf.js` (jsPDF) instead of `expo-print`.

**Storage keys / endpoints:** localStorage `notes:pinned-ids`; `GET/POST ${VITE_API_URL}/api/node-matrix/`, `PATCH/DELETE .../node-matrix/{id}/`.

---

### 5.6 `web/src/js/noteMarkdownPdf.js` — the PDF engine

**Purpose:** A pure-JS module (dynamic `import('jspdf')`) that renders Markdown into a styled A4 PDF.

**Exports:** `pdfSafeText`, `riskColorFor`, `looksLikeMarkdown`, `parseInline`, `extractImageUrls`, `prefetchImages`, `exportNotePdf`, `exportBlogPdf`.

**☰ The internal option lists**

| List | Contents |
|------|----------|
| `WINANSI_EXTRA` | Extra codepoints allowed in Windows-ANSI PDFs (curly quotes, dashes, bullet, ™ …) |
| `SYMBOL_MAP` | Unsupported Unicode → ASCII: `≤ → <=`, `→ ->`, `✓ → v`, `✅ → [x]`, `⭐ → *` … |
| `MD_INLINE_RULES` | In priority order: `***bold italic***`, `___bold italic___`, `**bold**`, `__bold__`, `~~strike~~`, `` `code` ``, `*italic*`, `_italic_` |
| `riskColorFor` priorities | 🔴 `[220,38,38]` → 🟠 `[234,88,12]` → 🟡 `[180,120,4]` → 🟢 `[22,163,74]` → ⚠ `[217,119,6]` → ℹ `[37,99,235]` → ◔ `[217,119,6]` → ⬛ `[63,63,70]` → ⬜ `[130,130,140]` → `null` |

**The Markdown block renderer — each line goes to exactly one renderer**

| Line pattern | Renderer |
|--------------|----------|
| ```` ``` ```` | code fence (open/close), rendered as a monospace block |
| a blank line | `ctx.y += lineHeight * 0.6` |
| `![alt](url)` alone | a picture (if prefetched) or an italic grey caption |
| contains `\|` **and** the next line is a separator | a table (computed column widths, header repeated on page breaks) |
| `---` / `***` / `___` | a horizontal rule |
| `#{1,6}` | a heading — sizes `{1:20, 2:17, 3:15, 4:13, 5:12, 6:11}` |
| `>` | a blockquote with a green left bar |
| `- ` / `* ` / `+ ` | a bullet `•` in accent green, indent `10 + floor(indent/2)*14` |
| `1.` / `1)` | an ordered item `N.` in accent green |
| anything else | inline-styled runs (bold / italic / code / link) |

**Branches:** `pdfSafeText` drops VS16/VS15/ZWJ and non-WinAnsi characters; `looksLikeMarkdown` tests 14 regexes; `exportNotePdf` renders the title as a heading (16px if it starts with `###`+, else 20px), then the body (Markdown or plain), then a footer `Exported from Archana's Notes · <date>`; `exportBlogPdf` draws an optional cover (max 42% of the page height), a metadata line (`author · date · category · N min read · Draft`), a `#tag` line, the body, and a per-page footer `Archana Timilsina · <title>` + `p / pages`.

**Storage keys / endpoints:** none. The only network access is `fetch(url, {mode:'cors'})` for images.

---

### 5.7 `web/src/ArchanaArea/components/Blog.jsx` — "Blog"

**Purpose:** The web twin of the mobile Blog Studio, with **image paste/drop** support and a **PDF export** button.

**Props:** `onBack` — optional; the back button calls `onBack` in list mode and `backToList()` in editor mode.

**Extra vs mobile:** `compressImage(file, maxDim=1600, quality=0.82)` (skips GIF/SVG and files under 350KB), `coverPreview` (a local blob URL), `onPasteContent` / `onDropContent` (paste or drop an image into the textarea → it is uploaded and inserted), `handleDownloadPdf()` → `exportBlogPdf`, `beforeunload` warning when dirty, and keyboard shortcuts `Cmd/Ctrl+S` (save) / `Cmd/Ctrl+K` (focus search) / `Escape` (close the delete modal).

**☰ Options:** identical to the mobile Blog screen — status chips (`all`/`published`/`draft`), the category filter, the 5 sort options, the Write/Preview tabs, the 8 markdown toolbar buttons, the editor category + status pickers, the featured toggle, the delete modal.

**API endpoints:** identical to mobile, plus `POST /api/blog/images/` (multipart `image`). localStorage `blog:liked-ids`.

---

### 5.8 `web/src/ArchanaArea/components/dramalist.jsx` — "Drug Collection"

**Purpose:** The web twin of the mobile Watchlist.

**☰ Options:** type tabs `['All','drama','movie','anime','book','manga']`; status tabs `['All','Watching','Plan to Watch','On Hold','Completed','Dropped']`; sort `default | title-az | title-za`; type select (5); status select (5); genre select (15: `Bromance, BL, Crime, Detective, Thriller, Romance, Action, Drama, Fantasy, Horror, Historical, Adventure, Sci-Fi, Comedy, Sad`).

**Extra vs mobile:** pressing `/` focuses the search box; the type select displays the value capitalised.

**Branches:** the same filter chain (type → status → search → sort) and the same validation (title + genre required), the same 3 modals (add/edit, delete, Collection Info), the same empty-state wording.

**API endpoints:** `GET/POST ${VITE_API_URL}/api/watchlist/`, `PUT/DELETE .../watchlist/{id}/`.

---

### 5.9 `web/src/ArchanaArea/components/Challengetracker.jsx` — "Challenges"

**Purpose:** The web twin of the mobile Challenges screen, but the badge is generated with a **canvas** and downloaded as a PNG (mobile uses `expo-view-shot` + the share sheet).

**☰ Options:** the type toggle (`days` / `instant`), the 3 instant statuses (`completed` / `not_completed` / `pending`), the 5 stats tiles (Done, Missed, Remaining, Best streak, Complete).

**Branches:** the same as mobile — only today's cell is editable, past cells show a missed dot, future cells a lock; the form validates the title/start/end; the type swap changes the payload field (`duration_days` vs `end_date`).

**Extra vs mobile:** the delete uses `window.confirm` (mobile uses a native Alert); errors are only `console.error`'d (no UI banner).

**API endpoints:** `GET/POST ${VITE_API_URL}/api/challenges/`, `PATCH/DELETE .../challenges/{id}/`, `POST .../challenges/{id}/mark-day/`, `PATCH .../challenges/{id}/instant-status/`.

---

### 5.10 `web/src/ArchanaArea/components/ProjectDetail.jsx` — "Project"

**Purpose:** The Projects showcase — a type-filtered grid with a create/edit modal and a repeatable "features" tag input.

**Props:** `onBack` — the "←" button always renders (so `onBack` must be supplied).

**☰ Options**

- **Filter tabs:** All, Solo (`solo`), Group (`group`), Academic (`academic`), Open Source (`open_source`).
- **Type select (modal):** the same 4 values.
- **Features tag list:** free text, Enter or "Add" appends, "×" removes by index.
- Card type colours: `solo #6ee7b7`, `group #93c5fd`, `academic #fbbf24`, `open_source #f9a8d4` (fallback `#6ee7b7`).

**Branches**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| validate | `!name.trim()` | "Project name is required." | continues |
| validate | `!tech.trim()` | "Tech field is required." | continues |
| addFeature | the trimmed input is empty | nothing is added | the feature is appended |
| delete | `!res.ok && res.status !== 204` | the top-bar error pill | the project is removed (**no confirmation**) |
| card | `features.length > 0` | the first 4 features + "+N more" | hidden |
| card | `github_link` / `live_url` | the ↗ GitHub / ↗ Live links | "No links added" |
| modal | `modal === 'add'` | the title "New Project", the button "Create" | "Edit Project" / "Save" |
| modal | the overlay is clicked | the modal closes | clicking inside does not |

**API endpoints:** `GET/POST ${VITE_API_URL}/api/projectListView/`, `PATCH/DELETE ${VITE_API_URL}/api/projectDetailView/{id}/`.

---

### 5.11 `web/src/ArchanaArea/components/ProfessionalDev.jsx` — "Participation"

**Purpose:** The Professional Development log — filter tabs, expandable cards, add/edit modals with certificate upload and two tag lists.

**Props:** `onBack` — the "←" back button always renders.

**☰ Options**

- **Filter tabs:** All plus 8 types: `Mentorship` (🧑‍🏫 `#a78bfa`), `Internship` (💼 `#6ee7b7`), `Course` (📘 `#93c5fd`), `Fellowship` (🏅 `#fbbf24`), `Session` (🎙️ `#f9a8d4`), `Online Course` (💻 `#fb923c`), `Online Badges` (⚠ no `TYPE_META` entry → no icon), `Online Fellowship` (⚠ no entry).
- **Type select:** the same 8 values; the default is `Course`.
- **Tag lists:** "Key Learnings" and "Skills Acquired".

**Branches**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| validate | `!subject.trim()` | "Subject is required." | continues |
| validate | `!company.trim()` | "Company/Organisation is required." | continues |
| validate | `!duration.trim()` | "Duration is required." | continues |
| filter | `filterType === 'all'` | all items | only the items whose `name` matches exactly |
| card | `TYPE_META[item.name]` | that icon + colour | the fallback `{ color:'#a78bfa', icon:'📌' }` |
| card | `certificate_link` | the "🏆 Cert" link (new tab, does not expand) | hidden |
| card | `isExpanded && (learnings.length > 0 \|\| skills.length > 0)` | the expanded block | nothing |
| buildFormData | `certificate_image instanceof File` | the file is sent | the existing certificate is kept |
| delete | `!res.ok && res.status !== 204` | the error pill | removed (**no confirmation**) |

**API endpoints:** `GET/POST ${VITE_API_URL}/api/pdListView/`, `PATCH/DELETE ${VITE_API_URL}/api/pdDetailView/{id}/` (multipart).

---

### 5.12 `web/src/ArchanaArea/components/Goals.jsx` — "Plan"

**Purpose:** The goals list with the per-day check-in grid.

**☰ Options:** the filter chips are absent; the implicit list is the goal list and each goal's `day_statuses` grid. Form: Objective (text), Timeline (number, min 1, max 365).

**Branches**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| create | `!title.trim() \|\| !timelineNum \|\| timelineNum <= 0` | **silently** aborted (no error message) | POST |
| day toggle | — | **double-click** only (`onDoubleClick`) toggles a day | a single click does nothing |
| `completed` | `g.days_completed ?? g.day_statuses?.filter(d=>d.done).length ?? 0` | the 3-level fallback | — |
| card | `isBusy` | dimmed, the buttons disabled, the check box spins | normal |
| render | `!loading && goals.length === 0 && !error` | the empty state | hidden |
| delete | `window.confirm` cancelled | aborted | DELETE |

**API endpoints:** `GET/POST ${VITE_API_URL}/api/Goals/`, `PATCH ${VITE_API_URL}/api/Goals/{id}/`, `PATCH .../Goals/{id}/days/{n}/toggle/`, `DELETE .../Goals/{id}/`.

---

### 5.13 `web/src/ArchanaArea/components/Hobbies.jsx` — "Hobbies"

**Purpose:** The hobbies accordion.

**☰ Options:** none — EMOJI (maxLength 12), TITLE, DESCRIPTION.

**Branches:** the same as the mobile Hobbies screen, except the create **appends** (`[...p, created]`) and auto-expands the new item; the accordion header click toggles `openId`; the delete uses `window.confirm`.

**API endpoints:** `GET/POST ${VITE_API_URL}/api/hobbies/`, `PATCH/DELETE .../hobbies/{id}/`.

---

### 5.14 `web/src/ArchanaArea/components/music.jsx` — "Music"

**Purpose:** The music-vibes card grid.

**☰ Options:** the free-text hex colour field (maxLength 7); the fixed equaliser bar config `BAR_PROPS`.

**Branches:** the same as the mobile Music screen — "Artist and track are required." / "Color must be a valid hex code (e.g. #6366f1)." validation, the 8 presets, the inline edit, the DELETE with **no** confirmation, and 8 skeleton cards while loading.

**API endpoints:** `GET/POST ${VITE_API_URL}/api/music-vibes/`, `PATCH/DELETE .../music-vibes/{id}/`.

---

### 5.15 `web/src/ArchanaArea/components/GestureDraw.jsx` — "Gesture Drawing"

**Purpose:** The web drawing canvas (2D `<canvas>` instead of SVG).

**☰ Options:** the same 5 colours and 3 sizes as mobile; the "show points" toggle; "clear".

**Branches:** the same shape as mobile — the pointer down/move/up model, the first point `#185FA5` and last point `#0F6E56` (radius 4), the middle points `rgba(180,100,60,0.7)` (radius 3), the stats strip (strokes / total points / this stroke / last point) and the "Points in last stroke" chip list.

**Extra vs mobile:** the web version has **no undo** button; a window resize re-scales and redraws both canvases.

**Storage keys / endpoints:** none.

---

### 5.16 `web/src/ArchanaArea/components/Gallery.jsx` — "Gallery"

**Purpose:** The web Archive scrapbook — masonry, create/edit modal, lightbox, image download.

**☰ Options:** the image source toggle (Local Upload / Remote URL), the per-card actions (Preview / Edit / Delete), the lightbox bar (Download / Close / ‹ Previous image / Next image ›).

**Branches**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| create | `!title.trim()` | "Title is required." | continues |
| create | `source==='local' && !file` | "Please select an image file." | continues |
| create | `source==='remote' && !remoteUrl.trim()` | "Please enter a remote image URL." | continues |
| update | `source==='local' && file` | `FormData` PATCH | else if `source==='remote' && remoteUrl !== editing.remote_url` → JSON `{title, source, url}` | else → JSON `{title}` |
| delete | `!res.ok && res.status !== 204` | toast "Delete failed." | removed + toast "Memory removed" (**no confirmation**) |
| grid | `loading` | 6 skeleton blocks (heights `[220,280,190,260,310,200]`) | — |
| grid | `stamps.length === 0` | the clickable empty state | — |
| lightbox | `!stamp` | renders `null` | — |
| lightbox | the image fails to load | "⚠ This image could not be loaded" | the image |
| lightbox | `stamps.length > 1` | the ‹ › buttons | hidden |
| download | the fetch fails | opens the URL in a new tab + the toast "Opened in a new tab — save it from there" | the file is downloaded + "Download started ✓" |
| lightbox keys | `Escape` / `ArrowLeft` / `ArrowRight` | close / previous / next | — |

**API endpoints:** `GET/POST ${VITE_API_URL}/api/archive/`, `PATCH/DELETE .../archive/{id}/`.

---

### 5.17 `web/src/ArchanaArea/components/TodoArea.jsx` — "Todo"

**Purpose:** The web Chronos timeline.

**☰ Options:** no dropdowns — the day columns are generated from the task due dates, plus the native `<input type="date">`.

**Branches**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| add | `!taskInput.trim() \|\| !dateInput` | aborted | POST |
| day groups | the day has no incomplete task | the day is **hidden entirely** | shown |
| card | `!task.completed && !isEditing` | the "✎" Edit button | hidden for completed tasks |
| card | `isSaving` | a spinner, everything disabled, the card dims | normal |
| card | `isEditing` | the inline input (auto-focused) | the text |
| inline edit | `onBlur` | it **saves** | — |
| inline edit | `Enter` | it saves | — |
| inline edit | `Escape` | the text is reverted, nothing is saved | — |
| delete a day | — | **no confirmation** — the day is removed optimistically + parallel DELETEs; a partial failure sets "Day deletion partially failed. Refreshing..." and refetches | — |

**API endpoints:** `GET/POST ${VITE_API_URL}/api/tasks/`, `PATCH/PUT/DELETE .../tasks/{id}/`.

---

### 5.18 `web/src/ArchanaArea/components/WishList.jsx` — "Wish"

**Purpose:** The wishes grid.

**☰ Options:** none — EMOJI (maxLength 2) + the wish text. A blank emoji is sent as `'✨'`.

**Branches:** the same as the mobile Wishlist, except the delete uses `window.confirm` and the "MysticBar" banner ("A wish written here is bound. Once you write, it cannot be removed.") is static copy.

**API endpoints:** `GET/POST ${VITE_API_URL}/api/wishes/`, `PUT/DELETE .../wishes/{id}/`.

---

### 5.19 `web/src/ArchanaArea/components/PdfChecker.jsx` — "PDF Manager"

**Purpose:** The PDF library — upload, list, preview (iframe), download, delete.

**Props:** `onBack` — optional; the "← Back" button renders only when truthy.

**State variables:** `pdfs[]`, `loading`, `title`, `file`, `uploading`, `previewDoc`, `error`.

**☰ Options:** none — only the OS file picker (`accept="application/pdf"`).

**Branches**

| Where | Condition | TRUE | FALSE |
|-------|-----------|------|-------|
| upload | `!file \|\| !title.trim()` | "Give it a title and choose a PDF file first." — no request | POST multipart |
| upload | `!res.ok` | "Upload failed. Check the file is a PDF." | the form resets, the list refreshes silently |
| delete | `window.confirm` cancelled | aborted | DELETE |
| list | `loading` | the spinner + "Loading documents…" | — |
| list | `pdfs.length === 0` | "No PDFs saved yet. Upload one above." | the cards |
| preview | `previewDoc` | the modal with an `<iframe src={file_url}>` | hidden |
| preview | `Escape` | it closes | — |
| meta | `size_kb` / `uploaded_at` | the pieces are joined with " · " | — |

**API endpoints:** `GET/POST ${VITE_API_URL}/api/pdfs/`, `DELETE .../pdfs/{id}/`. The download uses the API's `download_url`.

---

## 6. Backend in depth

### 6.1 `backend/soul/urls.py`

| Path | View |
|------|------|
| `admin/` | `django.contrib.admin.site.urls` |
| `api/` | `include('api.urls')` |
| `/media/<path>` | served from `MEDIA_ROOT` via `django.conf.urls.static.static()` |

### 6.2 `backend/soul/settings.py` — the settings that branch behaviour

| Setting | Value | What it controls |
|---------|-------|------------------|
| `INSTALLED_APPS` | django contrib apps + `rest_framework` + `corsheaders` + `['api']` | Which apps/models load |
| `REST_FRAMEWORK.DEFAULT_RENDERER_CLASSES` | `['rest_framework.renderers.JSONRenderer']` | **Every response is JSON** — no browsable API |
| `REST_FRAMEWORK` auth/permission | **not set** → DRF defaults (Session + Basic auth, AllowAny) | ⚠ **Everything is public** — there is no auth on any endpoint |
| `REST_FRAMEWORK.DEFAULT_PAGINATION_CLASS` | not set → none globally | Only `BlogPostListCreateAPIView` paginates (page_size 9) |
| `DATABASES` | `dj_database_url.config(default=os.environ.get('DATABASE_URL'), conn_max_age=600)` | The DB; connections reused for 600s |
| `CORS_ALLOWED_ORIGINS` | `archana-timilsina.com.np`, `www.…`, `localhost:5173`, `localhost:3000`, `localhost:5174`, `localhost:4174` | Which browser origins may call the API |
| `CORS_ALLOWED_ORIGIN_REGEXES` | `^https://[a-z0-9-]*-archanatimilsinas-projects\.vercel\.app$`, `^https://portfolio-[a-z0-9-]+\.vercel\.app$` | Any Vercel preview of those projects |
| `CSRF_TRUSTED_ORIGINS` | `localhost:3000`, `localhost:8000`, `10.0.2.2:8000`, `10.0.2.2:3000` | The emulator + local dev |
| `ALLOWED_HOSTS` | `portfolio-79vi.onrender.com`, `archana-timilsina.com.np`, `www.…`, `localhost`, `127.0.0.1`, `10.0.2.2` | ⚠ `10.0.2.2` is the Android emulator's host alias |
| `DEBUG` | `False` | Debug mode off |
| `STORAGES.default` | `soul.supabase_storage.SupabaseStorage` | All uploaded files go to Supabase |
| `STORAGES.staticfiles` | `whitenoise.storage.CompressedManifestStaticFilesStorage` | Static file serving |
| `SUPABASE_BUCKET_NAME` | `'media'` | The bucket name |
| `MEDIA_ROOT` / `MEDIA_URL` | `BASE_DIR/'media'` / `'/media/'` | The local media path |
| `STATIC_URL` | set twice — `'/static/'` then **overwritten** to `'static/'` | ⚠ a latent bug (the second wins) |
| `MIDDLEWARE` | `corsheaders` first, then security/session/common/csrf/auth/message/xframe | The CORS headers are added before everything else |
| Env vars | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `DJANGO_SECRET_KEY` | The runtime configuration |
| `TIME_ZONE` / `USE_TZ` | `'UTC'` / `True` | All date maths is UTC |

### 6.3 `backend/api/urls.py` — all 46 routes

> Every path below is prefixed with `/api/`.

| Path | Methods | View |
|------|---------|------|
| `health/` | GET | `HealthView` — `SELECT 1` → `{"status":"ok","db":true}` (503 if the DB fails) |
| `projectListView/` | GET, POST | `projectListView` |
| `projectDetailView/<int:pk>/` | GET, PUT, PATCH, DELETE | `ProjectDetailView` |
| `pdListView/` | GET, POST | `ProfessionalDevelopmentListView` |
| `pdDetailView/<int:pk>/` | GET, PUT, PATCH, DELETE | `ProfessionalDevelopmentDetailView` |
| `aboutme` (no slash) | GET, POST | `AboutMeListCreateView` |
| `aboutme/<int:pk>/` | GET, PUT, PATCH, DELETE | `AboutMeRetrieveUpdateDestroyView` |
| `daylogs/` | GET, POST | `DayLogListCreateView` |
| `daylogs/<int:pk>/` | GET, PUT, PATCH, DELETE | `DayLogDetailView` |
| `archive/` | GET, POST | `ScrapbookArchiveAPIView` |
| `archive/<int:pk>/` | GET, PUT, PATCH, DELETE | `ScrapbookStampDetailAPIView` |
| `node-matrix/` | GET, POST | `NoteListCreateAPIView` |
| `node-matrix/<int:pk>/` | GET, PUT, PATCH, DELETE | `NoteRetrieveUpdateDestroyView` |
| `wishes/` | GET, POST | `DreamWishListCreateAPIView` |
| `wishes/<int:pk>/` | GET, PUT, PATCH, DELETE | `DreamWishDetailView` |
| `watchlist/` | GET, POST | `WatchlistItemListCreateAPIView` |
| `watchlist/<int:pk>/` | GET, PUT, PATCH, DELETE | `WatchlistItemRetrieveUpdateDestroyView` |
| `Goals/` | GET, POST | `GoalListCreateAPIView` (prefetch `day_statuses`) |
| `Goals/<int:pk>/` | GET, PUT, PATCH, DELETE | `GoalRetrieveUpdateDestroyView` |
| `Goals/<int:pk>/days/<int:day_number>/toggle/` | PATCH | `GoalDayToggleAPIView` — flips the day, re-syncs `done`, returns the whole goal |
| `hobbies/` | GET, POST | `HobbyListCreateAPIView` |
| `hobbies/<int:pk>/` | GET, PUT, PATCH, DELETE | `HobbyRetrieveUpdateDestroyView` |
| `music-vibes/` | GET, POST | `MusicVibeListCreateAPIView` |
| `music-vibes/<int:pk>/` | GET, PUT, PATCH, DELETE | `MusicVibeRetrieveUpdateDestroyView` |
| `tasks/` | GET, POST | `TaskListCreateAPIView` |
| `tasks/<int:pk>/` | GET, PUT, PATCH, DELETE | `TaskRetrieveUpdateDestroyView` |
| `verify-secret/` | POST | `VerifySecretView` |
| `secret-meta/` | GET | `SecretMetaView` |
| `challenges/` | GET, POST | `ChallengeListCreateAPIView` |
| `challenges/<int:pk>/` | GET, PUT, PATCH, DELETE | `ChallengeRetrieveUpdateDestroyView` |
| `challenges/<int:pk>/mark-day/` | POST | `ChallengeMarkDayAPIView` |
| `challenges/<int:pk>/instant-status/` | PATCH | `ChallengeInstantStatusAPIView` |
| `pdfs/` | GET, POST | `PDFListCreateView` |
| `pdfs/<uuid:id>/` | GET, PUT, PATCH, DELETE | `PDFDetailView` |
| `pdfs/<uuid:id>/download/` | GET | `PDFDownloadView` — streams the bytes from Supabase |
| `blog/categories/` | GET, POST | `BlogCategoryListCreateAPIView` (annotated with `post_count`) |
| `blog/categories/<int:pk>/` | GET, PUT, PATCH, DELETE | `BlogCategoryRetrieveUpdateDestroyView` |
| `blog/images/` | POST | `BlogImageUploadAPIView` → `{"url","name"}` |
| `blog/posts/` | GET, POST | `BlogPostListCreateAPIView` (paginated, filtered — see below) |
| `blog/posts/stats/` | GET | `BlogPostStatsAPIView` → `{total,published,drafts,views,likes}` |
| `blog/posts/<int:pk>/` | GET, PUT, PATCH, DELETE | `BlogPostRetrieveUpdateDestroyView` |
| `blog/posts/<int:pk>/like/` | POST | `BlogPostLikeAPIView` |
| `blog/posts/<int:pk>/view/` | POST | `BlogPostViewAPIView` |
| `blog/comments/` | GET, POST | `BlogCommentListCreateAPIView` (filterable by `post`) |
| `blog/comments/<int:pk>/` | GET, PUT, PATCH, DELETE | `BlogCommentRetrieveUpdateDestroyView` |

**`BlogPostListCreateAPIView` — the list query parameters (☰ the filters)**

| Param | Accepted values | Effect |
|-------|-----------------|--------|
| `status` | exactly `'draft'` or `'published'` | filters by status; **any other value is silently ignored** |
| `category` | a numeric id **or** a slug | numeric → `category_id`; otherwise → `category__slug` |
| `tag` | any string | `tags__icontains` |
| `featured` | `'true'` or `'1'` | `is_featured=True`; other values ignored |
| `search` | any string | matches title **or** excerpt **or** content **or** tags (icontains) |
| `ordering` | `newest` → `-created_at`, `oldest` → `created_at`, `popular` → `-views`, `liked` → `-likes`, `title` → `title` | an unknown value falls back to `-is_featured, -published_at, -created_at` |
| `page` / `page_size` | integers | pagination, default 9, max 48 |

### 6.4 `backend/api/models.py` — the data model and every option list

| Model | Purpose | Key fields |
|-------|---------|------------|
| `ProfessionalDevelopment` | A course/mentorship/internship | `name` (choices), `subject`, `company`, `duration`, `certificate_image`, `learnings` (JSON), `skills_acquired` (JSON) |
| `Project` | A portfolio project | `name` (unique), `tech`, `project_type` (choices), `description`, `tech_stack` (JSON), `features` (JSON), `github_link`, `live_url`, `created_at` |
| `AboutMe` | The single profile + the secret store | `name`, `email` (unique), `phone`, `address`, `base_secret_code` (4), `sidebar_code`, `portal_dream`, `created_at` |
| `DayLog` | A daily entry | `date`, `mood` (choices), `title`, `image_file`, `remote_url`, `source` (choices) |
| `ScrapbookStamp` | An archive stamp | `title` ("Memory Label"), `image` (required), `remote_url`, `source` (choices), `timestamp` |
| `OperativeNote` | A node-matrix note | `emoji` (default 📝), `title`, `text`, `created_at`, `updated_at` |
| `DreamWish` | A wish | `emoji` (default ✨), `wish`, `created_at`, `updated_at` |
| `WatchlistItem` | A media item | `type` (choices), `title`, `genre` (choices), `status` (choices) |
| `OperativeGoal` | A goal | `title`, `timeline`, `done`, `created_at`, `updated_at` + `days_completed` property |
| `GoalDayStatus` | A per-day check | FK `goal` (CASCADE), `day_number`, `done`, `updated_at`; unique together |
| `HobbyItem` | A hobby | `emoji` (default ✨), `title`, `text` |
| `MusicVibeItem` | A track | `artist`, `track`, `mood`, `color` (hex-validated, default `#10b981`) |
| `Task` | A todo | `text`, `due_date`, `completed` |
| `Challenge` | A days/instant challenge | `title`, `type`, `start_date`, `duration_days`, `end_date`, `instant_status` |
| `ChallengeDay` | A marked day | FK `challenge` (CASCADE), `date`, `status`, `marked_at`; unique together |
| `PDFDocument` | An uploaded PDF | UUID pk, `title`, `file` (PDF-only), `size`, `uploaded_at` |
| `BlogCategory` | A blog category | `name` (unique), `slug` (auto, unique), `description`, `color`, `post_count` property |
| `BlogPost` | A blog article | `title`, `slug` (auto), `excerpt`, `content`, `cover_image`, `category` (FK, SET_NULL), `tags` (JSON), `author`, `status`, `is_featured`, `read_time`, `views`, `likes`, `published_at` |
| `BlogComment` | A comment | FK `post` (CASCADE), `author_name` (default "Anonymous"), `body`, `created_at` |

**Model-level logic worth knowing**

| Where | What it does |
|-------|--------------|
| `OperativeGoal.save()` | On insert it bulk-creates `GoalDayStatus` rows for days `1..timeline`; on update it calls `sync_day_statuses()` (creates missing days, deletes days beyond the timeline) |
| `OperativeGoal.sync_done_status()` | Sets `done = True` when `completed >= timeline` |
| `OperativeGoal.days_completed` | `day_statuses.filter(done=True).count()` |
| `Challenge.save()` | `days` → `end_date = start_date + (duration_days - 1)`; `instant` → `duration_days = (end_date - start_date).days + 1` |
| `Challenge.clean()` | `days` requires `duration_days >= 1`; `instant` requires `end_date >= start_date` |
| `Challenge.status` (property) | `None` for instant; `ENDED` if today > end_date; else `ONGOING` |
| `Challenge.is_today_editable()` | True only for `days` challenges where `start_date <= today <= end_date` |
| `Challenge.get_stats()` | `{total_days, completed, missed, remaining, current_streak, longest_streak, completion_pct, status}` |
| `BlogPost.save()` | Auto-slug (with `-2`, `-3` suffixes), `read_time = max(1, round(words/200))`, sets `published_at` on publish, normalises/dedupes tags |
| `BlogCategory.save()` | Auto-slug with uniqueness suffixes |
| `BlogPost` / `ScrapbookStamp` signals | `post_delete` → delete the cover/stamp image from storage |
| `PDFDocument.save()` / `.delete()` | Sets `size` from the file; deletes the file from storage on delete |

### 6.5 `backend/api/serializers.py` — every validation branch

| Serializer | Read-only fields | Validation branches (the exact messages) |
|------------|------------------|------------------------------------------|
| `ProjectSerializer` | — (`__all__`) | — |
| `ProfessionalDevelopmentSerializer` | — | `certificate_image_url` is a computed absolute URL |
| `AboutMeSerializer` | `timestamp` | — (the client field names are `baseSecretCode`, `sidebarCode`, `portalDream`) |
| `DayLogSerializer` | `url` (computed), `file` is **write-only** | uploading a file forces `source = 'local'` |
| `ScrapbookStampSerializer` | `image_url` (computed), `url` is **write-only** | `source='remote'` → the server downloads the image (`requests.get(..., timeout=10)`); a non-200 → "Could not download image from provided URL."; a connection error → "Error connecting to remote image URL."; `source='local'` without a file → "Image file is required for local source." |
| `OperativeNoteSerializer` | `id`, `created_at` | if the text contains `abstr:premature` or `struct:pre` → **"INTERNAL THOUGHT CRITICAL FAILURE: Text contains premature structural abstraction lines."** |
| `DreamWishSerializer` | `id`, `created_at`, `updated_at` | a blank emoji → `"✨"`; a blank wish → "A dream wish description is required." |
| `WatchlistItemSerializer` | `id` | a blank title → "Title cannot be empty."; a blank genre → "Genre selection is mandatory." |
| `OperativeGoalSerializer` | `id`, `done`, `created_at`, `updated_at` | `timeline <= 0` → "Timeline must be a positive number of days."; `timeline > 365` → "Timeline can't exceed 365 days." |
| `GoalDayStatusSerializer` | `id`, `day_number`, `updated_at` | only `done` is writable |
| `HobbyItemSerializer` | `id` | a blank title → "Objective label title cannot consist strictly of spaces."; a blank text → "Analytical context narrative details must be explicitly provided." |
| `MusicVibeItemSerializer` | `id` | a blank artist → "Artist name token details cannot be empty."; a blank track → "Track composition title cannot be empty." |
| `TaskSerializer` | `id`, `createdAt` | a blank text → "Task text cannot be empty." |
| `ChallengeSerializer` | `id`, `created_at` | `days` → duration required and `>= 1` ("Required and must be at least 1 for a days challenge."); `instant` → end_date required ("Required for an instant challenge.") and `>= start_date` ("End date must be on or after the start date.") |
| `InstantStatusSerializer` | — | `instant_status` must be one of `completed` / `not_completed` / `pending` |
| `PDFDocumentSerializer` | `id`, `size`, `uploaded_at`, `updated_at` | the file must end in `.pdf` → "Only PDF files are allowed." |
| `BlogImageUploadSerializer` | — | images must be **under 8 MB** → "Images must be smaller than 8 MB." |
| `BlogCategorySerializer` | `id`, `slug`, `created_at` | a blank name → "Category name cannot be empty." |
| `BlogCommentSerializer` | `id`, `created_at` | a blank body → "Comment cannot be empty."; a blank author → "Anonymous" |
| `BlogPostListSerializer` | `id`, `slug`, `read_time`, `views`, `likes`, `published_at`, timestamps | a blank title → "A blog title is required." |
| `BlogPostDetailSerializer` | (inherits) | + `content`, `comments`, `word_count` |
| `TagsField` (custom) | — | a JSON array → cleaned; a JSON string → split on commas; anything else → "Tags must be a list of strings." |

### 6.6 `backend/api/views.py` — the status codes

| View | GET | POST | PUT/PATCH | DELETE |
|------|-----|------|-----------|--------|
| All the `ListCreateAPIView`s | 200 (the list) | 201 (created) | — | — |
| All the `RetrieveUpdateDestroyAPIView`s | 200 | — | 200 | 204 |
| `HealthView` | 200 `{"status":"ok","db":true}` / **503** `{"status":"degraded","db":false}` | — | — | — |
| `VerifySecretView` | — | 200 `{"allowed": true|false}` | — | — |
| `SecretMetaView` | 200 `{"gate_length":4,"sidebar_length":4}` | — | — | — |
| `GoalDayToggleAPIView` | — | — | 200 (the whole goal) / 404 | — |
| `ChallengeMarkDayAPIView` | — | 200 `{"date","completed","stats"}` / 400 (not a days challenge / no editable day) | — | — |
| `ChallengeInstantStatusAPIView` | — | — | 200 (the challenge) / 400 (not an instant challenge) | — |
| `PDFDownloadView` | 200 the PDF bytes / 404 | — | — | — |
| `BlogImageUploadAPIView` | — | 201 `{"url","name"}` | — | — |
| `BlogPostLikeAPIView` | — | 200 `{"id","likes"}` | — | — |
| `BlogPostViewAPIView` | — | 200 `{"id","views"}` | — | — |
| `BlogPostStatsAPIView` | 200 `{total,published,drafts,views,likes}` | — | — | — |

**The `verify-secret` branches (☰ the 3 secret fields)**

| `field` | Compared against | Result |
|---------|------------------|--------|
| `gate` | `AboutMe.base_secret_code` | `allowed = (value == code)` |
| `sidebar` | `AboutMe.sidebar_code` | `allowed = (value == code)` |
| `dream` | `AboutMe.portal_dream` | `allowed = (value == code)` |
| anything else | — | `allowed = False` |

If there is **no `AboutMe` record** at all → `{"allowed": false}` (200).

**`BlogPostLikeAPIView` branches:** the body key is `like`; the values `'false'`, `'0'`, `'no'` (any case) mean un-like; the like count never drops below 0.

---

---

## 7. Option reference — all choices in one place

> Every dropdown, chip row, tab, picker and enum in the project, with the exact values.

### 7.1 The mobile menu (13 routes)

`src/navigation/routes.jsx` → `ROUTES`

| key | label | caption | group | icon |
|-----|-------|---------|-------|------|
| `home` | Home | Your landing page | Start | `home` |
| `myday` | My Day | Plan and log today | Everyday | `sun` |
| `chronos` | Chronos | Task flow by day | Everyday | `clock` |
| `goals` | Goals | Daily streaks | Everyday | `target` |
| `challenge` | Challenges | Track a challenge | Everyday | `award` |
| `notes` | Notes | Markdown node matrix | Write | `file-text` |
| `blog` | Blog | Write and publish | Write | `edit-2` |
| `gesture` | Gesture Draw | Sketch ideas | Write | `pen-tool` |
| `archive` | Archive | Everything saved | Write | `archive` |
| `music` | Music Vibes | Listen and log | Life | `music` |
| `hobbies` | Hobbies | What you build | Life | `heart` |
| `wishlist` | Wishlist | Things to get | Life | `star` |
| `watchlist` | Watchlist | Shows and films | Life | `tv` |

### 7.2 Moods (day logs — mobile + web + backend)

| Mood | bg | fg |
|------|----|----|
| Happy | `#d1f0e0` | `#1a5c36` |
| Okay | `#fde9cc` | `#7a4010` |
| Neutral | `#e8e2d8` | `#5a4f40` |
| Sad | `#d5e8f7` | `#1e3f6a` |
| Wired | `#fce8e8` | `#8b1a1a` |
| Tired | `#eaedf2` | `#374050` |

The backend also has a **`Faded`** watchlist status (`('Faded','faded')`) that the mobile app does **not** expose in its picker.

### 7.3 Image sources

| Value | Where | Meaning |
|-------|-------|---------|
| `local` | DayLog / ScrapbookStamp | A file uploaded from the device |
| `remote` | DayLog / ScrapbookStamp | A URL the server downloads |

### 7.4 Watchlist options

**Type:** `drama`, `movie`, `anime`, `book`, `manga`
**Status:** `Watching`, `Completed`, `Plan to Watch`, `On Hold`, `Dropped` (+ `Faded` in the backend only)
**Genre (15):** `Bromance`, `BL`, `Crime`, `Detective`, `Thriller`, `Romance`, `Action`, `Drama`, `Fantasy`, `Horror`, `Historical`, `Adventure`, `Sci-Fi`, `Comedy`, `Sad`
**Sort:** `default`, `title-az`, `title-za`

### 7.5 Challenge options

| Group | Values |
|-------|--------|
| Type | `days` ("Days challenge"), `instant` ("Instant challenge") |
| Instant status | `completed` (Completed), `not_completed` (Not done), `pending` (Pending) |
| Day-cell status | `completed`, `missed`, `today`, `upcoming` |
| Stats tiles | Done, Missed, Remaining, Best streak, Complete |
| Backend `Challenge.status` | `ongoing`, `ended` |

### 7.6 Blog options

| Group | Values |
|-------|--------|
| Status filter | `all` (All), `published` (Published), `draft` (Drafts) |
| Editor status | `draft` (Draft), `published` (Published) |
| Sort | `newest` (Newest), `oldest` (Oldest), `popular` (Most viewed), `liked` (Most liked), `title` (Title A–Z) |
| Editor tabs | `write` (Write), `preview` (Preview) |
| Markdown toolbar | B, I, H, •, ❝, `</>`, Link, Insert image |
| Markdown toolbar (web) | Bold, Italic, Heading, Bullet list, Quote, Inline code, Link, Insert image |
| Delete modal | Cancel, Delete |

### 7.7 Notes options

| Group | Values |
|-------|--------|
| Filter chips | `all` (All Notes), `pinned` (Pinned) |
| Context menu (mobile long-press / web right-click) | Open, Duplicate, Copy, Download as PDF, Pin note / Unpin note, Delete note |
| Editor toolbar | Copy, PDF, Pin / Pinned, Duplicate, Delete |
| Delete modal | Cancel, Delete |

### 7.8 Music / drawing / archive options

| Group | Values |
|-------|--------|
| Music colour presets | `#10b981`, `#6366f1`, `#f43f5e`, `#f59e0b`, `#0ea5e9`, `#a855f7`, `#2d6a4f`, `#ec4899` |
| Music default colour | `#10b981` |
| Drawing colours | `#1a1a2e` Dark, `#185FA5` Blue, `#0F6E56` Teal, `#993C1D` Coral, `#993556` Pink |
| Drawing sizes | `2` thin, `3` mid, `6` thick |
| Archive source chips | `local` (Local Upload), `remote` (Remote URL) |

### 7.9 Project / Professional Development options

| Group | Values |
|-------|--------|
| Project type | `solo` (Solo), `group` (Group), `academic` (Academic), `open_source` (Open Source) |
| PD type | `Mentorship`, `Internship`, `Course`, `Fellowship`, `Session`, `Online Course`, `Online Badges`, `Online Fellowship` |

### 7.10 Web-only option groups

| Group | Values |
|-------|--------|
| Sidebar sections | 16 ids (see §5.2) + "🔒 Lock Sidebar" |
| PIN pad keys | `1 2 3 4 5 6 7 8 9 clear 0 back` |
| Secret fields | `gate` (base_secret_code), `sidebar` (sidebar_code), `dream` (portal_dream) |

---

## 8. Variables reference — the glossary

> The state variables that drive a branch, grouped by file.

| File | Variable | Type | What it decides |
|------|----------|------|-----------------|
| `App.js` | `booted` | bool | Splash vs. the app |
| `App.js` | `splashDone` | bool | The 1400ms minimum |
| `App.js` | `drawerOpen` | bool | The drawer overlay |
| `App.js` | `activeKey` | string | Which route is on screen |
| `App.js` | `openRef`, `keyRef` | refs | Live mirrors so the BackHandler never reads a stale value |
| `App.js` | `ACCEPTS_BACK` | Set | Which screens get an `onBack` prop (`blog`, `watchlist`) |
| `routes.jsx` | `ROUTES` / `ROUTE_MAP` / `GROUPS` | consts | The whole menu |
| `Drawer.jsx` | `open`, `mounted`, `x` | state/ref | The panel position and whether it is rendered |
| `Drawer.jsx` | `W`, `EDGE`, `VELOCITY` | consts | The panel width, the edge zone, the flick threshold |
| `HomeScreen.jsx` | `cols`, `compact`, `wide` | derived | The 1/2/3-column grid and the phone/tablet layouts |
| `Mydaylogpage.jsx` | `entries`, `activeId`, `pickedFile`, `isEditing` | state | The masonry, the open card, local vs remote image, POST vs PUT |
| `Chronostaskflow.jsx` | `allTasks`, `dateInput`, `pageIndex` | state | The timeline columns, the new task's date, the dot pager |
| `Goalsscreen.jsx` | `goals`, `filter`-less, `editingId`, `savingId`, `togglingDay` | state | The goal cards, the inline editor, the busy flags |
| `Challengetrackerscreen.jsx` | `challenges`, `mode`(`showForm`/`editingChallenge`), `badgeData` | state | The ONGOING/ENDED split, the form, the badge capture |
| `Notes.jsx` | `selectedId` (`null`/`'draft'`/number), `content`, `saveStatus`, `filter`, `pinned`, `menuNote` | state | The editor pane, the autosave, the filter, the pin set, the long-press menu |
| `Blogscreen.jsx` | `mode` (`null`/`new`/`edit`/`view`), `tab`, `form`, `dirty`, `coverFile`, `removeCover`, `liked` | state | The list↔editor switch, Write/Preview, the post form, the unsaved-changes guard, the cover, the like set |
| `Archivescreen.jsx` | `stamps`, `modal`, `editing`, `form`, `previewIndex`, `downloadingId` | state | The masonry, the form modal, the lightbox, the gallery save |
| `Gesturedraw.jsx` | `strokeColor`, `strokeSize`, `showPoints`, `showHint`, `lastStrokePts`, `scrollOn`, `canvasSize` | state | The drawing style, the debug overlay, the hint, the scroll lock |
| `Musicvibes.jsx` | `vibes`, `isCreating`, `newForm`, `editId`, `editForm`, `creating`, `saving`, `deletingId` | state | The grid, the create panel, the inline editor, the busy flags |
| `Hobbiesscreen.jsx` | `hobbies`, `isCreating`, `editingId`, `openId` | state | The accordion, the create panel, the inline editor, which item is open |
| `Wishlist.jsx` | `wishes`, `isCreating`, `editingId`, `creating`, `updating` | state | The grid, the create panel, the inline editor |
| `Watchlistscreen.jsx` | `items`, `tab`, `statusTab`, `search`, `sort`, `modal`, `editItem`, `delTarget`, `showInfo` | state | The two filter rows, the search, the sort, the three modals |
| `web MyArea.jsx` | `sidebarOpen`, `sidebarRendered`, `activeSection`, `showSidebarPin` | state | The sidebar, the PIN modal, which page is shown |
| `web Notes.jsx` | `selectedId`, `contextMenu`, `filter`, `pinned` | state | The editor pane, the right-click menu, the filter, the pin set |
| `web Blog.jsx` | `mode`, `activeTab`, `form`, `dirty`, `coverFile`, `coverPreview`, `removeCover`, `liked` | state | The list↔editor switch, Write/Preview, the form, the unsaved guard, the cover, the like set |
| `backend models.py` | `Choice` tuples | — | Every enum in §7 |

---

## 9. Dead / unwired code

| File / symbol | Status | Notes |
|---------------|--------|-------|
| `src/components/Pdfmanager.jsx` | ⚠ **Empty file (0 bytes)** | The mobile "PDF Manager" does not exist, although the backend has `/api/pdfs/` and the web app has a working `PdfChecker.jsx` |
| `src/screens/WebsiteShell.jsx` | ⚠ **Not referenced anywhere** | It is a complete WebView wrapper (with `EXPO_PUBLIC_APP_URL` setup, error/retry overlays) but `routes.jsx` never imports it. `EXPO_PUBLIC_APP_URL` in `.env` therefore does nothing today. |
| `backend/api/tests.py` | Empty (2 lines) | No tests exist |
| `backend/api/admin.py` | Present (187 lines) | Registers the models in the Django admin |
| `web/dist/` | A build artifact | The deployed web build |
| `src/components/Notes.jsx` ↔ `web/.../Notes.jsx` | Duplicated logic | The two Notes screens are near-copies; the same is true for Goals, Hobbies, Wishlist, Watchlist, Music, Challenges, Blog, Archive/Gallery, TodoArea/Chronostaskflow, Tellme/Mydaylogpage, GestureDraw/Gesturedraw. **A change to one is usually needed in the other.** |

**Known inconsistencies flagged in `PROMPTS.md`**

| Issue | Detail |
|-------|--------|
| ISSUE 1 — not adaptive | Several screens use `useWindowDimensions()` *inside* reusable components (the guidance says take the size from the parent). `HomeScreen` has breakpoints but the grid is not fully fluid. |
| ISSUE 2 — tokens are not consistent | `PROMPTS.md` asks for `src/theme/tokens.ts` with `useTokens()`, `space.*`, `uiRadius.*`, `uiType.*`. The project still uses `src/theme.js` with the `C` object and hard-codes hex values in several screens. |

**Other gotchas found while mapping**

| Where | Gotcha |
|-------|---------|
| `App.js` | `const ready = fontsLoaded && splashDone;` is computed but **never used** — the real gate is `booted`. |
| `Watchlistscreen.jsx` | The error banner renders only when `!modal`, so an error raised inside the modal is invisible on the main screen. |
| `Wishlist.jsx` | The delete-failure message is the literal string **"Delete failed. Do you see that?? I told you."** |
| `settings.py` | `STATIC_URL` is assigned twice; the second (`'static/'`, without a leading slash) wins. |
| `settings.py` | No `DEFAULT_PERMISSION_CLASSES` → **every API endpoint is publicly readable and writable.** |
| `backend/api/serializers.py` | `OperativeNoteSerializer` rejects any note whose text contains `abstr:premature` or `struct:pre`. |
| `Notes.jsx` (both) | The mobile version persists pins to AsyncStorage `notes:pinned-ids`; the web version to localStorage `notes:pinned-ids` — the same key name, different stores. |

---

## 10. Where do I change X?

| I want to change… | Mobile file | Web file | Backend file |
|-------------------|-------------|----------|--------------|
| The app name / icon / splash | `app.json`, `assets/` | `web/index.html`, `web/public/` | — |
| The colours | `src/theme.js` (`C`) | each component's `C` object | — |
| The menu (add/remove a screen) | `src/navigation/routes.jsx` | `web/.../MyArea.jsx` (`SECTIONS` + `SectionPage`) | — |
| The launcher icon | `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` + `assets/android-icon-*` | — | — |
| The splash screen | `src/components/AppSplash.jsx` + `app.json` (`expo-splash-screen` plugin) | `web/index.html` (the `#boot` block) | — |
| The home dashboard | `src/screens/HomeScreen.jsx` | `web/.../MyArea.jsx` (the hero) | — |
| A new API field | the screen's form + payload | the same screen's form + payload | `models.py` + `serializers.py` + a migration |
| A new option value | the screen's constant | the same screen's constant | the model's `choices` + a migration |
| A validation message | — | — | `serializers.py` `validate_*` |
| The list filters | the screen's fetch function | the same | the view's `get_queryset` |
| The API base URL | `.env` (`EXPO_PUBLIC_API_URL`) | `web/.env` (`VITE_API_URL`) | — |
| The dark-mode / theming | `src/theme.js` | each component's `C` | — |
| The secret PIN logic | — | `web/.../MyArea.jsx` | `views.py` (`VerifySecretView`) + `models.py` (`AboutMe`) |

---

## Appendix — the fastest way to self-check

1. **"What can I reach from the home screen?"** → §2 (the runtime tree) + §7.1.
2. **"What does this screen do in every situation?"** → §4 / §5 for the file, then the "Branches / ways" table.
3. **"What are the choices?"** → §7.
4. **"What does this variable mean?"** → §8.
5. **"What breaks if I change this?"** → §9 (the mobile/web duplication is the biggest trap).
6. **"Where does the data live?"** → §6.3 (the routes) and §6.4 (the models).

---

*End of document.*

