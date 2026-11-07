import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Image, Modal, Alert, Linking,
  ActivityIndicator, Animated, RefreshControl, KeyboardAvoidingView, Platform,
  StyleSheet, useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import useCachedResource from '../hooks/useCachedResource';
import { BREAKPOINTS } from '../utils/responsive';
import { invalidatePrefix } from '../api/cache';
import { apiGet, apiSend, apiUpload } from '../api/http';
import { apiSendOffline, isRetryableError } from '../api/offlineSend';
import { enqueueOp, mergeIntoQueuedCreate, mergeUploadIntoQueuedCreate, removeOpsForLocalId, subscribeOutbox } from '../api/outbox';
import { stageFile } from '../api/fileQueue';
import { isLocalId } from '../hooks/useLocalCollection';
import { useOnlineStatus } from '../api/connectivity';
import { TTL } from '../api/resources';

const POSTS = '/blog/posts/';
const COMMENTS = '/blog/comments/';
const IMAGES = '/blog/images/';
const LIKED_KEY = 'blog:liked-ids';
const DEFAULT_FILTER_SIGNATURE = 'all|all||newest';

const C = {
  bg: '#f6f5f0', white: '#ffffff', dark: '#1a1a2e', green: '#2d6a4f', greenLt: '#e4f1ea',
  border: '#d8d4cc', muted: '#eceae3', soft: '#5c574c', gold: '#d4af37', accent: '#52d68a',
  danger: '#c0392b', dangerLt: '#fdecea', ph: '#6b665b',
};
const shadow = {
  shadowColor: '#1a1a2e', shadowOpacity: 0.08, shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 }, elevation: 3,
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const fmtRelative = (iso) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : fmtDate(iso);
};
const words = (s) => (s || '').split(/\s+/).filter(Boolean).length;
const blankForm = () => ({ title: '', excerpt: '', content: '', category: '', tags: '', author: 'Archana Timilsina', status: 'draft', isFeatured: false });
const postToForm = (p) => ({
  title: p.title || '', excerpt: p.excerpt || '', content: p.content || '',
  category: p.category ? String(p.category) : '', tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
  author: p.author || 'Archana Timilsina', status: p.status || 'draft', isFeatured: !!p.is_featured,
});
const parseTags = (raw) => (raw || '').split(',').map((t) => t.trim()).filter(Boolean)
  .filter((t, i, a) => a.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);

const INLINE = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
function inline(text, prefix) {
  const out = []; let last = 0; let m; let k = 0;
  const re = new RegExp(INLINE);
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${prefix}${k++}`;
    if (m[2] !== undefined) out.push(<Text key={key} style={md.bold}>{m[2]}</Text>);
    else if (m[3] !== undefined) out.push(<Text key={key} style={md.italic}>{m[3]}</Text>);
    else if (m[4] !== undefined) out.push(<Text key={key} style={md.code}>{m[4]}</Text>);
    else out.push(<Text key={key} style={md.link} onPress={() => { Linking.openURL(m[6]).catch(() => {}); }}>{m[5]}</Text>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text }) {
  const blocks = useMemo(() => {
    const lines = (text || '').split('\n'); const out = []; let i = 0; let key = 0;
    while (i < lines.length) {
      const line = lines[i]; const t = line.trim();
      if (t.startsWith('```')) {
        const code = []; i += 1;
        while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i += 1; }
        i += 1;
        out.push(<ScrollView key={key++} horizontal style={md.pre}><Text style={md.preText}>{code.join('\n')}</Text></ScrollView>);
        continue;
      }
      if (!t) { i += 1; continue; }
      if (/^---+$/.test(t)) { out.push(<View key={key++} style={md.hr} />); i += 1; continue; }
      const img = t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (img) { out.push(<Image key={key++} source={{ uri: img[2] }} style={md.img} resizeMode="cover" accessibilityLabel={img[1]} />); i += 1; continue; }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const lvl = Math.min(h[1].length, 3);
        out.push(<Text key={key++} style={[md.h, lvl === 1 ? md.h1 : lvl === 2 ? md.h2 : md.h3]}>{inline(h[2], `h${key}`)}</Text>);
        i += 1; continue;
      }
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
        out.push(<View key={key++} style={md.quote}><Text style={md.quoteText}>{inline(buf.join(' '), `q${key}`)}</Text></View>);
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        const items = []; let n = 1;
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          const ordered = /^\s*\d+\./.test(lines[i]);
          const body = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '');
          items.push(
            <View key={`li${key}-${n}`} style={md.li}>
              <Text style={md.bullet}>{ordered ? `${n}.` : '•'}</Text>
              <Text style={[md.p, { flex: 1, marginVertical: 0 }]}>{inline(body, `li${key}${n}`)}</Text>
            </View>,
          );
          n += 1; i += 1;
        }
        out.push(<View key={key++} style={{ marginVertical: 8, gap: 4 }}>{items}</View>);
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('```') && !/^(#{1,6})\s+/.test(lines[i])
        && !/^>\s?/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) && !/^---+$/.test(lines[i].trim())
        && !/^!\[[^\]]*\]\([^)]+\)$/.test(lines[i].trim())) { buf.push(lines[i]); i += 1; }
      if (buf.length) out.push(<Text key={key++} style={md.p}>{inline(buf.join(' '), `p${key}`)}</Text>);
      else i += 1;
    }
    return out;
  }, [text]);

  if (!text || !text.trim()) return <Text style={md.empty}>Nothing to preview yet — start writing your story.</Text>;
  return <View>{blocks}</View>;
}

