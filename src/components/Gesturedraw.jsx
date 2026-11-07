import React, {
  useRef, useState, useEffect, useReducer, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, ScrollView, Pressable, PanResponder, StyleSheet,
  useWindowDimensions, Platform, StatusBar, SafeAreaView,
  TextInput, Modal, Alert, Image as RNImage,
} from 'react-native';
import Svg, {
  Path, Circle, Defs, Pattern, Rect, G,
} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

import {
  META_KEY, DEFAULT_META, PALETTES,
  loadMeta, saveMetaSoon, pushRecent, lowContrast,
} from './gesturedraw/meta';
import {
  ensureSketchStore, saveSketchSoon, uniqueName, uid, fmtWhen,
} from './gesturedraw/sketches';


const STORAGE_KEY = 'gesturedraw:strokes';
const MAX_STORED_STROKES = 50;
const MAX_HISTORY = 100;

const QUICK_SIZES = [
  { value: 2, label: 'thin' },
  { value: 6, label: 'mid' },
  { value: 14, label: 'thick' },
];
const OPACITY_PRESETS = [25, 50, 75, 100];
const SMOOTH_ORDER = ['off', 'low', 'med', 'high'];
const SMOOTH_DIST = { off: 0, low: 3, med: 6, high: 11 };

const BG_PRESETS = ['#ffffff', '#000000', '#f5efe0', '#e8e6e1', '#1a1a2e', '#2d2a26'];

const T = {
  white: '#ffffff',
  page: '#ffffff',
  border: '#d8d4cc',
  borderSecondary: '#ccc',
  soft: '#7a7567',
  tertiary: '#aaa',
  ink: '#1a1a2e',
  text: '#111',
  warm: '#eceae3',
  panel: '#f9f9f7',
  info: '#185FA5',
  infoBg: '#e8f0fb',
  green: '#2d6a4f',
  success: '#0F6E56',
  successBg: '#e6f4f0',
  danger: '#C0392B',
  dot: 'rgba(180,100,60,0.7)',
};

const DARK = {
  white: '#1e1e28',
  page: '#14141c',
  border: '#3a3a48',
  borderSecondary: '#4a4a5a',
  soft: '#a8a396',
  tertiary: '#777',
  ink: '#f5f2ea',
  text: '#f5f2ea',
  warm: '#2a2a36',
  panel: '#1a1a24',
  info: '#7db8f0',
  infoBg: '#233246',
  green: '#7ee2a8',
  success: '#7ee2a8',
  successBg: '#1d3329',
  danger: '#f08080',
  dot: 'rgba(220,150,100,0.7)',
};

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });


