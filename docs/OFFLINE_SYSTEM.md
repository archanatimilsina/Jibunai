# Offline-first system

Every screen works with no connection: full history stays visible, and
create / read / update / delete all work offline and sync later.

## How it works

| Layer | File | Job |
|---|---|---|
| Read cache | `src/api/cache.js` + `cacheStore.js` | stale-while-revalidate, disk-persisted. History is always visible offline. |
| Connectivity | `src/api/connectivity.js` | NetInfo (if installed) + a backend reachability probe. `useOnlineStatus()` hook. |
| Outbox | `src/api/outbox.js` | Persistent FIFO queue (`jibunai:outbox:v1`). Survives restarts. |
| Sync engine | `src/api/syncEngine.js` | Replays the outbox in order when online; reconciles responses into the cache. Started in `App.js`. |
| Write helper | `src/api/offlineSend.js` | `apiSendOffline()` — tries the network, queues on retryable failure (offline, timeout, abort, 5xx, 408/429). Validation errors (other 4xx) are never queued. |
| Screen hook | `src/hooks/useOfflineCollection.js` | `useOfflineCollection(key, { createPath, itemPath })` — drop-in replacement for `useCachedResource` + `apiSend`, adds `create / update / remove / runCustom`, `pending`, `isOnline`, `sync`. |
| Status UI | `src/components/SyncBanner.jsx` | Global pill: offline state + pending count + manual retry. Mounted in `AppShell`. |
| Secrets | `src/api/secureStore.js` + `AuthContext` | Auth token in SecureStore (Keychain/Keystore), never in plain storage. Legacy tokens auto-migrate. |
| Reminders | `src/notifications/reminders.js` | OS-scheduled local notifications — fire offline, after reboot (`rescheduleOnBoot()` runs at startup). |
| Layout | `src/utils/responsive.js` | Shared breakpoints (`useAdaptive()`) so screens stay usable on any phone/tablet. |

### Offline write flow

1. Screen calls `create/update/remove` → cache updates instantly (optimistic).
2. Hook tries the API. Success → cache reconciled with the server object.
3. Retryable failure → op appended to the outbox, item keeps a `_pending` flag.
4. `SyncBanner` shows `N to sync`; engine replays FIFO on reconnect / app-start.
5. New items get temp ids (`local-…`): edits merge into the queued POST, deleting
   drops the queued POST — the server never sees an unresolvable reference.

### Migrated screens (all offline)

- `Notes.jsx` — autosave + draft serialization over the outbox.
- `Goalsscreen.jsx` — CRUD + nested day toggles via `runCustom`.
- `Wishlist.jsx`, `Watchlistscreen.jsx` — CRUD via `useOfflineCollection`
  (`updateMethod: 'PUT'` where the API needs full replace).
- `Hobbiesscreen.jsx`, `Musicvibes.jsx` — CRUD via `useOfflineCollection`.
- `Chronostaskflow.jsx` + `TodaysTasks.jsx` — shared `tasks` key; batch
  day-delete loops `remove()` per task (each op queues independently).
- `Challengetrackerscreen.jsx` — CRUD + `mark-day` / `instant-status` via
  `runCustom` with optimistic updaters.
- `Archivescreen.jsx`, `Mydaylogpage.jsx` — text + image writes via
  `createWithFile` / `updateWithFile`: picked images are staged into
  persistent storage (`src/api/fileQueue.js`), previewed instantly, uploaded
  now when online, or queued and uploaded by the sync engine on replay.
- `Blogscreen.jsx` — custom offline layer: saves (JSON or cover-upload),
  deletes, likes and comments all queue with `resourceKey: 'blogPosts'` /
  `'blogComments'`; the list/stats/open post auto-refresh when the blog queue
  drains. Only inline story-image upload stays online-only (it has no post to
  attach to offline) and shows a clear message.

### Migrating a new screen (mechanical, ~10 lines)

