import React, {
  useState, useEffect, useCallback, useRef, useMemo, memo,
} from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, Modal, ScrollView, Animated,
  StyleSheet, useWindowDimensions, Platform, KeyboardAvoidingView, StatusBar,
  SafeAreaView, RefreshControl, ActivityIndicator, BackHandler, AppState,
  Keyboard, Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';

import useCachedResource from '../hooks/useCachedResource';
import { apiSend } from '../api/http';
import { fetchResource, TTL } from '../api/resources';


const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const ENDPOINT = `${API_BASE}/api/node-matrix/`;
const PIN_KEY = 'notes:pinned-ids';
const WIDE_BREAKPOINT = 900;

const DELETE_TIMEOUT = 90000;


const C = {
  pageBg: '#f6f5f0',
  sidebarBg: '#eceae3',
  border: '#d8d4cc',
  borderSoft: '#e5e1d8',
  text: '#1a1a2e',
  muted: '#7a7567',
  dimmer: '#a8a396',
  accent: '#2d6a4f',
  accentDim: '#245741',
  accentSoft: 'rgba(45,106,79,0.10)',
  accentRing: 'rgba(45,106,79,0.35)',
  danger: '#c0392b',
  dangerDim: '#a53125',
  dangerSoft: 'rgba(192,57,43,0.08)',
  ok: '#2d6a4f',
  white: '#ffffff',
};
const R = { lg: 14, md: 10, sm: 8 };

const shadow = (h = 8, o = 0.14, r = 20) => Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: h }, shadowOpacity: o, shadowRadius: r },
  android: { elevation: Math.round(h * 1.2) },
  default: {},
});