function toPath(pts) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x} ${pts[0].y}L${pts[1].x} ${pts[1].y}`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += `Q${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${last.x} ${last.y}`;
}

/** Drop duplicate / very close points (smoothing level). Dots exempt. */
function decimate(pts, level) {
  const minD = SMOOTH_DIST[level] ?? 6;
  if (!minD || pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = out[out.length - 1];
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    if (dx * dx + dy * dy >= minD * minD) out.push(p);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function distToSeg(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

/** Topmost stroke index within threshold of (x, y), else -1. */
function hitStroke(strokes, x, y, threshold) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const pts = strokes[i].pts || [];
    if (pts.length === 1) {
      if (Math.hypot(pts[0].x - x, pts[0].y - y) <= threshold + (strokes[i].size || 3) / 2) return i;
      continue;
    }
    for (let j = 0; j < pts.length - 1; j++) {
      if (distToSeg({ x, y }, pts[j], pts[j + 1]) <= threshold + (strokes[i].size || 3) / 2) return i;
    }
  }
  return -1;
}

function shapePoints(kind, s, e) {
  const x0 = Math.min(s.x, e.x);
  const y0 = Math.min(s.y, e.y);
  const x1 = Math.max(s.x, e.x);
  const y1 = Math.max(s.y, e.y);
  if (Math.hypot(e.x - s.x, e.y - s.y) < 4) return [{ ...s }];
  if (kind === 'line') return [{ ...s }, { ...e }];
  if (kind === 'rect') {
    const pts = [];
    const N = 6;
    for (let i = 0; i <= N; i++) pts.push({ x: x0 + ((x1 - x0) * i) / N, y: y0 });
    for (let i = 1; i <= N; i++) pts.push({ x: x1, y: y0 + ((y1 - y0) * i) / N });
    for (let i = 1; i <= N; i++) pts.push({ x: x1 - ((x1 - x0) * i) / N, y: y1 });
    for (let i = 1; i < N; i++) pts.push({ x: x0, y: y1 - ((y1 - y0) * i) / N });
    pts.push({ x: x0, y: y0 });
    return pts;
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.max(2, (x1 - x0) / 2);
  const ry = Math.max(2, (y1 - y0) / 2);
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (2 * Math.PI * i) / N;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

const dotColor = (i, n, th) => (i === 0 ? th.info : i === n - 1 ? th.success : th.dot);


const StrokeShape = memo(function StrokeShape({ stroke }) {
  const { pts, color, size, opacity = 100 } = stroke;
  if (pts.length === 1) {
    return <Circle cx={pts[0].x} cy={pts[0].y} r={size / 2 + 0.5} fill={color} opacity={opacity / 100} />;
  }
  return (
    <Path
      d={toPath(pts)}
      stroke={color}
      strokeWidth={size}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={opacity / 100}
    />
  );
});

const StrokeDots = memo(function StrokeDots({ pts, th }) {
  return pts.map((p, i) => (
    <Circle key={i} cx={p.x} cy={p.y} r={i === 0 || i === pts.length - 1 ? 4 : 3} fill={dotColor(i, pts.length, th)} />
  ));
});


function ToolDivider({ th }) {
  return <View style={[st.divider, { backgroundColor: th.border }]} />;
}

function ChipButton({ label, onPress, onLongPress, active, tone = 'neutral', disabled, style, th }) {
  const activeBg = tone === 'info' ? th.infoBg : th.warm;
  const activeBorder = tone === 'info' ? th.green : '#aaa';
  const activeText = tone === 'info' ? th.green : th.text;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [
        st.chip,
        { borderColor: th.borderSecondary },
        active && { backgroundColor: activeBg, borderColor: activeBorder },
        pressed && !active && { backgroundColor: th.warm },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[st.chipText, { color: th.soft }, active && { color: activeText }]}>{label}</Text>
    </Pressable>
  );
}

function StatCard({ label, value, style, th }) {
  return (
    <View style={[st.stat, style]}>
      <Text style={[st.statLabel, { color: th.tertiary }]}>{label}</Text>
      <Text style={[st.statValue, { color: th.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}


export default function GestureDraw() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const sidePanelW = 300;
  const canvasHeight = wide
    ? Math.max(420, height - 150)
    : Math.max(320, Math.min(Math.round(height * 0.52), 560));

  // --- tools & brush state (persisted in meta, additive — strokes key untouched)
  const [tool, setTool] = useState('brush'); // brush|highlighter|eraser|line|rect|circle
  const [slotA, setSlotA] = useState(DEFAULT_META.slotA);
  const [slotB, setSlotB] = useState(DEFAULT_META.slotB);
  const [activeSlot, setActiveSlot] = useState('A');
  const [brushSize, setBrushSize] = useState(DEFAULT_META.brushSize);
  const [eraserSize, setEraserSize] = useState(DEFAULT_META.eraserSize);
  const [opacity, setOpacity] = useState(DEFAULT_META.opacity);
  const [smoothing, setSmoothing] = useState(DEFAULT_META.smoothing);
  const [bg, setBg] = useState(DEFAULT_META.bg);
  const [overlay, setOverlay] = useState(DEFAULT_META.overlay);
  const [transparent, setTransparent] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [symmetry, setSymmetry] = useState(false);
  const [darkUI, setDarkUI] = useState(false);
  const [leftHand, setLeftHand] = useState(false);
  const [paletteTab, setPaletteTab] = useState('Default');
  const [recents, setRecents] = useState([]);
  const [favs, setFavs] = useState([]);
  const [tutorialSeen, setTutorialSeen] = useState(true);
  const [deviceNoteSeen, setDeviceNoteSeen] = useState(true);

  // --- ui state
  const [showPoints, setShowPoints] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [lastStrokePts, setLastStrokePts] = useState([]);
  const [scrollOn, setScrollOn] = useState(true);
  const [canvasBase, setCanvasBase] = useState({ w: 0, h: 0 });
  const [previewShape, setPreviewShape] = useState(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [touchPt, setTouchPt] = useState(null);
  const [snack, setSnack] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [storageKB, setStorageKB] = useState('—');
  const [hexInput, setHexInput] = useState('');
  const [colorSheet, setColorSheet] = useState(false);
  const [canvasSheet, setCanvasSheet] = useState(false);
  const [menuSheet, setMenuSheet] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [droppedNote, setDroppedNote] = useState(false);
  const [store, setStore] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [, force] = useReducer((n) => n + 1, 0);

  const th = darkUI ? DARK : T;
  const strokeColor = activeSlot === 'A' ? slotA : slotB;
  const setStrokeColor = (c) => (activeSlot === 'A' ? setSlotA(c) : setSlotB(c));
  const activeSize = tool === 'eraser' ? eraserSize : brushSize;
  const setActiveSize = (v) => (tool === 'eraser' ? setEraserSize(v) : setBrushSize(v));
  const effOpacity = tool === 'highlighter' ? Math.min(opacity, 45) : opacity;

  const data = useRef({
    drawing: false,
    allStrokes: [],
    currentPoints: [],
    totalPoints: 0,
    start: { x: 0, y: 0 },
    shapeStart: null,
    eraseCandidate: -1,
    hist: { undo: [], redo: [] },
    raf: null,
  });
  const cfg = useRef({ tool, zoom, panMode, eraserSize });
  cfg.current = { tool, zoom, panMode, eraserSize };
  const brushRef = useRef({ color: strokeColor, size: brushSize, opacity: effOpacity, smoothing });
  brushRef.current = { color: strokeColor, size: brushSize, opacity: effOpacity, smoothing };

  const shotRef = useRef(null);
  const snackTimer = useRef(null);
  const metaLoaded = useRef(false);
  const sketchApplied = useRef(false);
  const storeRef = useRef(null);
  storeRef.current = store;
  const canvasRef = useRef({ bg, overlay, transparent, photoUri });
  canvasRef.current = { bg, overlay, transparent, photoUri };

  const showSnack = useCallback((msg, action) => {
    try {
      clearTimeout(snackTimer.current);
    } catch { /* ignore */ }
    setSnack(action ? { msg, actionLabel: action.label, onAction: action.fn } : { msg });
    snackTimer.current = setTimeout(() => setSnack(null), action ? 6000 : 2800);
  }, []);

  useEffect(() => () => {
    if (data.current.raf) cancelAnimationFrame(data.current.raf);
    try {
      clearTimeout(snackTimer.current);
    } catch { /* ignore */ }
  }, []);

  const scheduleRender = useCallback(() => {
    const d = data.current;
    if (d.raf) return;
    if (typeof requestAnimationFrame === 'undefined') { force(); return; }
    d.raf = requestAnimationFrame(() => { d.raf = null; force(); });
  }, []);

  const recount = useCallback(() => {
    const d = data.current;
    d.totalPoints = d.allStrokes.reduce((n, s) => n + (s.pts?.length || 0), 0);
  }, []);

  // Strokes: bare array under the ORIGINAL key (exporter + old builds keep working),
  // plus a mirror of the open sketch inside the multi-sketch store.
  const persistStrokes = useCallback(() => {
    try {
      const strokes = data.current.allStrokes.slice(-MAX_STORED_STROKES);
      const json = JSON.stringify(strokes);
      AsyncStorage.setItem(STORAGE_KEY, json).catch(() => {
        showSnack('Low storage — sketch could not be saved.');
      });
      const s = storeRef.current;
      if (s && s.currentId) {
        const c = canvasRef.current;
        const next = {
          ...s,
          sketches: s.sketches.map((x) => (x.id === s.currentId
            ? { ...x, strokes, bg: c.bg, overlay: c.overlay, transparent: c.transparent, photoUri: c.photoUri || null, updated: Date.now() }
            : x)),
        };
        storeRef.current = next;
        setStore(next);
        saveSketchSoon(next);
      }
      AsyncStorage.getItem(META_KEY).catch(() => null).then((raw) => {
        const metaLen = raw ? raw.length : 0;
        setStorageKB(`${((json.length + metaLen) / 1024).toFixed(1)} KB`);
      }).catch(() => {});
    } catch {
      showSnack('Low storage — sketch could not be saved.');
    }
  }, [showSnack]);

  // Meta (settings): separate additive key, debounced.
  useEffect(() => {
    if (!metaLoaded.current) return;
    saveMetaSoon({
      bg, overlay, transparent, slotA, slotB, activeSlot,
      brushSize, eraserSize, opacity, smoothing, symmetry,
      darkUI, leftHand, paletteTab, recents, favs,
      tutorialSeen, deviceNoteSeen,
    });
  }, [bg, overlay, transparent, slotA, slotB, activeSlot, brushSize, eraserSize,
    opacity, smoothing, symmetry, darkUI, leftHand, paletteTab, recents, favs,
    tutorialSeen, deviceNoteSeen]);

  // Load: legacy bare-array strokes + meta.
  useEffect(() => {
    let alive = true;
    loadMeta().then((m) => {
      if (!alive) return;
      // Per-sketch background wins once the sketch store has applied it.
      if (!sketchApplied.current) {
        setBg(m.bg); setOverlay(m.overlay); setTransparent(!!m.transparent);
      }
      setSlotA(m.slotA); setSlotB(m.slotB); setActiveSlot(m.activeSlot);
      setBrushSize(m.brushSize); setEraserSize(m.eraserSize); setOpacity(m.opacity);
      setSmoothing(m.smoothing); setSymmetry(!!m.symmetry); setDarkUI(!!m.darkUI);
      setLeftHand(!!m.leftHand); setPaletteTab(m.paletteTab || 'Default');
      setRecents(m.recents || []); setFavs(m.favs || []);
      setTutorialSeen(!!m.tutorialSeen); setDeviceNoteSeen(!!m.deviceNoteSeen);
      metaLoaded.current = true;
    }).catch(() => { metaLoaded.current = true; });
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          const arr = Array.isArray(parsed) ? parsed : parsed?.strokes;
          if (!Array.isArray(arr)) return;
          const d = data.current;
          d.allStrokes = arr.slice(-MAX_STORED_STROKES);
          recount();
          const last = d.allStrokes[d.allStrokes.length - 1];
          setLastStrokePts(last ? last.pts : []);
          setShowHint(d.allStrokes.length === 0);
          force();
        } catch { /* corrupt copy — start fresh */ }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [recount]);

  // Multi-sketch store (lite gallery). Legacy key already mirrors the open
  // sketch, so whichever async load wins, the content agrees.
  useEffect(() => {
    let alive = true;
    ensureSketchStore().then(({ store: s, seeded }) => {
      if (!alive) return;
      storeRef.current = s;
      setStore(s);
      if (seeded) {
        sketchApplied.current = true;
        return;
      }
      const cur = s.sketches.find((x) => x.id === s.currentId) || s.sketches[0];
      if (!cur) return;
      const d = data.current;
      d.allStrokes = [...(cur.strokes || [])];
      d.hist = { undo: [], redo: [] };
      setUndoCount(0);
      setRedoCount(0);
      recount();
      const last = d.allStrokes[d.allStrokes.length - 1];
      setLastStrokePts(last ? last.pts : []);
      setShowHint(d.allStrokes.length === 0);
      setBg(cur.bg || '#ffffff');
      setOverlay(cur.overlay || 'dots');
      setTransparent(!!cur.transparent);
      setPhotoUri(cur.photoUri || null);
      sketchApplied.current = true;
      force();
    }).catch(() => {});
    return () => { alive = false; };
  }, [recount]);

  const openSketchContent = useCallback((sk) => {
    const d = data.current;
    d.allStrokes = [...(sk.strokes || [])];
    d.currentPoints = [];
    d.drawing = false;
    d.shapeStart = null;
    d.hist = { undo: [], redo: [] };
    setUndoCount(0);
    setRedoCount(0);
    setPreviewShape(null);
    setHighlightIdx(-1);
    recount();
    const last = d.allStrokes[d.allStrokes.length - 1];
    setLastStrokePts(last ? last.pts : []);
    setShowHint(d.allStrokes.length === 0);
    setBg(sk.bg || '#ffffff');
    setOverlay(sk.overlay || 'dots');
    setTransparent(!!sk.transparent);
    setPhotoUri(sk.photoUri || null);
    sketchApplied.current = true;
    force();
  }, [recount]);

  const openSketch = useCallback((id) => {
    const s = storeRef.current;
    if (!s || id === s.currentId) return;
    const sk = s.sketches.find((x) => x.id === id);
    if (!sk) return;
    const next = { ...s, currentId: id };
    storeRef.current = next;
    setStore(next);
    saveSketchSoon(next);
    openSketchContent(sk);
    persistStrokes();
  }, [openSketchContent, persistStrokes]);

  const newSketch = useCallback(() => {
    const s = storeRef.current;
    if (!s) return;
    const sk = {
      id: uid(), name: uniqueName(s.sketches, `Sketch ${s.sketches.length + 1}`,
      ), created: Date.now(), updated: Date.now(),
      strokes: [], bg: '#ffffff', overlay: 'dots', transparent: false, photoUri: null,
    };
    const next = { ...s, currentId: sk.id, sketches: [...s.sketches, sk] };
    storeRef.current = next;
    setStore(next);
    saveSketchSoon(next);
    openSketchContent(sk);
    persistStrokes();
    showSnack(`Started “${sk.name}” — previous sketch autosaved.`);
  }, [openSketchContent, persistStrokes, showSnack]);

  const duplicateSketch = useCallback((id) => {
    const s = storeRef.current;
    const src = s?.sketches.find((x) => x.id === id);
    if (!s || !src) return;
    const copy = {
      ...src,
      id: uid(),
      name: uniqueName(s.sketches, `${src.name} (copy)`),
      created: Date.now(), updated: Date.now(),
      strokes: (src.strokes || []).map((t) => ({ ...t, pts: [...t.pts] })),
    };
    const next = { ...s, currentId: copy.id, sketches: [...s.sketches, copy] };
    storeRef.current = next;
    setStore(next);
    saveSketchSoon(next);
    openSketchContent(copy);
    persistStrokes();
  }, [openSketchContent, persistStrokes]);

  const deleteSketch = useCallback((id) => {
    const s = storeRef.current;
    const idx = s?.sketches.findIndex((x) => x.id === id) ?? -1;
    if (!s || idx < 0) return;
    const sk = s.sketches[idx];
    Alert.alert(`Delete “${sk.name}”?`, 'This removes the sketch from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          let remaining = s.sketches.filter((x) => x.id !== id);
          if (!remaining.length) {
            const fresh = {
              id: uid(), name: 'Sketch 1', created: Date.now(), updated: Date.now(),
              strokes: [], bg: '#ffffff', overlay: 'dots', transparent: false, photoUri: null,
            };
            remaining = [fresh];
          }
          const nextId = id === s.currentId ? remaining[0].id : s.currentId;
          const next = { ...s, sketches: remaining, currentId: nextId };
          storeRef.current = next;
          setStore(next);
          saveSketchSoon(next);
          if (id === s.currentId) {
            openSketchContent(remaining[0]);
            persistStrokes();
          }
          showSnack('Sketch deleted', {
            label: 'UNDO', fn: () => {
              const cur = storeRef.current;
              const list = [...cur.sketches];
              list.splice(Math.min(idx, list.length), 0, sk);
              const restored = { ...cur, sketches: list, currentId: sk.id };
              storeRef.current = restored;
              setStore(restored);
              saveSketchSoon(restored);
              openSketchContent(sk);
              persistStrokes();
            },
          });
        },
      },
    ]);
  }, [openSketchContent, persistStrokes, showSnack]);

  const saveRename = useCallback((id) => {
    const s = storeRef.current;
    const name = renameText.trim().slice(0, 40);
    if (!s || !name) {
      setRenamingId(null);
      return;
    }
    const next = {
      ...s,
      sketches: s.sketches.map((x) => (x.id === id
        ? { ...x, name: uniqueName(s.sketches.filter((y) => y.id !== id), name), updated: Date.now() }
        : x)),
    };
    storeRef.current = next;
    setStore(next);
    saveSketchSoon(next);
    setRenamingId(null);
  }, [renameText]);

  // --- history (in-memory; survives rotation + short backgrounding)
  const syncHist = useCallback(() => {
    const h = data.current.hist;
    setUndoCount(h.undo.length);
    setRedoCount(h.redo.length);
  }, []);

  const pushAction = useCallback((a) => {
    const h = data.current.hist;
    h.undo.push(a);
    if (h.undo.length > MAX_HISTORY) {
      h.undo.shift();
      setDroppedNote(true);
    }
    h.redo.length = 0;
    syncHist();
  }, [syncHist]);

  const applyInverse = useCallback((a) => {
    const d = data.current;
    if (a.t === 'add') {
      const i = d.allStrokes.indexOf(a.stroke);
      if (i >= 0) d.allStrokes.splice(i, 1);
    } else if (a.t === 'remove') {
      d.allStrokes.splice(Math.min(a.index, d.allStrokes.length), 0, a.stroke);
    } else if (a.t === 'clear') {
      d.allStrokes.push(...a.strokes);
    }
  }, []);

  const applyForward = useCallback((a) => {
    const d = data.current;
    if (a.t === 'add') {
      d.allStrokes.splice(Math.min(a.index, d.allStrokes.length), 0, a.stroke);
    } else if (a.t === 'remove') {
      const i = d.allStrokes.indexOf(a.stroke);
      if (i >= 0) d.allStrokes.splice(i, 1);
    } else if (a.t === 'clear') {
      d.allStrokes = [];
    }
  }, []);

  const afterMutation = useCallback(() => {
    const d = data.current;
    recount();
    const prev = d.allStrokes[d.allStrokes.length - 1];
    setLastStrokePts(prev ? prev.pts : []);
    if (d.allStrokes.length === 0) setShowHint(true);
    persistStrokes();
    force();
  }, [recount, persistStrokes]);

  const handleUndo = useCallback((steps = 1) => {
    const h = data.current.hist;
    let bgJump = null;
    for (let k = 0; k < steps && h.undo.length; k++) {
      const a = h.undo.pop();
      if (a.t === 'bg') bgJump = a.from;
      else applyInverse(a);
      h.redo.push(a);
    }
    if (bgJump !== null) setBg(bgJump);
    afterMutation();
    syncHist();
  }, [applyInverse, afterMutation, syncHist]);

  const handleRedo = useCallback((steps = 1) => {
    const h = data.current.hist;
    let bgJump = null;
    for (let k = 0; k < steps && h.redo.length; k++) {
      const a = h.redo.pop();
      if (a.t === 'bg') bgJump = a.to;
      else applyForward(a);
      h.undo.push(a);
    }
    if (bgJump !== null) setBg(bgJump);
    afterMutation();
    syncHist();
  }, [applyForward, afterMutation, syncHist]);

  const finishBrushStroke = useCallback(() => {
    const d = data.current;
    if (!d.drawing) return;
    d.drawing = false;
    if (d.currentPoints.length > 0) {
      const b = brushRef.current;
      const pts = decimate([...d.currentPoints], b.smoothing);
      const stroke = { pts, color: b.color, size: b.size, opacity: b.opacity };
      d.allStrokes.push(stroke);
      pushAction({ t: 'add', stroke, index: d.allStrokes.length - 1 });
      setLastStrokePts(pts);
      setRecents((r) => pushRecent(r, b.color));
    }
    d.currentPoints = [];
    setTouchPt(null);
    setScrollOn(true);
    afterMutation();
  }, [pushAction, afterMutation]);

  const commitShape = useCallback((kind, s, e) => {
    const pts = shapePoints(kind, s, e);
    if (!pts.length) return;
    const b = brushRef.current;
    const stroke = { pts, color: b.color, size: b.size, opacity: b.opacity };
    data.current.allStrokes.push(stroke);
    pushAction({ t: 'add', stroke, index: data.current.allStrokes.length - 1 });
    setLastStrokePts(pts);
    setRecents((r) => pushRecent(r, b.color));
    afterMutation();
  }, [pushAction, afterMutation]);

  const removeStrokeAt = useCallback((idx) => {
    const d = data.current;
    if (idx < 0 || idx >= d.allStrokes.length) return;
    const [stroke] = d.allStrokes.splice(idx, 1);
    pushAction({ t: 'remove', stroke, index: idx });
    afterMutation();
  }, [pushAction, afterMutation]);

  const previewShapeRef = useRef(null);
  previewShapeRef.current = previewShape;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (e) => {
      if (cfg.current.panMode) return false;
      const touches = e.nativeEvent.touches;
      if (touches && touches.length > 1) return false; // 2nd finger never draws
      return true;
    },
    onMoveShouldSetPanResponder: (e) => {
      if (cfg.current.panMode) return false;
      const touches = e.nativeEvent.touches;
      if (touches && touches.length > 1) return false;
      return true;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const c = cfg.current;
      const x = e.nativeEvent.locationX / c.zoom;
      const y = e.nativeEvent.locationY / c.zoom;
      const d = data.current;
      if (c.tool === 'eraser') {
        d.eraseCandidate = hitStroke(d.allStrokes, x, y, c.eraserSize / 2 + 6);
        setHighlightIdx(d.eraseCandidate);
        setTouchPt({ x, y });
        setScrollOn(false);
        setShowHint(false);
        force();
        return;
      }
      if (c.tool === 'line' || c.tool === 'rect' || c.tool === 'circle') {
        d.shapeStart = { x: Math.round(x), y: Math.round(y) };
        setPreviewShape({ kind: c.tool, s: d.shapeStart, e: d.shapeStart });
        setScrollOn(false);
        setShowHint(false);
        force();
        return;
      }
      d.drawing = true;
      d.start = { x, y };
      d.currentPoints = [{ x: Math.round(x), y: Math.round(y) }];
      setScrollOn(false);
      setShowHint(false);
      force();
    },
    onPanResponderMove: (_e, g) => {
      const c = cfg.current;
      const d = data.current;
      if (c.tool === 'eraser') return; // hover highlight handled by onTouchMove
      if (d.shapeStart) {
        const e2 = { x: Math.round(d.shapeStart.x + g.dx / c.zoom), y: Math.round(d.shapeStart.y + g.dy / c.zoom) };
        setPreviewShape({ kind: c.tool, s: d.shapeStart, e: e2 });
        return;
      }
      if (!d.drawing) return;
      const p = { x: Math.round(d.start.x + g.dx / c.zoom), y: Math.round(d.start.y + g.dy / c.zoom) };
      const prev = d.currentPoints[d.currentPoints.length - 1];
      if (prev && prev.x === p.x && prev.y === p.y) return;
      d.currentPoints.push(p);
      scheduleRender();
    },
    onPanResponderRelease: (e) => {
      const c = cfg.current;
      const d = data.current;
      if (c.tool === 'eraser') {
        const x = e.nativeEvent.locationX / c.zoom;
        const y = e.nativeEvent.locationY / c.zoom;
        const idx = hitStroke(d.allStrokes, x, y, c.eraserSize / 2 + 6);
        setHighlightIdx(-1);
        setTouchPt(null);
        d.eraseCandidate = -1;
        setScrollOn(true);
        if (idx >= 0) removeStrokeAt(idx);
        else force();
        return;
      }
      if (d.shapeStart) {
        const kind = c.tool;
        const s = d.shapeStart;
        const e2 = previewShapeRef.current?.e || s;
        d.shapeStart = null;
        setPreviewShape(null);
        setScrollOn(true);
        commitShape(kind, s, e2);
        return;
      }
      finishBrushStroke();
    },
    onPanResponderTerminate: () => {
      const d = data.current;
      d.shapeStart = null;
      d.eraseCandidate = -1;
      setPreviewShape(null);
      setHighlightIdx(-1);
      setTouchPt(null);
      finishBrushStroke();
    },
  }), [finishBrushStroke, commitShape, removeStrokeAt, scheduleRender]);

  // Eraser hover highlight follows the finger (grant + release do the work).
  const onEraserTouchMove = (e) => {
    if (cfg.current.tool !== 'eraser' || cfg.current.panMode) return;
    const x = e.nativeEvent.locationX / cfg.current.zoom;
    const y = e.nativeEvent.locationY / cfg.current.zoom;
    setTouchPt({ x, y });
    setHighlightIdx(hitStroke(data.current.allStrokes, x, y, cfg.current.eraserSize / 2 + 6));
  };

  const handleClear = () => {
    const d = data.current;
    if (!d.allStrokes.length) return;
    Alert.alert('Clear the whole canvas?', 'Only strokes are removed — background and settings stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: () => {
          const strokes = [...d.allStrokes];
          d.allStrokes = [];
          pushAction({ t: 'clear', strokes });
          setShowHint(true);
          setLastStrokePts([]);
          afterMutation();
          showSnack('Canvas cleared', { label: 'UNDO', fn: () => handleUndo(1) });
        },
      },
    ]);
  };

  const applyBg = (next) => {
    if (next === bg && !transparent) return;
    pushAction({ t: 'bg', from: bg, to: next });
    setBg(next);
    setTransparent(false);
    syncHist();
    if (lowContrast(strokeColor, next)) {
      showSnack('That background hides the current brush — try a contrasting color.');
    }
  };

  const setZoomClamped = (z) => {
    const nz = Math.max(0.5, Math.min(2, Math.round(z * 100) / 100));
    setZoom(nz);
    if (nz === 1) setPanMode(false);
    showSnack(`Zoom ${Math.round(nz * 100)}%`);
  };

  const captureShot = async (format = 'png') => {
    if (!shotRef.current) {
      showSnack('Nothing to export yet.');
      return null;
    }
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      const uri = await shotRef.current.capture();
      return uri;
    } finally {
      setExporting(false);
    }
  };

  const handleSharePNG = async () => {
    try {
      const uri = await captureShot();
      if (!uri) return;
      const ok = await Sharing.isAvailableAsync().catch(() => false);
      if (!ok) {
        showSnack('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share sketch' });
    } catch {
      showSnack('Export failed — try again.');
    }
  };

  const handleSaveGallery = async () => {
    try {
      const uri = await captureShot();
      if (!uri) return;
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        showSnack('Allow photo access to save to the gallery.');
        return;
      }
      await MediaLibrary.createAssetAsync(uri);
      showSnack('Saved to gallery ✓');
    } catch {
      showSnack('Could not save — storage may be full.');
    }
  };

  const handleBackupJSON = async () => {
    try {
      const payload = {
        app: 'jibunai', system: 'gesture', v: 1,
        exportedAt: new Date().toISOString(),
        bg, overlay, strokes: data.current.allStrokes,
      };
      const base = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!base) throw new Error('no-storage');
      const uri = `${base}gesture-sketch-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload));
      const ok = await Sharing.isAvailableAsync().catch(() => false);
      if (ok) await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Back up sketch' });
      else showSnack(`Backup written to cache.`);
    } catch {
      showSnack('Backup failed — storage may be full.');
    }
  };

  const pickPhoto = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showSnack('Allow photo access to trace over a photo.');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.85, allowsEditing: false,
      });
      if (r.canceled || !r.assets?.[0]?.uri) return;
      canvasRef.current = { ...canvasRef.current, photoUri: r.assets[0].uri, transparent: false };
      setPhotoUri(r.assets[0].uri);
      setTransparent(false);
      persistStrokes();
      showSnack('Photo added — draw over it. Included in PNG export.');
    } catch {
      showSnack('Could not open the photo picker.');
    }
  };

  const removePhoto = () => {
    canvasRef.current = { ...canvasRef.current, photoUri: null };
    setPhotoUri(null);
    persistStrokes();
  };

  const applyHex = () => {    let h = hexInput.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) {
      showSnack('Use a hex like #1a1a2e.');
      return;
    }
    const c = `#${h}`;
    setStrokeColor(c);
    setRecents((r) => pushRecent(r, c));
    setHexInput('');
  };

  const d = data.current;
  const lastStroke = d.allStrokes[d.allStrokes.length - 1];
  const lastPt = d.currentPoints.length
    ? d.currentPoints[d.currentPoints.length - 1]
    : lastStroke ? lastStroke.pts[lastStroke.pts.length - 1] : null;
  const currentStroke = d.drawing
    ? d.currentPoints.length
    : lastStroke ? lastStroke.pts.length : null;
  const totalPoints = d.totalPoints + (d.drawing ? d.currentPoints.length : 0);

  const stats = [
    { label: 'strokes', val: d.allStrokes.length },
    { label: 'total points', val: totalPoints },
    { label: 'this stroke', val: currentStroke ?? '—' },
    { label: 'last point', val: lastPt ? `${lastPt.x}, ${lastPt.y}` : '—' },
  ];

  const liveStroke = d.drawing && d.currentPoints.length > 0
    ? { pts: brushRef.current.smoothing === 'off' ? d.currentPoints : decimate(d.currentPoints, brushRef.current.smoothing), color: strokeColor, size: brushSize, opacity: effOpacity }
    : null;

  const previewPts = previewShape ? shapePoints(previewShape.kind, previewShape.s, previewShape.e) : [];
  const cx = canvasBase.w / 2 || 0;
  const W = canvasBase.w;
  const H = canvasHeight;

  const swatches = PALETTES[paletteTab] || PALETTES.Default;

  const toolbar = (
    <View style={[st.toolbar, { backgroundColor: th.white, borderBottomColor: th.border }, leftHand && { flexDirection: 'row-reverse' }]}>
      {[
        ['brush', 'brush'], ['highlighter', 'marker'], ['eraser', 'eraser'],
        ['line', 'line'], ['circle', 'circle'], ['rect', 'square'],
      ].map(([key, label]) => (
        <ChipButton key={key} label={label} th={th} active={tool === key} tone="info" onPress={() => { setTool(key); setScrollOn(true); }} />
      ))}
      <ToolDivider th={th} />
      <ChipButton label="color" th={th} active={colorSheet} onPress={() => setColorSheet(true)} />
      <View style={[st.previewDot, { backgroundColor: strokeColor, width: Math.min(28, 10 + activeSize), height: Math.min(28, 10 + activeSize), borderRadius: Math.min(14, (10 + activeSize) / 2) }]} />
      <View style={st.toolbarEnd}>
        <ChipButton label="undo" th={th} disabled={undoCount === 0} onPress={() => handleUndo(1)} onLongPress={() => handleUndo(5)} />
        <ChipButton label="redo" th={th} disabled={redoCount === 0} onPress={() => handleRedo(1)} onLongPress={() => handleRedo(5)} />
        <ChipButton label="canvas" th={th} onPress={() => setCanvasSheet(true)} />
        <ChipButton label="menu" th={th} onPress={() => setMenuSheet(true)} />
      </View>
    </View>
  );

  const sizeRow = (
    <View style={[st.sizeBar, { backgroundColor: th.white, borderBottomColor: th.border }]}>
      {!!store && (
        <Pressable onPress={() => setMenuSheet(true)} hitSlop={6}>
          <Text style={[st.sizeText, { color: th.green, minWidth: 0 }]} numberOfLines={1}>
            {(store.sketches.find((x) => x.id === store.currentId)?.name || 'Sketch').slice(0, 18)}
          </Text>
        </Pressable>
      )}
      <Text style={[st.toolLabel, { color: th.soft }]}>{tool === 'eraser' ? 'Eraser' : tool === 'highlighter' ? 'Marker' : 'Brush'}</Text>
      <Pressable onPress={() => setActiveSize(Math.max(1, activeSize - 1))} hitSlop={8} style={[st.step, { borderColor: th.borderSecondary }]}>
        <Text style={[st.stepText, { color: th.text }]}>−</Text>
      </Pressable>
      <Text style={[st.sizeText, { color: th.text }]}>{activeSize}px · {effOpacity}%</Text>
      <Pressable onPress={() => setActiveSize(Math.min(100, activeSize + 1))} hitSlop={8} style={[st.step, { borderColor: th.borderSecondary }]}>
        <Text style={[st.stepText, { color: th.text }]}>+</Text>
      </Pressable>
      {QUICK_SIZES.map((s) => (
        <ChipButton key={s.value} label={s.label} th={th} active={activeSize === s.value} onPress={() => setActiveSize(s.value)} />
      ))}
      <ToolDivider th={th} />
      <Pressable onPress={() => setOpacity(Math.max(5, opacity - 5))} hitSlop={8} style={[st.step, { borderColor: th.borderSecondary }]}>
        <Text style={[st.stepText, { color: th.text }]}>−</Text>
      </Pressable>
      <Text style={[st.sizeText, { color: th.text }]}>α</Text>
      <Pressable onPress={() => setOpacity(Math.min(100, opacity + 5))} hitSlop={8} style={[st.step, { borderColor: th.borderSecondary }]}>
        <Text style={[st.stepText, { color: th.text }]}>+</Text>
      </Pressable>
      {panMode && (
        <ChipButton label="pan ✓" th={th} active tone="info" onPress={() => setPanMode(false)} />
      )}
      {zoom !== 1 && !panMode && (
        <ChipButton label={`pan ${Math.round(zoom * 100)}%`} th={th} onPress={() => setPanMode(true)} />
      )}
    </View>
  );

  const renderStrokes = (list, prefix) => list.map((s, i) => (
    <React.Fragment key={`${prefix}${i}`}>
      <StrokeShape stroke={s} />
      {symmetry && (
        <G transform={`translate(${2 * cx} 0) scale(-1 1)`}>
          <StrokeShape stroke={s} />
        </G>
      )}
    </React.Fragment>
  ));

  const canvas = (
    <View
      style={[st.canvasWrap, { height: canvasHeight, backgroundColor: transparent ? th.white : bg }]}
      onLayout={(e) => {
        const { width: w } = e.nativeEvent.layout;
        setCanvasBase((prev) => (Math.abs(prev.w - w) > 1 ? { w, h: canvasHeight } : prev));
      }}
    >
      <ScrollView
        horizontal
        scrollEnabled={panMode && zoom > 1}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
      >
        <ScrollView
          scrollEnabled={panMode && zoom > 1}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View
            {...panResponder.panHandlers}
            onTouchMove={onEraserTouchMove}
            style={{ width: Math.max(W, W * zoom), height: H * Math.max(1, zoom) }}
          >
            {W > 0 && (
              <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={{ width: W * zoom, height: H * Math.max(1, zoom), backgroundColor: transparent && !photoUri ? 'transparent' : bg }}>
                {!!photoUri && (
                  <RNImage
                    source={{ uri: photoUri }}
                    style={{ position: 'absolute', top: 0, left: 0, width: W * zoom, height: H * Math.max(1, zoom) }}
                    resizeMode="cover"
                  />
                )}
                <Svg width={W * zoom} height={H * Math.max(1, zoom)} pointerEvents="none">
                  <Defs>
                    <Pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                      <Circle cx="1.5" cy="1.5" r="1" fill={darkUI ? '#3a3a48' : '#e5e1d8'} />
                    </Pattern>
                    <Pattern id="gridlines" width="24" height="24" patternUnits="userSpaceOnUse">
                      <Path d="M24 0H0V24" stroke={darkUI ? '#33333f' : '#e5e1d8'} strokeWidth="1" fill="none" />
                    </Pattern>
                    <Pattern id="ruled" width="24" height="28" patternUnits="userSpaceOnUse">
                      <Path d="M0 27H24" stroke={darkUI ? '#33333f' : '#d8e2ef'} strokeWidth="1" />
                      <Circle cx="1.5" cy="1.5" r="1" fill={darkUI ? '#3a3a48' : '#e5e1d8'} />
                    </Pattern>
                    <Pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">
                      <Rect width="16" height="16" fill={darkUI ? '#20202c' : '#ffffff'} />
                      <Rect width="8" height="8" fill={darkUI ? '#2c2c3a' : '#e3e3e3'} />
                      <Rect x="8" y="8" width="8" height="8" fill={darkUI ? '#2c2c3a' : '#e3e3e3'} />
                    </Pattern>
                  </Defs>

                  {transparent ? (
                    <Rect width={W * zoom} height={H * Math.max(1, zoom)} fill="url(#checker)" />
                  ) : (
                    <Rect width={W * zoom} height={H * Math.max(1, zoom)} fill={bg} />
                  )}
                  {!exporting && overlay !== 'none' && !transparent && (
                    <Rect
                      width={W * zoom}
                      height={H * Math.max(1, zoom)}
                      fill={overlay === 'grid' ? 'url(#gridlines)' : overlay === 'lines' ? 'url(#ruled)' : 'url(#dots)'}
                    />
                  )}

                  <G scale={zoom}>
                    {renderStrokes(d.allStrokes, 's')}
                    {liveStroke && <StrokeShape stroke={liveStroke} />}
                    {previewPts.length > 1 && (
                      <Path d={toPath(previewPts)} stroke={strokeColor} strokeWidth={brushSize} strokeDasharray="6 4" strokeLinecap="round" fill="none" opacity={0.7} />
                    )}
                    {previewPts.length === 1 && (
                      <Circle cx={previewPts[0].x} cy={previewPts[0].y} r={brushSize / 2 + 0.5} fill={strokeColor} opacity={0.7} />
                    )}
                    {highlightIdx >= 0 && d.allStrokes[highlightIdx] && (
                      <Path
                        d={toPath(d.allStrokes[highlightIdx].pts.length > 1 ? d.allStrokes[highlightIdx].pts : [d.allStrokes[highlightIdx].pts[0], { x: d.allStrokes[highlightIdx].pts[0].x + 0.5, y: d.allStrokes[highlightIdx].pts[0].y + 0.5 }])}
                        stroke="#e00" strokeWidth={(d.allStrokes[highlightIdx].size || 3) + 5}
                        strokeLinecap="round" fill="none" opacity={0.35}
                      />
                    )}
                    {showPoints && d.allStrokes.map((s, i) => <StrokeDots key={`d${i}`} pts={s.pts} th={th} />)}
                    {tool === 'eraser' && touchPt && !exporting && (
                      <Circle cx={touchPt.x} cy={touchPt.y} r={eraserSize / 2} stroke={th.text} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
                    )}
                  </G>
                </Svg>
              </ViewShot>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {showHint && (
        <View style={st.hintWrap} pointerEvents="none">
          <View style={[st.hint, { borderColor: th.border, backgroundColor: darkUI ? 'rgba(30,30,40,0.85)' : 'rgba(255,255,255,0.85)' }]}>
            <Text style={[st.hintText, { color: th.tertiary }]}>draw anything here</Text>
          </View>
        </View>
      )}
    </View>
  );

  const statsGrid = (
    <View style={[st.statsWrap, wide && st.statsWrapSide, { backgroundColor: th.panel, borderBottomColor: th.border }]}>
      {stats.map(({ label, val }) => (
        <StatCard
          key={label}
          label={label}
          value={String(val)}
          th={th}
          style={wide ? { width: '48%' } : { flexGrow: 1, flexBasis: width < 520 ? '46%' : '22%' }}
        />
      ))}
    </View>
  );

  const pointsPanel = showPoints && lastStrokePts.length > 0 && (
    <View style={[st.pointsWrap, wide && { flex: 1 }]}>
      <Text style={[st.pointsTitle, { color: th.soft }]}>Points in last stroke</Text>
      <ScrollView
        nestedScrollEnabled
        style={{ maxHeight: wide ? undefined : 180 }}
        contentContainerStyle={st.pointsGrid}
        showsVerticalScrollIndicator
      >
        {lastStrokePts.map((p, i) => {
          const first = i === 0;
          const last = i === lastStrokePts.length - 1;
          return (
            <View
              key={i}
              style={[
                st.pointChip,
                { backgroundColor: th.warm, borderColor: th.border },
                first && { backgroundColor: th.infoBg, borderColor: th.green },
                last && !first && { backgroundColor: th.successBg, borderColor: th.success },
              ]}
            >
              <Text
                style={[
                  st.pointChipText,
                  { color: th.soft },
                  first && { color: th.green },
                  last && !first && { color: th.success },
                ]}
              >
                {p.x},{p.y}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: th.page }]}>
      <StatusBar barStyle={darkUI ? 'light-content' : 'dark-content'} backgroundColor={th.white} />
      <ScrollView
        scrollEnabled={scrollOn && !(panMode && zoom > 1)}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? 28 : 0 }}
      >
        {!deviceNoteSeen && (
          <Pressable
            onPress={() => setDeviceNoteSeen(true)}
            style={[st.noteBanner, { backgroundColor: th.infoBg }]}
          >
            <Text style={[st.noteText, { color: th.green }]}>
              Saved on this device only — export anything you want to keep. Uninstalling removes sketches. (tap to dismiss)
            </Text>
          </Pressable>
        )}

        {toolbar}
        {sizeRow}

        {wide ? (
          <View style={st.wideRow}>
            {canvas}
            <View style={[st.sidePanel, { width: sidePanelW, height: canvasHeight, borderLeftColor: th.border, backgroundColor: th.panel }]}>
              {statsGrid}
              {pointsPanel}
            </View>
          </View>
        ) : (
          <>
            {canvas}
            {statsGrid}
            {pointsPanel}
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 8, padding: 14, flexWrap: 'wrap' }}>
          <ChipButton label={showPoints ? 'hide points' : 'show points'} th={th} tone="info" active={showPoints} onPress={() => setShowPoints((p) => !p)} />
          <ChipButton label={`smooth: ${smoothing}`} th={th} onPress={() => setSmoothing(SMOOTH_ORDER[(SMOOTH_ORDER.indexOf(smoothing) + 1) % SMOOTH_ORDER.length])} />
          <ChipButton label={symmetry ? 'symmetry ✓' : 'symmetry'} th={th} active={symmetry} tone="info" onPress={() => setSymmetry((v) => !v)} />
        </View>
        {droppedNote && (
          <Text style={{ paddingHorizontal: 16, paddingBottom: 12, fontSize: 11.5, color: th.tertiary }}>
            History is capped at {MAX_HISTORY} steps — oldest steps were dropped.
          </Text>
        )}
      </ScrollView>

      {snack && (
        <View style={st.snackWrap} pointerEvents="box-none">
          <View style={[st.snack, { backgroundColor: th.ink }]}>
            <Text style={[st.snackText, { color: darkUI ? '#14141c' : '#fff' }]} numberOfLines={2}>{snack.msg}</Text>
            {snack.onAction && (
              <Pressable onPress={() => { snack.onAction(); setSnack(null); }} hitSlop={8}>
                <Text style={st.snackAction}>{snack.actionLabel || 'UNDO'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Color sheet */}
      <Modal visible={colorSheet} transparent animationType="fade" onRequestClose={() => setColorSheet(false)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setColorSheet(false)} />
          <View style={[st.modal, { backgroundColor: th.white, maxHeight: '80%' }]}>
            <Text style={[st.modalTitle, { color: th.text }]}>Color</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {['A', 'B'].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setActiveSlot(s)}
                  style={[st.slotBtn, { borderColor: th.borderSecondary, backgroundColor: s === 'A' ? slotA : slotB }, activeSlot === s && { borderColor: th.green, borderWidth: 3 }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 3 }}>{s}</Text>
                </Pressable>
              ))}
              <Text style={{ fontSize: 12, color: th.soft, alignSelf: 'center' }}>two quick inks — tap to switch</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
              {Object.keys(PALETTES).map((p) => (
                <Pressable key={p} onPress={() => setPaletteTab(p)} style={[st.chip, { borderColor: th.borderSecondary }, paletteTab === p && { backgroundColor: th.warm, borderColor: th.green }]}>
                  <Text style={[st.chipText, { color: th.soft }]}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
              {swatches.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    setStrokeColor(c);
                    setRecents((r) => pushRecent(r, c));
                    if (activeSlot === 'A') setSlotA(c);
                    else setSlotB(c);
                  }}
                  onLongPress={() => setFavs((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c].slice(0, 12)))}
                  style={[st.swatch, { backgroundColor: c, borderColor: strokeColor.toLowerCase() === c.toLowerCase() ? th.green : th.borderSecondary }, strokeColor.toLowerCase() === c.toLowerCase() && { transform: [{ scale: 1.2 }] }]}
                />
              ))}
            </View>
            {!!recents.length && (
              <>
                <Text style={[st.toolLabel, { color: th.soft }]}>Recent</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 }}>
                  {recents.map((c) => (
                    <Pressable key={c} onPress={() => setStrokeColor(c)} style={[st.swatchSm, { backgroundColor: c, borderColor: th.borderSecondary }]} />
                  ))}
                </View>
              </>
            )}
            <Text style={[st.toolLabel, { color: th.soft }]}>Favorites (long-press a swatch to pin)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 }}>
              {favs.length === 0 && <Text style={{ fontSize: 12, color: th.tertiary }}>none yet</Text>}
              {favs.map((c) => (
                <Pressable key={c} onPress={() => setStrokeColor(c)} onLongPress={() => setFavs((f) => f.filter((x) => x !== c))} style={[st.swatchSm, { backgroundColor: c, borderColor: th.green }]} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TextInput
                value={hexInput}
                onChangeText={setHexInput}
                placeholder="#1a1a2e"
                placeholderTextColor={th.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[st.hexInput, { borderColor: th.borderSecondary, color: th.text }]}
              />
              <Pressable onPress={applyHex} style={[st.hexBtn, { backgroundColor: th.green }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Set</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Canvas sheet: background, overlay, zoom */}
      <Modal visible={canvasSheet} transparent animationType="fade" onRequestClose={() => setCanvasSheet(false)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCanvasSheet(false)} />
          <View style={[st.modal, { backgroundColor: th.white }]}>
            <Text style={[st.modalTitle, { color: th.text }]}>Canvas</Text>
            <Text style={[st.toolLabel, { color: th.soft }]}>Background</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 }}>
              {BG_PRESETS.map((c) => (
                <Pressable key={c} onPress={() => applyBg(c)} style={[st.swatch, { backgroundColor: c, borderColor: bg === c && !transparent ? th.green : th.borderSecondary }]} />
              ))}
              <Pressable onPress={() => { setTransparent(true); showSnack('Transparent background — PNG export keeps it.'); }} style={[st.chip, { borderColor: th.borderSecondary }, transparent && { borderColor: th.green }]}>
                <Text style={[st.chipText, { color: th.soft }]}>transparent</Text>
              </Pressable>
            </View>
            <Text style={[st.toolLabel, { color: th.soft }]}>Overlay (screen only — hidden on export)</Text>            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' }}>
              {['dots', 'grid', 'lines', 'none'].map((o) => (
                <Pressable key={o} onPress={() => setOverlay(o)} style={[st.chip, { borderColor: th.borderSecondary }, overlay === o && { borderColor: th.green, backgroundColor: th.warm }]}>
                  <Text style={[st.chipText, { color: th.soft }]}>{o}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[st.toolLabel, { color: th.soft }]}>Trace photo (draw over it, included in export)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              <Pressable onPress={pickPhoto} style={[st.chip, { borderColor: th.borderSecondary }]}>
                <Text style={[st.chipText, { color: th.soft }]}>{photoUri ? 'Change photo…' : 'Add photo…'}</Text>
              </Pressable>
              {!!photoUri && (
                <Pressable onPress={removePhoto} style={[st.chip, { borderColor: th.borderSecondary }]}>
                  <Text style={[st.chipText, { color: th.danger }]}>Remove</Text>
                </Pressable>
              )}
            </View>
            <Text style={[st.toolLabel, { color: th.soft }]}>Zoom ({Math.round(zoom * 100)}%)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8, alignItems: 'center' }}>
              <Pressable onPress={() => setZoomClamped(zoom - 0.25)} style={[st.step, { borderColor: th.borderSecondary }]}>
                <Text style={[st.stepText, { color: th.text }]}>−</Text>
              </Pressable>
              <Pressable onPress={() => setZoomClamped(1)} style={[st.chip, { borderColor: th.borderSecondary }]}>
                <Text style={[st.chipText, { color: th.soft }]}>reset fit</Text>
              </Pressable>
              <Pressable onPress={() => setZoomClamped(zoom + 0.25)} style={[st.step, { borderColor: th.borderSecondary }]}>
                <Text style={[st.stepText, { color: th.text }]}>+</Text>
              </Pressable>
              <Pressable onPress={() => { setPanMode((v) => !v); }} style={[st.chip, { borderColor: th.borderSecondary }, panMode && { borderColor: th.green, backgroundColor: th.warm }]}>
                <Text style={[st.chipText, { color: th.soft }]}>{panMode ? 'pan: on (draw off)' : 'pan: off'}</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 11.5, color: th.tertiary }}>Zoomed in? Turn pan on to move around, off to keep drawing.</Text>
          </View>
        </View>
      </Modal>

      {/* Menu sheet: actions, settings, export */}
      <Modal visible={menuSheet} transparent animationType="fade" onRequestClose={() => setMenuSheet(false)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuSheet(false)} />
          <View style={[st.modal, { backgroundColor: th.white, maxHeight: '85%' }]}>
            <Text style={[st.modalTitle, { color: th.text }]}>Menu</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
            {!!store && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[st.toolLabel, { color: th.soft }]}>Sketches ({store.sketches.length})</Text>
                  <Pressable onPress={newSketch} style={[st.chip, { borderColor: th.green }]}>
                    <Text style={[st.chipText, { color: th.green }]}>+ New</Text>
                  </Pressable>
                </View>
                {store.sketches.map((sk) => {
                  const isCur = sk.id === store.currentId;
                  return (
                    <View key={sk.id} style={[st.skRow, isCur && { borderColor: th.green, backgroundColor: th.warm }]}>
                      {renamingId === sk.id ? (
                        <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TextInput
                            value={renameText}
                            onChangeText={setRenameText}
                            autoFocus
                            maxLength={40}
                            style={[st.hexInput, { borderColor: th.borderSecondary, color: th.text, flex: 1 }]}
                          />
                          <Pressable onPress={() => saveRename(sk.id)} style={[st.hexBtn, { backgroundColor: th.green }]}>
                            <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <>
                          <Pressable onPress={() => openSketch(sk.id)} style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[st.skName, { color: th.text }]} numberOfLines={1}>
                              {sk.name}{isCur ? ' ✓' : ''}
                            </Text>
                            <Text style={[st.skMeta, { color: th.tertiary }]}>
                              {(sk.strokes || []).length} strokes · {fmtWhen(sk.updated)}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => { setRenamingId(sk.id); setRenameText(sk.name); }} hitSlop={8} style={st.skBtn}>
                            <Text style={[st.skBtnText, { color: th.soft }]}>Rename</Text>
                          </Pressable>
                          <Pressable onPress={() => duplicateSketch(sk.id)} hitSlop={8} style={st.skBtn}>
                            <Text style={[st.skBtnText, { color: th.soft }]}>Copy</Text>
                          </Pressable>
                          <Pressable onPress={() => deleteSketch(sk.id)} hitSlop={8} style={st.skBtn}>
                            <Text style={[st.skBtnText, { color: th.danger }]}>Del</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  );
                })}
                <View style={st.menuDivider} />
              </>
            )}
            {[
              { label: 'Share as PNG', fn: () => { setMenuSheet(false); handleSharePNG(); } },
              { label: 'Save PNG to gallery', fn: () => { setMenuSheet(false); handleSaveGallery(); } },
              { label: 'Back up sketch (.json)', fn: () => { setMenuSheet(false); handleBackupJSON(); } },
              { label: 'Clear canvas…', danger: true, fn: () => { setMenuSheet(false); handleClear(); } },
            ].map((o) => (
              <Pressable key={o.label} onPress={o.fn} style={st.menuRow}>
                <Text style={[st.menuText, { color: o.danger ? th.danger : th.text }]}>{o.label}</Text>
              </Pressable>
            ))}
            <View style={st.menuDivider} />
            {[
              { label: `Dark interface ${darkUI ? '✓' : ''}`, fn: () => setDarkUI((v) => !v) },
              { label: `Left-handed toolbar ${leftHand ? '✓' : ''}`, fn: () => setLeftHand((v) => !v) },
              { label: 'Replay tutorial', fn: () => { setMenuSheet(false); setTutorialSeen(false); } },
            ].map((o) => (
              <Pressable key={o.label} onPress={o.fn} style={st.menuRow}>
                <Text style={[st.menuText, { color: th.text }]}>{o.label}</Text>
              </Pressable>
            ))}
            <Text style={{ fontSize: 11.5, color: th.tertiary, marginTop: 10 }}>
              Storage used: {storageKB} · capped at {MAX_STORED_STROKES} strokes · device only
            </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* First-run tutorial */}
      <Modal visible={!tutorialSeen} transparent animationType="fade" onRequestClose={() => setTutorialSeen(true)}>
        <View style={st.overlay}>
          <View style={[st.modal, { backgroundColor: th.white }]}>
            <Text style={[st.modalTitle, { color: th.text }]}>Quick gestures</Text>
            {[
              'One finger draws — a second finger mid-stroke is ignored.',
              'Eraser removes a whole stroke with one tap.',
              'Pinch is off: use Canvas → zoom, then pan mode to move.',
              'Hold undo to step back quickly. Clear always asks first.',
              'Menu → share PNG, save to gallery, or back up JSON.',
            ].map((t) => (
              <Text key={t} style={{ fontSize: 13.5, color: th.soft, marginBottom: 8 }}>• {t}</Text>
            ))}
            <Pressable onPress={() => setTutorialSeen(true)} style={[st.hexBtn, { backgroundColor: th.green, marginTop: 8, alignSelf: 'stretch', alignItems: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Start doodling</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const st = StyleSheet.create({
  safe: { flex: 1 },

  noteBanner: { paddingVertical: 8, paddingHorizontal: 14 },
  noteText: { fontSize: 12 },

  toolbar: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sizeBar: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolLabel: { fontSize: 12, letterSpacing: 0.3 },
  toolbarEnd: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  chip: {
    borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth * 2, backgroundColor: 'transparent',
  },
  chipText: { fontSize: 12.5 },
  divider: { width: StyleSheet.hairlineWidth * 2, height: 22 },
  step: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { fontSize: 16, fontWeight: '700' },
  sizeText: { fontSize: 12.5, fontWeight: '600', minWidth: 64, textAlign: 'center' },
  previewDot: { borderWidth: 1, borderColor: '#999' },

  canvasWrap: {
    width: '100%', overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: '#000',
  },
  hintWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hint: {
    borderWidth: 1, borderStyle: 'dashed',
    paddingVertical: 9, paddingHorizontal: 20, borderRadius: 22,
  },
  hintText: { fontSize: 13.5 },

  wideRow: { flexDirection: 'row' },
  sidePanel: { borderLeftWidth: StyleSheet.hairlineWidth * 2 },

  statsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsWrapSide: { justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { gap: 2, minWidth: 0 },
  statLabel: { fontSize: 11.5 },
  statValue: { fontSize: 16, fontWeight: '500' },

  pointsWrap: { paddingVertical: 12, paddingHorizontal: 16 },
  pointsTitle: { fontSize: 12.5, fontWeight: '500', marginBottom: 8 },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 6 },
  pointChip: {
    borderRadius: 5, paddingVertical: 3, paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pointChipText: { fontFamily: MONO, fontSize: 11.5 },

  snackWrap: { position: 'absolute', left: 16, right: 16, bottom: 24, alignItems: 'center' },
  snack: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  snackText: { fontSize: 13.5, flex: 1 },
  snackAction: { color: '#7ee2a8', fontWeight: '800', fontSize: 13 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center', padding: 22,
  },
  modal: { borderRadius: 18, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2 },
  swatchSm: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  slotBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  hexInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 12, fontSize: 14,
  },
  hexBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, justifyContent: 'center' },
  menuRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e4e0d6' },
  menuText: { fontSize: 15 },
  menuDivider: { height: 10 },
  skRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#e4e0d6', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6,
  },
  skName: { fontSize: 14, fontWeight: '700' },
  skMeta: { fontSize: 11.5, marginTop: 1 },
  skBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  skBtnText: { fontSize: 12, fontWeight: '700' },
});
