import React, {
  useRef, useState, useEffect, useReducer, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, ScrollView, Pressable, PanResponder, StyleSheet,
  useWindowDimensions, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import Svg, {
  Path, Circle, Defs, Pattern, Rect,
} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';


const STORAGE_KEY = 'gesturedraw:strokes';
const MAX_STORED_STROKES = 50;


const COLORS = [
  { value: '#1a1a2e', label: 'Dark' },
  { value: '#185FA5', label: 'Blue' },
  { value: '#0F6E56', label: 'Teal' },
  { value: '#993C1D', label: 'Coral' },
  { value: '#993556', label: 'Pink' },
];

const SIZES = [
  { value: 2, label: 'thin' },
  { value: 3, label: 'mid' },
  { value: 6, label: 'thick' },
];

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
  dot: 'rgba(180,100,60,0.7)',
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

const dotColor = (i, n) => (i === 0 ? T.info : i === n - 1 ? T.success : T.dot);


const StrokeShape = memo(function StrokeShape({ stroke }) {
  const { pts, color, size } = stroke;
  if (pts.length === 1) {
    return <Circle cx={pts[0].x} cy={pts[0].y} r={size / 2 + 0.5} fill={color} />;
  }
  return (
    <Path
      d={toPath(pts)}
      stroke={color}
      strokeWidth={size}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
});

const StrokeDots = memo(function StrokeDots({ pts }) {
  return pts.map((p, i) => (
    <Circle key={i} cx={p.x} cy={p.y} r={i === 0 || i === pts.length - 1 ? 4 : 3} fill={dotColor(i, pts.length)} />
  ));
});


function ToolDivider() {
  return <View style={st.divider} />;
}

function ChipButton({ label, onPress, active, tone = 'neutral', disabled, style }) {
  const activeBg = tone === 'info' ? T.infoBg : T.warm;
  const activeBorder = tone === 'info' ? T.green : '#aaa';
  const activeText = tone === 'info' ? T.green : T.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [
        st.chip,
        active && { backgroundColor: activeBg, borderColor: activeBorder },
        pressed && !active && { backgroundColor: T.warm },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[st.chipText, active && { color: activeText }]}>{label}</Text>
    </Pressable>
  );
}

function StatCard({ label, value, style }) {
  return (
    <View style={[st.stat, style]}>
      <Text style={st.statLabel}>{label}</Text>
      <Text style={st.statValue} numberOfLines={1}>{value}</Text>
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

  const [strokeColor, setStrokeColor] = useState(COLORS[0].value);
  const [strokeSize, setStrokeSize] = useState(3);
  const [showPoints, setShowPoints] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [lastStrokePts, setLastStrokePts] = useState([]);
  const [scrollOn, setScrollOn] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [, force] = useReducer((n) => n + 1, 0);

  const data = useRef({
    drawing: false,
    allStrokes: [],
    currentPoints: [],
    totalPoints: 0,
    start: { x: 0, y: 0 },
    raf: null,
  });
  const settings = useRef({ color: strokeColor, size: strokeSize });
  settings.current = { color: strokeColor, size: strokeSize };

  const scheduleRender = useCallback(() => {
    const d = data.current;
    if (d.raf) return;
    if (typeof requestAnimationFrame === 'undefined') { force(); return; }
    d.raf = requestAnimationFrame(() => { d.raf = null; force(); });
  }, []);

  useEffect(() => () => {
    if (data.current.raf) cancelAnimationFrame(data.current.raf);
  }, []);

  // Strokes live in a ref (no re-render per touch) — persist them so a
  // navigation away doesn't wipe the drawing. Capped to stay small.
  const persistStrokes = useCallback(() => {
    try {
      const all = data.current.allStrokes.slice(-MAX_STORED_STROKES);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all)).catch(() => {});
    } catch { /* storage full or unavailable — drawing still works in memory */ }
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) return;
          const d = data.current;
          d.allStrokes = arr.slice(-MAX_STORED_STROKES);
          d.totalPoints = d.allStrokes.reduce((n, s) => n + (s.pts?.length || 0), 0);
          const last = d.allStrokes[d.allStrokes.length - 1];
          setLastStrokePts(last ? last.pts : []);
          setShowHint(d.allStrokes.length === 0);
          force();
        } catch { /* corrupt copy — start fresh */ }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const finishStroke = useCallback(() => {
    const d = data.current;
    if (!d.drawing) return;
    d.drawing = false;
    if (d.currentPoints.length > 0) {
      const pts = [...d.currentPoints];
      d.allStrokes.push({ pts, color: settings.current.color, size: settings.current.size });
      d.totalPoints += pts.length;
      setLastStrokePts(pts);
    }
    d.currentPoints = [];
    setScrollOn(true);
    persistStrokes();
    force();
  }, [persistStrokes]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const d = data.current;
      const x = Math.round(e.nativeEvent.locationX);
      const y = Math.round(e.nativeEvent.locationY);
      d.drawing = true;
      d.start = { x, y };
      d.currentPoints = [{ x, y }];
      setScrollOn(false);
      setShowHint(false);
      force();
    },
    onPanResponderMove: (_e, g) => {
      const d = data.current;
      if (!d.drawing) return;
      const p = { x: Math.round(d.start.x + g.dx), y: Math.round(d.start.y + g.dy) };
      const prev = d.currentPoints[d.currentPoints.length - 1];
      if (prev && prev.x === p.x && prev.y === p.y) return;
      d.currentPoints.push(p);
      scheduleRender();
    },
    onPanResponderRelease: finishStroke,
    onPanResponderTerminate: finishStroke,
  }), [finishStroke, scheduleRender]);

  const handleClear = () => {
    const d = data.current;
    d.allStrokes = [];
    d.currentPoints = [];
    d.totalPoints = 0;
    d.drawing = false;
    setShowHint(true);
    setLastStrokePts([]);
    persistStrokes();
    force();
  };

  const handleUndo = () => {
    const d = data.current;
    const popped = d.allStrokes.pop();
    if (!popped) return;
    d.totalPoints -= popped.pts.length;
    const prev = d.allStrokes[d.allStrokes.length - 1];
    setLastStrokePts(prev ? prev.pts : []);
    if (d.allStrokes.length === 0) setShowHint(true);
    persistStrokes();
    force();
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
    ? { pts: d.currentPoints, color: strokeColor, size: strokeSize }
    : null;

  const toolbar = (
    <View style={st.toolbar}>
      <Text style={st.toolLabel}>Color</Text>
      <View style={st.colorRow}>
        {COLORS.map((c) => {
          const sel = strokeColor === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => setStrokeColor(c.value)}
              hitSlop={6}
              accessibilityRole="radio"
              accessibilityLabel={c.label}
              accessibilityState={{ selected: sel }}
              style={[
                st.colorBtn,
                { backgroundColor: c.value, borderColor: sel ? T.text : 'transparent' },
                sel && { transform: [{ scale: 1.2 }] },
              ]}
            />
          );
        })}
      </View>

      <ToolDivider />

      <Text style={st.toolLabel}>Size</Text>
      <View style={st.sizeRow}>
        {SIZES.map((s) => (
          <ChipButton
            key={s.value}
            label={s.label}
            active={strokeSize === s.value}
            onPress={() => setStrokeSize(s.value)}
          />
        ))}
      </View>

      <ToolDivider />

      <ChipButton
        label="show points"
        tone="info"
        active={showPoints}
        onPress={() => setShowPoints((p) => !p)}
      />

      <View style={st.toolbarEnd}>
        <ChipButton label="undo" disabled={d.allStrokes.length === 0} onPress={handleUndo} />
        <ChipButton label="clear" onPress={handleClear} />
      </View>
    </View>
  );

  const canvas = (
    <View
      style={[st.canvasWrap, { height: canvasHeight }, wide && { flex: 1 }]}
      onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      {...panResponder.panHandlers}
    >
      {canvasSize.w > 0 && (
        <Svg width={canvasSize.w} height={canvasSize.h} pointerEvents="none">
          <Defs>
            <Pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <Circle cx="1.5" cy="1.5" r="1" fill="#e5e1d8" />
            </Pattern>
          </Defs>
          <Rect width={canvasSize.w} height={canvasSize.h} fill="url(#grid)" />

          {d.allStrokes.map((s, i) => <StrokeShape key={i} stroke={s} />)}
          {liveStroke && <StrokeShape stroke={liveStroke} />}

          {showPoints && d.allStrokes.map((s, i) => <StrokeDots key={`d${i}`} pts={s.pts} />)}
          {showPoints && liveStroke && liveStroke.pts.map((p, i) => (
            <Circle key={`l${i}`} cx={p.x} cy={p.y} r={3} fill={i === 0 ? T.info : T.dot} />
          ))}
        </Svg>
      )}

      {showHint && (
        <View style={st.hintWrap} pointerEvents="none">
          <View style={st.hint}>
            <Text style={st.hintText}>draw anything here</Text>
          </View>
        </View>
      )}
    </View>
  );

  const statsGrid = (
    <View style={[st.statsWrap, wide && st.statsWrapSide]}>
      {stats.map(({ label, val }) => (
        <StatCard
          key={label}
          label={label}
          value={String(val)}
          style={wide ? { width: '48%' } : { flexGrow: 1, flexBasis: width < 520 ? '46%' : '22%' }}
        />
      ))}
    </View>
  );

  const pointsPanel = showPoints && lastStrokePts.length > 0 && (
    <View style={[st.pointsWrap, wide && { flex: 1 }]}>
      <Text style={st.pointsTitle}>Points in last stroke</Text>
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
                first && { backgroundColor: T.infoBg, borderColor: T.green },
                last && !first && { backgroundColor: T.successBg, borderColor: T.success },
              ]}
            >
              <Text
                style={[
                  st.pointChipText,
                  first && { color: T.green },
                  last && !first && { color: T.success },
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
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.white} />
      <ScrollView
        scrollEnabled={scrollOn}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? 28 : 0 }}
      >
        {toolbar}

        {wide ? (
          <View style={st.wideRow}>
            {canvas}
            <View style={[st.sidePanel, { width: sidePanelW, height: canvasHeight }]}>
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
      </ScrollView>
    </SafeAreaView>
  );
}


