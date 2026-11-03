/**
 * Music Player — every song on the device, with the works.
 *
 * Library (search, 5-field sorting, artist filter, favorites), full transport
 * (shuffle, repeat off/all/one, ±10s, speed, sleep timer), per-track cover
 * upload, favorites, and resume-where-you-left-off. All local, all offline.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MusicLibrary from 'expo-music-library';

import { loadLibrary, refreshLibrary, trackArtwork, withPrefs } from '../player/library';
import {
  getPlayerPrefs,
  loadPlayerPrefs,
  removeCover,
  setCover,
  toggleFavorite,
  usePlayerPrefs,
} from '../player/prefs';
import {
  cycleRate,
  cycleRepeat,
  getQueue,
  isEngineReady,
  next,
  playQueue,
  prev,
  restoreQueue,
  seekTo,
  setQueue,
  setSleepTimer,
  skip,
  subscribePlayer,
  toggle,
  toggleShuffle,
} from '../player/engine';
import { SORT_FIELDS, artistList, formatDuration, useLibraryView } from '../player/sort';
import { stageFile } from '../api/fileQueue';

const COVER_SIZE = 52;

const artFor = (t, prefs) =>
  prefs.covers[t.id] || t.coverUri || t.artworkUri || null;

function CoverTile({ track, prefs, size = COVER_SIZE, radius = 10 }) {
  const uri = track ? artFor(track, prefs) : null;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  const initial = ((track?.title || '?').trim().charAt(0) || '?').toUpperCase();
  return (
    <View style={[st.tile, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[st.tileText, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const SLEEP_OPTIONS = [null, 5, 10, 15, 30, 45, 60];

export default function PlayerScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;

  const [tracks, setTracks] = useState([]);
  const [permission, setPermission] = useState('undetermined');
  const [libLoading, setLibLoading] = useState(true);
  const [sort, setSort] = useState({ field: 'title', dir: 'asc' });
  const [query, setQuery] = useState('');
  const [artist, setArtist] = useState(null);
  const [favOnly, setFavOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(false);
  const [sleepPick, setSleepPick] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef([]);
  const restoredRef = useRef(false);
  const barW = useRef(0);

  const prefs = usePlayerPrefs();
  const [snap, setSnap] = useState(() => ({
    track: null, playing: false, position: 0, duration: 0,
    queueLen: 0, index: -1, shuffle: false, repeat: 'off', rate: 1, sleepUntil: null,
  }));
  useEffect(() => subscribePlayer(setSnap), []);

  useEffect(() => () => {
    toastTimers.current.forEach(clearTimeout);
    toastTimers.current = [];
  }, []);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-3));
    toastTimers.current.push(setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200));
  }, []);

  // Library load (cached index first, OS refresh in background).
  useEffect(() => {
    let alive = true;
    setLibLoading(true);
    loadPlayerPrefs().catch(() => {});
    loadLibrary({
      onUpdate: (fresh) => {
        if (!alive) return;
        setTracks(withPrefs(fresh, getPlayerPrefs()));
      },
    })
      .then(({ tracks: list, permission: perm }) => {
        if (!alive) return;
        setTracks(withPrefs(list, getPlayerPrefs()));
        setPermission(perm);
        setLibLoading(false);
      })
      .catch(() => alive && setLibLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Covers/favorites flow through `merged` (recomputed from prefs below);
  // the engine queue keeps the original track objects, and artwork/favorite
  // state is always resolved live from prefs at render time.

  // Resume last session once the engine + library are ready.
  useEffect(() => {
    if (restoredRef.current || !tracks.length || !isEngineReady()) return;
    const last = getPlayerPrefs().last;
    if (!last?.trackId || !tracks.some((t) => t.id === last.trackId)) {
      restoredRef.current = true;
      return;
    }
    restoredRef.current = true;
    restoreQueue(tracks, last.trackId, last.position || 0).catch(() => {});
  }, [tracks, snap.track]);

  // Reload when the OS library changes (new downloads, deletions).
  useEffect(() => {
    let sub = null;
    try {
      sub = MusicLibrary.addChangeListener?.(() => {
        refreshLibrary()
          .then(({ tracks: list }) => setTracks(withPrefs(list, getPlayerPrefs())))
          .catch(() => {});
      });
    } catch {
      /* older devices may not support change events */
    }
    return () => {
      try {
        sub?.remove?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const merged = useMemo(() => withPrefs(tracks, prefs), [tracks, prefs]);
  const view = useLibraryView(merged, sort, { query, artist, favoritesOnly: favOnly });
  const artists = useMemo(() => artistList(merged), [merged]);
  const queue = useMemo(() => getQueue(), [snap]);

  const playFromView = (i) => {
    playQueue(view, i).then((ok) => {
      if (!ok) toast('Could not play this file.', true);
    });
  };

  const shuffleAll = () => {
    if (!view.length) return;
    const order = [...view].sort(() => Math.random() - 0.5);
    if (!snap.shuffle) toggleShuffle();
    playQueue(order, 0);
  };

  const pickCover = async (track) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.status !== 'limited') {
        toast('Allow photo access to set a cover.', true);
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1] });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const staged = await stageFile(a.uri, a.fileName || `cover-${track.id}.jpg`);
      await setCover(track.id, staged);
      toast('Cover updated ✓');
    } catch (e) {
      toast(e?.message || 'Could not set cover.', true);
    }
  };

  const heart = (track) => {
    toggleFavorite(track.id).catch((e) => toast(e?.message || 'Failed.', true));
  };

  const pos = snap.position || 0;
  const dur = snap.duration || snap.track?.duration || 0;
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;

  const renderRow = ({ item, index }) => (
    <Pressable
      onPress={() => playFromView(index)}
      style={({ pressed }) => [st.row, snap.track?.id === item.id && st.rowActive, pressed && { opacity: 0.85 }]}
    >
      <CoverTile track={item} prefs={prefs} />
      <View style={st.meta}>
        <Text style={st.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={st.rowSub} numberOfLines={1}>
          {item.artist}{item.album ? ` · ${item.album}` : ''}{item.duration ? ` · ${formatDuration(item.duration)}` : ''}
        </Text>
      </View>
      <Pressable onPress={() => heart(item)} hitSlop={8} accessibilityLabel="Toggle favorite">
        <Feather name="heart" size={17} color={item.favorite ? '#c0392b' : '#b0a898'} />
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[st.body, wide && st.bodyWide]}>
        <View style={st.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.kicker}>MUSIC PLAYER</Text>
            <Text style={st.title}>Your library</Text>
            {!libLoading && (
              <Text style={st.count}>{merged.length} track{merged.length === 1 ? '' : 's'}{permission !== 'granted' ? ' · waiting for access' : ''}</Text>
            )}
          </View>
          <Pressable onPress={() => setSortOpen(true)} style={st.iconBtn} accessibilityLabel="Sorting options">
            <Feather name="sliders" size={17} color="#1a1a2e" />
          </Pressable>
          <Pressable onPress={shuffleAll} style={[st.iconBtn, st.shuffleBtn]} accessibilityLabel="Shuffle all">
            <Feather name="shuffle" size={17} color="#fff" />
          </Pressable>
        </View>

        <View style={st.searchWrap}>
          <Feather name="search" size={15} color="#a8a396" style={st.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search title, artist, album"
            placeholderTextColor="#a8a396"
            style={st.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search music"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} style={st.searchClear} accessibilityLabel="Clear search">
              <Feather name="x" size={14} color="#a8a396" />
            </Pressable>
          )}
        </View>

        <View style={st.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ flex: 1 }}>
            <Pressable onPress={() => setFavOnly((v) => !v)} style={[st.chip, favOnly && st.chipActive]}>
              <Feather name="heart" size={11} color={favOnly ? '#fff' : '#7a7567'} />
              <Text style={[st.chipText, favOnly && st.chipTextActive]}>Favorites</Text>
            </Pressable>
            {artist && (
              <Pressable onPress={() => setArtist(null)} style={[st.chip, st.chipActive]}>
                <Text style={[st.chipText, st.chipTextActive]}>{artist} ✕</Text>
              </Pressable>
            )}
            {!artist && artists.slice(0, 12).map((a) => (
              <Pressable key={a} onPress={() => setArtist(a)} style={st.chip}>
                <Text style={st.chipText} numberOfLines={1}>{a}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {libLoading ? (
          <View style={st.center}>
            <ActivityIndicator size="large" color="#2d6a4f" />
            <Text style={st.centerText}>Reading your music…</Text>
          </View>
        ) : permission !== 'granted' ? (
          <View style={st.center}>
            <Feather name="music" size={28} color="#b0a898" style={{ marginBottom: 10 }} />
            <Text style={st.centerText}>Music access is off. Allow access to play your songs.</Text>
            <Pressable
              onPress={() => {
                setLibLoading(true);
                refreshLibrary()
                  .then(({ tracks: list, permission: perm }) => {
                    setTracks(withPrefs(list, getPlayerPrefs()));
                    setPermission(perm);
                    setLibLoading(false);
                  })
                  .catch(() => setLibLoading(false));
              }}
              style={st.emptyBtn}
            >
              <Text style={st.emptyBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : view.length === 0 ? (
          <View style={st.center}>
            <Feather name="music" size={28} color="#b0a898" style={{ marginBottom: 10 }} />
            <Text style={st.emptyTitle}>{merged.length === 0 ? 'No music found' : 'Nothing matches'}</Text>
            <Text style={st.centerText}>
              {merged.length === 0
                ? 'Add audio files to this device and pull to refresh.'
                : 'Try a different search or filter.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={view}
            keyExtractor={(t) => t.id}
            renderItem={renderRow}
            contentContainerStyle={{ paddingBottom: snap.track ? 150 : 90 }}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {!!snap.track && (
          <Pressable onPress={() => setNowPlaying(true)} style={st.mini} accessibilityLabel="Open now playing">
            <CoverTile track={snap.track} prefs={prefs} size={44} radius={8} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.miniTitle} numberOfLines={1}>{snap.track.title}</Text>
              <Text style={st.miniSub} numberOfLines={1}>{snap.track.artist}</Text>
            </View>
            <Pressable onPress={toggle} hitSlop={10} accessibilityLabel={snap.playing ? 'Pause' : 'Play'}>
              <Feather name={snap.playing ? 'pause' : 'play'} size={20} color="#1a1a2e" />
            </Pressable>
          </Pressable>
        )}

        <View pointerEvents="none" style={st.toastWrap}>
          {toasts.map((t) => (
            <View key={t.id} style={[st.toast, t.err && st.toastErr]}>
              <Feather name={t.err ? 'x' : 'check'} size={13} color={t.err ? '#c0392b' : '#2d6a4f'} />
              <Text style={st.toastText}>{t.msg}</Text>
            </View>
          ))}
        </View>
      </View>

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortOpen(false)} accessibilityLabel="Close sorting" />
          <View style={st.modal}>
            <Text style={st.modalTitle}>Sort by</Text>
            {SORT_FIELDS.map(({ key, label }) => {
              const active = sort.field === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSort((s) => ({ field: key, dir: s.field === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
                  style={[st.sortRow, active && st.sortRowActive]}
                >
                  <Text style={[st.sortText, active && st.sortTextActive]}>{label}</Text>
                  {active && <Feather name={sort.dir === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} color="#2d6a4f" />}
                </Pressable>
              );
            })}
            <Text style={st.modalHint}>Tap again to flip ascending / descending.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={nowPlaying} transparent animationType="slide" onRequestClose={() => setNowPlaying(false)}>
        <View style={st.npWrap}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={st.npHead}>
              <Pressable onPress={() => setNowPlaying(false)} hitSlop={10} accessibilityLabel="Close now playing">
                <Feather name="chevron-down" size={24} color="#1a1a2e" />
              </Pressable>
              <Text style={st.npKicker}>NOW PLAYING</Text>
              <Pressable onPress={() => snap.track && heart(snap.track)} hitSlop={10} accessibilityLabel="Toggle favorite">
                <Feather name="heart" size={20} color={snap.track?.favorite ? '#c0392b' : '#b0a898'} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={st.npBody} showsVerticalScrollIndicator={false}>
              {!!snap.track && (
                <>
                  <View style={st.npCover}>
                    <CoverTile track={snap.track} prefs={prefs} size={Math.min(width - 120, 300)} radius={20} />
                  </View>
                  <Text style={st.npTitle} numberOfLines={2}>{snap.track.title}</Text>
                  <Text style={st.npArtist} numberOfLines={1}>{snap.track.artist}</Text>

                  <View style={st.coverBtns}>
                    <Pressable onPress={() => pickCover(snap.track)} style={st.coverBtn}>
                      <Feather name="image" size={13} color="#2d6a4f" />
                      <Text style={st.coverBtnText}>Cover</Text>
                    </Pressable>
                    {!!prefs.covers[snap.track.id] && (
                      <Pressable onPress={() => removeCover(snap.track.id).then(() => toast('Cover removed.'))} style={st.coverBtn}>
                        <Feather name="x" size={13} color="#7a7567" />
                        <Text style={st.coverBtnText}>Remove</Text>
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    onLayout={(e) => { barW.current = e.nativeEvent.layout.width; }}
                    onPress={(e) => {
                      if (dur > 0 && barW.current > 0) seekTo((e.nativeEvent.locationX / barW.current) * dur);
                    }}
                    style={st.bar}
                    accessibilityLabel="Seek"
                  >
                    <View style={[st.fill, { width: `${pct}%` }]} />
                  </Pressable>
                  <View style={st.times}>
                    <Text style={st.timeText}>{formatDuration(pos)}</Text>
                    <Text style={st.timeText}>{dur ? formatDuration(dur) : '--:--'}</Text>
                  </View>

                  <View style={st.controls}>
                    <Pressable onPress={toggleShuffle} hitSlop={8} accessibilityLabel="Shuffle">
                      <Feather name="shuffle" size={20} color={snap.shuffle ? '#2d6a4f' : '#b0a898'} />
                    </Pressable>
                    <Pressable onPress={() => prev()} hitSlop={8} accessibilityLabel="Previous">
                      <Feather name="skip-back" size={26} color="#1a1a2e" />
                    </Pressable>
                    <Pressable onPress={toggle} hitSlop={8} style={st.playBtn} accessibilityLabel={snap.playing ? 'Pause' : 'Play'}>
                      <Feather name={snap.playing ? 'pause' : 'play'} size={30} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => next()} hitSlop={8} accessibilityLabel="Next">
                      <Feather name="skip-forward" size={26} color="#1a1a2e" />
                    </Pressable>
                    <Pressable onPress={cycleRepeat} hitSlop={8} accessibilityLabel="Repeat mode">
                      <View>
                        <Feather name="repeat" size={20} color={snap.repeat !== 'off' ? '#2d6a4f' : '#b0a898'} />
                        {snap.repeat === 'one' && <Text style={st.oneBadge}>1</Text>}
                      </View>
                    </Pressable>
                  </View>

                  <View style={st.controls2}>
                    <Pressable onPress={() => skip(-10)} hitSlop={8} style={st.smallBtn} accessibilityLabel="Back 10 seconds">
                      <Feather name="rotate-ccw" size={16} color="#1a1a2e" />
                      <Text style={st.smallText}>10</Text>
                    </Pressable>
                    <Pressable onPress={cycleRate} hitSlop={8} style={st.smallBtn} accessibilityLabel="Playback speed">
                      <Text style={st.smallText}>{snap.rate}x</Text>
                    </Pressable>
                    <Pressable onPress={() => setSleepPick((v) => !v)} hitSlop={8} style={[st.smallBtn, snap.sleepUntil && st.sleepOn]} accessibilityLabel="Sleep timer">
                      <Feather name="moon" size={16} color={snap.sleepUntil ? '#fff' : '#1a1a2e'} />
                      <Text style={[st.smallText, snap.sleepUntil && { color: '#fff' }]}>
                        {snap.sleepUntil ? `${Math.max(1, Math.ceil((snap.sleepUntil - Date.now()) / 60000))}m` : 'Sleep'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => skip(10)} hitSlop={8} style={st.smallBtn} accessibilityLabel="Forward 10 seconds">
                      <Feather name="rotate-cw" size={16} color="#1a1a2e" />
                      <Text style={st.smallText}>10</Text>
                    </Pressable>
                  </View>

                  {sleepPick && (
                    <View style={st.sleepRow}>
                      {SLEEP_OPTIONS.map((m) => {
                        const on = m === null ? !snap.sleepUntil : false;
                        return (
                          <Pressable
                            key={String(m)}
                            onPress={() => { setSleepTimer(m); setSleepPick(false); toast(m ? `Sleep in ${m} min 🌙` : 'Sleep timer off'); }}
                            style={[st.sleepOpt, on && st.sleepOptOn]}
                          >
                            <Text style={[st.sleepText, on && st.sleepTextOn]}>{m === null ? 'Off' : `${m}m`}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <Text style={st.qTitle}>Up next</Text>
                  {queue.map((q, i) => (
                    <Pressable key={`${q.id}-${i}`} onPress={() => (snap.index !== -1 ? playQueue(queue, i) : null)} style={[st.qRow, i === snap.index && st.qRowActive]}>
                      <Text style={[st.qNum, i === snap.index && st.qNumActive]}>{i === snap.index ? '▶' : i + 1}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.qName} numberOfLines={1}>{q.title}</Text>
                        <Text style={st.qSub} numberOfLines={1}>{q.artist}</Text>
                      </View>
                      <Text style={st.qDur}>{q.duration ? formatDuration(q.duration) : ''}</Text>
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f5f0' },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 26 },
  bodyWide: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: '#7a7567' },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  count: { fontSize: 12.5, color: '#7a7567', marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#eceae3',
    alignItems: 'center', justifyContent: 'center',
  },
  shuffleBtn: { backgroundColor: '#2d6a4f' },
  searchWrap: { marginBottom: 10, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d6', borderRadius: 10,
    paddingVertical: 10, paddingLeft: 36, paddingRight: 34, fontSize: 14.5, color: '#1a1a2e',
  },
  searchClear: { position: 'absolute', right: 10, padding: 4 },
  filterRow: { marginBottom: 12, flexGrow: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: '#e4e0d6', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#7a7567' },
  chipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  centerText: { fontSize: 14, color: '#7a7567', textAlign: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#7a7567', marginBottom: 4 },
  emptyBtn: { backgroundColor: '#2d6a4f', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e4e0d6',
    borderRadius: 14, padding: 10, marginBottom: 8,
  },
  rowActive: { borderColor: '#2d6a4f', backgroundColor: '#f2f8f4' },
  meta: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  rowSub: { fontSize: 12.5, color: '#7a7567', marginTop: 1 },
  tile: { backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center' },
  tileText: { color: '#fff', fontWeight: '800' },
  mini: {
    position: 'absolute', left: 18, right: 18, bottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 10,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  miniTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  miniSub: { color: '#a8a396', fontSize: 12 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 84, alignItems: 'center', gap: 8 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d6',
    borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14,
  },
  toastErr: { borderColor: '#fecaca' },
  toastText: { fontSize: 13.5, color: '#1a1a2e' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center', justifyContent: 'center', padding: 22,
  },
  modal: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
  },
  sortRowActive: { backgroundColor: '#e4f1ea' },
  sortText: { fontSize: 15, color: '#1a1a2e' },
  sortTextActive: { fontWeight: '800', color: '#2d6a4f' },
  modalHint: { fontSize: 12, color: '#a8a396', marginTop: 10 },
  npWrap: { flex: 1, backgroundColor: '#f6f5f0' },
  npHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  npKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#7a7567' },
  npBody: { paddingHorizontal: 28, paddingBottom: 60, alignItems: 'center' },
  npCover: { marginTop: 10, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  npTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', textAlign: 'center' },
  npArtist: { fontSize: 15, color: '#7a7567', marginTop: 4 },
  coverBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  coverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#e4f1ea', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  coverBtnText: { fontSize: 12.5, fontWeight: '700', color: '#2d6a4f' },
  bar: { width: '100%', height: 22, justifyContent: 'center', marginTop: 14 },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#2d6a4f' },
  times: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 11.5, color: '#7a7567' },
  controls: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, marginTop: 10,
  },
  playBtn: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center',
  },
  oneBadge: {
    position: 'absolute', top: -6, right: -8, backgroundColor: '#2d6a4f', color: '#fff',
    fontSize: 9, fontWeight: '800', width: 15, height: 15, borderRadius: 8, textAlign: 'center',
  },
  controls2: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  smallText: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  sleepOn: { backgroundColor: '#2d6a4f', borderRadius: 10 },
  sleepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  sleepOpt: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e4e0d6' },
  sleepOptOn: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  sleepText: { fontSize: 13, fontWeight: '700', color: '#7a7567' },
  sleepTextOn: { color: '#fff' },
  qTitle: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '800', letterSpacing: 1, color: '#7a7567', marginTop: 22, marginBottom: 8 },
  qRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  qRowActive: { backgroundColor: '#e4f1ea', borderRadius: 10, paddingHorizontal: 8 },
  qNum: { width: 26, fontSize: 12.5, color: '#a8a396', textAlign: 'center' },
  qNumActive: { color: '#2d6a4f', fontWeight: '800' },
  qName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  qSub: { fontSize: 12, color: '#7a7567' },
  qDur: { fontSize: 12, color: '#a8a396' },
});
