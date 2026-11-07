/**
 * Device music library — index every playable audio file with metadata.
 *
 * Uses expo-music-library (MediaStore on Android, media queries on iOS):
 * title / artist / album / duration / artwork come from the OS. Anything the
 * user fixes (title, artist, cover) is overlaid from player prefs.
 *
 * Spec coverage (§1, §3, §9, §10):
 * - background scan with progress + AsyncStorage cache for instant open
 * - format allowlist (mp3/aac/m4a/flac/wav/ogg/opus), min-duration filter,
 *   excluded folders, filename fallback, accent-insensitive search
 * - album / artist / folder groupings, total duration, new-vs-cached diff
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MusicLibrary from 'expo-music-library';

import { getPlayerPrefs, loadPlayerPrefs } from './prefs';

const LIB_CACHE_KEY = 'jibunai:library:v1';

let cached = null;

export const SUPPORTED_EXTS = ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus'];

export const playableUri = (t) => t.assetUrl || t.contentUri || t.uri || null;

/** Lowercase + strip accents/punctuation for matching ("é" == "e"). */
export const normName = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Find a device track for a logged vibe (artist + title, title-only fallback).
 * Powers "play this vibe" from the Music screen.
 */
export function findTrackFor(tracks, artist, title) {
  const na = normName(artist);
  const nt = normName(title);
  if (!nt) return null;
  return (tracks || []).find((t) => normName(t.artist) === na && normName(t.title) === nt)
    || (tracks || []).find((t) => normName(t.title) === nt)
    || null;
}

