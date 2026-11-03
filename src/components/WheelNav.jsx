import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROUTE_META } from '../navigation/routeMeta';
import { systemForRoute } from '../systems/catalog';
import { useSystems } from '../systems/prefs';
import { C } from '../theme';

/* light palette — matches the rest of the app */
const SEG_A = '#ffffff';
const SEG_B = '#fbfaf7';
const SEG_BORDER = '#e4e0d6';
const SEG_SELECTED = '#e4f1ea';
const SEG_PICKED = 'rgba(45,106,79,0.16)';
const GLOW = '#2d6a4f';
const DISC = '#ffffff';

const POINTER = { w: 34, h: 17 };

/* ------------------------------- geometry -------------------------------- */

const normalize = (deg) => {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
};

/** signed distance in (-180, 180] */
const signed = (deg) => {
  const a = normalize(deg);
  return a > 180 ? a - 360 : a;
};

/** point on a circle, angle measured clockwise from 12 o'clock */
const polar = (cx, cy, r, deg) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

const segmentPath = (cx, cy, rOuter, rInner, a0, a1) => {
  const p1 = polar(cx, cy, rOuter, a0);
  const p2 = polar(cx, cy, rOuter, a1);
  const p3 = polar(cx, cy, rInner, a1);
  const p4 = polar(cx, cy, rInner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} `
    + `L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
};

const arcPath = (cx, cy, r, a0, a1) => {
  const p1 = polar(cx, cy, r, a0);
  const p2 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
};

/* --------------------------------- wheel --------------------------------- */

/** how long the wheel lingers on the chosen segment before it navigates */
const NAVIGATE_DELAY = 450;

/** how small the wheel is when it sits on the menu button */
const MORPH_SCALE = 0.12;

