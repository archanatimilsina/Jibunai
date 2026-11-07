/**
 * Sorting, searching and filtering for the player library.
 *
 * sort = { field: 'title'|'artist'|'album'|'duration'|'added'|'plays'|'recent', dir: 'asc'|'desc' }
 * ('added' falls back to filename order — the OS index has no added-date.)
 *
 * §2: case-insensitive, leading "the/a/an" ignored, accents ignored,
 * albums ordered by disc/track (filename fallback), per-screen memory,
 * section letters / group headers.
 */
import { useMemo } from 'react';

import { normName } from './library';

export const SORT_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'duration', label: 'Duration' },
  { key: 'added', label: 'Date added' },
  { key: 'plays', label: 'Play count' },
  { key: 'recent', label: 'Last played' },
];

const stripArticle = (s) => String(s || '').replace(/^(the|a|an)\s+/i, '');

const sortKey = (t, field) => {
  switch (field) {
    case 'artist':
      return normName(stripArticle(t.artist));
    case 'album':
      return normName(stripArticle(t.album)) || '~';
    case 'duration':
      return Number(t.duration || 0);
    case 'plays':
      return Number(t.playCount || 0);
    case 'recent':
      return Number(t.lastPlayed || 0);
    case 'added':
      return String(t.filename || t.id || '').toLowerCase();
    case 'title':
    default:
      return normName(stripArticle(t.title));
  }
};

export function sortTracks(tracks, sort) {
  const { field = 'title', dir = 'asc' } = sort || {};
  const mul = dir === 'desc' ? -1 : 1;
  return [...(tracks || [])].sort((a, b) => {
    // Albums: keep disc/track order via filename, then title.
    if (field === 'album') {
      const ka = sortKey(a, 'album');
      const kb = sortKey(b, 'album');
      const cmp = typeof ka === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
      if (cmp !== 0) return cmp * mul;
      const fa = String(a.filename || a.title || '').toLowerCase();
      const fb = String(b.filename || b.title || '').toLowerCase();
      const fc = fa.localeCompare(fb);
      if (fc !== 0) return fc * mul;
    }
    const ka = sortKey(a, field);
    const kb = sortKey(b, field);
    if (typeof ka === 'number' && typeof kb === 'number') {
      if (ka !== kb) return (ka - kb) * mul;
    } else {
      const cmp = String(ka).localeCompare(String(kb));
      if (cmp !== 0) return cmp * mul;
    }
    return String(a.title || '').localeCompare(String(b.title || '')) * mul;
  });
}

export function filterTracks(tracks, { query = '', artist = null, album = null, folder = null, favoritesOnly = false } = {}) {
  const q = normName(query.trim());
  return (tracks || []).filter((t) => {
    if (favoritesOnly && !t.favorite) return false;
    if (artist && t.artist !== artist) return false;
    if (album && t.album !== album) return false;
    if (folder && t.folder !== folder) return false;
    if (!q) return true;
    return normName(`${t.title} ${t.artist} ${t.album} ${t.folder} ${t.filename}`).includes(q);
  });
}

/** Highlight ranges for §10 match display. */
export function matchRanges(text, query) {
  const hay = normName(text);
  const needle = normName(query);
  if (!needle || !hay.includes(needle)) return null;
  const idx = hay.indexOf(needle);
  return { start: idx, end: idx + needle.length };
}

export function artistList(tracks) {
  const set = new Set();
  (tracks || []).forEach((t) => {
    if (t.artist) set.add(t.artist);
  });
  return [...set].sort((a, b) => stripArticle(a).localeCompare(stripArticle(b), undefined, { sensitivity: 'base' }));
}

/** Section letter for fast-scroll (§1) and group headers (§2). */
export function sectionFor(track, field = 'title') {
  const raw = field === 'artist' ? track.artist : field === 'album' ? track.album : track.title;
  const clean = stripArticle(normName(raw));
  const ch = (clean.charAt(0) || '#').toUpperCase();
  return /[A-Z]/.test(ch) ? ch : '#';
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function formatTotal(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

/** The visible library view: filter → sort. Memoized for big libraries. */
export function useLibraryView(tracks, sort, filters) {
  return useMemo(
    () => sortTracks(filterTracks(tracks, filters), sort),
    [tracks, sort?.field, sort?.dir, filters?.query, filters?.artist, filters?.album, filters?.folder, filters?.favoritesOnly],
  );
}
