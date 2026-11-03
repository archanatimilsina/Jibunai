/**
 * Playback engine — one AudioPlayer for the whole session.
 *
 * The player instance is created by AppShell (`useAudioPlayer()`) and handed
 * here via `attachPlayer()`, so music keeps playing while you browse any
 * screen. Screens subscribe to snapshots; all transport runs through here.
 */
import { saveResume } from './prefs';

const RATES = [1, 1.25, 1.5, 2];

let player = null;
let statusSub = null;
let queue = [];
let index = -1;
let shuffle = false;
let repeat = 'off'; // 'off' | 'all' | 'one'
let sleepTimerId = null;
let sleepUntil = null;
let lastSavedSec = -1;

const listeners = new Set();

const current = () => (index >= 0 && index < queue.length ? queue[index] : null);

function snapshot() {
  return {
    track: current(),
    playing: !!player?.playing,
    position: player?.currentTime ?? 0,
    duration: player?.duration ?? current()?.duration ?? 0,
    loading: !!player?.isLoading,
    queueLen: queue.length,
    index,
    shuffle,
    repeat,
    rate: player?.playbackRate ?? 1,
    sleepUntil,
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

const persistResume = (force = false) => {
  const t = current();
  if (!t || !player) return;
  const sec = Math.floor(player.currentTime || 0);
  if (!force && sec === lastSavedSec) return;
  lastSavedSec = sec;
  saveResume(t.id, sec).catch(() => {});
};

function pickNext(auto) {
  if (!queue.length) return -1;
  if (shuffle) {
    if (queue.length === 1) return 0;
    let n = index;
    while (n === index) n = Math.floor(Math.random() * queue.length);
    return n;
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
  const t = queue[i];
  try {
    player.replace(t.uri);
    player.loop = repeat === 'one';
    if (autoplay) player.play();
    notify();
    return true;
  } catch {
    // Unplayable file (moved/deleted/DRM) — skip ahead once.
    if (queue.length > 1) {
      const n = pickNext(true);
      if (n !== -1 && n !== i) return playIndex(n, { autoplay });
    }
    notify();
    return false;
  }
}

function onStatus(status) {
  if (status?.didJustFinish) {
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
  if (player?.playing) {
    const sec = Math.floor(player.currentTime || 0);
    if (sec !== lastSavedSec && sec % 15 === 0) persistResume();
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
  notify();
}

export async function playQueue(tracks, startIndex = 0) {
  queue = [...(tracks || [])];
  if (!queue.length) return false;
  return playIndex(Math.max(0, Math.min(startIndex, queue.length - 1)));
}

/** Restore last session: load queue paused at the saved position. */
export async function restoreQueue(tracks, trackId, position = 0) {
  queue = [...(tracks || [])];
  index = trackId ? queue.findIndex((t) => t.id === trackId) : -1;
  if (index < 0 || !player) return false;
  const t = queue[index];
  try {
    player.replace(t.uri);
    player.loop = repeat === 'one';
    if (position > 0 && position < (player.duration || t.duration || Infinity)) {
      await player.seekTo(position).catch(() => {});
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
  queue = [...(tracks || [])];
  index = cur ? queue.findIndex((t) => t.id === cur) : -1;
  notify();
}

export function toggle() {
  if (!player) return;
  try {
    if (player.playing) {
      player.pause();
      persistResume(true);
    } else if (current()) {
      player.play();
    }
    notify();
  } catch {
    /* ignore */
  }
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
  if (index > 0) await playIndex(index - 1);
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
  notify();
  return repeat;
}

export function cycleRate() {
  const cur = player?.playbackRate ?? 1;
  const i = RATES.indexOf(cur);
  const nextRate = RATES[(i + 1 + RATES.length) % RATES.length] ?? 1;
  try {
    if (player) player.playbackRate = nextRate;
  } catch {
    /* ignore */
  }
  notify();
  return nextRate;
}

export function setSleepTimer(minutes) {
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null;
    sleepUntil = null;
  }
  if (!minutes) {
    notify();
    return null;
  }
  sleepUntil = Date.now() + minutes * 60000;
  sleepTimerId = setTimeout(() => {
    sleepTimerId = null;
    sleepUntil = null;
    try {
      player?.pause();
      persistResume(true);
    } catch {
      /* ignore */
    }
    notify();
  }, minutes * 60000);
  notify();
  return sleepUntil;
}
