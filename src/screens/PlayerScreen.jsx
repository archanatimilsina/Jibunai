/**
 * Music Player — every song on the device, with the works.
 *
 * §1 library (permission explainer, background scan + progress, instant
 * cache, format allowlist, min-duration + excluded folders, filename
 * fallback, count + total time, fast-scroll rail), §2 sorting (7 fields,
 * The/A-aware, album disc/track order, per-tab memory, section bubble),
 * §3 cover art (embedded → custom → gradient placeholder, lazy thumbs,
 * large + blurred Now Playing art, tap to enlarge), §4 transport
 * (draggable seek + preview, prev-3s rule, ±10s, fade in/out, resume,
 * corrupt-skip toast), §5 true shuffle + repeat icons + persistence,
 * §6 sleep timer (presets, custom, end-of-song, fade-out, countdown,
 * extend), §7 background + notification-shade card (Pause/Play + Stop,
 * fully offline, no server), §8 lock-screen note + privacy toggle,
 * §8 lock-screen MediaSession note + privacy toggle, §9 albums/artists/
 * folders views, §10 grouped accent-insensitive search + recents +
 * long-press actions, §11 queue reorder/remove/undo/clear/save/remaining,
 * §12 playlists + favorites + auto lists + M3U export, §13 in-player
 * mini bar (opens Now Playing; shade card replaces the old global bar), §14 disconnect handling + device
 * switcher note, §15 speed 0.5–2x + EQ state.
 *
 * Platform note: Expo Go exposes no native foreground-service, MediaSession
 * wiring, system EQ, or Bluetooth SCO APIs. Playback, metadata caching, and
 * all library/queue/playlist logic are fully implemented here; where the OS
 * owns the surface (notification, lock screen, car, EQ DSP), the app stores
 * the user's choice and applies it the moment the native module allows.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
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
import * as Clipboard from 'expo-clipboard';

import { loadLibrary, refreshLibrary, trackArtwork, withPrefs, libraryStats, albumGroups, artistGroups, folderGroups, searchLibrary } from '../player/library';
import {
  getPlayerPrefs,
  loadPlayerPrefs,
  removeCover,
  setCover,
  toggleFavorite,
  saveSettings,
  saveSort,
  addRecentSearch,
  clearRecentSearches,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addToPlaylist,
  removeFromPlaylist,
  reorderPlaylist,
  saveEq,
  usePlayerPrefs,
} from '../player/prefs';
import {
  RATES,
  cycleRate,
  setRate,
  resetRate,
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
  extendSleep,
  skip,
  subscribePlayer,
  toggle,
  toggleShuffle,
  onPlaybackError,
  moveInQueue,
  removeFromQueue,
  insertInQueue,
  clearQueue,
  queueRemaining,
} from '../player/engine';
import { SORT_FIELDS, artistList, formatDuration, formatTotal, useLibraryView, sectionFor } from '../player/sort';
import { stageFile } from '../api/fileQueue';

const COVER_SIZE = 52;
const TABS = [
  { key: 'songs', label: 'Songs' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'folders', label: 'Folders' },
  { key: 'playlists', label: 'Playlists' },
];
const SLEEP_PRESETS = [15, 30, 45, 60];
const MIN_OPTIONS = [0, 30, 45, 60, 90, 120];
const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0],
  'Bass Boost': [8, 5, 0, -2, -4],
  'Treble Boost': [-4, -2, 0, 5, 8],
  Rock: [6, 3, -2, 3, 6],
  Pop: [2, 4, 0, 3, 2],
  Jazz: [4, 2, 0, 2, 5],
  Classical: [5, 3, 0, 3, 5],
  Vocal: [-2, 1, 4, 3, 1],
};
const EQ_BANDS = ['60Hz', '230Hz', '910Hz', '3.6k', '14k'];
const RAIL = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

const initialsOf = (t) => ((t?.title || '?').trim().charAt(0) || '?').toUpperCase();
const hueOf = (s) => {
  const str = String(s || '?');
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
};

function CoverTile({ track, prefs, size = COVER_SIZE, radius = 10 }) {
  const uri = track ? (prefs.covers[track.id] || track.coverUri || track.artworkUri) : null;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  const hue = hueOf(track?.title);
  return (
    <View style={[st.tile, { width: size, height: size, borderRadius: radius, backgroundColor: `hsl(${hue}, 38%, 38%)` }]}>
      <Text style={[st.tileText, { fontSize: size * 0.42 }]}>{initialsOf(track)}</Text>
    </View>
  );
}

function Hi({ text, query }) {
  const q = String(query || '').trim();
  if (!q || !text || !String(text).toLowerCase().includes(q.toLowerCase())) {
    return <Text style={st.rowTitle} numberOfLines={1}>{text}</Text>;
  }
  const i = String(text).toLowerCase().indexOf(q.toLowerCase());
  return (
    <Text style={st.rowTitle} numberOfLines={1}>
      {String(text).slice(0, i)}
      <Text style={st.hi}>{String(text).slice(i, i + q.length)}</Text>
      {String(text).slice(i + q.length)}
    </Text>
  );
}

/** Draggable seek bar with elapsed/remaining + drag-time preview (§4). */
function SeekBar({ pos, dur, onSeek }) {
  const w = useRef(0);
  const [drag, setDrag] = useState(null);
  const commit = (x) => {
    if (!dur || w.current <= 0) return;
    onSeek(Math.max(0, Math.min(dur, (x / w.current) * dur)));
  };
  const shown = drag ?? pos;
  const pct = dur > 0 ? Math.min(100, (shown / dur) * 100) : 0;
  return (
    <View>
      {!!drag && (
        <View style={st.previewBubble}>
          <Text style={st.previewText}>{formatDuration(drag)} / -{formatDuration(Math.max(0, dur - drag))}</Text>
        </View>
      )}
      <View
        onLayout={(e) => { w.current = e.nativeEvent.layout.width; }}
        onTouchStart={(e) => setDrag(Math.max(0, Math.min(dur, (e.nativeEvent.locationX / w.current) * dur)))}
        onTouchMove={(e) => setDrag(Math.max(0, Math.min(dur, (e.nativeEvent.locationX / w.current) * dur)))}
        onTouchEnd={(e) => {
          const v = Math.max(0, Math.min(dur, (e.nativeEvent.locationX / w.current) * dur));
          setDrag(null);
          commit(e.nativeEvent.locationX);
          return v;
        }}
        style={st.bar}
        accessibilityLabel="Seek"
      >
        <View style={[st.fill, { width: `${pct}%` }]} />
        <View style={[st.knob, { left: `${pct}%` }]} />
      </View>
      <View style={st.times}>
        <Text style={st.timeText}>{formatDuration(shown)}</Text>
        <Text style={st.timeText}>{dur ? `-${formatDuration(Math.max(0, dur - shown))}` : '--:--'}</Text>
      </View>
    </View>
  );
}