const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.page },

  toolbar: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border,
    backgroundColor: T.white,
  },
  toolLabel: { fontSize: 12, color: T.soft, letterSpacing: 0.3 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 3 },
  colorBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  sizeRow: { flexDirection: 'row', gap: 6 },
  divider: { width: StyleSheet.hairlineWidth * 2, height: 22, backgroundColor: T.border },
  toolbarEnd: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  chip: {
    borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth * 2, borderColor: T.borderSecondary, backgroundColor: 'transparent',
  },
  chipText: { fontSize: 12.5, color: T.soft },

  canvasWrap: {
    width: '100%', backgroundColor: T.white, overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: '#000',
  },
  hintWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hint: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: T.border,
    paddingVertical: 9, paddingHorizontal: 20, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)',
  },
  hintText: { fontSize: 13.5, color: T.tertiary },

  wideRow: { flexDirection: 'row' },
  sidePanel: { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: T.border, backgroundColor: T.panel },

  statsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border, backgroundColor: T.panel,
  },
  statsWrapSide: { justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { gap: 2, minWidth: 0 },
  statLabel: { fontSize: 11.5, color: T.tertiary },
  statValue: { fontSize: 16, fontWeight: '500', color: T.text },

  pointsWrap: { paddingVertical: 12, paddingHorizontal: 16 },
  pointsTitle: { fontSize: 12.5, fontWeight: '500', color: T.soft, marginBottom: 8 },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 6 },
  pointChip: {
    borderRadius: 5, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: T.warm,
    borderWidth: StyleSheet.hairlineWidth * 2, borderColor: T.border,
  },
  pointChipText: { fontFamily: MONO, fontSize: 11.5, color: T.soft },
});