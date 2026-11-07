import AsyncStorage from '@react-native-async-storage/async-storage';

export const META_KEY = 'gesturedraw:meta:v1';

export const DEFAULT_META = {
  v: 1,
  bg: '#ffffff',
  overlay: 'dots', // 'dots' | 'grid' | 'lines' | 'none'
  transparent: false,
  slotA: '#1a1a2e',
  slotB: '#993556',
  activeSlot: 'A',
  brushSize: 3,
  eraserSize: 14,
  opacity: 100,
  smoothing: 'med', // 'off' | 'low' | 'med' | 'high'
  symmetry: false,
  darkUI: false,
  leftHand: false,
  paletteTab: 'Default',
  recents: [],
  favs: [],
  tutorialSeen: false,
  deviceNoteSeen: false,
};

export const PALETTES = {
  Default: [
    '#1a1a2e', '#ffffff', '#185FA5', '#0F6E56',
    '#993C1D', '#993556', '#C0392B', '#E67E22',
    '#F1C40F', '#27AE60', '#16A085', '#2980B9',
    '#8E44AD', '#795548', '#7F8C8D', '#000000',
  ],
  Pastel: ['#FFD6E0', '#FFE5B4', '#FFF3B0', '#C8E6C9', '#B3E5FC', '#D1C4E9', '#F5F5F5', '#E0E0E0'],
  Neon: ['#39FF14', '#00FFFF', '#FF00FF', '#FFFF00', '#FF5F1F', '#7CFF00', '#00FF85', '#FFFFFF'],
  Earth: ['#5D4037', '#795548', '#8D6E63', '#A1887F', '#6D4C41', '#3E2723', '#9C7B54', '#C2A878'],
  Mono: ['#000000', '#212121', '#616161', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#F5F5F5', '#FFFFFF'],
};

export async function loadMeta() {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META };
    const p = JSON.parse(raw);
    return { ...DEFAULT_META, ...p, v: 1 };
  } catch {
    return { ...DEFAULT_META };
  }
}

let saveTimer = null;
export function saveMetaSoon(meta) {
  try {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      AsyncStorage.setItem(META_KEY, JSON.stringify({ ...meta, v: 1 })).catch(() => {});
    }, 300);
  } catch {
    /* ignore */
  }
}

export function pushRecent(recents, color) {
  const c = String(color || '').toLowerCase();
  if (!c) return recents;
  return [c, ...(recents || []).filter((x) => String(x).toLowerCase() !== c)].slice(0, 8);
}

/** Relative luminance 0..1 for contrast suggestions. */
export function luminance(hex) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return 1;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function lowContrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05) < 1.8;
}