```diff
-import useCachedResource from '../hooks/useCachedResource';
-import { apiSend } from '../api/http';
-import { fetchResource, TTL } from '../api/resources';
+import useOfflineCollection from '../hooks/useOfflineCollection';
+import { TTL } from '../api/resources';

-const { data: items, mutate, ...rest } = useCachedResource('wishes', () => fetchResource('wishes'), { ttl: TTL.STATIC, initial: [] });
+const { items, create, update, remove, isOnline, pending, ...rest } = useOfflineCollection('wishes', {
+  ttl: TTL.STATIC, initial: [],
+  createPath: '/wishes/',
+  itemPath: (id) => `/wishes/${id}/`,
+  updateMethod: 'PATCH', // or 'PUT' when the endpoint needs a full replace
+});

-const created = await apiSend('/wishes/', 'POST', payload); mutate(p => [created, ...p]);
+await create(payload);

-const updated = await apiSend(`/wishes/${id}/`, 'PUT', payload); mutate(...);
+await update(id, payload);

-await apiSend(`/wishes/${id}/`, 'DELETE'); mutate(p => p.filter(...));
+await remove(id);
```

Nested actions (goal day-toggles, challenge mark-day, blog likes) use
`runCustom(path, method, body, { updater, targetId })` — see
`Goalsscreen.jsx:toggleDay`. Multipart screens (archive, daylogs, blog
covers) use `createWithFile(fields, { uri, name, type, field })` /
`updateWithFile(...)` — see `Archivescreen.jsx`.

Screens sharing one key (`tasks`: ChronosTaskFlow + TodaysTasks) share one
queue automatically — reuse the same `resourceKey`.

### Uploads offline

`src/api/fileQueue.js` stages picked images into `jibunai-uploads/` (the
ImagePicker cache URI may be purged by the OS). `processOutbox` rebuilds the
FormData from stored fields + staged file and calls `apiUpload`; the staged
copy is deleted after a successful replay. If the staged file is gone at
replay time, the text fields still sync and the entry keeps its local preview
until the image is re-attached.

### Security notes (personal + secret data)

- Auth token: SecureStore only (`WHEN_UNLOCKED_THIS_DEVICE_ONLY` on iOS).
  `http.js` reads it via `secureGet` — no code path touches a plaintext token.
- Pre-auth / secret codes: never stored, never logged (`src/api/auth.js` already
  avoids this; keep it that way).
- Cached lists live in AsyncStorage (device-encrypted when the OS lock is on).
  Full DB encryption (SQLCipher) is the next step if the threat model needs it.
- 401 during sync stops the run and keeps the queue — a bad token never burns
  queued writes; re-login replays them.

### Notifications (offline-capable)

```js
import { scheduleReminder, scheduleRepeatingReminder, cancelReminder, listReminders } from '../notifications/reminders';

// One-time: exact date+time, fires offline
await scheduleReminder({ title: 'Meeting', body: 'Room 2', kind: 'once', date: '2026-11-19T12:30:00' });

// Repeating: 'daily' | 'weekly' | 'monthly' | 'yearly'
await scheduleRepeatingReminder({ title: 'Journal', interval: 'daily', hour: 21, minute: 0 });
await scheduleRepeatingReminder({ title: 'Mom’s birthday', interval: 'yearly', month: 3, day: 14, hour: 9, minute: 0 });
```

Alarm screen (bulk on/off) and date-keeper screen (daily/monthly/yearly) build
on `listReminders()` + `cancelReminder()` + `cancelAllReminders()`. Group
bulk-toggle = cancel + reschedule the group's stored specs.

### Availability / responsiveness

- Cache lifecycle (45 s refresh + foreground revalidate) + sync engine (online
  event + foreground + 15 s retry backoff) = highly available with no polling
  in background.
- Render backend sleeps on free tier: the probe treats wake-up latency as
  offline and queues — first launch after sleep never loses a write.
- New screens: use `useAdaptive()` (`isPhone/isTablet/isWide/columns/pad`)
  instead of ad-hoc breakpoints; keep touch targets ≥ 44 pt and test at 360 px
  and 1024 px widths.

### Verify

```bash
node --check src/api/*.js src/hooks/useOfflineCollection.js src/utils/responsive.js src/notifications/reminders.js
npx esbuild App.js src/components/*.jsx --loader:.js=jsx --jsx=automatic --outdir=/tmp/check --log-level=error
```

Test on device: airplane mode → create/edit/delete in Notes + Goals → counts
show "offline / N to sync" → reconnect → banner drains, server has the data.
Kill + restart mid-queue → outbox replays at startup.
