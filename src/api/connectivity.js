/**
 * Connectivity tracking with a backend-reachability probe.
 *
 * NetInfo alone only tells us the radio is up — the Render backend sleeps on
 * the free tier, so we additionally probe /api/health/: any HTTP response
 * (even a 4xx/5xx) means "online", only a network-level failure means "offline".
 * Works with zero new native deps; if @react-native-community/netinfo is
 * installed it is used as the primary signal, otherwise we poll the probe.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { API_BASE, HEALTH_PATH } from './http';

let NetInfo = null;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  NetInfo = require('@react-native-community/netinfo');
} catch {
  NetInfo = null;
}

let online = true;
let probedOnce = false;
const listeners = new Set();
let started = false;
let pollTimer = null;

const setOnline = (next) => {
  const v = !!next;
  if (v === online && probedOnce) return;
  online = v;
  probedOnce = true;
  listeners.forEach((cb) => {
    try {
      cb(online);
    } catch {
      /* ignore */
    }
  });
};

/** One-shot backend reachability check. Never throws, never runs twice at once. */
let probing = null;

export function probeOnline({ timeout = 30_000 } = {}) {
  if (probing) return probing;
  probing = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      // /api/health/ is cheap (200 + DB check); bare /api has no route.
      // Render's sleeping tier can take >30 s to answer the first request, so
      // give it room before declaring the backend unreachable.
      const res = await fetch(`${API_BASE}${HEALTH_PATH}`, {
        method: 'GET',
        signal: controller.signal,
      });
      // Any HTTP status (200, 404, 401, …) proves the network path works.
      void res.status;
      setOnline(true);
      return true;
    } catch {
      setOnline(false);
      return false;
    } finally {
      clearTimeout(timer);
    }
  })().finally(() => {
    probing = null;
  });
  return probing;
}

export function isOnlineNow() {
  return online;
}

export function subscribeOnline(listener) {
  listeners.add(listener);
  listener(online);
  return () => listeners.delete(listener);
}

function startPolling() {
  if (pollTimer || NetInfo) return;
  pollTimer = setInterval(() => {
    if (AppState.currentState === 'active') probeOnline().catch(() => {});
  }, 30_000);
}

export function startConnectivity() {
  if (started) return;
  started = true;

  if (NetInfo?.addEventListener) {
    NetInfo.addEventListener((state) => {
      const deviceUp = state.isConnected !== false && state.isInternetReachable !== false;
      if (!deviceUp) {
        setOnline(false);
        return;
      }
      // Radio is up — confirm the backend itself is reachable.
      probeOnline().catch(() => {});
    });
  } else {
    probeOnline().catch(() => {});
    startPolling();
  }

  AppState.addEventListener('change', (next) => {
    if (next === 'active') probeOnline().catch(() => {});
  });
}

export function useOnlineStatus() {
  const [value, setValue] = useState(online);
  useEffect(() => subscribeOnline(setValue), []);
  return value;
}
