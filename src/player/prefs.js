/**
 * Player preferences — covers, favorites, metadata overrides, resume point.
 * Local-only (`jibunai:player:v1`): the device is the library.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'jibunai:player:v1';

const empty = () => ({ covers: {}, favorites: [], meta: {}, last: null });

let state = empty();
let loaded = false;
let loadPromise = null;
const listeners = new Set();

const snap = () => ({ ...state, covers: { ...state.covers }, favorites: [...state.favorites], meta: { ...state.meta } });

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

async function persist() {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* in-memory copy still drives this session */
  }
  notify();
}

export async function loadPlayerPrefs() {
  if (loaded) return snap();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        state = {
          covers: p.covers || {},
          favorites: Array.isArray(p.favorites) ? p.favorites : [],
          meta: p.meta || {},
          last: p.last || null,
        };
      }
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

export function usePlayerPrefs() {
  const [s, setS] = useState(snap);
  useEffect(() => subscribePlayerPrefs(setS), []);
  return s;
}