async function deleteNote(url, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELETE_TIMEOUT);
    try {
      const res = await fetch(url, { method: 'DELETE', signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok && res.status >= 500 && i < attempts - 1) {
        lastErr = new Error(`Server error ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
  }
  throw lastErr || new Error('Delete failed');
}

async function noteStillExists(id) {
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) return true;
    const list = await res.json();
    return list.some((n) => n.id === id);
  } catch {
    return true;
  }
}



const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function firstLine(text) {
  const lines = (text || '').split('\n');
  for (const l of lines) if (l.trim()) return l.trim();
  return '';
}

function splitTitleBody(content) {
  const raw = (content || '').replace(/^\n+/, '');
  const nl = raw.indexOf('\n');
  let title = nl === -1 ? raw : raw.slice(0, nl);
  let body = nl === -1 ? '' : raw.slice(nl + 1);
  title = title.trim();
  if (!title) title = 'New Note';
  if (title.length > 140) {
    body = title.slice(140) + (body ? '\n' + body : '');
    title = title.slice(0, 140);
  }
  return { title, body };
}

function composeContent(note) {
  if (!note) return '';
  const title = note.title || '';
  const body = note.text || '';
  return body ? `${title}\n${body}` : title;
}

const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function loadIdSet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    console.error(`[Notes] could not read ${key} from storage:`, e);
    return new Set();
  }
}
async function saveIdSet(key, set) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error(`[Notes] could not persist ${key} to storage:`, e);
  }
}


function Highlight({ text, q, style, markStyle, numberOfLines }) {
  const s = text || '';
  if (!q) return <Text style={style} numberOfLines={numberOfLines}>{s}</Text>;
  const lower = s.toLowerCase();
  const parts = [];
  let start = 0; let idx; let key = 0;
  while ((idx = lower.indexOf(q, start)) !== -1) {
    if (idx > start) parts.push(s.slice(start, idx));
    parts.push(<Text key={key++} style={markStyle || st.mark}>{s.slice(idx, idx + q.length)}</Text>);
    start = idx + q.length;
  }
  if (start < s.length) parts.push(s.slice(start));
  return <Text style={style} numberOfLines={numberOfLines}>{parts.length ? parts : s}</Text>;
}

function Skeleton() {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.5, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[st.skeleton, { opacity }]} />;
}

function Toast({ msg, err }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View
      style={[
        st.toast,
        { borderLeftColor: err ? C.danger : C.ok, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <Feather name={err ? 'x' : 'check'} size={14} color={err ? C.danger : C.ok} />
      <Text style={st.toastText}>{msg}</Text>
    </Animated.View>
  );
}

const NoteRow = memo(function NoteRow({ item, selected, pinned, q, wide, onPress, onLongPress, onDelete }) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={item.isDraft ? undefined : () => onLongPress(item)}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={`Open note ${item.title || 'New Note'}`}
      style={({ pressed }) => [
        st.row,
        selected && st.rowSelected,
        !selected && pressed && st.rowPressed,
      ]}
    >
      <View style={st.rowTop}>
        <Highlight
          text={item.title || 'New Note'}
          q={q}
          numberOfLines={1}
          style={[st.rowTitle, selected && { color: C.white }]}
          markStyle={selected ? st.markOnAccent : st.mark}
        />
        {pinned && (
          <View style={st.rowPin}>
            <Feather name="bookmark" size={12} color={selected ? C.white : C.accent} />
          </View>
        )}
        {wide && selected && (
          <Pressable
            hitSlop={8}
            onPress={() => onDelete(item.id)}
            accessibilityLabel={item.isDraft ? 'Discard draft' : `Delete ${item.title || 'note'}`}
            style={({ pressed }) => [st.rowDelete, pressed && { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          >
            <Feather name="trash-2" size={13} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}
      </View>
      <Highlight
        text={firstLine(item.text) || 'No additional text'}
        q={q}
        numberOfLines={1}
        style={[st.rowSnippet, selected && { color: 'rgba(255,255,255,0.78)' }]}
        markStyle={selected ? st.markOnAccent : st.mark}
      />
      <Text style={[st.rowDate, selected && { color: 'rgba(255,255,255,0.78)' }]}>
        {item.isDraft ? 'Just now' : fmtDate(item.created_at)}
      </Text>
    </Pressable>
  );
});

function ToolbarAction({ icon, label, onPress, active, danger, showLabel }) {
  const color = danger ? C.danger : active ? C.accent : C.muted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        st.tbAction,
        pressed && { backgroundColor: danger ? C.dangerSoft : 'rgba(0,0,0,0.05)' },
      ]}
    >
      <Feather name={icon} size={16} color={color} />
      {showLabel && <Text style={[st.tbActionText, { color }]}>{label}</Text>}
    </Pressable>
  );
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      style={({ pressed }) => [st.menuItem, pressed && { backgroundColor: danger ? C.dangerSoft : 'rgba(0,0,0,0.05)' }]}
    >
      <Feather name={icon} size={17} color={danger ? C.dangerDim : C.muted} />
      <Text style={[st.menuItemText, danger && { color: C.dangerDim }]}>{label}</Text>
    </Pressable>
  );
}


export default function Notes() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const showLabels = width >= 640;

  const {
    data: notes,
    loading,
    refreshing,
    errorText: fetchErr,
    refresh,
    mutate,
  } = useCachedResource('notes', () => fetchResource('notes'), {
    ttl: TTL.EDITABLE,
    initial: [],
    errorMessage: 'Could not load notes. Check your connection.',
  });

  const [selectedId, setSelectedId] = useState(null);
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveErr, setSaveErr] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [pinned, setPinned] = useState(() => new Set());
  const [menuNote, setMenuNote] = useState(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  const editorRef = useRef(null);
  const autosaveTimer = useRef(null);
  const pendingRef = useRef(null);
  const draftCreatingRef = useRef(false);
  const draftQueuedRef = useRef(null);
  const selectedIdRef = useRef(null);
  const pinsLoadedRef = useRef(false);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-2));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    loadIdSet(PIN_KEY).then((set) => { setPinned(set); pinsLoadedRef.current = true; });
  }, []);
  useEffect(() => {
    if (pinsLoadedRef.current) saveIdSet(PIN_KEY, pinned);
  }, [pinned]);

  useEffect(() => () => clearTimeout(autosaveTimer.current), []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [query]);
  const q = debouncedQuery;

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);


  const commitSave = async (id, text) => {
    if (!text || !text.trim()) return true;
    const { title, body } = splitTitleBody(text);

    if (id === 'draft') {
      if (draftCreatingRef.current) { draftQueuedRef.current = text; return true; }
      draftCreatingRef.current = true;
      setSaveStatus('saving');
      try {
        const created = await apiSend('/node-matrix/', 'POST', { emoji: '📝', title, text: body });
        mutate((prev) => [created, ...(prev || [])]);
        if (selectedIdRef.current === 'draft') setSelectedId(created.id);
        setSaveStatus('saved');
        setSaveErr(null);
        draftCreatingRef.current = false;
        const queued = draftQueuedRef.current;
        draftQueuedRef.current = null;
        if (queued !== null) return await commitSave(created.id, queued);
        return true;
      } catch (e) {
        console.error('[Notes] create error:', e);
        setSaveErr('Network error — not saved.');
        setSaveStatus('idle');
        draftCreatingRef.current = false;
        return false;
      }
    }

    setSaveStatus('saving');
    try {
      const updated = await apiSend(`/node-matrix/${id}/`, 'PATCH', { emoji: '📝', title, text: body });
      mutate((prev) => (prev || []).map((n) => (n.id === id ? updated : n)));
      setSaveStatus('saved');
      setSaveErr(null);
      return true;
    } catch (e) {
      console.error('[Notes] autosave error:', e);
      setSaveErr('Network error — changes are not saved.');
      setSaveStatus('idle');
      return false;
    }
  };

  const scheduleSave = (id, text) => {
    pendingRef.current = { id, content: text };
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const p = pendingRef.current;
      pendingRef.current = null;
      if (p) commitSave(p.id, p.content);
    }, 700);
  };

  const flushPending = async () => {
    clearTimeout(autosaveTimer.current);
    const p = pendingRef.current;
    pendingRef.current = null;
    if (!p) return true;
    return commitSave(p.id, p.content);
  };

  const flushRef = useRef(flushPending);
  flushRef.current = flushPending;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flushRef.current();
    });
    return () => sub.remove();
  }, []);

  const onContentChange = (value) => {
    setContent(value);
    setSaveErr(null);
    if (selectedId === null) return;
    scheduleSave(selectedId, value);
  };


  const selectNote = async (item) => {
    if (selectedId === item.id) return;
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save your last note — staying here so nothing is lost.", true); return; }
    setMenuNote(null);
    setSelectedId(item.id);
    setContent(composeContent(item));
    setSaveStatus('idle');
    setSaveErr(null);
    if (wide) setTimeout(() => editorRef.current?.focus(), 50);
  };

  const startCreate = async () => {
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save your last note — staying here so nothing is lost.", true); return; }
    setMenuNote(null);
    setSelectedId('draft');
    setContent('');
    setSaveStatus('idle');
    setSaveErr(null);
    setTimeout(() => editorRef.current?.focus(), 120);
  };

  const handleBack = async () => {
    Keyboard.dismiss();
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save — staying here so nothing is lost.", true); return; }
    setSelectedId(null);
    setContent('');
  };

  const backRef = useRef(handleBack);
  backRef.current = handleBack;
  useEffect(() => {
    if (wide || selectedId === null) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { backRef.current(); return true; });
    return () => sub.remove();
  }, [wide, selectedId]);


  const filteredSortedNotes = useMemo(() => {
    let list = notes;
    if (filter === 'pinned') list = list.filter((n) => pinned.has(n.id));
    if (q) list = list.filter((n) => (n.title || '').toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      const aPin = pinned.has(a.id); const bPin = pinned.has(b.id);
      if (aPin !== bPin) return aPin ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [notes, filter, q, pinned]);

  const draftRow = useMemo(() => {
    if (selectedId !== 'draft') return null;
    const { title, body } = splitTitleBody(content);
    return { id: 'draft', title: content.trim() ? title : 'New Note', text: body, created_at: new Date().toISOString(), isDraft: true };
  }, [selectedId, content]);

  const listItems = draftRow ? [draftRow, ...filteredSortedNotes] : filteredSortedNotes;

  const emptyState = useMemo(() => {
    if (notes.length === 0 && !draftRow) return { title: 'No notes yet', desc: 'Create your first note to get started.' };
    if (q) return { title: 'No notes found', desc: 'Try a different keyword.' };
    if (filter === 'pinned') return { title: 'No pinned notes', desc: 'Long-press a note and choose Pin to see it here.' };
    return { title: 'No notes yet', desc: 'Create your first note to get started.' };
  }, [notes.length, draftRow, q, filter]);


  const requestDelete = (id) => {
    if (id === 'draft') {
      if (pendingRef.current) {
        clearTimeout(autosaveTimer.current);
        pendingRef.current = null;
      }
      setSelectedId(null);
      setContent('');
      setSaveStatus('idle');
      setSaveErr(null);
      setMenuNote(null);
      return;
    }
    setMenuNote(null);
    setConfirmDeleteId(id);
  };
  const cancelDelete = () => setConfirmDeleteId(null);

  const handleDelete = async (id) => {
    if (pendingRef.current?.id === id) {
      clearTimeout(autosaveTimer.current);
      pendingRef.current = null;
    }
    setDeletingId(id);
    let success = false;
    try {
      const res = await deleteNote(`${ENDPOINT}${id}/`);
      success = res.ok || res.status === 204 || res.status === 404;
      if (!success) toast('Delete failed. Please try again.', true);
    } catch (e) {
      console.error('[Notes] delete error:', e);
      success = !(await noteStillExists(id));
      if (!success) toast('Network error — could not delete.', true);
    }
    if (success) {
      mutate((prev) => (prev || []).filter((n) => n.id !== id));
      if (selectedIdRef.current === id) {
        setSelectedId(null);
        setContent('');
        setSaveStatus('idle');
        setSaveErr(null);
      }
      toast('Note deleted');
    }
    setDeletingId(null);
    return success;
  };

  const confirmDeleteNow = async () => {
    const id = confirmDeleteId;
    if (id == null) return;
    const ok = await handleDelete(id);
    if (ok) setConfirmDeleteId(null);
  };


  const togglePin = (id) => setPinned((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const duplicateNote = async (note) => {
    if (!note) return;
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save your last note — try again.", true); return; }
    try {
      const created = await apiSend('/node-matrix/', 'POST', {
        emoji: '📝',
        title: `${note.title} copy`,
        text: note.text,
      });
      mutate((prev) => [created, ...(prev || [])]);
      setMenuNote(null);
      setSelectedId(created.id);
      setContent(composeContent(created));
      setSaveStatus('idle');
      toast('Note duplicated');
    } catch (e) {
      console.error('[Notes] duplicate error:', e);
      toast('Network error — could not duplicate.', true);
    }
  };

  const copyToClipboard = async (str) => {
    try {
      await Clipboard.setStringAsync(str || '');
      toast('Copied');
    } catch (e) {
      console.error('[Notes] clipboard error:', e);
      toast('Could not copy — clipboard unavailable.', true);
    }
  };

  const downloadNotePdf = async (note) => {
    try {
      const { title, body } = splitTitleBody(note ? composeContent(note) : content);
      const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
        <body style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1a1a2e;padding:40px;">
          <h1 style="font-size:26px;margin:0 0 18px;">${escapeHtml(title)}</h1>
          <div style="white-space:pre-wrap;line-height:1.7;font-size:14px;">${escapeHtml(body)}</div>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
      }
      toast('PDF ready');
    } catch (e) {
      console.error('[Notes] PDF export error:', e);
      toast('Could not create the PDF.', true);
    }
  };

  const isPinnedSelected = typeof selectedId === 'number' && pinned.has(selectedId);
  const showList = wide || selectedId === null;
  const showDetail = wide || selectedId !== null;


  const renderItem = useCallback(({ item }) => (
    <NoteRow
      item={item}
      selected={selectedId === item.id}
      pinned={pinned.has(item.id)}
      q={q}
      wide={wide}
      onPress={selectNote}
      onLongPress={setMenuNote}
      onDelete={requestDelete}
    />
  ), [selectedId, pinned, q, wide, content, notes]);

  const sidebar = (
    <View style={[st.sidebar, wide ? st.sidebarWide : st.sidebarFull]}>
      <View style={st.sidebarHeader}>
        <View>
          <Text style={st.appName}>Notes</Text>
          {!loading && (
            <Text style={st.appCount}>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</Text>
          )}
        </View>
        <Pressable
          onPress={startCreate}
          accessibilityRole="button"
          accessibilityLabel="New note"
          style={({ pressed }) => [st.newBtn, pressed && { backgroundColor: C.accentDim }]}
        >
          <Feather name="plus" size={15} color={C.white} />
          <Text style={st.newBtnText}>New Note</Text>
        </Pressable>
      </View>

      <View style={st.searchWrap}>
        <Feather name="search" size={15} color={C.dimmer} style={st.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={C.dimmer}
          style={st.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel="Search notes"
        />
        {!!query && (
          <Pressable onPress={() => setQuery('')} hitSlop={10} style={st.searchClear} accessibilityLabel="Clear search">
            <Feather name="x" size={14} color={C.dimmer} />
          </Pressable>
        )}
      </View>

      <View style={st.chips} accessibilityRole="tablist">
        {[['all', 'All Notes'], ['pinned', 'Pinned']].map(([key, label]) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(key)}
              style={[st.chip, active && st.chipActive]}
            >
              <Text style={[st.chipText, active && { color: C.white }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!!fetchErr && (
        <View style={st.sidebarError}>
          <Text style={st.sidebarErrorText}>
            Couldn't load notes.{' '}
            <Text style={st.linkText} onPress={refresh}>Retry</Text>
          </Text>
        </View>
      )}

      {loading ? (
        <View style={st.listPad}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          extraData={[selectedId, pinned, q, wide]}
          contentContainerStyle={[st.listPad, listItems.length === 0 && { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              tintColor={C.accent}
              colors={[C.accent]}
              onRefresh={refresh}
            />
          )}
          ListEmptyComponent={(
            <View style={st.sidebarEmpty}>
              <Feather name="file-text" size={26} color={C.dimmer} style={{ marginBottom: 10 }} />
              <Text style={st.sidebarEmptyTitle}>{emptyState.title}</Text>
              <Text style={st.sidebarEmptyDesc}>{emptyState.desc}</Text>
            </View>
          )}
        />
      )}
    </View>
  );

  const detail = (
    <KeyboardAvoidingView
      style={st.detail}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {selectedId === null ? (
        <View style={st.detailEmpty}>
          <Feather name="edit-3" size={30} color={C.dimmer} style={{ marginBottom: 8 }} />
          <Text style={st.detailEmptyTitle}>Select a note</Text>
          <Text style={st.detailEmptyDesc}>Choose a note from the list, or create a new one.</Text>
        </View>
      ) : (
        <>
          <View style={st.topbar}>
            {!wide && (
              <Pressable onPress={handleBack} hitSlop={6} style={st.backBtn} accessibilityLabel="Back to list">
                <Feather name="chevron-left" size={24} color={C.accent} />
              </Pressable>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={st.topbarScroll}
              keyboardShouldPersistTaps="handled"
            >
              {!!content.trim() && (
                <>
                  <ToolbarAction icon="copy" label="Copy" showLabel={showLabels} onPress={() => copyToClipboard(content)} />
                  <ToolbarAction icon="download" label="PDF" showLabel={showLabels} onPress={() => downloadNotePdf()} />
                </>
              )}
              {typeof selectedId === 'number' && (
                <>
                  <ToolbarAction
                    icon="bookmark"
                    label={isPinnedSelected ? 'Pinned' : 'Pin'}
                    showLabel={showLabels}
                    active={isPinnedSelected}
                    onPress={() => togglePin(selectedId)}
                  />
                  <ToolbarAction
                    icon="layers"
                    label="Duplicate"
                    showLabel={showLabels}
                    onPress={() => duplicateNote(notes.find((n) => n.id === selectedId))}
                  />
                  <ToolbarAction icon="trash-2" label="Delete" showLabel={showLabels} danger onPress={() => requestDelete(selectedId)} />
                </>
              )}
            </ScrollView>

            <View style={st.saveWrap}>
              {saveStatus !== 'idle' && (
                <View style={st.saveStatus}>
                  <View style={[st.saveDot, { backgroundColor: saveStatus === 'saving' ? C.muted : C.ok }]} />
                  <Text style={[st.saveText, { color: saveStatus === 'saving' ? C.muted : C.ok }]}>
                    {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
                  </Text>
                </View>
              )}
              {keyboardUp && !wide && (
                <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8} style={st.doneBtn} accessibilityLabel="Done editing">
                  <Text style={st.doneText}>Done</Text>
                </Pressable>
              )}
            </View>
          </View>

          {!!saveErr && (
            <View style={st.inlineError}>
              <Feather name="alert-triangle" size={13} color={C.dangerDim} />
              <Text style={st.inlineErrorText}>{saveErr}</Text>
            </View>
          )}

          <TextInput
            ref={editorRef}
            value={content}
            onChangeText={onContentChange}
            placeholder="Start typing…"
            placeholderTextColor={C.dimmer}
            multiline
            scrollEnabled
            textAlignVertical="top"
            autoFocus={selectedId === 'draft'}
            accessibilityLabel="Note text"
            style={[st.editor, wide ? st.editorWide : st.editorNarrow]}
          />
        </>
      )}
    </KeyboardAvoidingView>
  );

  const cmNote = menuNote ? notes.find((n) => n.id === menuNote.id) : null;

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.sidebarBg} />
      <View style={st.shell}>
        {showList && sidebar}
        {showDetail && detail}
      </View>

      {}
      <Modal
        visible={!!cmNote}
        transparent
        animationType={wide ? 'fade' : 'slide'}
        onRequestClose={() => setMenuNote(null)}
      >
        <Pressable style={[st.overlay, !wide && { justifyContent: 'flex-end', padding: 0 }]} onPress={() => setMenuNote(null)}>
          {cmNote && (
            <Pressable
              onPress={() => {}}
              style={[st.menu, wide ? st.menuCard : st.menuSheet]}
              accessibilityRole="menu"
            >
              {!wide && <View style={st.sheetGrab} />}
              <Text style={st.menuTitle} numberOfLines={1}>{cmNote.title || 'New Note'}</Text>
              <MenuItem icon="book-open" label="Open" onPress={() => { selectNote(cmNote); setMenuNote(null); }} />
              <MenuItem icon="layers" label="Duplicate" onPress={() => duplicateNote(cmNote)} />
              <MenuItem icon="copy" label="Copy" onPress={() => { copyToClipboard(composeContent(cmNote)); setMenuNote(null); }} />
              <MenuItem icon="download" label="Download as PDF" onPress={() => { downloadNotePdf(cmNote); setMenuNote(null); }} />
              <View style={st.menuDivider} />
              <MenuItem
                icon="bookmark"
                label={`${pinned.has(cmNote.id) ? 'Unpin' : 'Pin'} note`}
                onPress={() => { togglePin(cmNote.id); setMenuNote(null); }}
              />
              <View style={st.menuDivider} />
              <MenuItem icon="trash-2" label="Delete note" danger onPress={() => requestDelete(cmNote.id)} />
              {!wide && <View style={{ height: Platform.OS === 'ios' ? 18 : 6 }} />}
            </Pressable>
          )}
        </Pressable>
      </Modal>

      {}
      <Modal
        visible={confirmDeleteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { if (deletingId === null) cancelDelete(); }}
      >
        <Pressable style={st.overlay} onPress={() => { if (deletingId === null) cancelDelete(); }}>
          <Pressable onPress={() => {}} style={st.modalBox} accessibilityViewIsModal>
            <Text style={st.modalTitle}>Delete this note?</Text>
            <Text style={st.modalDesc}>This can't be undone. The note will be permanently removed.</Text>
            <View style={st.modalActions}>
              <Pressable
                onPress={cancelDelete}
                disabled={deletingId === confirmDeleteId}
                style={({ pressed }) => [st.btn, st.btnSecondary, pressed && { backgroundColor: 'rgba(0,0,0,0.04)' }, deletingId === confirmDeleteId && { opacity: 0.5 }]}
              >
                <Text style={[st.btnText, { color: C.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteNow}
                disabled={deletingId === confirmDeleteId}
                style={({ pressed }) => [st.btn, st.btnDanger, pressed && { backgroundColor: C.dangerDim }, deletingId === confirmDeleteId && { opacity: 0.7 }]}
              >
                {deletingId === confirmDeleteId && <ActivityIndicator size="small" color={C.white} style={{ marginRight: 6 }} />}
                <Text style={[st.btnText, { color: C.white }]}>{deletingId === confirmDeleteId ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
            {deletingId === confirmDeleteId && (
              <Text style={st.modalHint}>The server may take a moment to wake up.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {}
      <View pointerEvents="none" style={[st.toastWrap, wide ? { right: 24, alignItems: 'flex-end' } : { left: 16, right: 16, alignItems: 'center' }]}>
        {toasts.map((t) => <Toast key={t.id} msg={t.msg} err={t.err} />)}
      </View>
    </SafeAreaView>
  );
}


const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.sidebarBg },
  shell: { flex: 1, flexDirection: 'row', backgroundColor: C.pageBg },

  sidebar: { backgroundColor: C.sidebarBg, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border },
  sidebarWide: { width: 320 },
  sidebarFull: { flex: 1, borderRightWidth: 0 },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 16 : 10, paddingBottom: 12,
  },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: C.text },
  appCount: { fontSize: 12, color: C.muted, marginTop: 1 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: R.sm, backgroundColor: C.accent,
    ...shadow(3, 0.16, 6),
  },
  newBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },

  searchWrap: { marginHorizontal: 16, marginBottom: 12, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: R.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7, paddingLeft: 36, paddingRight: 34,
    fontSize: 14.5, color: C.text,
  },
  searchClear: { position: 'absolute', right: 10, padding: 4 },

  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12.5, fontWeight: '700', color: C.muted },

  sidebarError: {
    marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: R.sm,
    backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: 'rgba(192,57,43,0.25)',
  },
  sidebarErrorText: { fontSize: 13, color: C.dangerDim },
  linkText: { textDecorationLine: 'underline', fontWeight: '700' },

  listPad: { paddingHorizontal: 8, paddingBottom: 24 },

  row: { paddingVertical: 11, paddingHorizontal: 12, borderRadius: R.md, marginBottom: 2, gap: 3 },
  rowSelected: { backgroundColor: C.accent },
  rowPressed: { backgroundColor: 'rgba(0,0,0,0.045)' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  rowPin: { flexShrink: 0 },
  rowDelete: { width: 26, height: 26, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  rowSnippet: { fontSize: 13, lineHeight: 18, color: C.muted },
  rowDate: { fontSize: 11.5, color: C.dimmer },
  mark: { backgroundColor: 'rgba(45,106,79,0.20)', color: C.text },
  markOnAccent: { backgroundColor: 'rgba(255,255,255,0.30)', color: C.white },

  skeleton: { height: 66, borderRadius: R.md, marginHorizontal: 4, marginBottom: 8, backgroundColor: '#e0ddd4' },

  sidebarEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  sidebarEmptyTitle: { fontSize: 15, fontWeight: '700', color: C.muted, marginBottom: 4 },
  sidebarEmptyDesc: { fontSize: 13, lineHeight: 19, color: C.dimmer, textAlign: 'center' },

  detail: { flex: 1, backgroundColor: C.pageBg, minWidth: 0 },
  detailEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  detailEmptyTitle: { fontSize: 16, fontWeight: '700', color: C.muted, marginBottom: 4 },
  detailEmptyDesc: { fontSize: 13.5, color: C.dimmer, textAlign: 'center' },

  topbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6, minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSoft,
    backgroundColor: C.pageBg,
  },
  backBtn: { width: 38, height: 38, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  topbarScroll: { alignItems: 'center', gap: 2, paddingRight: 8 },
  tbAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 9, borderRadius: R.sm,
  },
  tbActionText: { fontSize: 13, fontWeight: '700' },

  saveWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 6 },
  saveStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  saveDot: { width: 6, height: 6, borderRadius: 3 },
  saveText: { fontSize: 12 },
  doneBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.sm, backgroundColor: C.accentSoft },
  doneText: { fontSize: 13, fontWeight: '700', color: C.accent },

  inlineError: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: R.sm,
    backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: 'rgba(192,57,43,0.25)',
  },
  inlineErrorText: { flex: 1, fontSize: 13, color: C.dangerDim },

  editor: { flex: 1, fontSize: 16.5, lineHeight: 28, color: C.text },
  editorWide: { paddingHorizontal: 40, paddingTop: 30, paddingBottom: 48 },
  editorNarrow: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: C.white, borderRadius: R.lg, padding: 22,
    width: '100%', maxWidth: 360, ...shadow(12, 0.22, 30),
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
  modalDesc: { fontSize: 14, lineHeight: 21, color: C.muted, marginBottom: 20 },
  modalHint: { fontSize: 12, color: C.dimmer, marginTop: 12, textAlign: 'right' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: R.sm, minWidth: 84,
  },
  btnSecondary: { borderWidth: 1, borderColor: C.border },
  btnDanger: { backgroundColor: C.danger },
  btnText: { fontSize: 14, fontWeight: '700' },

  menu: { backgroundColor: C.white, paddingVertical: 6, paddingHorizontal: 6 },
  menuCard: { width: '100%', maxWidth: 280, borderRadius: R.md, borderWidth: 1, borderColor: C.border, ...shadow(14, 0.18, 36) },
  menuSheet: { width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 10, paddingBottom: 8 },
  sheetGrab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 6, marginBottom: 10 },
  menuTitle: { fontSize: 13, fontWeight: '700', color: C.dimmer, paddingHorizontal: 12, paddingBottom: 8, paddingTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: R.sm },
  menuItemText: { fontSize: 15, color: C.text },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.borderSoft, marginVertical: 4, marginHorizontal: 8 },

  toastWrap: { position: 'absolute', bottom: 24, gap: 8 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3,
    borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 14, maxWidth: 320,
    ...shadow(8, 0.14, 18),
  },
  toastText: { flexShrink: 1, fontSize: 13.5, color: C.text },
});