export default function WheelNav({
  open,
  activeKey,
  onSelect,
  onClose,
  navigateDelay = NAVIGATE_DELAY,
  origin = null,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { enabled } = useSystems();

  // Home + settings always ride the wheel; every other segment follows the
  // user's system choice (settings/home belong to no system → always shown).
  const tabs = useMemo(() => ROUTE_META.filter((r) => {
    if (r.key === 'home' || r.key === 'settings') return true;
    const sys = systemForRoute(r.key);
    if (!sys) return true;
    return enabled.includes(sys.key);
  }), [enabled]);
  const count = tabs.length;
  const step = 360 / count;

  /* -------------------------------- layout ------------------------------- */
  const readoutH = 58;
  const availH = height - insets.top - insets.bottom - readoutH - POINTER.h - 44;
  const D = Math.max(210, Math.min(width - 40, availH, 420));
  const R = D / 2;
  const rInner = R * 0.36;
  const rIcon = R * 0.73;
  const hubSize = rInner * 1.55;

  /* ------------------------------ animation ------------------------------ */
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const rotRef = useRef(0);

  /* the wheel grows out of the menu button — these carry it there and back */
  const morphX = useRef(new Animated.Value(0)).current;
  const morphY = useRef(new Animated.Value(0)).current;

  const [visible, setVisible] = useState(false);
  const [aligned, setAligned] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** key of the tab the wheel is about to open (set while it lingers) */
  const [pending, setPending] = useState(null);

  const alignedRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const startPointRef = useRef({ x: 0, y: 0 });
  const centerRef = useRef({ x: width / 2, y: height / 2 });
  /** centre of the wheel inside the overlay — used for the grow-out-of-the-button morph */
  const wheelCenterRef = useRef(null);
  const stageLayout = useRef({ x: 0, y: 0 });
  const wrapLayout = useRef({ x: 0, y: 0 });
  const openIndexRef = useRef(0);
  const prevAlignedRef = useRef(0);
  const navTimerRef = useRef(null);

  // one scale + lift per icon so the focused one can pop
  const iconScales = useMemo(() => tabs.map(() => new Animated.Value(1)), [tabs]);
  const iconLifts = useMemo(() => tabs.map(() => new Animated.Value(0)), [tabs]);

  /** index of the tab closest to the pointer for a given rotation */
  const alignIndexFor = useCallback((deg) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < count; i += 1) {
      const d = Math.abs(signed(i * step + deg));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }, [count, step]);

  /** rotation value that puts `index` exactly under the pointer */
  const rotationFor = useCallback(
    (index, from = rotRef.current) => from - signed(index * step + from),
    [step],
  );

  /** angle of a touch around the wheel centre + its distance from the centre */
  const pointerAt = useCallback((pageX, pageY) => {
    const { x: cx, y: cy } = centerRef.current;
    const dx = pageX - cx;
    const dy = pageY - cy;
    return {
      angle: normalize((Math.atan2(dx, -dy) * 180) / Math.PI),
      distance: Math.hypot(dx, dy),
    };
  }, []);

  const SNAP = reduceMotion ? 0 : 240;

  /** drop any scheduled navigation */
  const clearPending = useCallback(() => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    setPending(null);
  }, []);

  /** wait a beat on the chosen segment, then open it */
  const scheduleNavigate = useCallback((key) => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    setPending(key);
    navTimerRef.current = setTimeout(() => {
      navTimerRef.current = null;
      setPending(null);
      onSelect?.(key);
    }, navigateDelay);
  }, [navigateDelay, onSelect]);

  /* never leave a navigation hanging around */
  useEffect(() => () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
  }, []);

  /** snap the wheel to a tab and (optionally) go there */
  const commit = useCallback((index, navigate = true) => {
    const tab = tabs[index];
    if (!tab) return;
    // a new pick replaces whatever was about to open
    clearPending();
    setPicked(index);
    const target = rotationFor(index, rotRef.current);
    Animated.timing(rotation, {
      toValue: target,
      duration: SNAP,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        setPicked(-1);
        return;
      }
      if (navigate) {
        // the wheel stays on the segment for a moment before it navigates
        scheduleNavigate(tab.key);
      } else {
        setPicked(-1);
      }
    });
  }, [tabs, rotation, rotationFor, SNAP, clearPending, scheduleNavigate]);

  /* keep the highlight in sync with the rotation */
  useEffect(() => {
    const id = rotation.addListener(({ value }) => {
      rotRef.current = value;
      const idx = alignIndexFor(value);
      if (idx !== alignedRef.current) {
        alignedRef.current = idx;
        setAligned(idx);
      }
    });
    return () => rotation.removeListener(id);
  }, [rotation, alignIndexFor]);

  /* the focused icon pops up and grows — only the two that changed animate */
  useEffect(() => {
    const prev = prevAlignedRef.current;
    if (prev === aligned) return;
    prevAlignedRef.current = aligned;
    const dur = reduceMotion ? 0 : 200;
    const spring = (v, toValue) => Animated.spring(v, {
      toValue,
      // RN allows only one spring "family": speed/bounciness OR
      // tension/friction OR stiffness/damping/mass. Mixing them throws.
      friction: 6,
      tension: 150,
      useNativeDriver: true,
    }).start();
    const lift = (v, toValue) => Animated.timing(v, {
      toValue,
      duration: dur,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (iconScales[prev]) spring(iconScales[prev], 1);
    if (iconLifts[prev]) lift(iconLifts[prev], 0);
    if (iconScales[aligned]) spring(iconScales[aligned], 1.3);
    if (iconLifts[aligned]) lift(iconLifts[aligned], -8);
  }, [aligned, iconScales, iconLifts, reduceMotion]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  /* ------------------------------- open/close ---------------------------- */
  useEffect(() => {
    /* the wheel starts as a small disc sitting on the menu button and grows
       into the full wheel — that is the "circle becomes wheel" transition */
    const centre = wheelCenterRef.current;
    const morph = !reduceMotion && origin && centre;
    const fromX = morph ? origin.x - centre.x : 0;
    const fromY = morph ? origin.y - centre.y : 0;

    if (open) {
      setVisible(true);
      setPicked(-1);
      clearPending();
      const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
      openIndexRef.current = activeIndex;
      const target = rotationFor(activeIndex, rotRef.current);
      rotation.setValue(rotRef.current);
      const dur = reduceMotion ? 0 : 320;
      if (morph) {
        morphX.setValue(fromX);
        morphY.setValue(fromY);
        scale.setValue(MORPH_SCALE);
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 0 : 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotation, { toValue: target, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(morphX, { toValue: 0, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(morphY, { toValue: 0, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (visible) {
      // closing the wheel cancels anything that was about to open
      clearPending();
      const dur = reduceMotion ? 0 : 240;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: morph ? MORPH_SCALE : 0.9, duration: dur, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        // the wheel shrinks back into the button it came from
        Animated.timing(morphX, { toValue: fromX, duration: dur, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(morphY, { toValue: fromY, duration: dur, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ------------------------------ interaction ---------------------------- */
  const pan = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        draggingRef.current = false;
        startPointRef.current = { x: pageX, y: pageY };
        const p = pointerAt(pageX, pageY);
        lastAngleRef.current = p.angle;
        // cancel any snap that is still running
        rotation.stopAnimation();
        // touching the wheel cancels a navigation that was about to happen
        clearPending();
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const s = startPointRef.current;
        if (!draggingRef.current && Math.hypot(pageX - s.x, pageY - s.y) > 5) {
          draggingRef.current = true;
        }
        if (!draggingRef.current) return;
        const p = pointerAt(pageX, pageY);
        // a touch at the very centre has no meaningful angle — ignore it
        if (p.distance < rInner * 0.55) return;
        const delta = signed(p.angle - lastAngleRef.current);
        lastAngleRef.current = p.angle;
        const next = rotRef.current + delta;
        rotRef.current = next;
        rotation.setValue(next);
      },
      onPanResponderRelease: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        if (draggingRef.current) {
          // released → snap, and go to the tab it settled on
          const idx = alignIndexFor(rotRef.current);
          commit(idx, idx !== openIndexRef.current);
          return;
        }
        // a tap goes straight to the tab under the finger
        const p = pointerAt(pageX, pageY);
        if (p.distance < rInner * 0.55) return;
        commit(alignIndexFor(rotRef.current - p.angle), true);
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
      },
    }),
    [alignIndexFor, pointerAt, rotation, commit, rInner, clearPending],
  );

  /* escape / arrow keys (web) */
  useEffect(() => {
    if (Platform.OS !== 'web' || !open || typeof document === 'undefined') return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const idx = (alignIndexFor(rotRef.current) + dir + count) % count;
        const target = rotationFor(idx, rotRef.current);
        rotRef.current = target;
        rotation.setValue(target);
        openIndexRef.current = idx;
      }
      if (e.key === 'Enter') commit(alignIndexFor(rotRef.current), true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, count, alignIndexFor, rotationFor, rotation, commit, onClose]);

  /* ------------------------------- rendering ------------------------------ */

  // RN requires transform rotations to be degree strings ("12deg").
  // The native animated module converts them to radians, so this stays on the UI thread.
  const wheelRotation = rotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
    extrapolate: 'extend',
  });
  const counterRotation = rotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['360deg', '-360deg'],
    extrapolate: 'extend',
  });

  const cx = D / 2;
  const cy = D / 2;
  const gap = Math.min(1.4, step * 0.05);

  const segments = tabs.map((tab, i) => {
    const a0 = i * step - step / 2 + gap;
    const a1 = i * step + step / 2 - gap;
    const isAligned = i === aligned;
    const isPicked = i === picked;
    const fill = isPicked ? SEG_PICKED : isAligned ? SEG_SELECTED : i % 2 === 0 ? SEG_A : SEG_B;
    const stroke = isAligned || isPicked ? GLOW : SEG_BORDER;
    const strokeWidth = isAligned || isPicked ? 2 : 1;
    return { tab, i, a0, a1, fill, stroke, strokeWidth, isAligned };
  });

  const alignedTab = tabs[aligned] || tabs[0];
  // only show every label when the segments are wide enough to hold them
  const arcPerSegment = (2 * Math.PI * rIcon) / count;
  const showAllLabels = arcPerSegment >= 62;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
        {/* swallows every touch so the page underneath stays inactive */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
        />

        <View
          style={styles.stage}
          pointerEvents="box-none"
          onLayout={(e) => { stageLayout.current = e.nativeEvent.layout; }}
        >
          {/* what is under the pointer right now */}
          <View style={styles.readout}>
            <View style={styles.readoutIcon}>
              <Feather name={alignedTab.icon} size={13} color={C.green} />
            </View>
            <View style={styles.readoutText}>
              <Text style={styles.readoutLabel} numberOfLines={1}>
                {alignedTab.label}
              </Text>
              <Text style={styles.readoutGroup} numberOfLines={1}>
                {pending ? 'opening…' : alignedTab.group}
              </Text>
            </View>
          </View>

          {/* fixed pointer */}
          <Svg width={POINTER.w} height={POINTER.h} pointerEvents="none">
            <Path
              d={`M 2 2 L ${POINTER.w - 2} 2 L ${POINTER.w / 2} ${POINTER.h} Z`}
              fill={GLOW}
            />
          </Svg>

          <View
            style={{ width: D, height: D }}
            onLayout={(e) => {
              wrapLayout.current = e.nativeEvent.layout;
              const st = stageLayout.current;
              const w = wrapLayout.current;
              centerRef.current = { x: st.x + w.x + D / 2, y: st.y + w.y + D / 2 };
              wheelCenterRef.current = { x: st.x + w.x + D / 2, y: st.y + w.y + D / 2 };
            }}
          >
            {/* the wheel */}
            <Animated.View
              {...pan.panHandlers}
              accessible
              accessibilityRole="menu"
              accessibilityLabel={`Navigation wheel. ${alignedTab.label} selected.`}
              accessibilityHint="Rotate the wheel to choose a destination"
              accessibilityActions={[{ name: 'activate', label: `Open ${alignedTab.label}` }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'activate') commit(aligned, true);
              }}
              style={[
                styles.wheel,
                {
                  width: D,
                  height: D,
                  borderRadius: D / 2,
                  // a solid disc so Android can cast the elevation shadow
                  backgroundColor: DISC,
                  // it grows out of the menu button, so it travels as it opens
                  transform: [{ translateX: morphX }, { translateY: morphY }, { scale }, { rotate: wheelRotation }],
                },
              ]}
            >
              <Svg width={D} height={D} pointerEvents="none">
                {segments.map((seg) => (
                  <Path
                    key={seg.tab.key}
                    d={segmentPath(cx, cy, R - 1, rInner, seg.a0, seg.a1)}
                    fill={seg.fill}
                    stroke={seg.stroke}
                    strokeWidth={seg.strokeWidth}
                  />
                ))}
                {segments.filter((s) => s.isAligned || s.isPicked).map((seg) => (
                  <Path
                    key={`glow-${seg.tab.key}`}
                    d={arcPath(cx, cy, R + 2, seg.a0, seg.a1)}
                    stroke={GLOW}
                    strokeWidth={4}
                    strokeOpacity={0.18}
                    fill="none"
                  />
                ))}
                <Path
                  d={`M ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 1 0 ${cx + rInner} ${cy} `
                    + `A ${rInner} ${rInner} 0 1 0 ${cx - rInner} ${cy}`}
                  stroke={SEG_BORDER}
                  strokeWidth={1}
                  fill="none"
                />
              </Svg>

              {tabs.map((tab, i) => {
                const pos = polar(cx, cy, rIcon, i * step);
                const isAligned = i === aligned;
                return (
                  <Animated.View
                    key={tab.key}
                    pointerEvents="none"
                    style={[
                      styles.icon,
                      {
                        left: pos.x - 16,
                        top: pos.y - 16,
                        // counter-rotate first so the artwork stays upright,
                        // then scale and lift the focused one
                        transform: [
                          { rotate: counterRotation },
                          { scale: iconScales[i] },
                          { translateY: iconLifts[i] },
                        ],
                      },
                    ]}
                  >
                    <Feather
                      name={tab.icon}
                      size={19}
                      color={isAligned || i === picked ? C.green : C.soft}
                    />
                    {showAllLabels ? (
                      <Text style={[styles.iconLabel, isAligned && { color: C.green }]} numberOfLines={1}>
                        {tab.label}
                      </Text>
                    ) : null}
                  </Animated.View>
                );
              })}
            </Animated.View>

            {/* hub — outside the pan view so it keeps its own taps */}
            <Animated.View
              pointerEvents="box-none"
              style={[styles.hubWrap, { transform: [{ translateX: morphX }, { translateY: morphY }, { scale }] }]}
            >
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
                style={({ pressed }) => [
                  styles.hub,
                  {
                    width: hubSize,
                    height: hubSize,
                    borderRadius: hubSize / 2,
                    transform: [{ scale: pressed ? 0.93 : 1 }],
                  },
                ]}
              >
                <Feather name="x" size={24} color="#ffffff" />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 30 },
  // the current page stays visible behind the wheel — only dimmed
  backdrop: { backgroundColor: 'rgba(246,245,240,0.88)' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderLt,
    backgroundColor: C.surface,
    marginBottom: 10,
    minWidth: 170,
    shadowColor: C.dark,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  readoutIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.greenLt,
  },
  readoutText: { flex: 1 },
  readoutLabel: { color: C.dark, fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
  readoutGroup: {
    color: C.ph,
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  wheel: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1a1a2e',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  icon: {
    position: 'absolute',
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    color: C.ph,
    fontSize: 7.5,
    letterSpacing: 0.4,
    marginTop: 1,
    maxWidth: 46,
  },

  hubWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hub: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.green,
    shadowColor: C.green,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
