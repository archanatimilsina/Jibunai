/**
 * Player preferences — local-only (`jibunai:player:v1`).
 * Covers, favorites, metadata overrides, resume point, plus everything the
 * 15-point music spec needs: settings (min duration, excluded folders),
 * per-screen sort memory, play counts, recent searches, playlists, sleep,
 * per-track speed, EQ state, and privacy/output toggles.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'jibunai:player:v1';

const empty = () => ({
  covers: {},
  favorites: [],
  meta: {},
  last: null, // { trackId, position }
  queue: null, // { ids, index } — restored across restarts
  settings: {
    minDuration: 30, // seconds; skip ringtones/voice notes
    excludedFolders: [], // e.g. ['WhatsApp Audio', 'Recordings']
    shuffle: false,
    repeat: 'off',
    sleepMinutes: 0,
    sleepEndOfSong: false,
    hideArtOnLock: false,
    pauseOnDisconnect: true,
    resumeOnReconnect: false,
    autoplayDevice: '',
    perTrackSpeed: false,
  },
  sort: {}, // per-screen: { songs: {field,dir}, albums: ..., artists: ... }
  playCounts: {}, // trackId -> plays
  lastPlayed: {}, // trackId -> timestamp
  recentSearches: [],
  playlists: [], // { id, name, trackIds, created }
  speeds: {}, // trackId -> rate
  eq: {
    enabled: false,
    preset: 'Flat',
    bands: [0, 0, 0, 0, 0],
    bassBoost: 0,
    virtualizer: 0,
    loudness: 0,
  },
});

const migrate = (p) => {
  const base = empty();
  if (!p || typeof p !== 'object') return base;
  return {
    ...base,
    ...p,
    settings: { ...base.settings, ...(p.settings || {}) },
    sort: p.sort || {},
    playCounts: p.playCounts || {},
    lastPlayed: p.lastPlayed || {},
    recentSearches: Array.isArray(p.recentSearches) ? p.recentSearches : [],
    playlists: Array.isArray(p.playlists) ? p.playlists : [],
    speeds: p.speeds || {},
    eq: { ...base.eq, ...(p.eq || {}) },
    covers: p.covers || {},
    favorites: Array.isArray(p.favorites) ? p.favorites : [],
    meta: p.meta || {},
    last: p.last || null,
    queue: p.queue || null,
  };
};

let state = empty();
let loaded = false;
let loadPromise = null;
const listeners = new Set();

const snap = () => ({
  ...state,
  covers: { ...state.covers },
  favorites: [...state.favorites],
  meta: { ...state.meta },
  settings: { ...state.settings },
  sort: { ...state.sort },
  playCounts: { ...state.playCounts },
  lastPlayed: { ...state.lastPlayed },
  recentSearches: [...state.recentSearches],
  playlists: state.playlists.map((p) => ({ ...p, trackIds: [...p.trackIds] })),
  speeds: { ...state.speeds },
  eq: { ...state.eq, bands: [...state.eq.bands] },
});

const notify = () => {
  const s = snap();
  listeners.forEach((cb) => {
    try {
      cb(s);
    } catch {
      /* ignore */
    }
  });
};

async function persist(notifyFirst = true) {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* in-memory copy still drives this session */
  }
  if (notifyFirst) notify();
}

export async function loadPlayerPrefs() {
  if (loaded) return snap();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      if (raw) state = migrate(JSON.parse(raw));
    } catch {
      state = empty();
    }
    loaded = true;
    return snap();
  })();
  return loadPromise;
}

export function subscribePlayerPrefs(listener) {
  listeners.add(listener);
  loadPlayerPrefs().then(() => listener(snap()));
  return () => listeners.delete(listener);
}

export function getPlayerPrefs() {
  return snap();
}

export async function setCover(trackId, uri) {
  await loadPlayerPrefs();
  state = { ...state, covers: { ...state.covers, [trackId]: uri } };
  await persist();
}

export async function removeCover(trackId) {
  await loadPlayerPrefs();
  const covers = { ...state.covers };
  delete covers[trackId];
  state = { ...state, covers };
  await persist();
}

export async function toggleFavorite(trackId) {
  await loadPlayerPrefs();
  const has = state.favorites.includes(trackId);
  state = {
    ...state,
    favorites: has ? state.favorites.filter((id) => id !== trackId) : [...state.favorites, trackId],
  };
  await persist();
  return !has;
}