/** Split "Artist - Title.mp3" filenames when the OS has no metadata. */
function splitFileName(filename) {
  const base = String(filename || '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const m = base.match(/^\s*(.+?)\s*[-–—]\s*(.+?)\s*$/);
  if (m && m[1] && m[2]) return { artist: m[1].trim(), title: m[2].trim() };
  return { artist: null, title: base || 'Unknown track' };
}

/** Guess a folder breadcrumb from the little the OS exposes. */
function folderOf(asset, uri) {
  const raw = asset.folder || asset.relativePath || asset.directory || '';
  if (raw) return String(raw).split('/').filter(Boolean).slice(-2).join('/');
  try {
    const parts = String(uri || '').split('/').filter(Boolean);
    if (parts.length >= 2) return decodeURIComponent(parts.slice(-2, -1)[0] || '');
  } catch {
    /* ignore */
  }
  const fn = String(asset.filename || '');
  const folderish = fn.includes('/') ? fn.split('/').slice(0, -1).join('/') : '';
  return folderish || 'Device';
}

/** Normalize one OS asset into a Track. Returns null when unplayable. */
export function toTrack(asset, prefs) {
  const uri = asset.assetUrl || asset.contentUri || asset.uri || null;
  if (!uri) return null;
  const ext = String(asset.filename || uri || '').split('.').pop().toLowerCase().split('?')[0];
  if (ext && !SUPPORTED_EXTS.includes(ext) && asset.filename) return null;
  const override = (prefs.meta || {})[asset.id] || {};
  const guessed = splitFileName(asset.filename);
  const titleFromOs = asset.title && asset.title !== asset.filename ? asset.title : null;
  return {
    id: String(asset.id),
    title: override.title || titleFromOs || guessed.title,
    artist: override.artist || asset.artist || guessed.artist || 'Unknown artist',
    album: asset.album || '',
    duration: Number(asset.duration || 0),
    uri,
    filename: asset.filename || '',
    folder: folderOf(asset, uri),
    artworkUri: asset.artworkUri || null,
    coverUri: (prefs.covers || {})[asset.id] || null,
    favorite: (prefs.favorites || []).includes(String(asset.id)),
    playCount: (prefs.playCounts || {})[String(asset.id)] || 0,
    lastPlayed: (prefs.lastPlayed || {})[String(asset.id)] || 0,
  };
}

const coverFor = (t) => t.coverUri || t.artworkUri || null;
export { coverFor as trackArtwork };

/** Gradient placeholder for §3 (letter avatar when no art exists). */
export const placeholderHue = (title) => {
  const s = String(title || '?');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

const excludedMatch = (t, excluded = []) => {
  if (!excluded.length) return false;
  const hay = `${t.folder || ''} ${t.filename || ''} ${t.uri || ''}`.toLowerCase();
  return excluded.some((f) => f && hay.includes(String(f).toLowerCase()));
};

/**
 * Load the full library: AsyncStorage cache first (instant), then refresh
 * from the OS in the background with progress. Returns { tracks, permission }
 * and calls onUpdate when the fresh index lands.
 */
export async function loadLibrary({ onUpdate, onProgress } = {}) {
  const prefs = await loadPlayerPrefs();
  let permission = 'undetermined';
  try {
    const p = await MusicLibrary.getPermissionsAsync();
    permission = p.status;
    if (p.status !== 'granted') {
      const req = await MusicLibrary.requestPermissionsAsync();
      permission = req.status;
    }
  } catch {
    permission = 'denied';
  }
  if (permission !== 'granted') {
    // Still serve the offline cache so the app opens instantly (§1, offline).
    try {
      const raw = await AsyncStorage.getItem(LIB_CACHE_KEY);
      if (raw) {
        cached = JSON.parse(raw);
        return { tracks: withPrefs(cached, prefs), permission };
      }
    } catch {
      /* ignore */
    }
    return { tracks: cached || [], permission };
  }

  const minDuration = Number(prefs.settings?.minDuration ?? 30);
  const excluded = prefs.settings?.excludedFolders || [];

  const pull = async () => {
    const all = [];
    let page = await MusicLibrary.getAssetsAsync({
      first: 500,
      sortBy: [[MusicLibrary.SortBy.title, true]],
    });
    all.push(...(page.assets || []));
    onProgress?.({ done: all.length, total: page.totalCount || all.length });
    while (page.hasNextPage) {
      page = await MusicLibrary.getAssetsAsync({ first: 500, after: page.endCursor });
      all.push(...(page.assets || []));
      onProgress?.({ done: all.length, total: page.totalCount || all.length });
    }
    const freshPrefs = await loadPlayerPrefs();
    const min = Number(freshPrefs.settings?.minDuration ?? 30);
    const excl = freshPrefs.settings?.excludedFolders || [];
    return all
      .map((a) => toTrack(a, freshPrefs))
      .filter(Boolean)
      .filter((t) => (t.duration || 0) >= min)
      .filter((t) => !excludedMatch(t, excl));
  };

  if (cached) {
    pull()
      .then(async (tracks) => {
        cached = tracks;
        try {
          await AsyncStorage.setItem(LIB_CACHE_KEY, JSON.stringify(tracks.slice(0, 4000)));
        } catch {
          /* cache is best-effort */
        }
        onUpdate?.(tracks);
      })
      .catch(() => {});
    return { tracks: withPrefs(cached, prefs), permission };
  }
  try {
    const raw = await AsyncStorage.getItem(LIB_CACHE_KEY);
    if (raw) {
      cached = JSON.parse(raw);
      pull()
        .then(async (tracks) => {
          cached = tracks;
          try {
            await AsyncStorage.setItem(LIB_CACHE_KEY, JSON.stringify(tracks.slice(0, 4000)));
          } catch {
            /* ignore */
          }
          onUpdate?.(tracks);
        })
        .catch(() => {});
      return { tracks: withPrefs(cached, prefs), permission };
    }
  } catch {
    /* no cache */
  }
  const tracks = await pull();
  cached = tracks;
  try {
    await AsyncStorage.setItem(LIB_CACHE_KEY, JSON.stringify(tracks.slice(0, 4000)));
  } catch {
    /* ignore */
  }
  return { tracks, permission, minDuration, excluded };
}

/** Re-apply fresh prefs (cover/favorite/meta edits) onto a track list. */
export function withPrefs(tracks, prefs = getPlayerPrefs()) {
  return (tracks || []).map((t) => toTrack(
    {
      id: t.id, title: t.title, artist: t.artist, album: t.album,
      duration: t.duration, filename: t.filename,
      artworkUri: t.artworkUri, assetUrl: t.uri, contentUri: null, uri: t.uri,
    },
    prefs,
  )).filter(Boolean);
}

export async function refreshLibrary() {
  cached = null;
  return loadLibrary({});
}

/** Header stats (§1): song count + total play time. */
export function libraryStats(tracks) {
  const totalSec = (tracks || []).reduce((s, t) => s + (Number(t.duration) || 0), 0);
  return { count: (tracks || []).length, totalSec };
}

/** §9 groupings. Album-artist aware: compilations group under Various Artists. */
export function albumGroups(tracks) {
  const map = new Map();
  (tracks || []).forEach((t) => {
    const album = t.album || 'Unknown album';
    const key = `${normName(album)}::${normName(t.artist)}`;
    if (!map.has(key)) map.set(key, { name: album, artist: t.artist || 'Various Artists', tracks: [] });
    map.get(key).tracks.push(t);
  });
  return [...map.values()]
    .map((g) => ({ ...g, tracks: [...g.tracks].sort((a, b) => String(a.filename || a.title).localeCompare(String(b.filename || b.title))) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const stripFeat = (artist) => String(artist || '').split(/ feat\.? | ft\.? | & |,| x |;/i)[0].trim() || artist;

export function artistGroups(tracks) {
  const map = new Map();
  (tracks || []).forEach((t) => {
    const main = stripFeat(t.artist) || 'Unknown artist';
    if (!map.has(main)) map.set(main, { name: main, tracks: [], albums: new Set() });
    const g = map.get(main);
    g.tracks.push(t);
    if (t.album) g.albums.add(t.album);
  });
  return [...map.values()]
    .map((g) => ({ name: g.name, tracks: g.tracks, albumCount: g.albums.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function folderGroups(tracks) {
  const map = new Map();
  (tracks || []).forEach((t) => {
    const f = t.folder || 'Device';
    if (!map.has(f)) map.set(f, []);
    map.get(f).push(t);
  });
  return [...map.entries()]
    .map(([name, list]) => ({ name, tracks: list }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Accent-insensitive grouped search (§10). */
export function searchLibrary(tracks, query) {
  const q = normName(query);
  if (!q) return { songs: [], artists: [], albums: [], folders: [] };
  const songs = (tracks || []).filter((t) =>
    normName(`${t.title} ${t.artist} ${t.album} ${t.folder}`).includes(q),
  ).slice(0, 50);
  const artists = artistGroups(tracks).filter((a) => normName(a.name).includes(q)).slice(0, 10);
  const albums = albumGroups(tracks).filter((a) => normName(`${a.name} ${a.artist}`).includes(q)).slice(0, 10);
  const folders = folderGroups(tracks).filter((f) => normName(f.name).includes(q)).slice(0, 10);
  return { songs, artists, albums, folders };
}
