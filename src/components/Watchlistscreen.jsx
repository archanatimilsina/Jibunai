import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Modal, ActivityIndicator, Animated,
  RefreshControl, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import useCachedResource from '../hooks/useCachedResource';
import { apiSend } from '../api/http';
import { fetchResource, TTL } from '../api/resources';


const C = {
  bg: '#f6f5f0', white: '#ffffff', dark: '#1a1a2e', green: '#2d6a4f', greenLt: '#e4f1ea',
  border: '#d8d4cc', muted: '#eceae3', soft: '#7a7567', red: '#c0392b', redLt: '#fdecea',
  gold: '#d4af37', ph: '#bdb8ad',
};

/* the app talks in its own status names, the API keeps its older ones */
const STATUS_API = {
  Processing: 'Watching',
  Completed: 'Completed',
  'Plan to Start': 'Plan to Watch',
  'On Hold': 'On Hold',
  Dropped: 'Dropped',
};
const STATUS_ALIAS = { Watching: 'Processing', 'Plan to Watch': 'Plan to Start' };

/** status shown on screen (old API values are mapped to the new names) */
const statusLabel = (v) => STATUS_ALIAS[v] || v;
/** status sent to the API */
const statusApi = (v) => STATUS_API[v] || v;

const EMPTY_FORM = { type: 'drama', title: '', genre: '', status: 'Processing' };
const TYPE_TABS = ['All', 'drama', 'movie', 'anime', 'book', 'manga'];
const STATUS_OPT = ['Processing', 'Completed', 'Plan to Start', 'On Hold', 'Dropped'];
const TYPE_OPT = ['drama', 'movie', 'anime', 'book', 'manga'];
const GENRE_OPT = ['Bromance', 'BL', 'Crime', 'Detective', 'Thriller', 'Romance', 'Action', 'Drama', 'Fantasy', 'Horror', 'Historical', 'Adventure', 'Sci-Fi', 'Comedy', 'Sad'];
const STATUS_ORDER = ['Processing', 'Plan to Start', 'On Hold', 'Completed', 'Dropped'];
const STATUS_TABS = ['All', ...STATUS_ORDER];
const SORT_OPT = [
  { value: 'default', label: 'Sort: Default' },
  { value: 'title-az', label: 'Title: A to Z' },
  { value: 'title-za', label: 'Title: Z to A' },
];

const STATUS_COLOR = {
  Processing: { bg: '#d8f3dc', color: '#2d6a4f', border: '#b7e4c7' },
  Completed: { bg: C.muted, color: C.soft, border: C.border },
  'Plan to Start': { bg: '#e8f4fd', color: '#1a6fa8', border: '#b3d9f5' },
  'On Hold': { bg: '#fdf6dc', color: '#9a7a00', border: '#f0d96a' },
  Dropped: { bg: '#fdecea', color: '#6137a9', border: '#f5b7b1' },
};
const TYPE_COLOR = {
  drama: { bg: '#ede7f6', color: '#5e35b1', border: '#c5b4e8' },
  movie: { bg: '#fce4ec', color: '#c2185b', border: '#f48fb1' },
  anime: { bg: '#e0f7fa', color: '#00838f', border: '#80deea' },
  book: { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  manga: { bg: '#f1f8e9', color: '#558b2f', border: '#c5e1a5' },
};
const TYPE_SURFACE = { drama: '#f7f4fd', movie: '#fdf1f6', anime: '#effbfc', book: '#fff8f0', manga: '#f6faf0' };

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const shadow = { shadowColor: '#1a1a2e', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 };

const Pill = ({ label, onPress, primary, style }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.pill, primary && { backgroundColor: C.dark }, pressed && { opacity: 0.8 }, style]}>
    <Text style={[s.pillText, primary && { color: C.bg }]}>{label}</Text>
  </Pressable>
);

const Tab = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[s.tab, active && { backgroundColor: C.dark, borderColor: C.dark }]}>
    <Text style={[s.tabText, active && { color: C.bg }]}>{label}</Text>
  </Pressable>
);

