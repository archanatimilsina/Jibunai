/**
 * Keeps the cache warm while the app is in use.
 *
 * - warms the memory tier from disk while the splash screen is up
 * - revalidates expired resources every 45 s while the app is foregrounded
 * - revalidates everything stale when the app comes back to the foreground
 *
 * Backgrounding the app pauses the timer, so nothing polls in the background.
 */
import { AppState } from 'react-native';

import { preloadCache, refreshAll, refreshStale } from './cache';

const POLL_INTERVAL = 45_000;

let started = false;
let timer = null;
let appStateSub = null;

const stopTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

const startTimer = () => {
  if (timer) return;
  timer = setInterval(() => {
    refreshStale();
  }, POLL_INTERVAL);
};

export function startCacheLifecycle() {
  if (started) return;
  started = true;

  // warm the cache from disk (safe to call before the UI mounts)
  preloadCache().catch(() => {});

  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      // coming back to the app: catch up on anything that changed elsewhere
      refreshStale();
      startTimer();
    } else {
      stopTimer();
    }
  });

  if (AppState.currentState === 'active') startTimer();
}

export function stopCacheLifecycle() {
  stopTimer();
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  started = false;
}

export { refreshAll };
