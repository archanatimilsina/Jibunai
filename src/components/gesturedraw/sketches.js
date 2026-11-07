import AsyncStorage from '@react-native-async-storage/async-storage';

export const SKETCH_KEY = 'gesturedraw:sketches:v1';
export const LEGACY_KEY = 'gesturedraw:strokes';

export const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export function uniqueName(list, base) {
  const names = new Set((list || []).map((s) => s.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}

const blank = (name) => ({
  id: uid(), name, created: Date.now(), updated: Date.now(),
  strokes: [], bg: '#ffffff', overlay: 'dots', transparent: false, photoUri: null,
});

/**
 * Load the sketch store, seeding once from the legacy single-canvas key.
 * The legacy key keeps being mirrored, so system export/removal keeps working.
 */
export async function ensureSketchStore() {
  try {
    const raw = await AsyncStorage.getItem(SKETCH_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.sketches)) {
        return { store: { v: 1, currentId: p.currentId, sketches: p.sketches }, seeded: false };
      }
    }
  } catch { /* fall through to seed */ }
  let legacyStrokes = [];
  try {
    const rawLegacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (rawLegacy) {
      const p = JSON.parse(rawLegacy);
      const arr = Array.isArray(p) ? p : p?.strokes;
      if (Array.isArray(arr)) legacyStrokes = arr;
    }
  } catch { /* start blank */ }
  const first = {
    ...blank(legacyStrokes.length ? 'My first sketch' : 'Sketch 1'),
    strokes: legacyStrokes,
  };
  const store = { v: 1, currentId: first.id, sketches: [first] };
  try {
    await AsyncStorage.setItem(SKETCH_KEY, JSON.stringify(store));
  } catch { /* memory copy still works this session */ }
  return { store, seeded: true };
}

let saveTimer = null;
export function saveSketchSoon(store) {
  try {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      AsyncStorage.setItem(SKETCH_KEY, JSON.stringify({ ...store, v: 1 })).catch(() => {});
    }, 400);
  } catch { /* ignore */ }
}

export const fmtWhen = (t) => {
  try {
    return new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};
