import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Animated, Alert,
  StyleSheet, useWindowDimensions, Platform, StatusBar,
  KeyboardAvoidingView, RefreshControl, ActivityIndicator, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import {
  Syne_400Regular, Syne_600SemiBold, Syne_700Bold, Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import {
  DMSans_400Regular, DMSans_500Medium, DMSans_400Regular_Italic,
} from '@expo-google-fonts/dm-sans';



import useOfflineCollection from '../hooks/useOfflineCollection';
import { TTL } from '../api/resources';
import { findTrackFor, loadLibrary } from '../player/library';
import { isEngineReady, playQueue, subscribePlayer } from '../player/engine';

const FAV_KEY = 'musicvibes:favorites';

const C = {
  bg: '#f6f5f0',
  surface: '#ffffff',
  surfaceUp: '#eceae3',
  border: '#d8d4cc',
  borderHov: '#c3bdb0',
  accent: '#2d6a4f',
  accentDim: '#245741',
  accentGlow: 'rgba(45,106,79,0.15)',
  ink: '#1a1a2e',
  muted: '#7a7567',
  dimmer: '#a8a396',
  danger: '#c0392b',
  dangerDim: 'rgba(192,57,43,0.12)',
  dangerBorder: 'rgba(192,57,43,0.30)',
};

const F = {
  syneReg: 'Syne_400Regular',
  syneSemi: 'Syne_600SemiBold',
  syne: 'Syne_700Bold',
  syneHeavy: 'Syne_800ExtraBold',
  sans: 'DMSans_400Regular',
  sansMed: 'DMSans_500Medium',
  sansItalic: 'DMSans_400Regular_Italic',
};

const DEFAULT_COLOR = '#10b981';
const PRESETS = ['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#0ea5e9', '#a855f7', '#2d6a4f', '#ec4899'];
const EMPTY_FORM = { artist: '', track: '', mood: '', color: DEFAULT_COLOR };
const MIN_CARD = 300;
const GAP = 18;

const BAR_PROPS = [
  { dur: 800, delay: 0 },
  { dur: 1100, delay: 150 },
  { dur: 700, delay: 300 },
  { dur: 1300, delay: 100 },
];

const shadow = (h = 6, o = 0.08, r = 16, color = '#1a1a2e') => Platform.select({
  ios: { shadowColor: color, shadowOffset: { width: 0, height: h }, shadowOpacity: o, shadowRadius: r },
  android: { elevation: Math.max(1, Math.round(h * 0.7)) },
  default: {},
});


const isValidHex = (v) => /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(v || '');
const fullHex = (v) => (v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);


function FadeUp({ children, delay = 0, distance = 16, duration = 400, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [a, delay, duration]);
  return (
    <Animated.View
      style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

function Btn({ label, onPress, primary, disabled, loading, small, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        st.btn,
        small && st.btnSmall,
        primary
          ? { backgroundColor: pressed ? C.accentDim : C.accent, borderColor: pressed ? C.accentDim : C.accent }
          : { backgroundColor: pressed ? C.surfaceUp : 'transparent', borderColor: pressed ? C.borderHov : C.border },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={primary ? '#fff' : C.muted} style={{ marginRight: 6 }} />}
      <Text style={[st.btnText, small && { fontSize: 12.5 }, { color: primary ? '#fff' : C.muted }]}>{label}</Text>
    </Pressable>
  );
}

function IconBtn({ children, onPress, danger, disabled, label }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        st.iconBtn,
        danger && { backgroundColor: C.dangerDim, borderColor: C.dangerBorder },
        pressed && { backgroundColor: danger ? C.danger : C.borderHov, borderColor: danger ? C.danger : C.borderHov, transform: [{ scale: 1.08 }] },
        disabled && { opacity: 0.45 },
      ]}
    >
      {children}
    </Pressable>
  );
}

function Field({ label, children, style }) {
  return (
    <View style={[st.field, style]}>
      <Text style={st.label}>{label}</Text>
      {children}
    </View>
  );
}

