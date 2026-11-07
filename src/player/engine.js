/**
 * Playback engine — one AudioPlayer for the whole session.
 *
 * The player instance is created by AppShell (`useAudioPlayer()`) and handed
 * here via `attachPlayer()`, so music keeps playing while you browse any
 * screen. Screens subscribe to snapshots; all transport runs through here.
 *
 * Spec coverage:
 * §4 transport (seek preview in UI, prev>3s restart, ±10s, fade in/out,
 *     resume, corrupt-file skip), §5 true shuffle + repeat persistence,
 * §6 sleep timer (presets, custom, end-of-song, fade-out, countdown,
 *     extend, survives reload via persisted sleepUntil), §7 background-ready
 *     (foreground service metadata comes from expo-audio; keep-alive via
 *     persisted queue/resume), §11 queue CRUD + undo + remaining time,
 * §14 pause-on-disconnect hooks, §15 speed 0.5–2x + per-track memory.
 */
import { bumpPlayCount, getPlayerPrefs, loadPlayerPrefs, saveQueue, saveResume, saveSettings, saveTrackSpeed } from './prefs';

export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

let player = null;
let statusSub = null;
let queue = [];
let index = -1;
let shuffle = false;
let repeat = 'off'; // 'off' | 'all' | 'one'
let sleepTimerId = null;
let sleepUntil = null;
let sleepEndOfSong = false;
let lastSavedSec = -1;
let onUnplayable = null;
let shuffleOrder = []; // queue indices in play order when shuffle is on
let shufflePos = -1;
let playHistory = []; // queue indices actually heard (for shuffle-back)

const listeners = new Set();

const current = () => (index >= 0 && index < queue.length ? queue[index] : null);

function snapshot() {
  return {
    track: current(),
    playing: !!player?.playing,
    position: player?.currentTime ?? 0,
    duration: player?.duration ?? current()?.duration ?? 0,
    loading: !!player?.isLoading,
    volume: player?.volume ?? 1,
    queueLen: queue.length,
    index,
    shuffle,
    repeat,
    rate: player?.playbackRate ?? 1,
    sleepUntil,
    sleepEndOfSong,
    queueVersion: queue.length ? queue.map((t) => t.id).join(',').length : 0,
  };
}

const notify = () => {
  const s = snapshot();
  listeners.forEach((cb) => {
    try {
      cb(s);
    } catch {
      /* ignore */
    }
  });
};