export default function PlayerScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;

  const [tracks, setTracks] = useState([]);
  const [permission, setPermission] = useState('undetermined');
  const [libLoading, setLibLoading] = useState(true);
  const [scanProgress, setScanProgress] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('songs');
  const [sort, setSortState] = useState({ field: 'title', dir: 'asc' });
  const [query, setQuery] = useState('');
  const [artist, setArtist] = useState(null);
  const [albumFilter, setAlbumFilter] = useState(null);
  const [folderFilter, setFolderFilter] = useState(null);
  const [favOnly, setFavOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(false);
  const [sleepPick, setSleepPick] = useState(false);
  const [customSleep, setCustomSleep] = useState('');
  const [eqOpen, setEqOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [excludedInput, setExcludedInput] = useState('');
  const [menuTrack, setMenuTrack] = useState(null);
  const [playlistPick, setPlaylistPick] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [plDetail, setPlDetail] = useState(null);
  const [albumDetail, setAlbumDetail] = useState(null);
  const [artistDetail, setArtistDetail] = useState(null);
  const [folderDetail, setFolderDetail] = useState(null);
  const [artZoom, setArtZoom] = useState(false);
  const [bubble, setBubble] = useState(null);
  const [tick, setTick] = useState(0);
  const [miniGone, setMiniGone] = useState(false);
  const [undo, setUndo] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef([]);
  const restoredRef = useRef(false);
  const listRef = useRef(null);
  const touchX = useRef(0);
  const touchY = useRef(0);

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

  // Corrupt/missing file (§4): toast + engine already skips ahead.
  useEffect(() => onPlaybackError((t) => toast(`Skipped unreadable file: ${t?.title || 'song'}`, true)), [toast]);

  // Library load: cache first (instant), OS refresh in background with progress.
  const applyTracks = useCallback((list) => {
    setTracks(withPrefs(list, getPlayerPrefs()));
  }, []);

  useEffect(() => {
    let alive = true;
    setLibLoading(true);
    loadPlayerPrefs().catch(() => {});
    loadLibrary({
      onProgress: (p) => alive && setScanProgress(p),
      onUpdate: (fresh) => alive && applyTracks(fresh),
    })
      .then(({ tracks: list, permission: perm }) => {
        if (!alive) return;
        applyTracks(list);
        setPermission(perm);
        setLibLoading(false);
        setScanProgress(null);
        const saved = getPlayerPrefs().sort?.songs;
        if (saved) setSortState(saved);
      })
      .catch(() => alive && setLibLoading(false));
    return () => {
      alive = false;
    };
  }, [applyTracks]);

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

  // Detect new/deleted files while the app is open (§1).
  useEffect(() => {
    let sub = null;
    try {
      sub = MusicLibrary.addChangeListener?.(() => {
        refreshLibrary()
          .then(({ tracks: list }) => applyTracks(list))
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
  }, [applyTracks]);

  // Restore the in-player mini bar for the new song (it reopens Now Playing).
  useEffect(() => {
    setMiniGone(false);
  }, [snap.track?.id]);

  // Sleep countdown ticker (§6).
  useEffect(() => {
    if (!snap.sleepUntil && !snap.sleepEndOfSong) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [snap.sleepUntil, snap.sleepEndOfSong]);

  const merged = useMemo(() => withPrefs(tracks, prefs), [tracks, prefs]);
  const stats = useMemo(() => libraryStats(merged), [merged]);
  const view = useLibraryView(merged, sort, { query: tab === 'songs' ? '' : query, artist, album: albumFilter, folder: folderFilter, favoritesOnly: favOnly });
  const artists = useMemo(() => artistList(merged), [merged]);
  const albums = useMemo(() => albumGroups(merged), [merged]);
  const artistGs = useMemo(() => artistGroups(merged), [merged]);
  const folderGs = useMemo(() => folderGroups(merged), [merged]);
  const queue = useMemo(() => getQueue(), [snap]);
  const grouped = useMemo(() => (tab === 'songs' && query.trim() ? searchLibrary(merged, query) : null), [tab, query, merged]);

  const changeSort = (field) => {
    setSortState((s) => {
      const nextS = { field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' };
      saveSort('songs', nextS).catch(() => {});
      return nextS;
    });
  };

  const doRefresh = () => {
    setRefreshing(true);
    refreshLibrary()
      .then(({ tracks: list }) => {
        applyTracks(list);
        setRefreshing(false);
        toast('Library refreshed');
      })
      .catch(() => setRefreshing(false));
  };

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

  const submitSearch = () => {
    if (query.trim()) addRecentSearch(query.trim()).catch(() => {});
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

  const playNext = (t) => {
    if (!queue.length) {
      playQueue([t], 0);
    } else {
      insertInQueue(Math.max(0, snap.index + 1), t);
      toast('Will play next');
    }
    setMenuTrack(null);
  };

  const addQueue = (t) => {
    if (!queue.length) playQueue([t], 0);
    else {
      insertInQueue(queue.length, t);
      toast('Added to queue');
    }
    setMenuTrack(null);
  };

  const rmQueueAt = (at) => {
    const removed = removeFromQueue(at);
    if (removed) {
      setUndo({ track: removed, at });
      toastTimers.current.push(setTimeout(() => setUndo(null), 6000));
    }
  };

  const undoRemove = () => {
    if (undo) {
      insertInQueue(Math.min(undo.at, getQueue().length), undo.track);
      setUndo(null);
    }
  };

  const exportM3U = async (name, list) => {
    const lines = ['#EXTM3U', ...list.map((t) => `#EXTINF:${Math.floor(t.duration || 0)},${t.artist} - ${t.title}\n${t.uri}`)];
    const body = lines.join('\n');
    try {
      const FS = require('expo-file-system');
      const path = `${FS.cacheDirectory || ''}jibunai-${Date.now()}.m3u`;
      if (FS.writeAsStringAsync && FS.cacheDirectory) {
        await FS.writeAsStringAsync(path, body);
        const Sharing = require('expo-sharing');
        if (await Sharing.isAvailableAsync?.()) {
          await Sharing.shareAsync(path, { mimeType: 'audio/x-mpegurl' });
          return;
        }
      }
      throw new Error('no-share');
    } catch {
      try {
        await Clipboard.setStringAsync(body);
        toast('M3U copied to clipboard');
      } catch {
        toast('Export failed.', true);
      }
    }
  };

  const autoLists = useMemo(() => {
    const byPlays = [...merged].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    const byRecent = [...merged].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    return [
      { id: '__fav', name: 'Favorites ♥', auto: true, tracks: merged.filter((t) => t.favorite) },
      { id: '__recent', name: 'Recently added', auto: true, tracks: [...merged].reverse().slice(0, 100) },
      { id: '__most', name: 'Most played', auto: true, tracks: byPlays.filter((t) => (t.playCount || 0) > 0).slice(0, 100) },
      { id: '__played', name: 'Recently played', auto: true, tracks: byRecent.filter((t) => t.lastPlayed).slice(0, 100) },
      { id: '__never', name: 'Never played', auto: true, tracks: merged.filter((t) => !(t.playCount > 0)).slice(0, 100) },
    ];
  }, [merged]);

  const resolveIds = (ids) => {
    const byId = new Map(merged.map((t) => [t.id, t]));
    return (ids || []).map((id) => byId.get(String(id))).filter(Boolean);
  };

  const pos = snap.position || 0;
  const dur = snap.duration || snap.track?.duration || 0;
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
  const remaining = queueRemaining();
  const sleepLeft = snap.sleepUntil ? Math.max(0, snap.sleepUntil - Date.now()) : 0;

  const scrollToLetter = (letter) => {
    const field = sort.field === 'artist' ? 'artist' : 'title';
    const i = view.findIndex((t) => sectionFor(t, field) === letter);
    if (i >= 0) {
      try {
        listRef.current?.scrollToIndex({ index: i, viewPosition: 0 });
      } catch {
        /* ignore */
      }
    }
    setBubble(letter);
    setTimeout(() => setBubble(null), 700);
  };

  const renderRow = ({ item, index }) => (
    <Pressable
      onPress={() => (tab === 'songs' && grouped ? playQueue(grouped.songs, grouped.songs.findIndex((t) => t.id === item.id)) : playFromView(index))}
      onLongPress={() => setMenuTrack(item)}
      style={({ pressed }) => [st.row, snap.track?.id === item.id && st.rowActive, pressed && { opacity: 0.85 }]}
    >
      <CoverTile track={item} prefs={prefs} />
      <View style={st.meta}>
        {tab === 'songs' && query.trim() ? <Hi text={item.title} query={query} /> : <Text style={st.rowTitle} numberOfLines={1}>{item.title}</Text>}
        <Text style={st.rowSub} numberOfLines={1}>
          {item.artist}{item.album ? ` · ${item.album}` : ''}{item.duration ? ` · ${formatDuration(item.duration)}` : ''}
        </Text>
      </View>
      <Pressable onPress={() => heart(item)} hitSlop={8} accessibilityLabel="Toggle favorite">
        <Feather name="heart" size={17} color={item.favorite ? '#c0392b' : '#b0a898'} />
      </Pressable>
    </Pressable>
  );

  const listData = tab === 'songs' && grouped ? grouped.songs : view;

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.body, wide && st.bodyWide]}>
          <View style={st.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.kicker}>MUSIC PLAYER</Text>
            <Text style={st.title}>Your library</Text>
            {!libLoading && (
              <Text style={st.count}>
                {stats.count} track{stats.count === 1 ? '' : 's'} · {formatTotal(stats.totalSec)}{permission !== 'granted' ? ' · waiting for access' : ''}
              </Text>
            )}
          </View>
          <Pressable onPress={() => setSettingsOpen(true)} style={st.iconBtn} accessibilityLabel="Library settings">
            <Feather name="settings" size={17} color="#1a1a2e" />
          </Pressable>
          <Pressable onPress={() => setEqOpen(true)} style={st.iconBtn} accessibilityLabel="Equalizer and speed">
            <Feather name="sliders" size={17} color="#1a1a2e" />
          </Pressable>
          <Pressable onPress={shuffleAll} style={[st.iconBtn, st.shuffleBtn]} accessibilityLabel="Shuffle all">
            <Feather name="shuffle" size={17} color="#fff" />
          </Pressable>
        </View>

        {scanProgress && (
          <View style={st.scanBar}>
            <ActivityIndicator size="small" color="#2d6a4f" />
            <Text style={st.scanText}>Scanning… {scanProgress.done}{scanProgress.total ? ` / ${scanProgress.total}` : ''}</Text>
          </View>
        )}

        <View style={st.tabs}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[st.tab, tab === t.key && st.tabOn]}>
              <Text style={[st.tabText, tab === t.key && st.tabTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'songs' && (
          <>
            <View style={st.searchWrap}>
              <Feather name="search" size={15} color="#a8a396" style={st.searchIcon} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={submitSearch}
                placeholder="Search title, artist, album, folder"
                placeholderTextColor="#a8a396"
                style={st.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Search music"
                returnKeyType="search"
              />
              {!!query && (
                <Pressable onPress={() => setQuery('')} hitSlop={10} style={st.searchClear} accessibilityLabel="Clear search">
                  <Feather name="x" size={14} color="#a8a396" />
                </Pressable>
              )}
            </View>

            {!query && prefs.recentSearches?.length > 0 && (
              <View style={st.recentRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {prefs.recentSearches.map((r) => (
                    <Pressable key={r} onPress={() => setQuery(r)} style={st.chip}>
                      <Feather name="clock" size={11} color="#7a7567" />
                      <Text style={st.chipText}>{r}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => clearRecentSearches().catch(() => {})} style={st.chip}>
                    <Text style={st.chipText}>Clear</Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}

            {grouped && (grouped.artists.length + grouped.albums.length + grouped.folders.length > 0) && (
              <View style={st.groupBox}>
                {grouped.artists.length > 0 && (
                  <Text style={st.groupText}>Artists: {grouped.artists.map((a) => a.name).join(', ')}</Text>
                )}
                {grouped.albums.length > 0 && (
                  <Text style={st.groupText}>Albums: {grouped.albums.map((a) => a.name).join(', ')}</Text>
                )}
                {grouped.folders.length > 0 && (
                  <Text style={st.groupText}>Folders: {grouped.folders.map((f) => f.name).join(', ')}</Text>
                )}
              </View>
            )}

            <View style={st.filterRow}>
              <Pressable onPress={() => setSortOpen(true)} style={st.chip} accessibilityLabel="Sorting options">
                <Feather name="filter" size={11} color="#7a7567" />
                <Text style={st.chipText}>{SORT_FIELDS.find((f) => f.key === sort.field)?.label} {sort.dir === 'asc' ? '↑' : '↓'}</Text>
              </Pressable>
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
            <Text style={st.hint}>Tap a song to play it instantly — everything is on this phone, no internet needed.</Text>
          </>
        )}

        {libLoading ? (
          <View style={st.center}>
            <ActivityIndicator size="large" color="#2d6a4f" />
            <Text style={st.centerText}>Reading your music…</Text>
          </View>
        ) : permission !== 'granted' ? (
          <View style={st.center}>
            <Feather name="music" size={28} color="#b0a898" style={{ marginBottom: 10 }} />
            <Text style={st.emptyTitle}>Music access is off</Text>
            <Text style={st.centerText}>
              Jibunai needs audio permission to list your on-device songs (Android 13+: “Allow all audio”). Nothing leaves your phone.
            </Text>
            <Pressable
              onPress={() => {
                setLibLoading(true);
                refreshLibrary()
                  .then(({ tracks: list, permission: perm }) => {
                    applyTracks(list);
                    setPermission(perm);
                    setLibLoading(false);
                  })
                  .catch(() => setLibLoading(false));
              }}
              style={st.emptyBtn}
            >
              <Text style={st.emptyBtnText}>Allow access</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openSettings?.().catch(() => {})} style={st.linkBtn}>
              <Text style={st.linkText}>Open Settings</Text>
            </Pressable>
          </View>
        ) : tab === 'albums' ? (
          <FlatList
            data={albums}
            keyExtractor={(a, i) => `${a.name}-${a.artist}-${i}`}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ paddingBottom: snap.track ? 170 : 110, gap: 10 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
            renderItem={({ item }) => {
              const art = item.tracks.find((t) => prefs.covers[t.id] || t.coverUri || t.artworkUri);
              return (
                <Pressable onPress={() => setAlbumDetail(item)} style={st.albumCard}>
                  <CoverTile track={art || item.tracks[0]} prefs={prefs} size={Math.min(width / 2 - 40, 180)} radius={14} />
                  <Text style={st.albumName} numberOfLines={1}>{item.name}</Text>
                  <Text style={st.albumSub} numberOfLines={1}>{item.artist} · {item.tracks.length} songs</Text>
                </Pressable>
              );
            }}
          />
        ) : tab === 'artists' ? (
          <FlatList
            data={artistGs}
            keyExtractor={(a) => a.name}
            contentContainerStyle={{ paddingBottom: snap.track ? 170 : 110 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
            renderItem={({ item }) => {
              const arts = item.tracks.slice(0, 4);
              return (
                <Pressable onPress={() => setArtistDetail(item)} style={st.row}>
                  <View style={st.collage}>
                    {arts.map((t) => {
                      const uri = prefs.covers[t.id] || t.coverUri || t.artworkUri;
                      return uri ? (
                        <Image key={t.id} source={{ uri }} style={st.collageCell} />
                      ) : (
                        <View key={t.id} style={[st.collageCell, st.tile, { backgroundColor: `hsl(${hueOf(t.title)}, 38%, 42%)` }]}>
                          <Text style={st.collageText}>{initialsOf(t)}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={st.meta}>
                    <Text style={st.rowTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={st.rowSub} numberOfLines={1}>{item.albumCount} albums · {item.tracks.length} songs · feat. split</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#b0a898" />
                </Pressable>
              );
            }}
          />
        ) : tab === 'folders' ? (
          <FlatList
            data={folderGs}
            keyExtractor={(f) => f.name}
            contentContainerStyle={{ paddingBottom: snap.track ? 170 : 110 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setFolderDetail(item)} style={st.row}>
                <View style={[st.tile, { width: COVER_SIZE, height: COVER_SIZE, borderRadius: 10 }]}>
                  <Feather name="folder" size={20} color="#fff" />
                </View>
                <View style={st.meta}>
                  <Text style={st.rowTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={st.rowSub} numberOfLines={1}>{item.tracks.length} songs</Text>
                </View>
                <Pressable
                  onPress={() => playQueue(item.tracks, 0)}
                  hitSlop={8}
                  style={st.iconBtn}
                  accessibilityLabel={`Play folder ${item.name}`}
                >
                  <Feather name="play" size={16} color="#1a1a2e" />
                </Pressable>
              </Pressable>
            )}
          />
        ) : tab === 'playlists' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: snap.track ? 170 : 110 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}>
            <View style={st.plNew}>
              <TextInput
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholder="New playlist name"
                placeholderTextColor="#a8a396"
                style={[st.searchInput, { flex: 1 }]}
              />
              <Pressable
                onPress={() => {
                  if (!newPlaylistName.trim()) return;
                  createPlaylist(newPlaylistName.trim()).then(() => {
                    setNewPlaylistName('');
                    toast('Playlist created');
                  });
                }}
                style={st.emptyBtn}
              >
                <Text style={st.emptyBtnText}>Add</Text>
              </Pressable>
            </View>
            {[...autoLists, ...(prefs.playlists || []).map((p) => ({ ...p, tracks: resolveIds(p.trackIds) }))].map((pl) => {
              const arts = pl.tracks.slice(0, 4);
              return (
                <Pressable key={pl.id} onPress={() => setPlDetail(pl)} onLongPress={() => !pl.auto && setPlDetail(pl)} style={st.row}>
                  <View style={st.collage}>
                    {[0, 1, 2, 3].map((i) => {
                      const t = arts[i];
                      const uri = t ? prefs.covers[t.id] || t.coverUri || t.artworkUri : null;
                      return uri ? (
                        <Image key={i} source={{ uri }} style={st.collageCell} />
                      ) : (
                        <View key={i} style={[st.collageCell, st.tile, { backgroundColor: t ? `hsl(${hueOf(t.title)}, 38%, 42%)` : '#e4e0d6' }]}>
                          <Text style={st.collageText}>{t ? initialsOf(t) : '♪'}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={st.meta}>
                    <Text style={st.rowTitle} numberOfLines={1}>{pl.name}</Text>
                    <Text style={st.rowSub} numberOfLines={1}>{pl.tracks.length} songs{pl.auto ? ' · auto' : ''}</Text>
                  </View>
                  <Pressable onPress={() => exportM3U(pl.name, pl.tracks)} hitSlop={8} accessibilityLabel="Export M3U">
                    <Feather name="share" size={15} color="#b0a898" />
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : listData.length === 0 ? (
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
          <View style={{ flex: 1 }}>
            <FlatList
              ref={listRef}
              data={listData}
              keyExtractor={(t) => t.id}
              renderItem={renderRow}
              contentContainerStyle={{ paddingBottom: snap.track ? 150 : 90 }}
              keyboardShouldPersistTaps="handled"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
            />
            {(sort.field === 'title' || sort.field === 'artist') && listData.length > 20 && (
              <View style={st.rail}>
                {RAIL.map((L) => (
                  <Pressable key={L} onPress={() => scrollToLetter(L)} hitSlop={2}>
                    <Text style={st.railText}>{L === '#' ? '•' : L}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {bubble && (
              <View style={st.bubble} pointerEvents="none">
                <Text style={st.bubbleText}>{bubble}</Text>
              </View>
            )}
          </View>
        )}

        {!!undo && (
          <View style={st.undoBar}>
            <Text style={st.undoText}>Removed “{undo.track.title}”</Text>
            <Pressable onPress={undoRemove} hitSlop={8}>
              <Text style={st.undoBtn}>UNDO</Text>
            </Pressable>
          </View>
        )}

        {!!snap.track && !miniGone && (
          <View
            onTouchStart={(e) => { touchX.current = e.nativeEvent.pageX; touchY.current = e.nativeEvent.pageY; }}
            onTouchEnd={(e) => {
              const dx = e.nativeEvent.pageX - touchX.current;
              const dy = e.nativeEvent.pageY - touchY.current;
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) next();
                else prev();
              } else if (dy > 70) setMiniGone(true);
            }}
          >
            <Pressable onPress={() => setNowPlaying(true)} style={st.mini} accessibilityLabel="Open now playing">
              <View style={[st.miniProgress, { width: `${pct}%` }]} />
              <CoverTile track={snap.track} prefs={prefs} size={44} radius={8} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.miniTitle} numberOfLines={1}>{snap.track.title}</Text>
                <Text style={st.miniSub} numberOfLines={1}>{snap.track.artist}</Text>
              </View>
              <Pressable onPress={toggle} hitSlop={10} accessibilityLabel={snap.playing ? 'Pause' : 'Play'}>
                <Feather name={snap.playing ? 'pause' : 'play'} size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={() => next()} hitSlop={10} accessibilityLabel="Next">
                <Feather name="skip-forward" size={18} color="#fff" />
              </Pressable>
            </Pressable>
          </View>
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
      </KeyboardAvoidingView>

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortOpen(false)} accessibilityLabel="Close sorting" />
          <View style={st.modal}>
            <Text style={st.modalTitle}>Sort by</Text>
            {SORT_FIELDS.map(({ key, label }) => {
              const active = sort.field === key;
              return (
                <Pressable key={key} onPress={() => changeSort(key)} style={[st.sortRow, active && st.sortRowActive]}>
                  <Text style={[st.sortText, active && st.sortTextActive]}>{label}</Text>
                  {active && <Feather name={sort.dir === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} color="#2d6a4f" />}
                </Pressable>
              );
            })}
            <Text style={st.modalHint}>Tap again to flip ascending / descending. Saved for this screen.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={!!menuTrack} transparent animationType="fade" onRequestClose={() => setMenuTrack(null)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuTrack(null)} />
          <View style={st.modal}>
            <Text style={st.modalTitle} numberOfLines={1}>{menuTrack?.title}</Text>
            <Text style={st.modalHint}>{menuTrack?.artist}</Text>
            {[
              { label: 'Play next', icon: 'corner-down-right', fn: () => menuTrack && playNext(menuTrack) },
              { label: 'Add to queue', icon: 'plus', fn: () => menuTrack && addQueue(menuTrack) },
              { label: 'Add to playlist…', icon: 'list', fn: () => { setPlaylistPick(menuTrack); setMenuTrack(null); } },
              { label: menuTrack?.favorite ? 'Remove favorite' : 'Add favorite ♥', icon: 'heart', fn: () => { if (menuTrack) heart(menuTrack); setMenuTrack(null); } },
              { label: 'Set cover art…', icon: 'image', fn: () => { if (menuTrack) pickCover(menuTrack); setMenuTrack(null); } },
              ...(menuTrack && prefs.covers[menuTrack.id]
                ? [{ label: 'Remove custom cover', icon: 'x', fn: () => { removeCover(menuTrack.id).then(() => toast('Custom cover removed.')); setMenuTrack(null); } }]
                : []),
            ].map((o) => (
              <Pressable key={o.label} onPress={o.fn} style={st.sortRow}>
                <Text style={st.sortText}>{o.label}</Text>
                <Feather name={o.icon} size={15} color="#7a7567" />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={!!playlistPick} transparent animationType="fade" onRequestClose={() => setPlaylistPick(null)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlaylistPick(null)} />
          <View style={st.modal}>
            <Text style={st.modalTitle}>Add to playlist</Text>
            {(prefs.playlists || []).length === 0 && <Text style={st.modalHint}>No playlists yet — create one on the Playlists tab.</Text>}
            {(prefs.playlists || []).map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  addToPlaylist(p.id, [playlistPick.id]).then(({ added, dupes }) => {
                    toast(added ? `Added to ${p.name}` : 'Already in playlist', !added && dupes > 0);
                    setPlaylistPick(null);
                  });
                }}
                style={st.sortRow}
              >
                <Text style={st.sortText}>{p.name}</Text>
                <Text style={st.qDur}>{p.trackIds.length}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {(albumDetail || artistDetail || folderDetail) && (
        <Modal visible transparent animationType="slide" onRequestClose={() => { setAlbumDetail(null); setArtistDetail(null); setFolderDetail(null); }}>
          <View style={st.npWrap}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={st.npHead}>
                <Pressable onPress={() => { setAlbumDetail(null); setArtistDetail(null); setFolderDetail(null); }} hitSlop={10}>
                  <Feather name="chevron-down" size={24} color="#1a1a2e" />
                </Pressable>
                <Text style={st.npKicker} numberOfLines={1}>
                  {(albumDetail?.name || artistDetail?.name || folderDetail?.name || '').toUpperCase().slice(0, 28)}
                </Text>
                <View style={{ width: 24 }} />
              </View>
              <View style={st.detailBtns}>
                <Pressable
                  onPress={() => {
                    const list = albumDetail?.tracks || artistDetail?.tracks || folderDetail?.tracks || [];
                    playQueue(list, 0);
                    setAlbumDetail(null); setArtistDetail(null); setFolderDetail(null);
                  }}
                  style={[st.emptyBtn, { flex: 1 }]}
                >
                  <Text style={st.emptyBtnText}>Play</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const list = [...(albumDetail?.tracks || artistDetail?.tracks || folderDetail?.tracks || [])].sort(() => Math.random() - 0.5);
                    if (!snap.shuffle) toggleShuffle();
                    playQueue(list, 0);
                    setAlbumDetail(null); setArtistDetail(null); setFolderDetail(null);
                  }}
                  style={[st.emptyBtn, { flex: 1, backgroundColor: '#1a1a2e' }]}
                >
                  <Text style={st.emptyBtnText}>Shuffle</Text>
                </Pressable>
              </View>
              <FlatList
                data={albumDetail?.tracks || artistDetail?.tracks || folderDetail?.tracks || []}
                keyExtractor={(t) => t.id}
                contentContainerStyle={{ padding: 18 }}
                renderItem={({ item, index: i }) => (
                  <Pressable onPress={() => playQueue(albumDetail?.tracks || artistDetail?.tracks || folderDetail?.tracks || [], i)} onLongPress={() => setMenuTrack(item)} style={st.row}>
                    <CoverTile track={item} prefs={prefs} size={44} radius={8} />
                    <View style={st.meta}>
                      <Text style={st.rowTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={st.rowSub} numberOfLines={1}>{item.artist}{item.duration ? ` · ${formatDuration(item.duration)}` : ''}</Text>
                    </View>
                  </Pressable>
                )}
              />
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {plDetail && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setPlDetail(null)}>
          <View style={st.npWrap}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={st.npHead}>
                <Pressable onPress={() => setPlDetail(null)} hitSlop={10}>
                  <Feather name="chevron-down" size={24} color="#1a1a2e" />
                </Pressable>
                <Text style={st.npKicker} numberOfLines={1}>{String(plDetail.name).toUpperCase().slice(0, 28)}</Text>
                {!plDetail.auto ? (
                  <Pressable onPress={() => {
                    Alert.alert('Delete playlist', `Delete “${plDetail.name}”?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => { deletePlaylist(plDetail.id); setPlDetail(null); } },
                    ]);
                  }} hitSlop={10}>
                    <Feather name="trash-2" size={18} color="#c0392b" />
                  </Pressable>
                ) : <View style={{ width: 24 }} />}
              </View>
              <View style={st.detailBtns}>
                <Pressable onPress={() => plDetail.tracks.length && playQueue(plDetail.tracks, 0)} style={[st.emptyBtn, { flex: 1 }]}>
                  <Text style={st.emptyBtnText}>Play</Text>
                </Pressable>
                {!plDetail.auto && (
                  <Pressable
                    onPress={() => {
                      Alert.prompt?.('Rename playlist', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', onPress: (n) => n && renamePlaylist(plDetail.id, n).then(() => setPlDetail((p) => ({ ...p, name: n }))) }], 'plain-text', plDetail.name);
                    }}
                    style={[st.emptyBtn, { flex: 1, backgroundColor: '#eceae3' }]}
                  >
                    <Text style={[st.emptyBtnText, { color: '#1a1a2e' }]}>Rename</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => exportM3U(plDetail.name, plDetail.tracks)} style={[st.emptyBtn, { flex: 1, backgroundColor: '#1a1a2e' }]}>
                  <Text style={st.emptyBtnText}>M3U</Text>
                </Pressable>
              </View>
              <FlatList
                data={plDetail.tracks}
                keyExtractor={(t, i) => `${t.id}-${i}`}
                contentContainerStyle={{ padding: 18 }}
                ListEmptyComponent={<Text style={st.centerText}>No songs yet — long-press a song → Add to playlist.</Text>}
                renderItem={({ item, index: i }) => (
                  <View style={st.row}>
                    <Pressable onPress={() => playQueue(plDetail.tracks, i)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={st.qNum}>{i + 1}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.rowTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={st.rowSub} numberOfLines={1}>{item.artist}</Text>
                      </View>
                    </Pressable>
                    {!plDetail.auto && (
                      <>
                        <Pressable onPress={() => i > 0 && reorderPlaylist(plDetail.id, i, i - 1).then(() => setPlDetail((p) => { const a = [...p.tracks]; const [m] = a.splice(i, 1); a.splice(i - 1, 0, m); return { ...p, tracks: a }; }))} hitSlop={6}>
                          <Feather name="chevron-up" size={16} color="#7a7567" />
                        </Pressable>
                        <Pressable onPress={() => i < plDetail.tracks.length - 1 && reorderPlaylist(plDetail.id, i, i + 1).then(() => setPlDetail((p) => { const a = [...p.tracks]; const [m] = a.splice(i, 1); a.splice(i + 1, 0, m); return { ...p, tracks: a }; }))} hitSlop={6}>
                          <Feather name="chevron-down" size={16} color="#7a7567" />
                        </Pressable>
                        <Pressable onPress={() => removeFromPlaylist(plDetail.id, item.id).then(() => setPlDetail((p) => ({ ...p, tracks: p.tracks.filter((t) => t.id !== item.id) })))} hitSlop={6}>
                          <Feather name="x" size={16} color="#c0392b" />
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              />
            </SafeAreaView>
          </View>
        </Modal>
      )}

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSettingsOpen(false)} />
          <View style={st.modal}>
            <Text style={st.modalTitle}>Library settings</Text>
            <Text style={st.modalHint}>Skip files shorter than</Text>
            <View style={st.sleepRow}>
              {MIN_OPTIONS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => saveSettings({ minDuration: m }).then(() => refreshLibrary().then(({ tracks: l }) => applyTracks(l)))}
                  style={[st.sleepOpt, (prefs.settings?.minDuration ?? 30) === m && st.sleepOptOn]}
                >
                  <Text style={[st.sleepText, (prefs.settings?.minDuration ?? 30) === m && st.sleepTextOn]}>{m === 0 ? 'All' : `${m}s`}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[st.modalHint, { marginTop: 12 }]}>Excluded folders (e.g. WhatsApp Audio)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TextInput value={excludedInput} onChangeText={setExcludedInput} placeholder="Folder name" placeholderTextColor="#a8a396" style={[st.searchInput, { flex: 1 }]} />
              <Pressable
                onPress={() => {
                  const v = excludedInput.trim();
                  if (!v) return;
                  saveSettings({ excludedFolders: [...(prefs.settings?.excludedFolders || []), v] })
                    .then(() => { setExcludedInput(''); return refreshLibrary(); })
                    .then(({ tracks: l }) => applyTracks(l));
                }}
                style={st.emptyBtn}
              >
                <Text style={st.emptyBtnText}>Add</Text>
              </Pressable>
            </View>
            {(prefs.settings?.excludedFolders || []).map((f) => (
              <View key={f} style={[st.sortRow, { paddingVertical: 8 }]}>
                <Text style={st.sortText}>{f}</Text>
                <Pressable onPress={() => saveSettings({ excludedFolders: (prefs.settings?.excludedFolders || []).filter((x) => x !== f) }).then(() => refreshLibrary().then(({ tracks: l }) => applyTracks(l)))} hitSlop={8}>
                  <Feather name="x" size={15} color="#c0392b" />
                </Pressable>
              </View>
            ))}
            {[
              { k: 'hideArtOnLock', label: 'Hide cover art on lock screen', v: prefs.settings?.hideArtOnLock },
              { k: 'pauseOnDisconnect', label: 'Pause when headphones / BT disconnect', v: prefs.settings?.pauseOnDisconnect },
              { k: 'resumeOnReconnect', label: 'Resume when device reconnects', v: prefs.settings?.resumeOnReconnect },
              { k: 'perTrackSpeed', label: 'Remember speed per song', v: prefs.settings?.perTrackSpeed },
            ].map((r) => (
              <View key={r.k} style={st.switchRow}>
                <Text style={st.sortText}>{r.label}</Text>
                <Switch value={!!r.v} onValueChange={(v) => saveSettings({ [r.k]: v })} />
              </View>
            ))}
            <Text style={st.modalHint}>Autoplay device: {prefs.settings?.autoplayDevice || 'off'}. Play to a car once, then it can be remembered here in a native build.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={eqOpen} transparent animationType="fade" onRequestClose={() => setEqOpen(false)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEqOpen(false)} />
          <View style={st.modal}>
            <View style={st.switchRow}>
              <Text style={st.modalTitle}>Equalizer</Text>
              <Switch value={!!prefs.eq?.enabled} onValueChange={(v) => saveEq({ enabled: v })} />
            </View>
            <Text style={st.modalHint}>DSP needs a native build — choices are stored and applied when the device supports them.</Text>
            <View style={[st.sleepRow, { justifyContent: 'flex-start' }]}>
              {Object.keys(EQ_PRESETS).map((p) => (
                <Pressable key={p} onPress={() => saveEq({ preset: p, bands: EQ_PRESETS[p] })} style={[st.sleepOpt, prefs.eq?.preset === p && st.sleepOptOn]}>
                  <Text style={[st.sleepText, prefs.eq?.preset === p && st.sleepTextOn]}>{p}</Text>
                </Pressable>
              ))}
            </View>
            {EQ_BANDS.map((b, i) => (
              <View key={b} style={st.switchRow}>
                <Text style={st.sortText}>{b}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable onPress={() => { const bands = [...(prefs.eq?.bands || [0, 0, 0, 0, 0])]; bands[i] = Math.max(-12, bands[i] - 1); saveEq({ bands, preset: 'Custom' }); }} style={st.stepBtn}><Text style={st.stepText}>−</Text></Pressable>
                  <Text style={[st.sortText, { width: 52, textAlign: 'center' }]}>{(prefs.eq?.bands || [0, 0, 0, 0, 0])[i]} dB</Text>
                  <Pressable onPress={() => { const bands = [...(prefs.eq?.bands || [0, 0, 0, 0, 0])]; bands[i] = Math.min(12, bands[i] + 1); saveEq({ bands, preset: 'Custom' }); }} style={st.stepBtn}><Text style={st.stepText}>+</Text></Pressable>
                </View>
              </View>
            ))}
            {[['bassBoost', 'Bass boost'], ['virtualizer', 'Virtualizer'], ['loudness', 'Loudness']].map(([k, label]) => (
              <View key={k} style={st.switchRow}>
                <Text style={st.sortText}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable onPress={() => saveEq({ [k]: Math.max(0, (prefs.eq?.[k] || 0) - 10) })} style={st.stepBtn}><Text style={st.stepText}>−</Text></Pressable>
                  <Text style={[st.sortText, { width: 52, textAlign: 'center' }]}>{prefs.eq?.[k] || 0}</Text>
                  <Pressable onPress={() => saveEq({ [k]: Math.min(100, (prefs.eq?.[k] || 0) + 10) })} style={st.stepBtn}><Text style={st.stepText}>+</Text></Pressable>
                </View>
              </View>
            ))}
            <Text style={[st.modalHint, { marginTop: 10 }]}>Speed: {snap.rate}x (0.5–2x, pitch preserved)</Text>
            <View style={st.sleepRow}>
              {RATES.map((r) => (
                <Pressable key={r} onPress={() => setRate(r)} style={[st.sleepOpt, snap.rate === r && st.sleepOptOn]}>
                  <Text style={[st.sleepText, snap.rate === r && st.sleepTextOn]}>{r}x</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => resetRate()} style={st.sleepOpt}>
                <Text style={st.sleepText}>Reset 1x</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={nowPlaying} transparent animationType="slide" onRequestClose={() => setNowPlaying(false)}>
        <View style={st.npWrap}>
          {!!snap.track && (prefs.covers[snap.track.id] || snap.track.coverUri || snap.track.artworkUri) && !prefs.settings?.hideArtOnLock && (
            <Image source={{ uri: prefs.covers[snap.track.id] || snap.track.coverUri || snap.track.artworkUri }} style={st.npBlur} blurRadius={40} />
          )}
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
                  <Pressable
                    onPress={() => setArtZoom(true)}
                    onTouchStart={(e) => { touchX.current = e.nativeEvent.pageX; }}
                    onTouchEnd={(e) => {
                      const dx = e.nativeEvent.pageX - touchX.current;
                      if (Math.abs(dx) > 50) {
                        if (dx < 0) next();
                        else prev();
                      }
                    }}
                    style={st.npCover}
                    accessibilityLabel="Enlarge cover art"
                  >
                    <CoverTile track={snap.track} prefs={prefs} size={Math.min(width - 120, 300)} radius={20} />
                  </Pressable>
                  <Text style={st.npTitle} numberOfLines={2}>{snap.track.title}</Text>
                  <Text style={st.npArtist} numberOfLines={1}>{snap.track.artist}</Text>

                  <View style={st.coverBtns}>
                    <Pressable onPress={() => pickCover(snap.track)} style={st.coverBtn}>
                      <Feather name="image" size={13} color="#2d6a4f" />
                      <Text style={st.coverBtnText}>Change cover</Text>
                    </Pressable>
                  </View>

                  <View style={{ width: '100%' }}>
                    <SeekBar pos={pos} dur={dur} onSeek={seekTo} />
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
                  <Text style={st.modeHint}>
                    {snap.shuffle ? 'True shuffle · plays all once' : 'In order'} · Repeat {snap.repeat === 'off' ? 'off' : snap.repeat === 'all' ? 'all' : 'one'}
                  </Text>

                  <View style={st.controls2}>
                    <Pressable onPress={() => skip(-10)} hitSlop={8} style={st.smallBtn} accessibilityLabel="Back 10 seconds">
                      <Feather name="rotate-ccw" size={16} color="#1a1a2e" />
                      <Text style={st.smallText}>10</Text>
                    </Pressable>
                    <Pressable onPress={cycleRate} hitSlop={8} style={st.smallBtn} accessibilityLabel="Playback speed">
                      <Text style={st.smallText}>{snap.rate}x</Text>
                    </Pressable>
                    <Pressable onPress={() => setSleepPick((v) => !v)} hitSlop={8} style={[st.smallBtn, (snap.sleepUntil || snap.sleepEndOfSong) && st.sleepOn]} accessibilityLabel="Sleep timer">
                      <Feather name="moon" size={16} color={(snap.sleepUntil || snap.sleepEndOfSong) ? '#fff' : '#1a1a2e'} />
                      <Text style={[st.smallText, (snap.sleepUntil || snap.sleepEndOfSong) && { color: '#fff' }]}>
                        {snap.sleepEndOfSong ? '1 song' : snap.sleepUntil ? `${Math.max(1, Math.ceil(sleepLeft / 60000))}m` : 'Sleep'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => skip(10)} hitSlop={8} style={st.smallBtn} accessibilityLabel="Forward 10 seconds">
                      <Feather name="rotate-cw" size={16} color="#1a1a2e" />
                      <Text style={st.smallText}>10</Text>
                    </Pressable>
                  </View>

                  {sleepPick && (
                    <View>
                      <Text style={st.modalHint}>Sleep timer = music fades out and stops by itself after the time you pick.</Text>
                      <View style={st.sleepRow}>
                        <Pressable onPress={() => { setSleepTimer(0); setSleepPick(false); toast('Sleep timer off'); }} style={st.sleepOpt}>
                          <Text style={st.sleepText}>Off</Text>
                        </Pressable>
                        {SLEEP_PRESETS.map((m) => (
                          <Pressable key={m} onPress={() => { setSleepTimer(m); setSleepPick(false); toast(`Sleep in ${m} min 🌙`); }} style={st.sleepOpt}>
                            <Text style={st.sleepText}>{m}m</Text>
                          </Pressable>
                        ))}
                        <Pressable onPress={() => { setSleepTimer(0, { endOfSong: true }); setSleepPick(false); toast('Stops at end of song 🌙'); }} style={st.sleepOpt}>
                          <Text style={st.sleepText}>End of song</Text>
                        </Pressable>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                        <TextInput value={customSleep} onChangeText={setCustomSleep} placeholder="Custom min" keyboardType="numeric" placeholderTextColor="#a8a396" style={[st.searchInput, { flex: 1 }]} />
                        <Pressable
                          onPress={() => { const m = parseInt(customSleep, 10); if (m > 0) { setSleepTimer(Math.min(480, m)); setSleepPick(false); setCustomSleep(''); } }}
                          style={st.emptyBtn}
                        >
                          <Text style={st.emptyBtnText}>Set</Text>
                        </Pressable>
                      </View>
                      {!!snap.sleepUntil && (
                        <Pressable onPress={() => { extendSleep(5); toast('Extended +5 min'); }} style={[st.emptyBtn, { marginTop: 8, backgroundColor: '#1a1a2e' }]}>
                          <Text style={st.emptyBtnText}>Extend +5 min ({Math.ceil(sleepLeft / 60000)}m left)</Text>
                        </Pressable>
                      )}
                      {(!!snap.sleepUntil || snap.sleepEndOfSong) && (
                        <Pressable onPress={() => { setSleepTimer(0); setSleepPick(false); }} style={st.linkBtn}>
                          <Text style={st.linkText}>Cancel timer</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  <Text style={st.qTitle}>Up next · {queue.length} · {formatDuration(remaining)} left</Text>
                  <View style={st.qBtns}>
                    <Pressable onPress={() => { setQueue(view); toast('Queue replaced with Songs view'); }} style={st.qBtn}>
                      <Text style={st.qBtnText}>Use Songs view</Text>
                    </Pressable>
                    <Pressable onPress={() => { clearQueue(); toast('Queue cleared'); }} style={st.qBtn}>
                      <Text style={st.qBtnText}>Clear</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (!queue.length) return;
                        createPlaylist(`Queue ${new Date().toLocaleDateString()}`, queue.map((t) => t.id)).then(() => toast('Saved as playlist'));
                      }}
                      style={st.qBtn}
                    >
                      <Text style={st.qBtnText}>Save list</Text>
                    </Pressable>
                  </View>
                  {queue.map((q, i) => (
                    <View key={`${q.id}-${i}`} style={[st.qRow, i === snap.index && st.qRowActive]}>
                      <Pressable onPress={() => playQueue(queue, i)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={[st.qNum, i === snap.index && st.qNumActive]}>{i === snap.index ? '▶' : i + 1}</Text>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={st.qName} numberOfLines={1}>{q.title}</Text>
                          <Text style={st.qSub} numberOfLines={1}>{q.artist}</Text>
                        </View>
                        <Text style={st.qDur}>{q.duration ? formatDuration(q.duration) : ''}</Text>
                      </Pressable>
                      <Pressable onPress={() => i > 0 && moveInQueue(i, i - 1)} hitSlop={6} accessibilityLabel="Move up">
                        <Feather name="chevron-up" size={15} color="#7a7567" />
                      </Pressable>
                      <Pressable onPress={() => i < queue.length - 1 && moveInQueue(i, i + 1)} hitSlop={6} accessibilityLabel="Move down">
                        <Feather name="chevron-down" size={15} color="#7a7567" />
                      </Pressable>
                      <Pressable onPress={() => rmQueueAt(i)} hitSlop={6} accessibilityLabel="Remove from queue">
                        <Feather name="x" size={15} color="#c0392b" />
                      </Pressable>
                    </View>
                  ))}
                  <Text style={st.modalHint}>Output: {Platform.OS === 'ios' ? 'iPhone speaker' : 'This device'} · wired/BT buttons route here · calls duck & resume via OS audio focus.</Text>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={artZoom} transparent animationType="fade" onRequestClose={() => setArtZoom(false)}>
        <View style={st.zoomWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setArtZoom(false)} />
          {!!snap.track && (
            <CoverTile track={snap.track} prefs={prefs} size={Math.min(width - 48, 420)} radius={24} />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f5f0' },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 26 },
  bodyWide: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: '#7a7567' },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  count: { fontSize: 12.5, color: '#7a7567', marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#eceae3',
    alignItems: 'center', justifyContent: 'center',
  },
  shuffleBtn: { backgroundColor: '#2d6a4f' },
  scanBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scanText: { fontSize: 12, color: '#7a7567' },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#eceae3' },
  tabOn: { backgroundColor: '#1a1a2e' },
  tabText: { fontSize: 12.5, fontWeight: '700', color: '#7a7567' },
  tabTextOn: { color: '#fff' },
  searchWrap: { marginBottom: 10, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d6', borderRadius: 10,
    paddingVertical: 10, paddingLeft: 36, paddingRight: 34, fontSize: 14.5, color: '#1a1a2e',
  },
  searchClear: { position: 'absolute', right: 10, padding: 4 },
  recentRow: { marginBottom: 10 },
  groupBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d6', borderRadius: 10, padding: 10, marginBottom: 10 },
  groupText: { fontSize: 12.5, color: '#7a7567', marginBottom: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: '#e4e0d6', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#7a7567' },
  chipTextActive: { color: '#fff' },
  hint: { fontSize: 12.5, color: '#7a7567', marginBottom: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  centerText: { fontSize: 14, color: '#7a7567', textAlign: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#7a7567', marginBottom: 4 },
  emptyBtn: { backgroundColor: '#2d6a4f', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16, alignItems: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  linkBtn: { padding: 12, alignItems: 'center' },
  linkText: { color: '#2d6a4f', fontSize: 14, fontWeight: '700' },
  rail: { position: 'absolute', right: 0, top: 0, bottom: 90, justifyContent: 'center', alignItems: 'center', paddingRight: 2 },
  railText: { fontSize: 10, fontWeight: '700', color: '#7a7567', paddingVertical: 1.5 },
  bubble: { position: 'absolute', alignSelf: 'center', top: '40%', backgroundColor: 'rgba(26,26,46,0.9)', borderRadius: 16, padding: 16 },
  bubbleText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e4e0d6',
    borderRadius: 14, padding: 10, marginBottom: 8,
  },
  rowActive: { borderColor: '#2d6a4f', backgroundColor: '#f2f8f4' },
  meta: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  hi: { backgroundColor: '#ffe9a8' },
  rowSub: { fontSize: 12.5, color: '#7a7567', marginTop: 1 },
  tile: { backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center' },
  tileText: { color: '#fff', fontWeight: '800' },
  collage: { width: COVER_SIZE, height: COVER_SIZE, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' },
  collageCell: { width: COVER_SIZE / 2, height: COVER_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  collageText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  albumCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e4e0d6', borderRadius: 14, padding: 10, alignItems: 'center' },
  albumName: { fontSize: 13.5, fontWeight: '700', color: '#1a1a2e', marginTop: 8 },
  albumSub: { fontSize: 11.5, color: '#7a7567' },
  plNew: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  undoBar: {
    position: 'absolute', left: 18, right: 18, bottom: 150, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a2e',
    borderRadius: 12, padding: 12,
  },
  undoText: { color: '#fff', fontSize: 13, flex: 1 },
  undoBtn: { color: '#7ee2a8', fontWeight: '800', fontSize: 13 },
  mini: {
    position: 'absolute', left: 18, right: 18, bottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  miniProgress: { position: 'absolute', top: 0, left: 0, height: 2, backgroundColor: '#7ee2a8' },
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
  modal: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 380, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
  },
  sortRowActive: { backgroundColor: '#e4f1ea' },
  sortText: { fontSize: 15, color: '#1a1a2e' },
  sortTextActive: { fontWeight: '800', color: '#2d6a4f' },
  modalHint: { fontSize: 12, color: '#a8a396', marginTop: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#eceae3', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  npWrap: { flex: 1, backgroundColor: '#f6f5f0' },
  npBlur: { position: 'absolute', top: 0, left: 0, right: 0, height: 340, opacity: 0.35 },
  npHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  npKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#7a7567', flex: 1, textAlign: 'center' },
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
  bar: { width: '100%', height: 26, justifyContent: 'center' },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#2d6a4f' },
  knob: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#2d6a4f', marginLeft: -6, top: 7 },
  previewBubble: { alignSelf: 'center', backgroundColor: '#1a1a2e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4 },
  previewText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
  modeHint: { fontSize: 11.5, color: '#7a7567', marginTop: 6 },
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
  qBtns: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginBottom: 6 },
  qBtn: { flex: 1, backgroundColor: '#eceae3', borderRadius: 8, padding: 8, alignItems: 'center' },
  qBtnText: { fontSize: 12, fontWeight: '700', color: '#1a1a2e' },
  qRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  qRowActive: { backgroundColor: '#e4f1ea', borderRadius: 10, paddingHorizontal: 8 },
  qNum: { width: 26, fontSize: 12.5, color: '#a8a396', textAlign: 'center' },
  qNumActive: { color: '#2d6a4f', fontWeight: '800' },
  qName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  qSub: { fontSize: 12, color: '#7a7567' },
  qDur: { fontSize: 12, color: '#a8a396' },
  detailBtns: { flexDirection: 'row', gap: 10, paddingHorizontal: 18 },
  zoomWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
});