const Btn = ({ children, onPress, variant = 'primary', disabled, busy, icon, style }) => {
  const v = btnVariants[variant];
  return (
    <Pressable
      onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => [s.btn, v.box, (disabled || busy) && { opacity: 0.6 }, pressed && { opacity: 0.85 }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={v.color} /> : icon ? <Feather name={icon} size={14} color={v.color} /> : null}
      <Text style={[s.btnText, { color: v.color }]}>{children}</Text>
    </Pressable>
  );
};
const btnVariants = {
  primary: { box: { backgroundColor: C.green, borderColor: C.green }, color: '#fff' },
  ghost: { box: { backgroundColor: C.white, borderColor: C.border }, color: C.dark },
  danger: { box: { backgroundColor: C.danger, borderColor: C.danger }, color: '#fff' },
};
const IconBtn = ({ name, onPress, danger, size = 30 }) => (
  <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [s.iconBtn, { width: size, height: size }, pressed && { backgroundColor: danger ? C.dangerLt : C.muted }]}>
    <Feather name={name} size={14} color={danger ? C.danger : C.dark} />
  </Pressable>
);
const Chip = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.green, borderColor: C.green }]}>
    <Text style={[s.chipText, active && { color: '#fff' }]} maxFontSizeMultiplier={1.3}>{label}</Text>
  </Pressable>
);
const Meta = ({ icon, value, color = C.soft, fill }) => (
  <View style={s.meta}>
    <Feather name={icon} size={12} color={color} />
    <Text style={[s.metaText, { color }]}>{value}</Text>
  </View>
);
const Picker = ({ label, value, options, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => String(o.value) === String(value));
  return (
    <>
      <Pressable disabled={disabled} onPress={() => setOpen(true)} style={[s.input, s.pickerBtn, disabled && { backgroundColor: C.muted }]} accessibilityLabel={label}>
        <Text numberOfLines={1} style={{ color: C.dark, fontSize: 14, flex: 1 }}>{current?.label ?? '—'}</Text>
        <Feather name="chevron-down" size={14} color={C.soft} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <View style={[s.modal, { padding: 8 }]}>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((o) => {
                const on = String(o.value) === String(value);
                return (
                  <Pressable key={String(o.value)} onPress={() => { onChange(o.value); setOpen(false); }}
                    style={[s.optRow, on && { backgroundColor: C.greenLt }]}>
                    <Text style={{ color: on ? C.green : C.dark, fontWeight: on ? '800' : '600', fontSize: 14 }}>{o.label}</Text>
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
};
const Skeleton = ({ style }) => {
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[{ backgroundColor: C.muted, borderRadius: 16, opacity: a }, style]} />;
};

export default function BlogScreen({ onBack }) {
  const { width } = useWindowDimensions();
  const cols = width >= BREAKPOINTS.wide ? 3 : width >= BREAKPOINTS.medium ? 2 : 1;
  const wide = width >= 900;
  const pad = width >= BREAKPOINTS.medium ? 28 : 16;

  const [extra, setExtra] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const [mode, setMode] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [tab, setTab] = useState('write');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sel, setSel] = useState({ start: 0, end: 0 });

  const [commentName, setCommentName] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [liked, setLiked] = useState(new Set());
  const viewedRef = useRef(new Set());

  const isEditing = mode === 'new' || mode === 'edit';
  const coverUri = coverFile?.uri || (!removeCover && post?.cover_image_url) || null;
  const isOnline = useOnlineStatus();
  // Local temp ids for posts created offline; later saves fold into the queued op.
  const makeLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const isNewPost = mode === 'new' || (activeId != null && isLocalId(activeId));

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-3));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(LIKED_KEY).then((raw) => { if (raw) setLiked(new Set(JSON.parse(raw))); }).catch(() => {});
  }, []);
  const persistLiked = (set) => AsyncStorage.setItem(LIKED_KEY, JSON.stringify([...set])).catch(() => {});

  /* ----------------------------- cached resources ---------------------------- */

  const buildQuery = useCallback((pageNum) => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (query.trim()) params.set('search', query.trim());
    if (sort) params.set('ordering', sort);
    params.set('page', String(pageNum));
    return params.toString();
  }, [statusFilter, categoryFilter, query, sort]);

  const fetchBlogPage = useCallback(async (pageNum = 1) => {
    const d = await apiGet(`${POSTS}?${buildQuery(pageNum)}`);
    const results = Array.isArray(d) ? d : d.results || [];
    return { results, total: Array.isArray(d) ? results.length : (d.count ?? results.length) };
  }, [buildQuery]);

  // the list is cached per filter combination; the key is debounced so typing
  // in the search field does not fire a request per keystroke
  const filterSignature = `${statusFilter}|${categoryFilter}|${query.trim()}|${sort}`;
  const [listKey, setListKey] = useState(filterSignature);
  const cacheKey = listKey === DEFAULT_FILTER_SIGNATURE ? 'blogPosts' : `blogPosts:${listKey}`;
  useEffect(() => {
    const t = setTimeout(() => setListKey(filterSignature), 280);
    return () => clearTimeout(t);
  }, [filterSignature]);

  const {
    data: categories,
  } = useCachedResource('blogCategories', async () => {
    const d = await apiGet('/blog/categories/');
    return Array.isArray(d) ? d : d.results || [];
  }, { ttl: TTL.BLOG, initial: [] });

  const {
    data: stats,
    refresh: refreshStats,
  } = useCachedResource('blogStats', () => apiGet('/blog/posts/stats/'), {
    ttl: TTL.LIVE,
    initial: { total: 0, published: 0, drafts: 0, views: 0, likes: 0 },
  });

  const {
    data: firstPage,
    loading,
    refreshing,
    errorText: listError,
    refresh: refreshList,
    mutate: mutateList,
  } = useCachedResource(cacheKey, () => fetchBlogPage(1), {
    ttl: TTL.BLOG,
    initial: null,
    errorMessage: 'Could not load posts.',
  });

  const cachedResults = firstPage?.results || [];
  const total = firstPage?.total ?? 0;
  const posts = useMemo(() => [...cachedResults, ...extra], [cachedResults, extra]);

  // a new filter combination starts a fresh list
  useEffect(() => {
    setExtra([]);
    setPage(1);
  }, [listKey]);

  /** Optimistic patch across the cached first page and the appended pages. */
  const patchPosts = useCallback((fn) => {
    mutateList((entry) => (entry ? { ...entry, results: fn(entry.results || []) } : entry));
    setExtra((prev) => fn(prev));
  }, [mutateList]);

  const loadMore = async () => {
    if (loadingMore || posts.length >= total) return;
    setLoadingMore(true);
    try {
      const next = await fetchBlogPage(page + 1);
      setExtra((prev) => [...prev, ...next.results]);
      setPage(page + 1);
    } catch {
      toast('Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = () => { refreshList(); refreshStats(); };

  const resetEditor = () => { setCoverFile(null); setRemoveCover(false); setSaveError(''); setDirty(false); };

  const startNew = () => {
    resetEditor(); setForm(blankForm()); setPost(null); setComments([]); setActiveId(null); setTab('write'); setMode('new');
  };

  const openPost = useCallback(async (item, asEdit = false) => {
    resetEditor();
    setActiveId(item.id); setPost(item); setForm(postToForm(item)); setComments([]);
    setTab(asEdit ? 'write' : 'preview'); setMode(asEdit ? 'edit' : 'view');
    // Local (offline-created) posts live only in the cache — nothing to fetch.
    if (isLocalId(item.id)) return;
    try {
      const d = await apiGet(`${POSTS}${item.id}/`);
      setPost(d); setComments(d.comments || []); setForm(postToForm(d));
    } catch { }
    if (!viewedRef.current.has(item.id)) {
      viewedRef.current.add(item.id);
      try {
        const d = await apiSend(`${POSTS}${item.id}/view/`, 'POST');
        patchPosts((prev) => prev.map((p) => (p.id === item.id ? { ...p, views: d.views } : p)));
        setPost((prev) => (prev && prev.id === item.id ? { ...prev, views: d.views } : prev));
      } catch { }
    }
  }, []);

  const closeEditor = () => { resetEditor(); setMode(null); setActiveId(null); setPost(null); setForm(blankForm()); };
  const backToList = () => {
    if (dirty) Alert.alert('Unsaved changes', 'Leave without saving?', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: closeEditor },
    ]);
    else closeEditor();
  };

  // After the outbox drains, pull server truth into the list, stats, and the
  // open post (view mode only — never clobber an editor with unsaved input).
  const activeRef = useRef({ activeId: null, mode: null });
  activeRef.current = { activeId, mode };
  const blogPendingRef = useRef(0);
  useEffect(() => subscribeOutbox((ops) => {
    const n = ops.filter((o) => o.resourceKey === 'blogPosts' || o.resourceKey === 'blogComments').length;
    const prev = blogPendingRef.current;
    blogPendingRef.current = n;
    if (prev > 0 && n === 0) {
      refreshList(); refreshStats();
      const { activeId: id, mode: m } = activeRef.current;
      if (id && !isLocalId(id) && m === 'view') {
        apiGet(`${POSTS}${id}/`).then((d) => {
          if (activeRef.current.activeId !== id) return;
          setPost(d); setComments(d.comments || []); setForm(postToForm(d));
          patchPosts((list) => list.map((p) => (p.id === id ? { ...p, ...d } : p)));
        }).catch(() => {});
      }
    }
  }), [refreshList, refreshStats]);

  const updateField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setDirty(true); };

  const pickImage = async (aspect) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast('Allow photo access to add images.', true); return null; }    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.82, allowsEditing: !!aspect, aspect,
    });
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0];
    return { uri: a.uri, name: a.fileName || `image-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' };
  };

  const onPickCover = async () => {
    const f = await pickImage([16, 9]);
    if (f) { setCoverFile(f); setRemoveCover(false); setDirty(true); }
  };

  const insertAtCursor = (snippet) => {
    const { start, end } = sel;
    const c = form.content || '';
    updateField('content', c.slice(0, start) + snippet + c.slice(end));
    const pos = start + snippet.length;
    setSel({ start: pos, end: pos });
  };
  const wrapSelection = (b, a = b) => {
    const { start, end } = sel; const c = form.content || '';
    const picked = c.slice(start, end) || 'text';
    updateField('content', c.slice(0, start) + b + picked + a + c.slice(end));
    setSel({ start: start + b.length, end: start + b.length + picked.length });
  };

  const insertImage = async () => {
    if (!isOnline) { toast('You are offline — connect to add images to your story.', true); return; }
    const f = await pickImage();
    if (!f) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', f);
      const { url } = await apiUpload(IMAGES, fd);
      const alt = f.name.replace(/\.[^.]+$/, '') || 'image';
      insertAtCursor(`\n\n![${alt}](${url})\n\n`);
      toast('Image added to your story.');
    } catch (err) { toast(err?.message || 'Network error — could not upload image.', true); }
    finally { setUploadingImage(false); }
  };

  const buildPayload = () => {
    const base = {
      title: form.title, excerpt: form.excerpt, content: form.content, author: form.author,
      status: form.status, is_featured: form.isFeatured, tags: parseTags(form.tags),
      category: form.category ? Number(form.category) : null,
    };
    if (coverFile || removeCover) {
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => {
        if (k === 'tags') fd.append('tags', JSON.stringify(v));
        else if (k === 'category') { if (v !== null) fd.append('category', String(v)); }
        else fd.append(k, String(v));
      });
      if (coverFile) fd.append('cover_image', coverFile);
      if (removeCover && !coverFile) fd.append('remove_cover', 'true');
      return fd;
    }
    return base;
  };

  const savePost = async (overrides = {}) => {
    const title = overrides.title ?? form.title;
    if (!title.trim()) { setSaveError('Give your post a title before saving.'); setTab('write'); return null; }
    setSaving(true); setSaveError('');
    try {
      const payload = buildPayload();
      const path = isNewPost ? POSTS : `${POSTS}${activeId}/`;
      const method = isNewPost ? 'POST' : 'PATCH';
      const saved = payload instanceof FormData
        ? await apiUpload(path, (() => { if (overrides.status) payload.append('status', overrides.status); return payload; })(), { method })
        : await apiSend(path, method, { ...payload, ...overrides });
      setPost(saved); setActiveId(saved.id); setForm(postToForm(saved)); setComments(saved.comments || []);
      setDirty(false); setCoverFile(null); setRemoveCover(false); setMode('edit');
      patchPosts((prev) => (prev.some((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p))
        : [saved, ...prev]));
      toast(isNewPost ? 'Post created' : 'Post saved');
      refreshStats();
      invalidatePrefix('blogPosts');
      return saved;
    } catch (err) {
      if (!isRetryableError(err)) { setSaveError(err?.message || 'Network error — changes were not saved.'); return null; }
      try {
        return await savePostOffline(overrides);
      } catch (e2) { setSaveError(e2?.message || 'Could not save offline.'); return null; }
    }
    finally { setSaving(false); }
  };

  /** Offline save: stage the cover, queue the op, paint the optimistic post. */
  const savePostOffline = async (overrides = {}) => {
    const status = overrides.status ?? form.status;
    const fields = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      author: form.author,
      status,
      is_featured: form.isFeatured,
      tags: JSON.stringify(parseTags(form.tags)),
      ...(form.category ? { category: String(form.category) } : {}),
    };
    if (removeCover && !coverFile) fields.remove_cover = 'true';
    let cover = null;
    if (coverFile) {
      const stagedUri = await stageFile(coverFile.uri, coverFile.name);
      cover = { uri: stagedUri, name: coverFile.name, type: coverFile.type, field: 'cover_image' };
    }
    const upload = cover
      ? { field: 'cover_image', fileUri: cover.uri, fileName: cover.name, mimeType: cover.type }
      : null;
    const optimisticFrom = (base) => ({
      ...base,
      title: form.title, excerpt: form.excerpt, content: form.content, author: form.author,
      status, is_featured: form.isFeatured, tags: parseTags(form.tags),
      category: form.category ? Number(form.category) : null,
      cover_image_url: cover ? cover.uri : (removeCover ? null : base?.cover_image_url || null),
      _pending: true, updated_at: new Date().toISOString(),
    });

    let result;
    if (isNewPost && mode === 'new') {
      const localId = makeLocalId();
      const optimistic = {
        ...optimisticFrom(null),
        id: localId, views: 0, likes: 0, comment_count: 0,
        created_at: new Date().toISOString(),
      };
      setPost(optimistic); setActiveId(localId); setForm(postToForm({ ...optimistic, category: optimistic.category }));
      setComments([]); setMode('edit');
      patchPosts((prev) => [optimistic, ...prev]);
      await enqueueOp({ resourceKey: 'blogPosts', method: 'POST', path: POSTS, body: fields, localId, upload });
      result = optimistic;
    } else if (isNewPost) {
      // Still-unsynced local post: fold the edit into its queued create.
      const localId = activeId;
      await mergeIntoQueuedCreate(localId, fields);
      if (upload) await mergeUploadIntoQueuedCreate(localId, upload);
      const optimistic = optimisticFrom(post);
      setPost((prev) => (prev && prev.id === localId ? { ...prev, ...optimistic } : prev));
      setForm((prev) => ({ ...prev, status }));
      patchPosts((prev) => prev.map((p) => (p.id === localId ? { ...p, ...optimistic } : p)));
      result = { ...(post || {}), ...optimistic };
    } else {
      const id = activeId;
      const optimistic = optimisticFrom(post);
      setPost((prev) => (prev && prev.id === id ? { ...prev, ...optimistic } : prev));
      setForm((prev) => ({ ...prev, status }));
      patchPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...optimistic } : p)));
      await enqueueOp({ resourceKey: 'blogPosts', method: 'PATCH', path: `${POSTS}${id}/`, body: fields, targetId: id, upload });
      result = { ...(post || {}), ...optimistic };
    }
    setDirty(false); setCoverFile(null); setRemoveCover(false);
    toast('Saved on this device.');
    return result;
  };

  const togglePublish = async () => {
    const next = form.status === 'published' ? 'draft' : 'published';
    updateField('status', next);
    await savePost({ status: next });
  };

  const deletePost = async (id) => {
    setDeleting(true);
    const cleanup = (wasOffline) => {
      patchPosts((prev) => prev.filter((p) => p.id !== id));
      mutateList((entry) => (entry
        ? { ...entry, results: (entry.results || []).filter((p) => p.id !== id), total: Math.max(0, (entry.total || 1) - 1) }
        : entry));
      refreshStats(); setConfirmDelete(null);
      if (activeId === id) closeEditor();
      toast(wasOffline ? 'Deleted on this device.' : 'Post deleted');
    };
    try {
      const { offline } = await apiSendOffline(`${POSTS}${id}/`, 'DELETE', null, { resourceKey: 'blogPosts', targetId: id });
      cleanup(offline);
      if (!offline) invalidatePrefix('blogPosts');
    } catch (err) {
      // Already gone server-side counts as deleted.
      if (err?.status === 404) {
        cleanup(false);
      } else toast(err?.message || 'Network error — could not delete.', true);
    }
    finally { setDeleting(false); }
  };

  const toggleLike = async (item) => {
    const was = liked.has(item.id);
    const next = new Set(liked);
    if (was) next.delete(item.id); else next.add(item.id);
    setLiked(next); persistLiked(next);
    const d = was ? -1 : 1;
    patchPosts((prev) => prev.map((p) => (p.id === item.id ? { ...p, likes: Math.max(0, (p.likes || 0) + d) } : p)));
    setPost((prev) => (prev && prev.id === item.id ? { ...prev, likes: Math.max(0, (prev.likes || 0) + d) } : prev));
    try {
      await apiSend(`${POSTS}${item.id}/like/`, 'POST', { like: !was });
    } catch (err) {
      if (isRetryableError(err)) {
        await enqueueOp({ resourceKey: 'blogPosts', method: 'POST', path: `${POSTS}${item.id}/like/`, body: { like: !was } }).catch(() => {});
      } else toast('Could not sync like.', true);
    }
  };

  const addComment = async () => {
    if (!commentBody.trim() || !post) return;
    setPostingComment(true);
    const body = { post: post.id, author_name: commentName.trim() || 'Anonymous', body: commentBody.trim() };
    try {
      const created = await apiSend(COMMENTS, 'POST', body);
      setComments((prev) => [...prev, created]); setCommentBody('');
      patchPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
      toast('Comment added');
    } catch (err) {
      if (!isRetryableError(err)) {
        toast(err?.message || 'Network error — comment not saved.', true);
      } else if (isLocalId(post.id)) {
        toast('Connect once so the post exists, then comment.', true);
      } else {
        const localId = makeLocalId();
        const optimistic = { ...body, id: localId, _local: true, created_at: new Date().toISOString() };
        setComments((prev) => [...prev, optimistic]); setCommentBody('');
        patchPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
        await enqueueOp({ resourceKey: 'blogComments', method: 'POST', path: COMMENTS, body, localId }).catch(() => {});
        toast('Comment saved on this device.');
      }
    } finally { setPostingComment(false); }
  };

  const deleteComment = async (id) => {
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      const { offline } = await apiSendOffline(`${COMMENTS}${id}/`, 'DELETE', null, { resourceKey: 'blogComments', targetId: id });
      patchPosts((prev) => prev.map((p) => (p.id === post?.id ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p)));
      if (offline) toast('Comment removed on this device.');
    } catch (err) {
      if (isLocalId(id)) {
        await removeOpsForLocalId(id).catch(() => {});
        patchPosts((prev) => prev.map((p) => (p.id === post?.id ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p)));
      } else if (err?.status === 404) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        setComments(snapshot);
        toast(err?.message || 'Could not delete comment.', true);
      }
    }
  };

  const catOptions = [{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
  const sortOptions = [
    { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' },
    { value: 'popular', label: 'Most viewed' }, { value: 'liked', label: 'Most liked' }, { value: 'title', label: 'Title A–Z' },
  ];
  const gap = 14;

  const renderCard = (p) => {
    const color = p.category_color || C.green;
    return (
      <View key={p.id} style={{ width: `${100 / cols}%`, padding: gap / 2 }}>
        <Pressable onPress={() => openPost(p)} style={({ pressed }) => [s.card, shadow, pressed && { transform: [{ scale: 0.985 }] }]}>
          <View style={[s.cover, { backgroundColor: color }]}>
            {p.cover_image_url
              ? <Image source={{ uri: p.cover_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <Text style={s.coverLetter}>{(p.title || '?').charAt(0).toUpperCase()}</Text>}
            <View style={s.badges}>
              <View style={[s.statusBadge, { backgroundColor: p.status === 'published' ? 'rgba(45,106,79,.92)' : 'rgba(26,26,46,.78)' }]}>
                <Text style={s.statusText}>{p.status === 'published' ? '● Published' : '○ Draft'}</Text>
              </View>
              {p.is_featured && <View style={s.featured}><Feather name="star" size={13} color="#fff" /></View>}
            </View>
          </View>
          <View style={s.cardBody}>
            {!!p.category_name && (
              <View style={[s.catPill, { backgroundColor: `${color}1a`, borderColor: `${color}40` }]}>
                <Text style={[s.catText, { color }]}>{p.category_name}</Text>
              </View>
            )}
            <Text style={s.cardTitle} numberOfLines={2}>{p.title}</Text>
            {!!p.excerpt && <Text style={s.cardExcerpt} numberOfLines={2}>{p.excerpt}</Text>}
            {Array.isArray(p.tags) && p.tags.length > 0 && (
              <View style={s.tagRow}>{p.tags.slice(0, 4).map((t) => <View key={t} style={s.tag}><Text style={s.tagText}>#{t}</Text></View>)}</View>
            )}
            <View style={s.cardFooter}>
              <Meta icon="clock" value={`${p.read_time || 1} min`} />
              <Meta icon="eye" value={p.views || 0} />
              <Meta icon="heart" value={p.likes || 0} color={liked.has(p.id) ? C.danger : C.soft} />
              <Meta icon="message-circle" value={p.comment_count || 0} />
              <Text style={s.cardDate}>{p.status === 'published' ? fmtRelative(p.published_at || p.created_at) : fmtDate(p.updated_at)}</Text>
            </View>
          </View>
          <View style={s.cardActions}>
            <IconBtn name="edit-2" onPress={() => openPost(p, true)} />
            <IconBtn name="trash-2" danger onPress={() => setConfirmDelete(p)} />
          </View>
        </Pressable>
      </View>
    );
  };

  const list = (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[s.container, { paddingHorizontal: pad }]}>
        <View style={s.statsRow}>
          {[['Published', stats.published], ['Drafts', stats.drafts], ['Views', stats.views], ['Likes', stats.likes]].map(([l, n]) => (
            <View key={l} style={[s.stat, { width: width >= BREAKPOINTS.medium ? '24%' : '48.5%' }]}>
              <Text style={s.statNum}>{n}</Text><Text style={s.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        <View style={s.toolbar}>
          <View style={s.chipGroup}>
            {[['all', 'All'], ['published', 'Published'], ['draft', 'Drafts']].map(([k, l]) => (
              <Chip key={k} label={l} active={statusFilter === k} onPress={() => setStatusFilter(k)} />
            ))}
          </View>
          <View style={s.selects}>
            <View style={{ flex: 1, minWidth: 140 }}><Picker label="Filter by category" value={categoryFilter} options={catOptions} onChange={setCategoryFilter} /></View>
            <View style={{ flex: 1, minWidth: 140 }}><Picker label="Sort posts" value={sort} options={sortOptions} onChange={setSort} /></View>
          </View>
        </View>

        {!!listError && (
          <View style={s.errorBanner}>
            <Text style={{ color: C.danger, fontSize: 13, flex: 1 }}>{listError}</Text>
            <Pressable onPress={refreshList} style={s.retry}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Retry</Text></Pressable>
          </View>
        )}

        {loading ? (
          <View style={s.grid}>{Array.from({ length: cols * 2 }).map((_, i) => (
            <View key={i} style={{ width: `${100 / cols}%`, padding: gap / 2 }}><Skeleton style={{ height: 290 }} /></View>
          ))}</View>
        ) : posts.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 40 }}>📝</Text>
            <Text style={s.emptyTitle}>{total === 0 ? 'No posts yet' : 'No posts match your filters'}</Text>
            <Text style={s.emptyDesc}>{total === 0 ? 'Write your first story — it only takes a minute.' : 'Try a different search or clear the filters.'}</Text>
            <Btn icon="plus" onPress={startNew} style={{ borderRadius: 100 }}>Write a post</Btn>
          </View>
        ) : (
          <>
            <View style={s.grid}>{posts.map(renderCard)}</View>
            {posts.length < total && (
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <Pressable onPress={loadMore} disabled={loadingMore} style={s.loadMore}>
                  {loadingMore && <ActivityIndicator size="small" color={C.green} />}
                  <Text style={s.loadMoreText}>{loadingMore ? 'Loading…' : `Load more (${posts.length}/${total})`}</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );

  const catFormOptions = [{ value: '', label: 'Uncategorised' }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
  const wc = words(form.content);
  const isLikedActive = post ? liked.has(post.id) : false;

  const main = (
    <View style={[s.editorMain, wide && { flex: 1 }]}>
      <Pressable disabled={!isEditing} onPress={onPickCover} style={[s.coverDrop, { height: coverUri ? 200 : 130 }]}>
        {coverUri ? <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Feather name="image" size={18} color={C.soft} />
            <Text style={{ color: C.soft, fontWeight: '600', fontSize: 13 }}>{isEditing ? 'Add a cover image' : 'No cover image'}</Text>
          </View>
        )}
        {isEditing && !!coverUri && (
          <View style={s.coverOverlay}>
            <Pressable style={s.smallBtn} onPress={onPickCover}><Text style={s.smallBtnText}>Change</Text></Pressable>
            <Pressable style={s.smallBtn} onPress={() => { setCoverFile(null); setRemoveCover(true); setDirty(true); }}>
              <Text style={[s.smallBtnText, { color: C.danger }]}>Remove</Text>
            </Pressable>
          </View>
        )}
      </Pressable>

      <TextInput
        style={s.titleInput} value={form.title} placeholder="Post title…" placeholderTextColor={C.ph}
        editable={isEditing} multiline onChangeText={(v) => updateField('title', v)}
      />

      <View style={s.metaGrid}>
        <View style={s.field}><Text style={s.label}>Author</Text>
          <TextInput style={[s.input, !isEditing && s.readonly]} value={form.author} editable={isEditing} onChangeText={(v) => updateField('author', v)} /></View>
        <View style={s.field}><Text style={s.label}>Category</Text>
          <Picker label="Category" value={form.category} options={catFormOptions} disabled={!isEditing} onChange={(v) => updateField('category', String(v))} /></View>
        <View style={s.field}><Text style={s.label}>Status</Text>
          <Picker label="Status" value={form.status} disabled={!isEditing} onChange={(v) => updateField('status', v)}
            options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} /></View>
        <View style={s.field}><Text style={s.label}>Tags</Text>
          <TextInput style={[s.input, !isEditing && s.readonly]} value={form.tags} placeholder="react, django, design" placeholderTextColor={C.ph}
            editable={isEditing} autoCapitalize="none" onChangeText={(v) => updateField('tags', v)} /></View>
      </View>

      <View style={{ gap: 5 }}>
        <Text style={s.label}>Excerpt / summary</Text>
        <TextInput style={[s.input, s.textarea, !isEditing && s.readonly]} value={form.excerpt} multiline
          placeholder="A short teaser shown on the post card…" placeholderTextColor={C.ph}
          editable={isEditing} onChangeText={(v) => updateField('excerpt', v)} />
      </View>

      <View style={s.contentHeader}>
        <Chip label="Write" active={tab === 'write'} onPress={() => setTab('write')} />
        <Chip label="Preview" active={tab === 'preview'} onPress={() => setTab('preview')} />
        <View style={{ flex: 1 }} />
        <Meta icon="clock" value={`${Math.max(1, Math.round(wc / 200))} min · ${wc} words`} />
      </View>

      {tab === 'write' && isEditing && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mdBar} contentContainerStyle={{ gap: 6, alignItems: 'center', padding: 6 }} keyboardShouldPersistTaps="always">
          {[['B', () => wrapSelection('**'), { fontWeight: '900' }], ['I', () => wrapSelection('*'), { fontStyle: 'italic' }],
            ['H', () => insertAtCursor('\n## '), {}], ['•', () => insertAtCursor('\n- '), {}], ['❝', () => insertAtCursor('\n> '), {}],
            ['</>', () => wrapSelection('`'), {}], ['Link', () => insertAtCursor('[text](https://)'), {}]].map(([l, fn, st]) => (
            <Pressable key={l} onPress={fn} style={s.mdBtn}><Text style={[s.mdBtnText, st]}>{l}</Text></Pressable>
          ))}
          <Pressable onPress={insertImage} disabled={uploadingImage} style={[s.mdBtn, { backgroundColor: C.green, borderColor: C.green, flexDirection: 'row', gap: 6 }]}>
            {uploadingImage ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="image" size={13} color="#fff" />}
            <Text style={[s.mdBtnText, { color: '#fff' }]}>{uploadingImage ? 'Uploading…' : 'Insert image'}</Text>
          </Pressable>
        </ScrollView>
      )}

      {tab === 'write' ? (
        <TextInput
          style={[s.contentArea, !isEditing && s.readonly]} value={form.content} multiline textAlignVertical="top"
          placeholder={'Write your story in markdown…\n\n# Heading\n**bold**, *italic*, `code`, [links](https://…), lists and > quotes'}
          placeholderTextColor={C.ph} editable={isEditing} scrollEnabled={false}
          selection={sel} onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
          onChangeText={(v) => updateField('content', v)}
        />
      ) : (
        <View style={s.preview}><Markdown text={form.content} /></View>
      )}
    </View>
  );

  const side = (
    <View style={[s.side, wide && { width: 320 }]}>
      {isEditing && (
        <View style={s.sideCard}>
          <Text style={s.sideTitle}>Publish</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn busy={saving} onPress={() => savePost()} style={{ flex: 1 }}>{saving ? 'Saving…' : 'Save changes'}</Btn>
            <Btn variant="ghost" disabled={saving} onPress={togglePublish} style={{ flex: 1 }}>{form.status === 'published' ? 'Unpublish' : 'Publish'}</Btn>
          </View>
          <Pressable onPress={() => updateField('isFeatured', !form.isFeatured)}
            style={[s.featureToggle, form.isFeatured && { borderColor: C.gold, backgroundColor: '#fff8e1' }]}>
            <Feather name="star" size={15} color={form.isFeatured ? '#a07d13' : C.soft} />
            <Text style={{ fontWeight: '700', fontSize: 13, color: form.isFeatured ? '#a07d13' : C.soft }}>{form.isFeatured ? 'Featured post' : 'Mark as featured'}</Text>
          </Pressable>
        </View>
      )}

      {post && (
        <View style={s.sideCard}>
          <Text style={s.sideTitle}>Post stats</Text>
          {[['Status', post.status_display || post.status], ['Published', post.published_at ? fmtDate(post.published_at) : '—'],
            ['Reading time', `${post.read_time || 1} min`], ['Views', post.views || 0], ['Likes', post.likes || 0], ['Comments', comments.length]].map(([l, v]) => (
            <View key={l} style={s.statLine}><Text style={s.statLineL}>{l}</Text><Text style={s.statLineV}>{v}</Text></View>
          ))}
          <Pressable onPress={() => toggleLike(post)}
            style={[s.likeBtn, isLikedActive && { borderColor: C.danger, backgroundColor: C.dangerLt }]}>
            <Feather name="heart" size={14} color={isLikedActive ? C.danger : C.soft} />
            <Text style={{ fontWeight: '700', fontSize: 13, color: isLikedActive ? C.danger : C.soft }}>{isLikedActive ? 'Liked' : 'Like this post'}</Text>
          </Pressable>
          {!!post.slug && <Text style={s.slug}>/{post.slug}</Text>}
        </View>
      )}

      {post && (
        <View style={s.sideCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sideTitle}>Comments</Text>
            <View style={s.countBadge}><Text style={s.countText}>{comments.length}</Text></View>
          </View>
          {comments.length === 0 && <Text style={{ color: C.soft, fontSize: 13 }}>No comments yet.</Text>}
          {comments.map((c) => (
            <View key={c.id} style={s.comment}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <Text style={{ fontWeight: '800', fontSize: 13, color: C.dark }}>{c.author_name}</Text>
                <Text style={{ fontSize: 11, color: C.soft, flex: 1 }}>{fmtRelative(c.created_at)}</Text>
                <Pressable hitSlop={8} onPress={() => deleteComment(c.id)}><Feather name="trash-2" size={13} color={C.soft} /></Pressable>
              </View>
              <Text style={{ fontSize: 13, lineHeight: 19, color: C.dark }}>{c.body}</Text>
            </View>
          ))}
          <TextInput style={s.input} value={commentName} placeholder="Your name (optional)" placeholderTextColor={C.ph} onChangeText={setCommentName} />
          <TextInput style={[s.input, s.textarea]} value={commentBody} multiline placeholder="Add a comment…" placeholderTextColor={C.ph} onChangeText={setCommentBody} />
          <Btn icon="send" busy={postingComment} disabled={!commentBody.trim()} onPress={addComment}>{postingComment ? 'Posting…' : 'Comment'}</Btn>
        </View>
      )}
    </View>
  );

  const editor = (
    <ScrollView contentContainerStyle={{ paddingBottom: 90 }} keyboardShouldPersistTaps="handled">
      <View style={[s.container, { paddingHorizontal: pad, paddingTop: 14 }]}>
        <View style={s.editorHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <View style={[s.editorStatus, { backgroundColor: form.status === 'published' ? C.green : C.dark }]}>
              <Text style={s.editorStatusText}>{form.status === 'published' ? '● Published' : '○ Draft'}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: C.soft, fontWeight: '600', fontSize: 13, flex: 1 }}>
              {mode === 'new' ? 'New post' : post?.slug ? `/${post.slug}` : 'Editing post'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {activeId && <IconBtn name="trash-2" danger size={38} onPress={() => setConfirmDelete(post || { id: activeId, title: form.title })} />}
            <Btn variant="ghost" onPress={backToList}>Close</Btn>
            {mode === 'view'
              ? <Btn icon="edit-2" onPress={() => setMode('edit')}>Edit</Btn>
              : <Btn busy={saving} onPress={() => savePost()}>{saving ? 'Saving…' : 'Save'}</Btn>}
          </View>
        </View>

        {!!saveError && <View style={s.errorBanner}><Text style={{ color: C.danger, fontSize: 13, flex: 1 }}>⚠ {saveError}</Text></View>}

        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          {main}
          {side}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <View style={s.topBar}>
        <View style={s.topInner}>
          <View style={s.topLeft}>
            {(onBack || mode) && (
              <Pressable onPress={mode ? backToList : onBack} style={s.backBtn} accessibilityLabel="Back"><Feather name="chevron-left" size={18} color={C.dark} /></Pressable>
            )}
            <Text style={s.pageTitle}>Blog <Text style={{ color: C.green }}>Studio</Text></Text>
            <View style={s.countBadge}><Text style={s.countText}>{stats.total}</Text></View>
          </View>
          {mode === null && (
            <Btn icon="plus" onPress={startNew} style={{ borderRadius: 100, paddingVertical: 8 }}>New Post</Btn>
          )}
        </View>
        {mode === null && (
          <View style={s.searchWrap}>
            <Feather name="search" size={15} color={C.soft} style={s.searchIcon} />
            <TextInput style={s.searchInput} placeholder="Search posts…" placeholderTextColor={C.soft}
              value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} />
            {!!query && <Pressable onPress={() => setQuery('')} hitSlop={8} style={s.searchClear}><Feather name="x" size={14} color={C.soft} /></Pressable>}
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {mode === null ? list : editor}
      </KeyboardAvoidingView>

      <Modal transparent visible={!!confirmDelete} animationType="fade" onRequestClose={() => !deleting && setConfirmDelete(null)}>
        <Pressable style={s.overlay} onPress={() => !deleting && setConfirmDelete(null)}>
          <Pressable style={s.modal} onPress={() => {}}>
            <Text style={s.modalTitle}>Delete this post?</Text>
            <Text style={s.modalDesc}>“{confirmDelete?.title || 'Untitled'}” will be removed with its comments. This can't be undone.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Btn variant="ghost" disabled={deleting} onPress={() => setConfirmDelete(null)}>Cancel</Btn>
              <Btn variant="danger" busy={deleting} onPress={() => deletePost(confirmDelete.id)}>{deleting ? 'Deleting…' : 'Delete'}</Btn>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View pointerEvents="none" style={s.toastWrap}>
        {toasts.map((t) => (
          <View key={t.id} style={[s.toast, { borderLeftColor: t.err ? C.danger : C.green }]}>
            <Feather name={t.err ? 'x' : 'check'} size={14} color={t.err ? C.danger : C.green} />
            <Text style={{ fontSize: 13, color: C.dark, flexShrink: 1 }}>{t.msg}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const md = StyleSheet.create({
  p: { fontSize: 15.5, lineHeight: 26, color: C.dark, marginVertical: 8 },
  h: { fontWeight: '800', letterSpacing: -0.3, color: C.dark, marginTop: 20, marginBottom: 8 },
  h1: { fontSize: 27, lineHeight: 34 }, h2: { fontSize: 22, lineHeight: 29 }, h3: { fontSize: 18, lineHeight: 25 },
  bold: { fontWeight: '800' }, italic: { fontStyle: 'italic' },
  code: { backgroundColor: C.muted, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 13.5 },
  link: { color: C.green, textDecorationLine: 'underline' },
  pre: { backgroundColor: C.dark, borderRadius: 10, padding: 14, marginVertical: 12 },
  preText: { color: '#e8e8ef', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 13, lineHeight: 19 },
  quote: { borderLeftWidth: 3, borderLeftColor: C.green, backgroundColor: C.greenLt, borderTopRightRadius: 8, borderBottomRightRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginVertical: 12 },
  quoteText: { color: C.soft, fontSize: 15, lineHeight: 24 },
  li: { flexDirection: 'row', gap: 8, paddingLeft: 4 }, bullet: { color: C.green, fontWeight: '800', fontSize: 15.5, lineHeight: 26, minWidth: 16 },
  img: { width: '100%', aspectRatio: 16 / 10, borderRadius: 14, marginVertical: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.muted },
  hr: { height: 1.5, backgroundColor: C.border, marginVertical: 20 },
  empty: { color: C.soft, fontStyle: 'italic' },
});

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  container: { width: '100%', maxWidth: 1280, alignSelf: 'center' },

  topBar: { backgroundColor: 'rgba(246,245,240,.96)', borderBottomWidth: 1.5, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  topInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1280, alignSelf: 'center' },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: C.dark },
  countBadge: { backgroundColor: C.muted, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 100 },
  countText: { fontSize: 11, fontWeight: '700', color: C.soft },
  searchWrap: { width: '100%', maxWidth: 1280, alignSelf: 'center', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 13, zIndex: 1 },
  searchInput: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 100, paddingLeft: 38, paddingRight: 36, paddingVertical: Platform.OS === 'ios' ? 10 : 7, fontSize: 16, color: C.dark },
  searchClear: { position: 'absolute', right: 13 },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1.5 },
  btnText: { fontSize: 13, fontWeight: '700' },
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingTop: 18 },
  stat: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  statNum: { fontSize: 24, fontWeight: '800', color: C.green },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.soft, marginTop: 2 },

  toolbar: { paddingTop: 16, paddingBottom: 6, gap: 10 },
  chipGroup: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  chipText: { fontSize: 13, fontWeight: '700', color: C.soft },
  selects: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8, fontSize: 16, color: C.dark },
  readonly: { backgroundColor: C.muted },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textarea: { minHeight: 64, lineHeight: 21, textAlignVertical: 'top' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.dangerLt, borderWidth: 1.5, borderColor: '#f0b4ad', borderRadius: 12, padding: 12, marginVertical: 10 },
  retry: { backgroundColor: C.danger, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7, marginTop: 8 },
  card: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, overflow: 'hidden', flex: 1 },
  cover: { height: 150, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverLetter: { fontSize: 42, fontWeight: '800', color: 'rgba(255,255,255,.9)' },
  badges: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  featured: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16, gap: 8 },
  catPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  catText: { fontSize: 10, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, lineHeight: 21, color: C.dark },
  cardExcerpt: { fontSize: 13, lineHeight: 20, color: C.soft },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: { backgroundColor: C.greenLt, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '600', color: C.green },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.muted, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5, fontWeight: '600' },
  cardDate: { marginLeft: 'auto', fontSize: 11, color: C.soft },
  cardActions: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 6, marginTop: 30 },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.dark },
  emptyDesc: { fontSize: 14, color: C.soft, textAlign: 'center', maxWidth: 320, marginBottom: 10 },
  loadMore: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1.5, borderColor: C.green, backgroundColor: C.white, borderRadius: 100, paddingVertical: 10, paddingHorizontal: 22 },
  loadMoreText: { color: C.green, fontWeight: '800', fontSize: 13 },

  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  editorStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  editorStatusText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  editorMain: { width: '100%', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 16, gap: 14 },
  coverDrop: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border, borderRadius: 12, backgroundColor: C.muted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coverOverlay: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 6 },
  smallBtn: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
  smallBtnText: { fontSize: 12, fontWeight: '700', color: C.dark },
  titleInput: { fontSize: 25, fontWeight: '800', letterSpacing: -0.6, color: C.dark, paddingVertical: 4, borderBottomWidth: 1.5, borderBottomColor: C.border },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, flexBasis: 170, gap: 5, minWidth: 0 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.soft },
  contentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mdBar: { borderWidth: 1.5, borderColor: C.border, backgroundColor: C.muted, borderRadius: 10, flexGrow: 0 },
  mdBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.white, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  mdBtnText: { fontSize: 13, fontWeight: '800', color: C.dark },
  contentArea: { minHeight: 380, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, borderRadius: 12, padding: 14, fontSize: 16, lineHeight: 24, color: C.dark, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  preview: { minHeight: 380, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },

  side: { width: '100%', gap: 14 },
  sideCard: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 16, gap: 10 },
  sideTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: C.soft },
  featureToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  statLine: { flexDirection: 'row', justifyContent: 'space-between' },
  statLineL: { fontSize: 13, color: C.soft }, statLineV: { fontSize: 13, color: C.dark, fontWeight: '700' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, borderRadius: 10, paddingVertical: 10, marginTop: 2 },
  slug: { alignSelf: 'flex-start', fontSize: 12, color: C.soft, backgroundColor: C.muted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  comment: { backgroundColor: C.muted, borderRadius: 10, padding: 10 },

  overlay: { flex: 1, backgroundColor: 'rgba(26,26,46,.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: C.white, borderRadius: 16, padding: 20, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.dark, marginBottom: 8 },
  modalDesc: { fontSize: 14, lineHeight: 21, color: C.soft, marginBottom: 20 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10 },

  toastWrap: { position: 'absolute', left: 16, right: 16, bottom: 24, alignItems: 'center', gap: 8 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderLeftWidth: 4, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, maxWidth: 360, ...shadow },
});