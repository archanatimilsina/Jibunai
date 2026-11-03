# Systems — choose, add, remove (with safe data handling)

## What it is
The app is a set of 15 toggleable systems (My Day, Chronos, Goals, Challenges,
Notes, Blog, Gesture Draw, Archive, Music, Hobbies, Wishlist, Watchlist, Alarm,
Date Keeper, Music Player).
The user picks them once after registration and can change the mix anytime in
Settings. Removing a system never deletes data.

## Files
| File | Job |
|---|---|
| `src/systems/catalog.js` | System definitions: routes, resource keys, local/storage keys |
| `src/systems/prefs.js` | `jibunai:systems:v1` prefs + `useSystems()` hook |
| `src/systems/exporter.js` | `systemDataCount()` + `buildSystemExport()` + `exportSystemData()` |
| `src/screens/SystemPickerScreen.jsx` | First-run picker (shown when `onboarded == false`) |
| `src/screens/SettingsScreen.jsx` | Settings → add/remove with Export / Remove / Cancel flow |

## Rules
- **No backend.** Choices are per-device `AsyncStorage`, offline-capable.
- **Removal hides locally only.** Server data is untouched; re-adding syncs it back.
- **Export** reads server data when online, the on-device cache when offline;
  Gesture Draw strokes (local-only) are read from `AsyncStorage`. The JSON file
  is shared via the OS share sheet (`jibunai-<system>-<date>.json`).
- **Menu follows choice.** WheelNav filters `ROUTE_META` through
  `systemForRoute()`; home + settings always show. `AppShell.navigate()`
  refuses disabled routes and an effect falls home if the open screen's
  system is turned off. Home hides `TodaysTasks` when Chronos is off.

## Adding a future system (e.g. Alarm, Date-keeper)
1. Build its screen + route as usual.
2. Add one entry to `SYSTEMS` in `catalog.js` (routes + resource/storage keys).
3. Done — picker, settings, wheel, guards, export all follow the catalog.

## Verify
```bash
node --check src/systems/*.js
npx esbuild App.js --loader:.js=jsx --jsx=automatic --outdir=/tmp/check --log-level=error
```
Logic tests: catalog ownership (12 systems, every route owned, home/settings
free), prefs defaults/toggle/onboarding/unknown-key filtering, exporter empty
count + payload shape.
