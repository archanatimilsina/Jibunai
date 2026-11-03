/**
 * Sorting, searching and filtering for the player library.
 *
 * sort = { field: 'title'|'artist'|'album'|'duration'|'added', dir: 'asc'|'desc' }
 * ('added' falls back to filename order — the OS index has no added-date.)
 */
import { useMemo } from 'react';

export const SORT_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'duration', label: 'Duration' },
  { key: 'added', label: 'Date added' },
];

const byField = (field) => (t) => {
  switch (field) {
    case 'artist':
      return (t.artist || '').toLowerCase();
    case 'album':
      return (t.album || '').toLowerCase();
    case 'duration':
      return Number(t.duration || 0);
    case 'added':
      return (t.filename || '').toLowerCase();
    case 'title':
    default:
      return (t.title || '').toLowerCase();
  }
};

export function sortTracks(tracks, sort) {
  const { field = 'title', dir = 'asc' } = sort || {};
  const key = byField(field);
  const mul = dir === 'desc' ? -1 : 1;
  return [...(tracks || [])].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (typeof ka === 'number' && typeof kb === 'number') return (ka - kb) * mul;
    const cmp = String(ka).localeCompare(String(kb));
    if (cmp !== 0) return cmp * mul;
    return String(a.title || '').localeCompare(String(b.title || '')) * mul;
  });
}

export function filterTracks(tracks, { query = '', artist = null, favoritesOnly = false } = {}) {
  const q = query.trim().toLowerCase();
  return (tracks || []).filter((t) => {
    if (favoritesOnly && !t.favorite) return false;
    if (artist && t.artist !== artist) return false;
    if (!q) return true;
    return (
      (t.title || '').toLowerCase().includes(q) ||
      (t.artist || '').toLowerCase().includes(q) ||
      (t.album || '').toLowerCase().includes(q)
    );
  });
}

export function artistList(tracks) {
  const set = new Set();
  (tracks || []).forEach((t) => {
    if (t.artist) set.add(t.artist);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** The visible library view: filter → sort. Memoized for big libraries. */
export function useLibraryView(tracks, sort, filters) {
  return useMemo(
    () => sortTracks(filterTracks(tracks, filters), sort),
    [tracks, sort?.field, sort?.dir, filters?.query, filters?.artist, filters?.favoritesOnly],
  );
}