export async function setMetaOverride(trackId, patch) {
  await loadPlayerPrefs();
  state = { ...state, meta: { ...state.meta, [trackId]: { ...(state.meta[trackId] || {}), ...patch } } };
  await persist();
}

export async function saveResume(trackId, position) {
  await loadPlayerPrefs();
  state = { ...state, last: trackId ? { trackId, position: Math.max(0, Math.floor(position || 0)) } : null };
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* resume point is best-effort */
  }
}

export async function saveQueue(ids, index) {
  await loadPlayerPrefs();
  state = { ...state, queue: { ids: [...(ids || [])], index } };
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* best-effort */
  }
}

export async function saveSettings(patch) {
  await loadPlayerPrefs();
  state = { ...state, settings: { ...state.settings, ...patch } };
  await persist();
}

export async function saveSort(screen, sort) {
  await loadPlayerPrefs();
  state = { ...state, sort: { ...state.sort, [screen]: { ...sort } } };
  await persist();
}

export async function bumpPlayCount(trackId) {
  await loadPlayerPrefs();
  const now = Date.now();
  state = {
    ...state,
    playCounts: { ...state.playCounts, [trackId]: (state.playCounts[trackId] || 0) + 1 },
    lastPlayed: { ...state.lastPlayed, [trackId]: now },
  };
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  notify();
}

export async function addRecentSearch(q) {
  const query = String(q || '').trim();
  if (!query) return;
  await loadPlayerPrefs();
  const next = [query, ...state.recentSearches.filter((s) => s.toLowerCase() !== query.toLowerCase())].slice(0, 10);
  state = { ...state, recentSearches: next };
  await persist();
}

export async function clearRecentSearches() {
  await loadPlayerPrefs();
  state = { ...state, recentSearches: [] };
  await persist();
}

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export async function createPlaylist(name, trackIds = []) {
  await loadPlayerPrefs();
  const pl = { id: uid(), name: String(name || 'Playlist').slice(0, 60) || 'Playlist', trackIds: [...trackIds], created: Date.now() };
  state = { ...state, playlists: [...state.playlists, pl] };
  await persist();
  return pl;
}

export async function renamePlaylist(id, name) {
  await loadPlayerPrefs();
  state = {
    ...state,
    playlists: state.playlists.map((p) => (p.id === id ? { ...p, name: String(name || p.name).slice(0, 60) } : p)),
  };
  await persist();
}

export async function deletePlaylist(id) {
  await loadPlayerPrefs();
  state = { ...state, playlists: state.playlists.filter((p) => p.id !== id) };
  await persist();
}

export async function addToPlaylist(id, trackIds) {
  await loadPlayerPrefs();
  const incoming = [...new Set((trackIds || []).map(String))];
  let added = 0;
  let dupes = 0;
  state = {
    ...state,
    playlists: state.playlists.map((p) => {
      if (p.id !== id) return p;
      const have = new Set(p.trackIds);
      const fresh = incoming.filter((t) => !have.has(t));
      added = fresh.length;
      dupes = incoming.length - fresh.length;
      return { ...p, trackIds: [...p.trackIds, ...fresh] };
    }),
  };
  await persist();
  return { added, dupes };
}

export async function removeFromPlaylist(id, trackId) {
  await loadPlayerPrefs();
  state = {
    ...state,
    playlists: state.playlists.map((p) => (p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p)),
  };
  await persist();
}

export async function reorderPlaylist(id, from, to) {
  await loadPlayerPrefs();
  state = {
    ...state,
    playlists: state.playlists.map((p) => {
      if (p.id !== id) return p;
      const arr = [...p.trackIds];
      if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return p;
      const [m] = arr.splice(from, 1);
      arr.splice(to, 0, m);
      return { ...p, trackIds: arr };
    }),
  };
  await persist();
}

export async function saveTrackSpeed(trackId, rate) {
  await loadPlayerPrefs();
  state = { ...state, speeds: { ...state.speeds, [trackId]: rate } };
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export async function saveEq(patch) {
  await loadPlayerPrefs();
  state = { ...state, eq: { ...state.eq, ...patch } };
  await persist();
}

export function usePlayerPrefs() {
  const [s, setS] = useState(snap);
  useEffect(() => subscribePlayerPrefs(setS), []);
  return s;
}
