# Jibunai — Caching Architecture Plan

## Goal
No more "loading everywhere". Data is fetched once, stored as JSON on the device, and
served instantly on later visits — while still staying fresh.

## Current state (problems)
- 11 screens each `fetch()` on mount and show a spinner/skeleton (`Goalsscreen`, `Watchlistscreen`,
  `Notes`, `Chronostaskflow`, `Mydaylogpage`, `Challengetrackerscreen`, `Hobbiesscreen`,
  `Wishlist`, `Musicvibes`, `Archivescreen`, `Blogscreen`).
- Nothing is persisted between launches → cold start = N network round trips.
- `RecentActivity` on Home fires **7 more** requests, duplicating work the screens already do.
- Data written on one screen is invisible on the next until a manual pull-to-refresh.
- Only `AsyncStorage` use today is for two id-lists (`notes:pinned-ids`, `blog:liked-ids`).

## Design
### 1. Two-tier store
- **Memory tier** (`Map`) — synchronous reads, the source of truth for the running app.
- **Disk tier** (AsyncStorage, key `jibunai:cache:<resource>`) — survives restarts.

Entry shape: `{ v, data, fetchedAt, updatedAt }` — JSON only, no `Date` objects
(the API already returns ISO strings, so a JSON round trip is lossless).

### 2. Cache engine (`src/api/cache.js`)
| Concern | Decision |
|---|---|
| Freshness | per-resource **TTL**; fresh = no network at all |
| Stale data | **stale-while-revalidate** — show cached data instantly, refresh in the background |
| Concurrency | one in-flight request per resource key (dedup), later responses never overwrite newer ones (sequence guard) |
| Writes | **optimistic** — cache updated + persisted immediately, server reconciled in the background; on failure the last server snapshot is restored |
| Subscribers | screens subscribe to a resource key → any writer (this device) updates every open screen instantly |
| Offline | network failure keeps the cached data and reports `stale` instead of clearing the screen |
| Storage | entries > 512 KB are memory-only; total capped at 4 MB; oldest entries pruned first (AsyncStorage ≈ 6 MB limit on Android) |
| Secrets | only an allow-list of resources is cached — `aboutme`, `verify-secret`, `secret-meta`, file downloads are never stored |

### 3. React binding (`src/hooks/useCachedResource.js`)
```js
const { data, loading, refreshing, error, stale, refresh, mutate } =
  useCachedResource('goals', fetchGoals, { ttl: 45_000, errorMessage: '…' });
```
- `loading` is only true when there is **nothing to show yet** (cold, never-cached resource).
  With a cache hit the screen renders content on the very first frame.
- `refresh()` = force revalidate (pull-to-refresh).
- `mutate(updater)` = optimistic local write into the cache (persisted + broadcast).

### 4. Freshness orchestration (`src/api/cacheLifecycle.js`)
- App start → `cache.preload()` reads the whole cache into memory while the splash is up.
- App returns to foreground → revalidate every resource whose TTL expired.
- Every 45 s while foregrounded → revalidate stale resources (catches changes made from the
  web app or another device).
- Backgrounded → timers pause (no battery/network drain).

### 5. TTL policy
| Resource | TTL | Why |
|---|---|---|
| goals, tasks, challenges | 30 s | changes often, cheap to refresh |
| notes, day logs | 60 s | edited in place |
| watchlist, hobbies, wishes, music vibes, archive | 5 min | rarely changes |
| blog posts / categories | 2 min | publishing is rare |
| blog stats | 30 s | counters |

### 6. `RecentActivity` rewritten
No longer fetches 7 endpoints. It **derives** the feed from the cached resources and
*requests* any resource that is missing, so opening Home warms the cache for every screen.
Result: opening Home makes the rest of the app instant, and the feed itself needs 0 requests
after the first visit.

## Consequences & mitigations
1. **Stale reads** → short TTLs, background revalidate, foreground revalidate, pull-to-refresh,
   and a "showing saved copy" hint when the network fails.
2. **Optimistic writes diverging from the server** → every mutation is followed by a background
   revalidate; a failed mutation restores the last server-confirmed snapshot.
3. **Clock skew / wrong TTL** → TTLs are conservative; `fetchedAt` is device-local, so a device
   clock jump only causes an extra refresh, never a wrong write.
4. **Storage growth** → per-entry and total size caps + LRU pruning; oversized entries stay in memory only.
5. **Cache corruption** (partial write / bad JSON) → every read is guarded; a corrupt entry is
   dropped and re-fetched.
6. **Two screens writing at once** → single source of truth in the cache; last write wins locally,
   server stays authoritative via revalidation.
7. **Extra background traffic** → revalidation only happens for TTL-expired resources, only while
   the app is foregrounded, and requests are deduplicated.
8. **Memory** → the cache holds parsed lists (a few hundred small objects); far below any concern,
   and the whole cache is bounded by the same size caps.

---

## What was implemented

### New files
| File | Role |
|---|---|
| `src/api/cacheStore.js` | disk + memory tier, size caps, LRU pruning, corrupt-entry guard |
| `src/api/cache.js` | the engine: get/set/mutate/invalidate, subscribe, dedupe, TTL, SWR |
| `src/api/http.js` | `apiGet` / `apiList` / `apiSend` / `apiUpload` with timeouts + error normalisation |
| `src/api/resources.js` | catalogue of cacheable resources + their TTLs |
| `src/api/cacheLifecycle.js` | preload on boot, 45 s foreground poll, refresh on app foreground |
| `src/api/activityKinds.js` | activity groups + their cache sources |
| `src/api/activity.js` | derives the activity feed from the cached resources (no requests) |
| `src/hooks/useCachedResource.js` | React binding (`data`, `loading`, `stale`, `refresh`, `mutate`) |
| `src/hooks/useActivity.js` | reads + warms the activity sources from the cache |

### Converted screens
`Goalsscreen`, `Watchlistscreen`, `Hobbiesscreen`, `Wishlist`, `Musicvibes`, `Archivescreen`,
`Notes`, `Chronostaskflow`, `Mydaylogpage`, `Challengetrackerscreen`, `Blogscreen` — every one of
them now reads through the cache and writes through `mutate` (optimistic + persisted).

### Cache keys
`notes`, `tasks`, `goals`, `challenges`, `watchlist`, `hobbies`, `wishes`, `musicVibes`, `archive`,
`daylogs`, `blogPosts`, `blogPosts:<filters>`, `blogCategories`, `blogStats`

### Tests
`cache-test/test.mjs` + `test2.mjs` (Node, mocked AsyncStorage) cover: first fetch, fresh-cache
short-circuit, request dedupe, stale revalidation, optimistic broadcast, offline fallback,
prefix invalidation, disk round-trip, corrupt-entry recovery, eviction and pruning.