function ColorPicker({ value, onChange, compact }) {
  const valid = isValidHex(value);
  return (
    <View style={{ gap: compact ? 6 : 10 }}>
      <View style={st.colorRow}>
        <View style={[st.swatch, { backgroundColor: valid ? value : DEFAULT_COLOR }]} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="#10b981"
          placeholderTextColor={C.dimmer}
          maxLength={7}
          autoCapitalize="none"
          autoCorrect={false}
          style={[st.input, compact && st.inputCompact, { flex: 1 }, !valid && !!value && { borderColor: C.danger }]}
          accessibilityLabel="Accent colour hex code"
        />
      </View>
      <View style={st.presetRow}>
        {PRESETS.map((p) => {
          const sel = value.toLowerCase() === p;
          return (
            <Pressable
              key={p}
              onPress={() => onChange(p)}
              hitSlop={4}
              accessibilityLabel={`Use ${p}`}
              style={[st.preset, { backgroundColor: p }, sel && st.presetSel]}
            />
          );
        })}
      </View>
    </View>
  );
}

const Equalizer = memo(function Equalizer({ color }) {
  const vals = useRef(BAR_PROPS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = vals.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(BAR_PROPS[i].delay),
      Animated.timing(v, { toValue: 1, duration: BAR_PROPS[i].dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: BAR_PROPS[i].dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [vals]);

  const H = 18;
  return (
    <View style={st.barGroup}>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            st.bar,
            {
              height: H,
              backgroundColor: color,
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [(H * 0.6) / 2, 0] }) },
                { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
});

function SkeletonCard({ width }) {
  const o = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.55, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[st.skeleton, { width, opacity: o }]} />;
}

function AddButton({ open, onPress }) {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) { ring.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.timing(ring, {
      toValue: 1, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [open, ring]);

  return (
    <View>
      {!open && (
        <Animated.View
          pointerEvents="none"
          style={[
            st.pulseRing,
            {
              opacity: ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.0, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
            },
          ]}
        />
      )}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          st.addBtn,
          open
            ? { backgroundColor: pressed ? C.border : C.surfaceUp, borderColor: pressed ? C.borderHov : C.border }
            : { backgroundColor: pressed ? C.accentDim : C.accent, borderColor: pressed ? C.accentDim : C.accent },
          pressed && { transform: [{ translateY: -1 }] },
        ]}
      >
        {({ pressed }) => (
          <Text style={[st.addBtnText, { color: open ? (pressed ? C.ink : C.muted) : '#fff' }]}>
            {open ? '✕ Close' : '+ Add Track'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function ToastItem({ t }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 250, useNativeDriver: true }).start(); }, [a]);
  return (
    <Animated.View
      style={[
        st.toast,
        {
          backgroundColor: t.err ? '#fdecea' : '#e4f1ea',
          borderColor: t.err ? C.dangerBorder : 'rgba(45,106,79,0.35)',
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <Text style={{ color: t.err ? C.danger : C.accent, fontSize: 14 }}>{t.err ? '✗' : '✓'}</Text>
      <Text style={[st.toastText, { color: t.err ? C.danger : C.accent }]}>{t.msg}</Text>
    </Animated.View>
  );
}


const MusicCard = memo(function MusicCard({
  vibe, index, width, isEditing, editForm, setEditForm, editErr, saving, deleting,
  onStartEdit, onCancelEdit, onSubmitEdit, onDelete,
  isFav, isPlaying, onToggleFav, onPlay,
}) {
  const accent = isValidHex(vibe.color) ? fullHex(vibe.color) : C.accent;
  const dotBg = `${accent}28`;

  const lift = useRef(new Animated.Value(0)).current;
  const pressTo = (v) => Animated.spring(lift, { toValue: v, friction: 7, tension: 120, useNativeDriver: true }).start();

  return (
    <FadeUp delay={Math.min(index, 12) * 50} style={{ width }}>
      <Animated.View
        style={{ transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }}
      >
        <Pressable
          onPressIn={() => !isEditing && pressTo(1)}
          onPressOut={() => pressTo(0)}
          onLongPress={() => !isEditing && onStartEdit(vibe)}
          delayLongPress={350}
          accessibilityHint="Long press to edit"
          style={[
            st.card,
            { borderColor: isEditing ? accent : C.border },
            isEditing && { ...shadow(10, 0.14, 24, accent) },
          ]}
        >
          {isEditing ? (
            <View style={{ width: '100%' }}>
              <View style={st.inlineFields}>
                <TextInput
                  value={editForm.artist}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, artist: v }))}
                  placeholder="Artist"
                  placeholderTextColor={C.dimmer}
                  style={[st.input, st.inputCompact, { flexBasis: 120, flexGrow: 1 }]}
                  accessibilityLabel="Artist"
                />
                <TextInput
                  value={editForm.track}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, track: v }))}
                  placeholder="Track"
                  placeholderTextColor={C.dimmer}
                  style={[st.input, st.inputCompact, { flexBasis: 120, flexGrow: 1 }]}
                  accessibilityLabel="Track"
                />
                <TextInput
                  value={editForm.mood}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, mood: v }))}
                  placeholder="Mood / vibe"
                  placeholderTextColor={C.dimmer}
                  style={[st.input, st.inputCompact, { flexBasis: 180, flexGrow: 2 }]}
                  accessibilityLabel="Mood"
                />
              </View>
              <View style={{ marginTop: 8 }}>
                <ColorPicker compact value={editForm.color} onChange={(v) => setEditForm((p) => ({ ...p, color: v }))} />
              </View>

              {!!editErr && (
                <View style={[st.errorBanner, { marginTop: 10, paddingVertical: 8 }]}>
                  <Text style={st.errorText}>⚠ {editErr}</Text>
                </View>
              )}

              <View style={[st.formActions, { marginTop: 12 }]}>
                <Btn primary small label={saving ? 'Saving…' : 'Update'} loading={saving} disabled={saving} onPress={() => onSubmitEdit(vibe.id)} />
                <Btn small label="Cancel" onPress={onCancelEdit} />
              </View>
            </View>
          ) : (
            <>
              <View style={[st.dot, { backgroundColor: dotBg }]}>
                <Equalizer color={accent} />
              </View>

              <View style={st.info}>
                <Text style={st.artist} numberOfLines={1}>{vibe.artist}</Text>
                <Text style={st.track} numberOfLines={1}>{vibe.track}</Text>
                {!!vibe.mood && <Text style={st.mood} numberOfLines={1}>{vibe.mood}</Text>}
              </View>

              <View style={st.cardActions}>
                <IconBtn label={isPlaying ? 'Now playing' : `Play ${vibe.track}`} onPress={() => onPlay(vibe)}>
                  <Feather name={isPlaying ? 'volume-2' : 'play'} size={13} color={isPlaying ? C.accent : C.dimmer} />
                </IconBtn>
                <IconBtn label={isFav ? 'Unfavorite' : 'Favorite'} onPress={() => onToggleFav(vibe.id)}>
                  <Feather name="heart" size={13} color={isFav ? C.danger : C.dimmer} />
                </IconBtn>
                <IconBtn label="Edit track" onPress={() => onStartEdit(vibe)}>
                  <Text style={{ fontSize: 12, color: C.dimmer }}>✏</Text>
                </IconBtn>
                <IconBtn label="Delete track" danger disabled={deleting} onPress={() => onDelete(vibe)}>
                  {deleting
                    ? <ActivityIndicator size="small" color={C.danger} style={{ transform: [{ scale: 0.65 }] }} />
                    : <Text style={{ fontSize: 12, color: C.danger }}>✕</Text>}
                </IconBtn>
              </View>
            </>
          )}
        </Pressable>
      </Animated.View>
    </FadeUp>
  );
});


