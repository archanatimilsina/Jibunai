/**
 * System preferences — which systems this device shows.
 *
 * Local-only (AsyncStorage `jibunai:systems:v1`): no backend, works offline,
 * per-device like everything else personal in this app.
 *
 *   { enabled: ['notes', ...], onboarded: true }
 *
 * Removing a system only hides it here — server data is untouched, so
 * re-adding restores everything after a sync.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SYSTEMS } from './catalog';

const PREFS_KEY = 'jibunai:systems:v1';

const defaultEnabled = () => SYSTEMS.filter((s) => s.defaultEnabled !== false).map((s) => s.key);

let state = { enabled: defaultEnabled(), onboarded: false, ready: false };
let loadPromise = null;
const listeners = new Set();

const snapshot = () => ({ ...state, enabled: [...state.enabled] });

const notify = () => {
  const snap = snapshot();
  listeners.forEach((cb) => {
    try {
      cb(snap);
    } catch {
      /* ignore */
    }
  });
};

async function persist() {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ enabled: state.enabled, onboarded: state.onboarded }));
  } catch {
    /* storage unavailable — the in-memory choice still applies this session */
  }
  notify();
}

export async function loadSystems() {
  if (state.ready) return snapshot();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const known = new Set(SYSTEMS.map((s) => s.key));
        const enabled = Array.isArray(parsed.enabled)
          ? parsed.enabled.filter((k) => known.has(k))
          : defaultEnabled();
        state = { enabled, onboarded: !!parsed.onboarded, ready: true };
      } else {
        state = { enabled: defaultEnabled(), onboarded: false, ready: true };
      }
    } catch {
      state = { enabled: defaultEnabled(), onboarded: false, ready: true };
    }
    notify();
    return snapshot();
  })();
  return loadPromise;
}

export function subscribeSystems(listener) {
  listeners.add(listener);
  loadSystems().then(() => listener(snapshot()));
  return () => listeners.delete(listener);
}

export function getSystemsSync() {
  return snapshot();
}

export function isSystemEnabled(key) {
  return state.enabled.includes(key);
}

export async function setSystemEnabled(key, on) {
  await loadSystems();
  const next = on
    ? [...new Set([...state.enabled, key])]
    : state.enabled.filter((k) => k !== key);
  state = { ...state, enabled: next };
  await persist();
}

/** First-run choice: replaces the whole set and marks onboarding done. */
export async function completeOnboarding(enabledKeys) {
  await loadSystems();
  const known = new Set(SYSTEMS.map((s) => s.key));
  state = {
    enabled: (enabledKeys || []).filter((k) => known.has(k)),
    onboarded: true,
    ready: true,
  };
  await persist();
}

export async function resetSystems() {
  state = { enabled: defaultEnabled(), onboarded: false, ready: true };
  await persist();
}

export function useSystems() {
  const [snap, setSnap] = useState(snapshot);
  useEffect(() => subscribeSystems(setSnap), []);
  return {
    ...snap,
    isEnabled: (key) => snap.enabled.includes(key),
    setEnabled: (key, on) => setSystemEnabled(key, on),
  };
}