const Badge = ({ label, c }) => (
  <View style={[s.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
    <Text style={[s.badgeText, { color: c.color }]}>{label}</Text>
  </View>
);

function Select({ value, options, onChange, placeholder, error, compact }) {
  const [open, setOpen] = useState(false);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: cap(o) } : o));
  const cur = opts.find((o) => o.value === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[compact ? s.sortBtn : s.input, s.selectRow, error && { borderColor: C.red }]}>
        <Text numberOfLines={1} style={[compact ? s.sortText : { fontSize: 15, color: cur ? C.dark : C.ph }, { flexShrink: 1 }]}>
          {cur?.label ?? placeholder ?? 'Select'}
        </Text>
        <Feather name="chevron-down" size={13} color={C.soft} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <View style={[s.sheet, { padding: 8 }]}>
            <ScrollView style={{ maxHeight: 380 }}>
              {opts.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
                    style={[s.optRow, on && { backgroundColor: C.greenLt }]}>
                    <Text style={{ fontSize: 15, fontWeight: on ? '800' : '500', color: on ? C.green : C.dark }}>{o.label}</Text>
                    {on && <Feather name="check" size={15} color={C.green} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const Spinner = ({ color = '#fff' }) => <ActivityIndicator size="small" color={color} />;

export default function WatchlistScreen() {
  const { width } = useWindowDimensions();
  const cols = width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const pad = width >= 600 ? 28 : 16;

  const [savingId, setSavingId] = useState(null);
  const [apiError, setApiError] = useState('');
  const {
    data: items,
    loading,
    refreshing,
    errorText: loadError,
    refresh,
    mutate,
  } = useCachedResource('watchlist', () => fetchResource('watchlist'), {
    ttl: TTL.STATIC,
    initial: [],
    errorMessage: 'Failed to load watchlist. Check your connection.',
  });

  const [tab, setTab] = useState('All');
  const [statusTab, setStatusTab] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');

  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const toastRef = useRef(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg, icon = 'check') => {
    setToast({ msg, icon });
    clearTimeout(toastRef.current);
    Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    toastRef.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 2600);
  };
  useEffect(() => () => clearTimeout(toastRef.current), []);

  const openAdd = () => { setForm(EMPTY_FORM); setErrors({}); setEditItem(null); setApiError(''); setModal('add'); };
  const openEdit = (item) => {
    setForm({ type: item.type || 'drama', title: item.title || '', genre: item.genre || '', status: statusLabel(item.status || 'Watching') });
    setErrors({}); setEditItem(item); setApiError(''); setModal('edit');
  };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    const e = {};
    if (!form.title.trim()) e.title = true;
    if (!form.genre.trim()) e.genre = true;
    if (Object.keys(e).length) { setErrors(e); return; }

    const isEdit = modal === 'edit';
    setSavingId(isEdit ? editItem.id : 'new');
    setApiError('');
    try {
      const saved = await apiSend(
        isEdit ? `/watchlist/${editItem.id}/` : '/watchlist/',
        isEdit ? 'PUT' : 'POST',
        { type: form.type, title: form.title.trim(), genre: form.genre.trim(), status: statusApi(form.status) },
      );
      if (isEdit) {
        mutate((p) => (p || []).map((x) => (x.id === editItem.id ? saved : x)));
        showToast(`"${saved.title}" updated!`);
      } else {
        mutate((p) => [saved, ...(p || [])]);
        showToast(`"${saved.title}" added!`);
      }
      setModal(null);
    } catch (err) { setApiError(err.message || 'Save failed.'); }
    finally { setSavingId(null); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setSavingId(delTarget.id); setApiError('');
    try {
      await apiSend(`/watchlist/${delTarget.id}/`, 'DELETE');
      mutate((p) => (p || []).filter((x) => x.id !== delTarget.id));
      setSelectedId((id) => (id === delTarget.id ? null : id));
      showToast(`"${delTarget.title}" removed.`, 'trash-2');
      setDelTarget(null);
    } catch (err) { setApiError(err.message || 'Could not delete item.'); setDelTarget(null); }
    finally { setSavingId(null); }
  };

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter((x) => tab === 'All' || x.type === tab)
      .filter((x) => statusTab === 'All' || statusLabel(x.status) === statusTab)
      .filter((x) => x.title.toLowerCase().includes(q) || (x.genre || '').toLowerCase().includes(q))
      .sort((a, b) => (sort === 'title-az' ? a.title.localeCompare(b.title) : sort === 'title-za' ? b.title.localeCompare(a.title) : 0));
  }, [items, tab, statusTab, search, sort]);

  const isSavingForm = savingId === 'new' || (editItem && savingId === editItem.id);
  const setF = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const renderCard = (item) => {
    const tc = TYPE_COLOR[item.type];
    const busy = savingId === item.id;
    const picked = selectedId === item.id;
    return (
      <View key={item.id} style={{ width: `${100 / cols}%`, padding: 8 }}>
        <Pressable
          onPress={() => setSelectedId((id) => (id === item.id ? null : item.id))}
          accessibilityRole="button"
          accessibilityState={{ selected: picked }}
          accessibilityLabel={`${item.title}, ${statusLabel(item.status)}`}
          style={({ pressed }) => [
            s.card,
            shadow,
            {
              backgroundColor: TYPE_SURFACE[item.type] || C.white, borderColor: tc?.border || C.border,
              borderLeftColor: tc?.color || C.border, opacity: busy ? 0.5 : 1,
            },
            picked && s.cardPicked,
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={s.cardTop}>
            <View style={s.cardBadges}>
              <Badge label={item.type} c={tc || STATUS_COLOR.Completed} />
              <Badge label={statusLabel(item.status)} c={STATUS_COLOR[statusLabel(item.status)] || STATUS_COLOR.Completed} />
            </View>

            {/* the actions only show up once the entry is picked */}
            {picked && (
              <View style={s.cardActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => openEdit(item)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.title}`}
                  style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]}
                >
                  {busy ? <Spinner color={C.dark} /> : <Feather name="edit-2" size={13} color={C.dark} />}
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => setDelTarget(item)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.title}`}
                  style={({ pressed }) => [s.iconBtn, s.iconBtnDanger, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="trash-2" size={13} color={C.red} />
                </Pressable>
              </View>
            )}
          </View>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.cardGenre}>{item.genre}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.dot} />
          <Text style={s.brand}>My <Text style={{ color: C.green }}>Watchlist</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pill primary label="+ Add" onPress={openAdd} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.green} onRefresh={refresh} />}
      >
        <View style={[s.main, { paddingHorizontal: pad }]}>
          <View style={s.header}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Text style={s.title}>Dramas, <Text style={{ color: C.green }}>Movies</Text> & More</Text>
              <Text style={s.desc}>Exploring new story each day.</Text>
            </View>
          </View>

          {!!(apiError || loadError) && !modal && (
            <Pressable onPress={() => setApiError('')} style={s.errorBanner}>
              <Text style={{ flex: 1, color: C.red, fontSize: 13 }}>{apiError || loadError}</Text>
              <Feather name="x" size={14} color={C.red} />
            </Pressable>
          )}

          <View style={s.controls}>
            <View style={s.searchBox}>
              <View style={s.searchIcon}><Feather name="search" size={14} color={C.soft} /></View>
              <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search title, genre..."
                placeholderTextColor={C.ph} autoCorrect={false} returnKeyType="search" />
              {!!search && <Pressable onPress={() => setSearch('')} hitSlop={8} style={s.clear}><Feather name="x" size={12} color={C.soft} /></Pressable>}
            </View>
            <View style={{ minWidth: 150 }}><Select compact value={sort} options={SORT_OPT} onChange={setSort} /></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
            {TYPE_TABS.map((t) => <Tab key={t} label={t} active={tab === t} onPress={() => setTab(t)} />)}
          </ScrollView>

          <View style={s.statusRow}>
            <Text style={s.statusLabel}>STATUS</Text>
            <View style={s.resultCount}><Text style={s.resultText}>{visible.length} {visible.length === 1 ? 'TITLE' : 'TITLES'}</Text></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.tabRow, { marginBottom: 20 }]}>
            {STATUS_TABS.map((t) => <Tab key={t} label={t} active={statusTab === t} onPress={() => setStatusTab(t)} />)}
          </ScrollView>

          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 40 }}>
              <Spinner color={C.green} /><Text style={{ color: C.soft, fontSize: 14 }}>Loading watchlist...</Text>
            </View>
          )}

          {!loading && (visible.length === 0 ? (
            <View style={s.empty}>
              <Feather name="film" size={34} color={C.ph} />
              <Text style={[s.emptyTitle, { marginTop: 12 }]}>Nothing here yet</Text>
              <Text style={s.emptyDesc}>
                {search ? `No results for "${search}"` : tab !== 'All' || statusTab !== 'All' ? 'Nothing matches these filters yet.' : 'Add your first entry to get started.'}
              </Text>
            </View>
          ) : (
            <View style={s.grid}>{visible.map(renderCard)}</View>
          ))}
        </View>
      </ScrollView>

      {}
      <Modal transparent visible={!!modal} animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={s.overlay} onPress={closeModal}>
            <Pressable style={s.panel} onPress={() => {}}>
              <Pressable onPress={closeModal} style={s.close}><Feather name="x" size={14} color={C.soft} /></Pressable>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={s.modalTitle}>{modal === 'add' ? 'Recording New Achievement' : 'Edit Entry'}</Text>

                <View style={s.formRow}>
                  <View style={s.formCol}><Text style={s.label}>TYPE</Text><Select value={form.type} options={TYPE_OPT} onChange={setF('type')} /></View>
                  <View style={s.formCol}><Text style={s.label}>STATUS</Text><Select value={form.status} options={STATUS_OPT} onChange={setF('status')} /></View>
                </View>

                <View style={s.formFull}>
                  <Text style={s.label}>TITLE *</Text>
                  <TextInput style={[s.input, errors.title && { borderColor: C.red }]} value={form.title}
                    onChangeText={(v) => { setF('title')(v); if (errors.title) setErrors((e) => ({ ...e, title: false })); }}
                    placeholder="Enter title..." placeholderTextColor={C.ph} />
                </View>

                <View style={s.formFull}>
                  <Text style={s.label}>GENRE *</Text>
                  <Select value={form.genre} options={GENRE_OPT.map((g) => ({ value: g, label: g }))} placeholder="Select genre" error={errors.genre}
                    onChange={(v) => { setF('genre')(v); setErrors((e) => ({ ...e, genre: false })); }} />
                </View>

                {!!apiError && <View style={s.modalError}><Text style={{ color: C.red, fontSize: 13 }}>{apiError}</Text></View>}

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
                  <Pressable onPress={handleSave} disabled={isSavingForm} style={[s.saveBtn, isSavingForm && { opacity: 0.5 }]}>
                    {isSavingForm && <Spinner />}
                    <Text style={s.saveText}>{isSavingForm ? 'Saving...' : modal === 'add' ? 'Add to Watchlist' : 'Save Changes'}</Text>
                  </Pressable>
                  <Pressable onPress={closeModal} style={s.cancelBtn}><Text style={s.cancelText}>Cancel</Text></Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {}
      <Modal transparent visible={!!delTarget} animationType="fade" onRequestClose={() => setDelTarget(null)}>
        <Pressable style={s.overlay} onPress={() => setDelTarget(null)}>
          <Pressable style={[s.panel, { maxWidth: 400, alignItems: 'center' }]} onPress={() => {}}>
            <Feather name="trash-2" size={30} color={C.red} />
            <Text style={[s.emptyTitle, { marginTop: 10 }]}>Remove from Watchlist?</Text>
            <Text style={[s.emptyDesc, { textAlign: 'center', marginBottom: 22 }]}>
              <Text style={{ color: C.dark, fontWeight: '800' }}>{delTarget?.title}</Text> will be permanently removed. This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
              <Pressable onPress={handleDelete} disabled={savingId === delTarget?.id} style={[s.saveBtn, { backgroundColor: C.red, borderColor: C.red }, savingId === delTarget?.id && { opacity: 0.5 }]}>
                {savingId === delTarget?.id && <Spinner />}
                <Text style={s.saveText}>{savingId === delTarget?.id ? 'Removing...' : 'Yes, Remove'}</Text>
              </Pressable>
              <Pressable onPress={() => setDelTarget(null)} style={s.cancelBtn}><Text style={s.cancelText}>Keep It</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {toast && (
        <Animated.View pointerEvents="none" style={[s.toast, {
          opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <Feather name={toast.icon} size={15} color={C.bg} />
          <Text style={s.toastText} numberOfLines={2}>{toast.msg}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  main: { width: '100%', maxWidth: 1300, alignSelf: 'center', paddingTop: 26 },

  topBar: { height: 58, backgroundColor: C.bg, borderBottomWidth: 2, borderBottomColor: C.dark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.green },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: C.dark },
  pill: { borderWidth: 2, borderColor: C.dark, borderRadius: 100, paddingVertical: 6, paddingHorizontal: 13, backgroundColor: 'transparent' },
  pillText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: C.dark, textTransform: 'uppercase' },

  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 38, color: C.dark, marginBottom: 6 },
  desc: { fontSize: 14.5, lineHeight: 22, color: C.soft },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.redLt, borderWidth: 1, borderColor: '#f5b7b1', borderRadius: 10, padding: 12, marginBottom: 18 },

  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 },
  searchBox: { flex: 1, minWidth: 200, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 14, zIndex: 1, top: 0, bottom: 0, justifyContent: 'center' },
  searchInput: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 100, paddingLeft: 40, paddingRight: 38, paddingVertical: Platform.OS === 'ios' ? 11 : 8, fontSize: 14.5, color: C.dark },
  clear: { position: 'absolute', right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  sortBtn: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 100, paddingVertical: Platform.OS === 'ios' ? 11 : 9, paddingHorizontal: 16 },
  sortText: { fontSize: 12.5, fontWeight: '800', color: C.dark },

  tabRow: { gap: 8, paddingRight: 8 },
  tab: { borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, borderRadius: 100, paddingVertical: 7, paddingHorizontal: 15 },
  tabText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: C.soft, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  statusLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.5, color: C.soft },
  resultCount: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 100, paddingVertical: 4, paddingHorizontal: 12 },
  resultText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: C.soft },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  card: { borderWidth: 1.5, borderLeftWidth: 4, borderRadius: 18, padding: 18, gap: 9 },
  cardPicked: { borderColor: C.dark, borderLeftColor: C.dark },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
  },
  iconBtnDanger: { backgroundColor: C.redLt, borderColor: '#f5b7b1' },
  badge: { borderWidth: 1.5, borderRadius: 100, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { fontSize: 17, fontWeight: '800', lineHeight: 22, color: C.dark },
  cardGenre: { fontSize: 13, color: C.soft },

  empty: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.dark, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: C.soft, lineHeight: 21 },

  overlay: { flex: 1, backgroundColor: 'rgba(26,26,46,.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: C.white, borderRadius: 16, width: '100%', maxWidth: 380 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10 },
  panel: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 24, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90%', ...shadow },
  close: { position: 'absolute', top: 14, right: 14, zIndex: 5, width: 32, height: 32, borderRadius: 16, backgroundColor: C.muted, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, color: C.dark, marginBottom: 20, paddingRight: 36 },

  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  formCol: { flexGrow: 1, flexBasis: 150, gap: 6 },
  formFull: { gap: 6, marginBottom: 14 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2, color: C.soft },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 15, color: C.dark },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modalError: { backgroundColor: C.redLt, borderWidth: 1, borderColor: '#f5b7b1', borderRadius: 8, padding: 11, marginTop: 4 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dark, borderWidth: 2, borderColor: C.dark, borderRadius: 100, paddingVertical: 13 },
  saveText: { color: C.bg, fontWeight: '800', fontSize: 14 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.border, borderRadius: 100, paddingVertical: 13 },
  cancelText: { color: C.soft, fontWeight: '800', fontSize: 14 },

  toast: { position: 'absolute', left: 16, right: 16, bottom: 28, alignSelf: 'center', maxWidth: 380, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.dark, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, ...shadow },
  toastText: { flexShrink: 1, color: C.bg, fontSize: 13.5, fontWeight: '800' },
});