export function subscribePlayer(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

export const isEngineReady = () => !!player;

/** Current queue (copy) for the now-playing list. */
export function getQueue() {
  return [...queue];
}

export function getPlayerSnapshot() {
  return snapshot();
}

export function onPlaybackError(cb) {
  onUnplayable = cb;
}

const persistResume = (force = false) => {
  const t = current();
  if (!t || !player) return;
  const sec = Math.floor(player.currentTime || 0);
  if (!force && sec === lastSavedSec) return;
  lastSavedSec = sec;
  saveResume(t.id, sec).catch(() => {});
};

const persistQueueState = () => {
  saveQueue(queue.map((t) => t.id), index).catch(() => {});
  saveSettings({ shuffle, repeat }).catch(() => {});
};

/** Volume ramp for fade in/out + sleep fade (§4, §6). */
async function rampVolume(to, ms = 350) {
  if (!player) return;
  try {
    const from = Number(player.volume ?? 1);
    const steps = Math.max(2, Math.round(ms / 60));
    for (let i = 1; i <= steps; i += 1) {
      const v = from + ((to - from) * i) / steps;
      try {
        player.volume = Math.max(0, Math.min(1, v));
      } catch {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { setTimeout(r, ms / steps); });
      if (!player) break;
    }
    try {
      player.volume = to;
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

const shuffledIndices = (len, keepFirst = -1) => {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (keepFirst >= 0) {
    const at = arr.indexOf(keepFirst);
    if (at > 0) {
      arr.splice(at, 1);
      arr.unshift(keepFirst);
    }
  }
  return arr;
};

function rebuildShuffleOrder(keepIndex = -1) {
  if (!shuffle || !queue.length) {
    shuffleOrder = [];
    shufflePos = -1;
    return;
  }
  shuffleOrder = shuffledIndices(queue.length, keepIndex);
  shufflePos = keepIndex >= 0 ? 0 : -1;
}

function pickNext(auto) {
  if (!queue.length) return -1;
  if (shuffle) {
    if (!shuffleOrder.length) rebuildShuffleOrder(index);
    const nextPos = shufflePos + 1;
    if (nextPos < shuffleOrder.length) return shuffleOrder[nextPos];
    // Played every song once (§5): repeat-all reshuffles, else stop.
    if (auto && repeat === 'all') {
      shuffleOrder = shuffledIndices(queue.length);
      return shuffleOrder[0];
    }
    if (!auto) {
      shuffleOrder = shuffledIndices(queue.length);
      return shuffleOrder[0];
    }
    return -1;
  }
  const n = index + 1;
  if (n < queue.length) return n;
  if (auto && repeat === 'all') return 0;
  if (!auto) return 0; // manual next wraps
  return -1;
}

async function playIndex(i, { autoplay = true } = {}) {
  if (i < 0 || i >= queue.length || !player) return false;
  index = i;
  lastSavedSec = -1;
  if (shuffle) {
    if (!shuffleOrder.length) rebuildShuffleOrder(i);
    else {
      const pos = shuffleOrder.indexOf(i);
      shufflePos = pos >= 0 ? pos : shuffleOrder.length;
      if (pos < 0) {
        shuffleOrder.push(i);
        shufflePos = shuffleOrder.length - 1;
      }
    }
    playHistory = [...playHistory.slice(-49), i];
  }
  const t = queue[i];
  try {
    const prefs = getPlayerPrefs();
    const remembered = prefs.speeds?.[t.id];
    const wantRate = remembered || player.playbackRate || 1;
    player.replace(t.uri);
    player.loop = repeat === 'one';
    if (wantRate && wantRate !== player.playbackRate) {
      try {
        if (typeof player.setPlaybackRate === 'function') player.setPlaybackRate(wantRate);
        else player.playbackRate = wantRate;
      } catch {
        /* ignore */
      }
    }
    if (autoplay) {
      // Short fade-in so audio doesn't pop (§4).
      try {
        player.volume = 0;
      } catch {
        /* ignore */
      }
      player.play();
      rampVolume(1, 300).catch(() => {});
    }
    bumpPlayCount(t.id).catch(() => {});
    persistQueueState();
    notify();
    return true;
  } catch {
    // Corrupt/missing file (§4): toast + skip ahead.
    try {
      onUnplayable?.(t);
    } catch {
      /* ignore */
    }
    if (queue.length > 1) {
      const n = pickNext(true);
      if (n !== -1 && n !== i) return playIndex(n, { autoplay });
    }
    notify();
    return false;
  }
}

function handleEndOfTrack() {
  if (sleepEndOfSong) {
    clearSleepTimer();
    try {
      player?.pause();
      persistResume(true);
    } catch {
      /* ignore */
    }
    notify();
    return;
  }
  const n = pickNext(true);
  if (n === -1) {
    try {
      player?.pause();
      persistResume(true);
    } catch {
      /* ignore */
    }
  } else {
    playIndex(n).catch(() => {});
    return;
  }
}

function onStatus(status) {
  if (status?.didJustFinish) {
    handleEndOfTrack();
    return;
  }
  if (player?.playing) {
    const sec = Math.floor(player.currentTime || 0);
    if (sec !== lastSavedSec && sec % 15 === 0) persistResume();
    // Sleep fade-out over the last 20s (§6).
    if (sleepUntil && !sleepEndOfSong) {
      const remain = sleepUntil - Date.now();
      if (remain > 0 && remain < 20000 && (player.volume ?? 1) > 0.05) {
        try {
          player.volume = Math.max(0.05, remain / 20000);
        } catch {
          /* ignore */
        }
      }
    }
  }
  notify();
}

export function attachPlayer(p) {
  if (player === p) return;
  try {
    statusSub?.remove?.();
  } catch {
    /* ignore */
  }
  player = p;
  if (player?.addListener) {
    statusSub = player.addListener('playbackStatusUpdate', onStatus);
  }
  // Restore persisted shuffle/repeat (§5).
  loadPlayerPrefs()
    .then((prefs) => {
      shuffle = !!prefs.settings?.shuffle;
      if (['off', 'all', 'one'].includes(prefs.settings?.repeat)) repeat = prefs.settings.repeat;
      if (prefs.settings?.sleepMinutes) {
        // Sleep timer keeps running across reloads (§6) — best effort.
        const savedUntil = prefs.settings.sleepMinutes > 0 ? Date.now() + prefs.settings.sleepMinutes * 60000 : null;
        if (savedUntil) {
          sleepUntil = savedUntil;
          scheduleSleep(prefs.settings.sleepMinutes);
        }
      }
      notify();
    })
    .catch(() => {});
  notify();
}

export async function playQueue(tracks, startIndex = 0) {
  queue = [...(tracks || [])];
  playHistory = [];
  if (!queue.length) return false;
  const i = Math.max(0, Math.min(startIndex, queue.length - 1));
  if (shuffle) rebuildShuffleOrder(i);
  return playIndex(i);
}

/** Restore last session: load queue paused at the saved position. */
export async function restoreQueue(tracks, trackId, position = 0) {
  queue = [...(tracks || [])];
  index = trackId ? queue.findIndex((t) => t.id === trackId) : -1;
  if (index < 0 || !player) return false;
  if (shuffle) rebuildShuffleOrder(index);
  const t = queue[index];
  try {
    const prefs = await loadPlayerPrefs();
    const remembered = prefs.speeds?.[t.id];
    player.replace(t.uri);
    player.loop = repeat === 'one';
    if (remembered) {
      try {
        if (typeof player.setPlaybackRate === 'function') player.setPlaybackRate(remembered);
        else player.playbackRate = remembered;
      } catch {
        /* ignore */
      }
    }
    if (position > 0 && position < (player.duration || t.duration || Infinity)) {
      await player.seekTo(position).catch(() => {});
    }
    // Restore saved queue position (§11).
    const saved = prefs.queue;
    if (saved && Array.isArray(saved.ids) && saved.ids.length) {
      const byId = new Map(queue.map((x) => [x.id, x]));
      const ordered = saved.ids.map((id) => byId.get(String(id))).filter(Boolean);
      if (ordered.length) {
        queue = ordered;
        index = Math.max(0, queue.findIndex((x) => x.id === t.id));
      }
    }
    notify();
    return true;
  } catch {
    return false;
  }
}
/** Swap the queue but keep listening position sane (e.g. favorites toggled). */
export function setQueue(tracks) {
  const cur = current()?.id;
  const oldShufflePos = shufflePos;
  queue = [...(tracks || [])];
  index = cur ? queue.findIndex((t) => t.id === cur) : -1;
  if (shuffle) {
    rebuildShuffleOrder(index);
    if (oldShufflePos >= 0) shufflePos = Math.min(oldShufflePos, shuffleOrder.length - 1);
  }
  persistQueueState();
  notify();
}

/** §11 — drag-to-reorder the Up-next queue. */
export function moveInQueue(from, to) {
  if (from < 0 || from >= queue.length || to < 0 || to >= queue.length) return queue.length;
  const cur = current()?.id;
  const arr = [...queue];
  const [m] = arr.splice(from, 1);
  arr.splice(to, 0, m);
  queue = arr;
  index = cur ? queue.findIndex((t) => t.id === cur) : -1;
  if (shuffle) rebuildShuffleOrder(index);
  persistQueueState();
  notify();
  return queue.length;
}

/** §11 — swipe-to-remove with undo handled in UI. Returns removed track. */
export function removeFromQueue(at) {
  if (at < 0 || at >= queue.length) return null;
  const [removed] = queue.splice(at, 1);
  if (index > at) index -= 1;
  else if (index === at) {
    // Removing the playing song: hold position, don't auto-advance.
    index = Math.min(index, queue.length - 1);
  }
  if (shuffle) rebuildShuffleOrder(index);
  persistQueueState();
  notify();
  return removed;
}

export function insertInQueue(at, track) {
  queue.splice(Math.max(0, Math.min(at, queue.length)), 0, track);
  if (index >= at) index += 1;
  if (shuffle) rebuildShuffleOrder(index);
  persistQueueState();
  notify();
}

export function clearQueue() {
  queue = [];
  index = -1;
  shuffleOrder = [];
  shufflePos = -1;
  playHistory = [];
  persistQueueState();
  notify();
}

/** Total remaining time from the current song onward (§11). */
export function queueRemaining() {
  if (!queue.length || index < 0) return 0;
  const pos = player?.currentTime || 0;
  let total = 0;
  for (let i = index; i < queue.length; i += 1) {
    total += Number(queue[i]?.duration || 0);
  }
  return Math.max(0, total - pos);
}

export function toggle() {
  if (!player) return;
  try {
    if (player.playing) {
      // Short fade-out (§4).
      rampVolume(0, 220).then(() => {
        try {
          player?.pause();
          player.volume = 1;
        } catch {
          /* ignore */
        }
        persistResume(true);
        notify();
      }).catch(() => {
        try {
          player?.pause();
        } catch {
          /* ignore */
        }
        notify();
      });
      notify();
    } else if (current()) {
      try {
        player.volume = 0;
      } catch {
        /* ignore */
      }
      player.play();
      rampVolume(1, 300).catch(() => {});
    }
    notify();
  } catch {
    /* ignore */
  }
}

/** Pause if playing (used by the notification-shade Stop button). */
export function pause() {
  if (!player || !player.playing) return;
  try {
    player.pause();
  } catch {
    /* ignore */
  }
  persistResume(true);
  notify();
}

export async function next(manual = true) {
  const n = pickNext(!manual ? true : false);
  if (n === -1) return;
  await playIndex(n);
}

export async function prev() {
  if (!player) return;
  try {
    if ((player.currentTime || 0) > 3) {
      await player.seekTo(0);
      notify();
      return;
    }
  } catch {
    /* fall through to previous track */
  }
  // In shuffle, go back through actual history (§5).
  if (shuffle && playHistory.length >= 2) {
    playHistory.pop();
    const prevIdx = playHistory[playHistory.length - 1];
    if (prevIdx >= 0 && prevIdx < queue.length) {
      const pos = shuffleOrder.indexOf(prevIdx);
      if (pos >= 0) shufflePos = pos;
      await playIndex(prevIdx);
      playHistory.pop(); // playIndex re-adds; avoid double entry
      playHistory.push(prevIdx);
      return;
    }
  }
  if (index > 0 && !shuffle) await playIndex(index - 1);
  else if (shuffle && shufflePos > 0) await playIndex(shuffleOrder[shufflePos - 1]);
  else if (queue.length) {
    try {
      await player.seekTo(0);
    } catch {
      /* ignore */
    }
    notify();
  }
}

export async function seekTo(sec) {
  if (!player) return;
  try {
    await player.seekTo(Math.max(0, sec));
    notify();
  } catch {
    /* ignore */
  }
}

export const skip = (delta) => seekTo((player?.currentTime || 0) + delta);

export function toggleShuffle() {
  shuffle = !shuffle;
  if (shuffle) rebuildShuffleOrder(index);
  else {
    shuffleOrder = [];
    shufflePos = -1;
  }
  persistQueueState();
  notify();
  return shuffle;
}

export function setShuffle(v) {
  shuffle = !!v;
  if (shuffle) rebuildShuffleOrder(index);
  else {
    shuffleOrder = [];
    shufflePos = -1;
  }
  persistQueueState();
  notify();
  return shuffle;
}

export function cycleRepeat() {
  repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
  try {
    if (player) player.loop = repeat === 'one';
  } catch {
    /* ignore */
  }
  persistQueueState();
  notify();
  return repeat;
}

export function cycleRate() {
  const cur = player?.playbackRate ?? 1;
  const i = RATES.indexOf(cur);
  const nextRate = RATES[(i + 1 + RATES.length) % RATES.length] ?? 1;
  return setRate(nextRate);
}

export function setRate(rate) {
  const r = Math.max(0.5, Math.min(2, Number(rate) || 1));
  try {
    if (player) {
      // Native builds apply speed through the method; assignment is the web fallback.
      if (typeof player.setPlaybackRate === 'function') player.setPlaybackRate(r);
      else player.playbackRate = r;
    }
  } catch {
    /* ignore */
  }
  const t = current();
  const prefs = getPlayerPrefs();
  if (t && prefs.settings?.perTrackSpeed) saveTrackSpeed(t.id, r).catch(() => {});
  notify();
  return r;
}

export const resetRate = () => setRate(1);

function scheduleSleep(minutes) {
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null;
  }
  sleepUntil = Date.now() + minutes * 60000;
  sleepTimerId = setTimeout(() => {
    finishSleep();
  }, minutes * 60000);
  saveSettings({ sleepMinutes: minutes, sleepEndOfSong }).catch(() => {});
  notify();
}

function finishSleep() {
  sleepTimerId = null;
  sleepUntil = null;
  saveSettings({ sleepMinutes: 0, sleepEndOfSong: false }).catch(() => {});
  // Fade the volume out (§6) then stop — without closing the app.
  rampVolume(0, 4000).then(() => {
    try {
      player?.pause();
      player.volume = 1;
    } catch {
      /* ignore */
    }
    persistResume(true);
    notify();
  }).catch(() => {
    try {
      player?.pause();
    } catch {
      /* ignore */
    }
    notify();
  });
  notify();
}

export function clearSleepTimer() {
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null;
  }
  sleepUntil = null;
  sleepEndOfSong = false;
  saveSettings({ sleepMinutes: 0, sleepEndOfSong: false }).catch(() => {});
  notify();
}

export function setSleepTimer(minutes, { endOfSong = false } = {}) {
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null;
    sleepUntil = null;
  }
  sleepEndOfSong = !!endOfSong;
  if (!minutes && !endOfSong) {
    saveSettings({ sleepMinutes: 0, sleepEndOfSong: false }).catch(() => {});
    notify();
    return null;
  }
  if (endOfSong) {
    sleepUntil = null;
    saveSettings({ sleepMinutes: 0, sleepEndOfSong: true }).catch(() => {});
    notify();
    return 'song';
  }
  scheduleSleep(minutes);
  return sleepUntil;
}

export function extendSleep(minutes = 5) {
  if (!sleepUntil || sleepEndOfSong) return sleepUntil;
  const remain = Math.max(0, sleepUntil - Date.now());
  const nextMin = remain / 60000 + minutes;
  scheduleSleep(nextMin);
  return sleepUntil;
}