export default function MusicVibes() {
  const [fontsLoaded] = useFonts({
    [F.syneReg]: Syne_400Regular,
    [F.syneSemi]: Syne_600SemiBold,
    [F.syne]: Syne_700Bold,
    [F.syneHeavy]: Syne_800ExtraBold,
    [F.sans]: DMSans_400Regular,
    [F.sansMed]: DMSans_500Medium,
    [F.sansItalic]: DMSans_400Regular_Italic,
  });

  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const stackHeader = width < 640;
  const sidePad = wide ? 48 : 20;
  const contentWidth = Math.min(width, 1320) - sidePad * 2;
  const cols = Math.max(1, Math.floor((contentWidth + GAP) / (MIN_CARD + GAP)));
  const cardWidth = Math.floor((contentWidth - GAP * (cols - 1)) / cols);
  const titleSize = width >= 900 ? 46 : width >= 500 ? 36 : 30;

  const {
    items: vibes,
    loading,
    refreshing,
    errorText: fetchErr,
    refresh,
    isOnline,
    pending,
    create,
    update,
    remove,
  } = useOfflineCollection('musicVibes', {
    ttl: TTL.STATIC,
    initial: [],
    createPath: '/music-vibes/',
    itemPath: (id) => `/music-vibes/${id}/`,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [createErr, setCreateErr] = useState(null);
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErr, setEditErr] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef([]);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-3));
    toastTimers.current.push(
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500),
    );
  }, []);

  useEffect(() => () => {
    toastTimers.current.forEach(clearTimeout);
    toastTimers.current = [];
  }, []);

  // Favorites live on this device (like blog likes) — no backend change needed.
  const [favorites, setFavorites] = useState(() => new Set());
  const [favOnly, setFavOnly] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(FAV_KEY).then((raw) => {
      if (raw) {
        try {
          setFavorites(new Set(JSON.parse(raw)));
        } catch {
          /* corrupt favorites reset silently */
        }
      }
    }).catch(() => {});
  }, []);
  const persistFavs = (set) => AsyncStorage.setItem(FAV_KEY, JSON.stringify([...set])).catch(() => {});
  const toggleFav = useCallback((id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistFavs(next);
      return next;
    });
  }, []);

  // Device-library matching for playback (cached per session).
  const deviceTracksRef = useRef(null);
  const [playingVibeId, setPlayingVibeId] = useState(null);
  const playingTrackRef = useRef(null);
  useEffect(() => subscribePlayer((snap) => {
    if (!snap.track || snap.track.id !== playingTrackRef.current) {
      playingTrackRef.current = snap.track?.id || null;
      setPlayingVibeId((prev) => (prev && snap.track ? prev : null));
    }
  }), []);

  const matchDevice = (vibe, tracks) => findTrackFor(tracks, vibe.artist, vibe.track);

  const playVibe = useCallback(async (vibe) => {
    try {
      if (!deviceTracksRef.current) {
        const { tracks, permission } = await loadLibrary();
        if (permission !== 'granted' || !tracks.length) {
          toast('No songs on this device — add music files first.', true);
          return;
        }
        deviceTracksRef.current = tracks;
      }
      const match = matchDevice(vibe, deviceTracksRef.current);
      if (!match) {
        toast(`"${vibe.track}" isn't on this device.`, true);
        return;
      }
      if (!isEngineReady()) {
        toast('Player is starting — try again in a moment.', true);
        return;
      }
      const ok = await playQueue([match], 0);
      if (ok) {
        playingTrackRef.current = match.id;
        setPlayingVibeId(vibe.id);
        toast(`Playing "${match.title}" 🎵`);
      } else {
        toast('Could not play this file.', true);
      }
    } catch (e) {
      toast(e?.message || 'Could not play.', true);
    }
  }, [toast]);

  const handleCreate = async () => {
    if (!newForm.artist.trim() || !newForm.track.trim()) {
      setCreateErr('Artist and track are required.');
      return;
    }
    if (!isValidHex(newForm.color)) {
      setCreateErr('Color must be a valid hex code (e.g. #6366f1).');
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const { offline } = await create({
        artist: newForm.artist.trim(),
        track: newForm.track.trim(),
        mood: newForm.mood.trim(),
        color: newForm.color,
      });
      setNewForm(EMPTY_FORM);
      setIsCreating(false);
      toast(offline ? 'Track saved on this device — will sync.' : 'Track added ✓');
    } catch (e) {
      console.error('[MusicVibes] create error:', e);
      setCreateErr(e?.message || 'Could not save track.');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = useCallback((v) => {
    setEditId(v.id);
    setEditForm({ artist: v.artist, track: v.track, mood: v.mood || '', color: v.color });
    setEditErr(null);
  }, []);

  const cancelEdit = useCallback(() => { setEditId(null); setEditErr(null); }, []);

  const handleUpdate = useCallback(async (id) => {
    if (!editForm.artist.trim() || !editForm.track.trim()) {
      setEditErr('Artist and track are required.');
      return;
    }
    if (!isValidHex(editForm.color)) {
      setEditErr('Color must be a valid hex code.');
      return;
    }
    setSaving(true);
    setEditErr(null);
    try {
      const { offline } = await update(id, {
        artist: editForm.artist.trim(),
        track: editForm.track.trim(),
        mood: editForm.mood.trim(),
        color: editForm.color,
      });
      setEditId(null);
      toast(offline ? 'Update saved on this device — will sync.' : 'Track updated ✓');
    } catch (e) {
      console.error('[MusicVibes] update error:', e);
      setEditErr(e?.message || 'Could not update track.');
    } finally {
      setSaving(false);
    }
  }, [editForm, toast, update]);

  const performDelete = useCallback(async (id) => {
    setDeletingId(id);
    try {
      const { offline } = await remove(id);
      toast(offline ? 'Removed on this device — will sync.' : 'Track removed');
    } catch (e) {
      console.error('[MusicVibes] delete error:', e);
      toast(e?.message || 'Could not delete track.', true);
    } finally {
      setDeletingId(null);
    }
  }, [toast]);

  const handleDelete = useCallback((v) => {
    Alert.alert('Remove this track?', `"${v.track}" by ${v.artist} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => performDelete(v.id) },
    ]);
  }, [performDelete]);

  const togglePanel = () => {
    setIsCreating((v) => !v);
    setCreateErr(null);
    setNewForm(EMPTY_FORM);
  };

  const skeletons = useMemo(() => Array.from({ length: Math.max(4, cols * 3) }), [cols]);

  const shownVibes = useMemo(
    () => (favOnly ? vibes.filter((v) => favorites.has(v.id)) : vibes),
    [vibes, favOnly, favorites],
  );

  if (!fontsLoaded) {
    return (
      <View style={[st.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={st.safe}
      /* android already pads the scroll view, iOS relies on the inset */
      edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[st.scroll, { paddingHorizontal: sidePad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              tintColor={C.accent}
              colors={[C.accent]}
              onRefresh={refresh}
            />
          )}
        >
          <FadeUp style={{ width: contentWidth, alignSelf: 'center' }} distance={12}>
            {}
            <View style={st.eyebrowRow}>
              <Text style={st.eyebrow}>MUSIC VIBES</Text>
              <LinearGradient
                colors={[C.border, 'rgba(216,212,204,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.eyebrowLine}
              />
            </View>

            {}
            <View style={[st.headerRow, stackHeader && { flexDirection: 'column', gap: 18 }]}>
              <View style={{ flex: stackHeader ? undefined : 1 }}>
                <Text style={[st.pageTitle, { fontSize: titleSize, lineHeight: titleSize * 1.12 }]}>
                  Songs On <Text style={{ color: C.accent }}>Repeat</Text>
                </Text>
                <Text style={st.pageDesc}>
                  The playlist that plays behind every coding session, rainy evening, and 2am thought spiral.
                </Text>
              </View>
              <View style={stackHeader && { alignSelf: 'stretch' }}>
                <AddButton open={isCreating} onPress={togglePanel} />
              </View>
            </View>

            {}
            {isCreating && (
              <FadeUp distance={6} duration={280}>
                <View style={st.formPanel}>
                  <Text style={st.formPanelTitle}>NEW TRACK ENTRY</Text>

                  <View style={st.formRow}>
                    <Field label="ARTIST *" style={{ flexBasis: 140, flexGrow: 1 }}>
                      <TextInput
                        value={newForm.artist}
                        onChangeText={(v) => setNewForm((p) => ({ ...p, artist: v }))}
                        placeholder="e.g. The Midnight"
                        placeholderTextColor={C.dimmer}
                        style={st.input}
                        accessibilityLabel="Artist"
                      />
                    </Field>
                    <Field label="TRACK *" style={{ flexBasis: 140, flexGrow: 1 }}>
                      <TextInput
                        value={newForm.track}
                        onChangeText={(v) => setNewForm((p) => ({ ...p, track: v }))}
                        placeholder="e.g. Sunset"
                        placeholderTextColor={C.dimmer}
                        style={st.input}
                        accessibilityLabel="Track"
                      />
                    </Field>
                    <Field label="MOOD / VIBE" style={{ flexBasis: 180, flexGrow: 1.5 }}>
                      <TextInput
                        value={newForm.mood}
                        onChangeText={(v) => setNewForm((p) => ({ ...p, mood: v }))}
                        placeholder="e.g. 2am Deep-Focus Synth Loops"
                        placeholderTextColor={C.dimmer}
                        style={st.input}
                        accessibilityLabel="Mood"
                      />
                    </Field>
                    <Field label="ACCENT COLOR" style={wide ? { width: 250 } : { flexBasis: '100%' }}>
                      <ColorPicker value={newForm.color} onChange={(v) => setNewForm((p) => ({ ...p, color: v }))} />
                    </Field>
                  </View>

                  {!!createErr && (
                    <View style={st.errorBanner}>
                      <Text style={st.errorText}>⚠ {createErr}</Text>
                    </View>
                  )}

                  <View style={st.formActions}>
                    <Btn primary label={creating ? 'Saving…' : 'Save Track'} loading={creating} disabled={creating} onPress={handleCreate} />
                    <Btn label="Cancel" onPress={togglePanel} />
                  </View>
                </View>
              </FadeUp>
            )}

            {}
            {!!fetchErr && (
              <View style={[st.errorBanner, { marginTop: 0, marginBottom: 28 }]}>
                <Text style={st.errorText}>
                  ⚠ Could not load tracks — {fetchErr}.{' '}
                  <Text style={{ textDecorationLine: 'underline' }} onPress={refresh}>Retry</Text>
                </Text>
              </View>
            )}

            {}
            <View style={st.favRow}>
              <Pressable
                onPress={() => setFavOnly((v) => !v)}
                accessibilityRole="tab"
                accessibilityState={{ selected: favOnly }}
                style={[st.favChip, favOnly && st.favChipActive]}
              >
                <Feather name="heart" size={12} color={favOnly ? '#fff' : C.muted} />
                <Text style={[st.favChipText, favOnly && st.favChipTextActive]}>
                  Favorites{favorites.size > 0 ? ` (${favorites.size})` : ''}
                </Text>
              </Pressable>
            </View>

            {}
            <View style={[st.grid, { gap: GAP }]}>
              {loading ? (
                skeletons.map((_, i) => <SkeletonCard key={i} width={cardWidth} />)
              ) : shownVibes.length === 0 ? (
                <View style={st.emptyState}>
                  <Text style={{ fontSize: 40, marginBottom: 14 }}>🎧</Text>
                  <Text style={st.emptyTitle}>{favOnly ? 'No favorites yet' : 'No tracks yet'}</Text>
                  <Text style={st.emptyDesc}>
                    {favOnly ? 'Tap the heart on any track to keep it here.' : 'Add your first song above.'}
                  </Text>
                </View>
              ) : (
                shownVibes.map((v, i) => (
                  <MusicCard
                    key={v.id}
                    vibe={v}
                    index={i}
                    width={cardWidth}
                    isEditing={editId === v.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    editErr={editId === v.id ? editErr : null}
                    saving={saving}
                    deleting={deletingId === v.id}
                    onStartEdit={startEdit}
                    onCancelEdit={cancelEdit}
                    onSubmitEdit={handleUpdate}
                    onDelete={handleDelete}
                    isFav={favorites.has(v.id)}
                    isPlaying={playingVibeId === v.id}
                    onToggleFav={toggleFav}
                    onPlay={playVibe}
                  />
                ))
              )}
            </View>
          </FadeUp>
        </ScrollView>
      </KeyboardAvoidingView>

      {}
      <View
        pointerEvents="none"
        style={[
          st.toastWrap,
          wide ? { right: 28, alignItems: 'flex-end' } : { left: 16, right: 16, alignItems: 'center' },
        ]}
      >
        {toasts.map((t) => <ToastItem key={t.id} t={t} />)}
      </View>
    </SafeAreaView>
  );
}


const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: Platform.OS === 'android' ? 44 : 26, paddingBottom: 96 },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  eyebrow: { fontFamily: F.syne, fontSize: 11, letterSpacing: 3.5, color: C.accent },
  eyebrowLine: { flex: 1, height: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, marginBottom: 40 },
  pageTitle: { fontFamily: F.syneHeavy, color: C.ink, letterSpacing: -1.6, marginBottom: 10 },
  pageDesc: { fontFamily: F.sans, fontSize: 15, lineHeight: 25, color: C.muted, maxWidth: 500 },

  addBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 22,
  },
  addBtnText: { fontFamily: F.syne, fontSize: 13.5, letterSpacing: 0.5 },
  pulseRing: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.45)',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { fontFamily: F.syne, fontSize: 13.5 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surfaceUp, alignItems: 'center', justifyContent: 'center',
  },

  formPanel: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderTopWidth: 2, borderTopColor: C.accent,
    borderRadius: 16, padding: 22, marginBottom: 36,
    ...shadow(6, 0.06, 18),
  },
  formPanelTitle: { fontFamily: F.syne, fontSize: 11, letterSpacing: 2.5, color: C.accent, marginBottom: 20 },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 },
  field: { gap: 7, minWidth: 0 },
  label: { fontFamily: F.syne, fontSize: 10.5, letterSpacing: 1.5, color: C.dimmer },
  input: {
    backgroundColor: C.surfaceUp, borderWidth: 1.5, borderColor: C.border, borderRadius: 9,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontFamily: F.sans, fontSize: 15, color: C.ink,
  },
  inputCompact: { paddingVertical: Platform.OS === 'ios' ? 9 : 6, paddingHorizontal: 11, fontSize: 14 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 40, height: 40, borderRadius: 9, borderWidth: 1.5, borderColor: C.border },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  preset: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  presetSel: { borderColor: C.ink, transform: [{ scale: 1.15 }] },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  errorBanner: {
    marginTop: 14, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.dangerDim,
    borderWidth: 1, borderColor: C.dangerBorder, borderRadius: 8,
  },
  errorText: { fontFamily: F.sans, fontSize: 13.5, lineHeight: 20, color: C.danger },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    backgroundColor: C.surface, borderWidth: 1.5, borderRadius: 18,
    paddingVertical: 20, paddingHorizontal: 22, minHeight: 92,
    ...shadow(3, 0.06, 12),
  },
  dot: {
    width: 52, height: 52, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(26,26,46,0.08)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end', gap: 2.5, height: 18 },
  bar: { width: 3, borderRadius: 2 },
  info: { flex: 1, minWidth: 0, paddingRight: 66 },
  artist: { fontFamily: F.sansMed, fontSize: 11.5, letterSpacing: 1.2, color: C.dimmer, textTransform: 'uppercase', marginBottom: 3 },
  track: { fontFamily: F.syneHeavy, fontSize: 16.5, color: C.ink, lineHeight: 21, marginBottom: 4 },
  mood: { fontFamily: F.sansItalic, fontSize: 13, color: C.muted },
  cardActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6 },
  inlineFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  favRow: { flexDirection: 'row', marginBottom: 18 },
  favChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
  },
  favChipActive: { backgroundColor: C.danger, borderColor: C.danger },
  favChipText: { fontFamily: F.syne, fontSize: 12.5, color: C.muted },
  favChipTextActive: { color: '#fff' },

  skeleton: { height: 92, borderRadius: 18, backgroundColor: C.surfaceUp, borderWidth: 1.5, borderColor: C.border },

  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 72, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: F.syne, fontSize: 16, color: C.muted, marginBottom: 6 },
  emptyDesc: { fontFamily: F.sans, fontSize: 14, color: C.dimmer },

  toastWrap: { position: 'absolute', bottom: 28, gap: 8, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 9, maxWidth: 320,
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16,
    ...shadow(8, 0.14, 20),
  },
  toastText: { flexShrink: 1, fontFamily: F.sansMed, fontSize: 13.5 },
});