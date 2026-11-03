/**
 * Device music library — index every playable audio file with metadata.
 *
 * Uses expo-music-library (MediaStore on Android, media queries on iOS):
 * title / artist / album / duration / artwork come from the OS. Anything the
 * user fixes (title, artist, cover) is overlaid from player prefs.
 */
import * as MusicLibrary from 'expo-music-library';

import { getPlayerPrefs, loadPlayerPrefs } from './prefs';

let cached = null;

export const playableUri = (t) => t.assetUrl || t.contentUri || t.uri || null;

/** Normalize for fuzzy matching ("The Midnight" == "the-midnight!"). */
export const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

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

/** Normalize one OS asset into a Track. Returns null when unplayable. */
export function toTrack(asset, prefs) {
  const uri = asset.assetUrl || asset.contentUri || asset.uri || null;
  if (!uri) return null;
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
    artworkUri: asset.artworkUri || null,
    coverUri: (prefs.covers || {})[asset.id] || null,
    favorite: (prefs.favorites || []).includes(String(asset.id)),
  };
}

const coverFor = (t) => t.coverUri || t.artworkUri || null;
export { coverFor as trackArtwork };

/**
 * Load the full library: cached index first (instant), then refresh from the
 * OS in the background. Returns { tracks, permission } and calls onUpdate
 * when the fresh index lands.
 */
export async function loadLibrary({ onUpdate } = {}) {
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
  if (permission !== 'granted') return { tracks: cached || [], permission };

  const pull = async () => {
    const all = [];
    let page = await MusicLibrary.getAssetsAsync({
      first: 500,
      sortBy: [[MusicLibrary.SortBy.title, true]],
    });
    all.push(...(page.assets || []));
    while (page.hasNextPage) {
      page = await MusicLibrary.getAssetsAsync({ first: 500, after: page.endCursor });
      all.push(...(page.assets || []));
    }
    const freshPrefs = await loadPlayerPrefs();
    return all.map((a) => toTrack(a, freshPrefs)).filter(Boolean);
  };

  if (cached) {
    pull()
      .then((tracks) => {
        cached = tracks;
        onUpdate?.(tracks);
      })
      .catch(() => {});
    return { tracks: withPrefs(cached, prefs), permission };
  }
  const tracks = await pull();
  cached = tracks;
  return { tracks, permission };
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
