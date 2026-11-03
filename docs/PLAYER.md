# Music Player system

Every song on the device, with full controls — all local, all offline.

## What it does
- **Library** — title/artist/album/duration/artwork from the OS
  (`expo-music-library`), permission flow, background refresh, change listener.
- **Transport** — play/pause, next/previous, seek bar, ±10s skip, shuffle,
  repeat off/all/one, 1x–2x speed, sleep timer.
- **Sorting (the good kind)** — title / artist / album / duration / date-added,
  each asc/desc, plus search, artist filter, favorites-only, shuffle-all.
- **Covers** — per-track image upload (staged persistently, shown in list +
  now playing + mini-player); embedded artwork used when present, initial tile
  otherwise. Filenames like `Artist - Title.mp3` are parsed when tags are missing.
- **Extras** — favorites, resume-where-you-left-off, global mini-player on
  every screen except the player, OS change listener refresh.

## How it connects
| File | Job |
|---|---|
| `src/player/library.js` | Permissions, indexed load, track normalization |
| `src/player/prefs.js` | `jibunai:player:v1` covers/favorites/resume + hook |
| `src/player/sort.js` | Sort fields, search, filters, duration format |
| `src/player/engine.js` | Session playback singleton (queue, repeat, sleep, resume) |
| `src/screens/PlayerScreen.jsx` | Library, sorting sheet, now playing, queue |
| `src/components/MiniPlayer.jsx` | Global mini-player in `AppShell` |

One `AudioPlayer` (`useAudioPlayer()`) is created in `AppShell` and handed to
the engine, so music survives navigation. No backend: the device is the library.

## Verify
```bash
node --check src/player/*.js
```
Logic tests: metadata + filename parsing, unplayable skip, all sort
field/direction combos, search/artist filters, artist list, durations, cover +
favorite + resume prefs.
