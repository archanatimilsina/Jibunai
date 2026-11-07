import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, FlatList, Pressable, Image, Modal, Alert, ActivityIndicator,
  Animated, RefreshControl, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, Pencil, Trash2, Download, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';

import useLocalCollection from '../hooks/useLocalCollection';
import { BREAKPOINTS } from '../utils/responsive';

const C = {
  dark: '#1a1a2e', soft: '#5c574c', border: '#d8d4cc', accent: '#eceae3', green: '#2d6a4f',
  greenDim: '#245741', danger: '#c0392b', white: '#ffffff', bg: '#f6f5f0', stamp: '#6b665b',
};
const EMPTY_FORM = { title: '', remoteUrl: '', source: 'remote', file: null, previewUrl: '' };

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const slugify = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const cardShadow = { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 };

const Spinner = ({ color = '#fff', size = 'small' }) => <ActivityIndicator size={size} color={color} />;

function MemoryCard({ stamp, onEdit, onDelete, onPreview, deleting }) {
  const [ratio, setRatio] = useState(4 / 3);
  const tilt = useMemo(() => {
    const idNum = Number(stamp.id) || 0;
    return (((idNum * 7919) % 100) / 100 - 0.5) * 5;
  }, [stamp.id]);
  const tapeLeft = (Number(stamp.id) || 0) % 2 === 0;

  return (
    <View style={[s.cardWrap, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={[s.polaroid, cardShadow]}>
        <View style={[s.tape, tapeLeft ? { left: 12, transform: [{ rotate: '-14deg' }] } : { right: 12, transform: [{ rotate: '14deg' }] }]} />
        <Pressable onPress={() => onPreview(stamp)} accessibilityLabel={`Preview ${stamp.title}`} style={s.imgBox}>
          {stamp.image ? (
            <Image
              source={{ uri: stamp.image }} resizeMode="cover"
              style={{ width: '100%', aspectRatio: ratio }}
              onLoad={(e) => {
                const { width, height } = e.nativeEvent.source || {};
                if (width && height) setRatio(Math.min(1.8, Math.max(0.65, width / height)));
              }}
            />
          ) : (
            <View style={s.imgEmpty}><Text style={s.imgEmptyText}>no image</Text></View>
          )}
        </Pressable>

        <Text style={s.stampText}>#{stamp.id} · {fmtDate(stamp.timestamp)}</Text>
        <Text style={s.cardTitle}>{stamp.title}</Text>

        <View style={s.actions}>
          <Pressable onPress={() => onPreview(stamp)} style={[s.abtn, { backgroundColor: C.dark, borderColor: C.dark }]}>
            <Eye size={14} color="#fff" /><Text style={[s.abtnText, { color: '#fff' }]}>Preview</Text>
          </Pressable>
          <Pressable onPress={() => onEdit(stamp)} style={s.abtn}>
            <Pencil size={14} color={C.dark} /><Text style={s.abtnText}>Edit</Text>
          </Pressable>
          <Pressable disabled={deleting} onPress={() => onDelete(stamp)} style={[s.abtn, deleting && { opacity: 0.5 }]}>
            {deleting ? <Spinner color={C.danger} /> : <Trash2 size={14} color={C.danger} />}
            <Text style={[s.abtnText, { color: C.danger }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Slide({ stamp, width }) {
  const [status, setStatus] = useState('loading');
  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: width >= BREAKPOINTS.medium ? 72 : 12 }}>
      {stamp.image && status !== 'failed' && (
        <Image
          source={{ uri: stamp.image }} resizeMode="contain"
          style={{ width: '100%', height: '100%', borderRadius: 8, opacity: status === 'loaded' ? 1 : 0 }}
          onLoad={() => setStatus('loaded')} onError={() => setStatus('failed')}
        />
      )}
      {status !== 'loaded' && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          {status === 'failed' || !stamp.image
            ? <Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 14 }}>⚠ This image could not be loaded</Text>
            : <Spinner color={C.green} size="large" />}
        </View>
      )}
    </View>
  );
}

function Lightbox({ stamps, startIndex, onClose, onDownload, downloadingId }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(startIndex);
  const listRef = useRef(null);
  const stamp = stamps[index];
  const goTo = (i) => {
    const next = (i + stamps.length) % stamps.length;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };
  if (!stamp) return null;
  const downloading = downloadingId === stamp.id;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={s.lb}>
        <View style={s.lbBar}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.lbTitle} numberOfLines={1}>{stamp.title}</Text>
            <Text style={s.lbSub}>#{stamp.id} · {fmtDate(stamp.timestamp)} · {index + 1} / {stamps.length}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => onDownload(stamp)} disabled={downloading} style={[s.lbBtn, { backgroundColor: C.green, borderColor: C.green }, downloading && { opacity: 0.55 }]}>
              {downloading ? <Spinner /> : <Download size={15} color="#fff" />}
              {width >= BREAKPOINTS.medium && <Text style={s.lbBtnText}>Save</Text>}
            </Pressable>
            <Pressable onPress={onClose} style={s.lbBtn} accessibilityLabel="Close preview">
              <X size={16} color="#fff" />
              {width >= BREAKPOINTS.medium && <Text style={s.lbBtnText}>Close</Text>}
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <FlatList
            key={width} ref={listRef} data={stamps} keyExtractor={(x) => String(x.id)} horizontal pagingEnabled
            showsHorizontalScrollIndicator={false} initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <Slide stamp={item} width={width} />}
          />
          {stamps.length > 1 && width >= BREAKPOINTS.medium && (
            <>
              <Pressable onPress={() => goTo(index - 1)} style={[s.nav, { left: 14 }]} accessibilityLabel="Previous image"><ChevronLeft size={22} color="#fff" /></Pressable>
              <Pressable onPress={() => goTo(index + 1)} style={[s.nav, { right: 14 }]} accessibilityLabel="Next image"><ChevronRight size={22} color="#fff" /></Pressable>
            </>
          )}
        </View>
        <Text style={s.lbCaption}>{width >= BREAKPOINTS.medium ? 'Use ‹ › to move between images' : 'Swipe to move between images'}</Text>
      </SafeAreaView>
    </Modal>
  );
}

export default function ArchiveScreen() {
  const { width } = useWindowDimensions();
  const cols = width >= BREAKPOINTS.wide ? 3 : width >= BREAKPOINTS.medium ? 2 : 1;
  const pad = width >= BREAKPOINTS.medium ? 32 : 18;

  const {
    items: stamps,
    loading,
    refreshing,
    errorText: fetchError,
    refresh,
    isOnline,
    pending,
    create,
    createWithFile,
    update,
    updateWithFile,
    remove,
  } = useLocalCollection('archive', {
    initial: [],
  });

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-3));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormErr(null); setModal(true); };
  const openEdit = (st) => {
    setEditing(st);
    setForm({ title: st.title, remoteUrl: st.remote_url || '', source: st.source || 'remote', file: null, previewUrl: st.image || '' });
    setFormErr(null); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY_FORM); setFormErr(null); };

  const pickFile = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setFormErr('Allow photo access to choose an image.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const file = { uri: a.uri, name: a.fileName || `memory-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' };
    setForm((f) => ({ ...f, file, source: 'local', previewUrl: a.uri, remoteUrl: '' }));
    setFormErr(null);
  };

  const switchSource = (src) => setForm((f) => ({ ...f, source: src, file: null, previewUrl: '', remoteUrl: '' }));
  const onRemoteUrl = (val) => setForm((f) => ({ ...f, remoteUrl: val, previewUrl: val }));

  const handleCreate = async () => {
    if (!form.title.trim()) { setFormErr('Title is required.'); return; }
    if (form.source === 'local' && !form.file) { setFormErr('Please select an image file.'); return; }
    if (form.source === 'remote' && !form.remoteUrl.trim()) { setFormErr('Enter remote image URL.'); return; }
    setSubmitting(true); setFormErr(null);
    try {
      const { offline } = form.source === 'local'
        ? await createWithFile(
            { title: form.title.trim(), source: 'local' },
            { uri: form.file.uri, name: form.file.name, type: form.file.type, field: 'image' },
          )
        : await create({
            title: form.title.trim(),
            source: 'remote',
            url: form.remoteUrl.trim(),
          });
      closeModal();
      toast(offline ? 'Saved on this device.' : 'Archived.');
    } catch (e) { setFormErr(e?.message || 'Could not save. Check your connection and try again.'); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async () => {
    if (!form.title.trim()) { setFormErr('Title is required.'); return; }
    setSubmitting(true); setFormErr(null);
    try {
      const { offline } = form.source === 'local' && form.file
        ? await updateWithFile(
            editing.id,
            { title: form.title.trim(), source: 'local' },
            { uri: form.file.uri, name: form.file.name, type: form.file.type, field: 'image' },
          )
        : form.source === 'remote' && form.remoteUrl !== editing.remote_url
          ? await update(editing.id, {
              title: form.title.trim(),
              source: 'remote',
              url: form.remoteUrl.trim(),
            })
          : await update(editing.id, { title: form.title.trim() });
      closeModal();
      toast(offline ? 'Saved on this device.' : 'Updated.');
    } catch (e) { setFormErr(e?.message || 'Save failed.'); }
    finally { setSubmitting(false); }
  };

  const deleteNow = async (id) => {
    setDeletingId(id);
    try {
      const { offline } = await remove(id);
      toast(offline ? 'Removed on this device.' : 'Removed.');
    } catch (e) { toast(e?.message || 'Delete failed.', true); }
    finally { setDeletingId(null); }
  };
  const handleDelete = (st) => Alert.alert('Remove this memory?', `“${st.title}” will be deleted.`, [
    { text: 'Keep it', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => deleteNow(st.id) },
  ]);

  const downloadImage = useCallback(async (st) => {
    if (!st?.image) return;
    setDownloadingId(st.id);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) throw new Error('permission');
      const ext = (st.image.split('?')[0].split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
      const safeExt = /^[a-z0-9]{2,4}$/.test(ext) ? ext : 'jpg';
      const dest = `${FileSystem.cacheDirectory}${slugify(st.title) || `memory-${st.id}`}.${safeExt}`;
      const { uri, status } = await FileSystem.downloadAsync(st.image, dest);
      if (status && status >= 400) throw new Error(`HTTP ${status}`);
      await MediaLibrary.saveToLibraryAsync(uri);
      toast('Saved to your photos ✓');
    } catch (e) {
      toast(e.message === 'permission' ? 'Allow photo access to save images.' : 'Could not save the image.', true);
    } finally { setDownloadingId(null); }
  }, [toast]);

  const columns = useMemo(() => {
    const out = Array.from({ length: cols }, () => []);
    stamps.forEach((st, i) => out[i % cols].push(st));
    return out;
  }, [stamps, cols]);

  const openPreview = (st) => setPreviewIndex(Math.max(0, stamps.findIndex((x) => x.id === st.id)));
  const isEdit = !!editing;
  const canSubmit = !submitting && form.title.trim();

  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.green} onRefresh={refresh} />}
      >
        <View style={[s.pageInner, { paddingHorizontal: pad }]}>
          <View style={s.hero}>
            <View style={s.labelRow}>
              <View style={s.rule} /><Text style={s.label}>PERSONAL ARCHIVE</Text><View style={s.rule} />
            </View>
            <Text style={[s.heroTitle, { fontSize: width >= BREAKPOINTS.wide ? 60 : 42 }]}>
              Visual <Text style={s.em}>Scrapbook</Text>
            </Text>
            <Text style={s.heroDesc}>
              A curated collection of fleeting moments and digital artifacts. Scroll through the loose grid to relive captured memories.
            </Text>
            <Pressable onPress={openCreate} disabled={loading} style={({ pressed }) => [s.capture, loading && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}>
              <Plus size={20} color="#fff" strokeWidth={2} />
              <Text style={s.captureText}>Log New Memory Stamp</Text>
            </Pressable>
          </View>

          {!!fetchError && (
            <View style={s.errBanner}>
              <Text style={{ flex: 1, color: C.danger, fontSize: 14 }}>⚠ Could not load archive — {fetchError}.</Text>
              <Pressable onPress={refresh}><Text style={{ color: C.danger, textDecorationLine: 'underline', fontSize: 14 }}>Retry</Text></Pressable>
            </View>
          )}

          {loading ? (
            <View style={s.masonry}>
              {Array.from({ length: cols }).map((_, c) => (
                <View key={c} style={s.col}>
                  {[220, 280, 190].map((h, i) => <SkeletonBox key={i} h={h + ((c * 37 + i * 23) % 50)} />)}
                </View>
              ))}
            </View>
          ) : stamps.length === 0 ? (
            <Pressable onPress={openCreate} style={s.empty}>
              <Text style={s.emptyTitle}>Your scrapbook is empty.</Text>
              <Text style={s.emptyDesc}>Tap here to capture your first memory.</Text>
            </Pressable>
          ) : (
            <View style={s.masonry}>
              {columns.map((col, ci) => (
                <View key={ci} style={s.col}>
                  {col.map((st) => (
                    <MemoryCard key={st.id} stamp={st} onEdit={openEdit} onDelete={handleDelete} onPreview={openPreview} deleting={deletingId === st.id} />
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={modal} animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} accessibilityLabel="Close dialog" />
            <View style={s.modal}>
              <Pressable onPress={closeModal} style={s.modalClose} hitSlop={8}><X size={20} color={C.soft} /></Pressable>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={s.modalTitle}>{isEdit ? 'Modify Memory Stamp' : 'Log New Memory Node'}</Text>

                <View style={s.fgroup}>
                  <Text style={s.flabel}>MEMORY TITLE *</Text>
                  <TextInput style={s.finput} value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                    placeholder="e.g. Redwood Solitude Walk" placeholderTextColor={C.stamp} />
                </View>

                <View style={s.fgroup}>
                  <Text style={s.flabel}>IMAGE SOURCE</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[['local', 'Local Upload'], ['remote', 'Remote URL']].map(([k, l]) => (
                      <Pressable key={k} onPress={() => switchSource(k)} style={[s.srcBtn, form.source === k && { backgroundColor: C.dark, borderColor: C.dark }]}>
                        <Text style={[s.srcText, form.source === k && { color: '#fff' }]}>{l}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {form.source === 'local' ? (
                  <View style={s.fgroup}>
                    <Text style={s.flabel}>IMAGE FILE {!isEdit && '*'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <Pressable onPress={pickFile} style={s.uploadBtn}><Text style={s.uploadText}>{form.file ? 'Replace Image' : 'Choose File'}</Text></Pressable>
                      {form.file && <Text style={[s.uploadStatus, { flexShrink: 1 }]} numberOfLines={1}>✓ {form.file.name}</Text>}
                      {!form.file && isEdit && <Text style={[s.uploadStatus, { color: C.soft }]}>Keeping existing image</Text>}
                    </View>
                  </View>
                ) : (
                  <View style={s.fgroup}>
                    <Text style={s.flabel}>REMOTE IMAGE URL {!isEdit && '*'}</Text>
                    <TextInput style={s.finput} value={form.remoteUrl} onChangeText={onRemoteUrl} keyboardType="url"
                      autoCapitalize="none" autoCorrect={false} placeholder="https://images.unsplash.com/..." placeholderTextColor={C.stamp} />
                  </View>
                )}

                {!!form.previewUrl && (
                  <View style={s.fgroup}>
                    <Text style={s.flabel}>PREVIEW</Text>
                    <Image source={{ uri: form.previewUrl }} resizeMode="contain" style={s.previewImg} />
                  </View>
                )}

                {!!formErr && <View style={s.modalErr}><Text style={{ color: C.danger, fontSize: 13 }}>⚠ {formErr}</Text></View>}

                <View style={s.modalActions}>
                  <Pressable onPress={closeModal} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></Pressable>
                  <Pressable onPress={isEdit ? handleUpdate : handleCreate} disabled={!canSubmit}
                    style={[s.submit, { backgroundColor: isEdit ? C.dark : C.green }, !canSubmit && { opacity: 0.5 }]}>
                    {submitting && <Spinner />}
                    <Text style={s.submitText}>{submitting ? 'Saving…' : isEdit ? 'Commit Update' : 'Archive Memory'}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {previewIndex !== null && stamps[previewIndex] && (
        <Lightbox stamps={stamps} startIndex={previewIndex} onClose={() => setPreviewIndex(null)}
          onDownload={downloadImage} downloadingId={downloadingId} />
      )}

      <View pointerEvents="none" style={s.toastWrap}>
        {toasts.map((t) => (
          <View key={t.id} style={[s.toast, t.err ? { backgroundColor: '#fff5f5', borderColor: '#fecaca' } : { backgroundColor: '#f0fdf9', borderColor: '#a7f3d0' }]}>
            <Text style={{ color: t.err ? C.danger : '#065f46', fontSize: 13.5, fontWeight: '500', flexShrink: 1 }}>{t.err ? '✗' : '✓'} {t.msg}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function SkeletonBox({ h }) {
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.5, duration: 750, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ height: h, marginBottom: 26, borderRadius: 4, backgroundColor: '#ede9e2', opacity: a }} />;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  pageInner: { width: '100%', maxWidth: 1300, alignSelf: 'center', paddingTop: 44 },

  hero: { alignItems: 'center', marginBottom: 56 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  rule: { width: 40, height: 1, backgroundColor: C.border },
  label: { fontSize: 11.5, fontWeight: '800', letterSpacing: 4, color: C.soft },
  heroTitle: { fontWeight: '800', letterSpacing: -2, color: C.dark, textAlign: 'center', marginBottom: 14 },
  em: { color: C.green },
  heroDesc: { fontSize: 15.5, lineHeight: 27, color: C.soft, textAlign: 'center', maxWidth: 580, marginBottom: 32 },
  capture: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.dark, borderRadius: 50, paddingVertical: 16, paddingHorizontal: 28, shadowColor: '#0f172a', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  captureText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fed7d7', borderRadius: 8, padding: 16, marginBottom: 28 },

  masonry: { flexDirection: 'row', gap: 26, alignItems: 'flex-start', paddingHorizontal: 4 },
  col: { flex: 1 },
  cardWrap: { marginBottom: 26 },
  polaroid: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 2, padding: 14, paddingBottom: 18 },
  tape: { position: 'absolute', top: -6, width: 58, height: 18, backgroundColor: 'rgba(191,176,142,.28)', zIndex: 5 },
  imgBox: { borderRadius: 6, overflow: 'hidden', backgroundColor: C.accent, marginBottom: 14, minHeight: 120 },
  imgEmpty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  imgEmptyText: { color: C.stamp, fontSize: 13, fontFamily: mono },
  stampText: { fontFamily: mono, fontSize: 11, color: C.stamp, marginBottom: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22, color: C.dark },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#ece7df' },
  abtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  abtnText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: C.dark, textTransform: 'uppercase' },

  empty: { alignItems: 'center', paddingVertical: 100, paddingHorizontal: 24, backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.soft, marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 15, color: C.soft, opacity: 0.7, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.72)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 490, maxHeight: '92%', backgroundColor: C.white, borderRadius: 14, padding: 26, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  modalClose: { position: 'absolute', top: 14, right: 16, zIndex: 5 },
  modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.8, color: C.dark, textAlign: 'center', marginBottom: 26, paddingHorizontal: 24 },
  fgroup: { gap: 8, marginBottom: 20 },
  flabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 2, color: C.soft },
  finput: { borderWidth: 1, borderColor: C.border, borderRadius: 7, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10, fontSize: 16, color: C.dark },
  srcBtn: { borderWidth: 1.5, borderColor: C.border, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 16 },
  srcText: { fontSize: 12.5, fontWeight: '800', color: C.soft },
  uploadBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 6, backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 18 },
  uploadText: { fontSize: 14, fontWeight: '600', color: C.dark },
  uploadStatus: { fontSize: 13, fontWeight: '600', color: C.green },
  previewImg: { width: '100%', height: 140, borderRadius: 5, borderWidth: 1, borderColor: C.border, backgroundColor: '#f0ece6' },
  modalErr: { padding: 11, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fed7d7', borderRadius: 6, marginBottom: 6 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 10 },
  cancel: { borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 13, paddingHorizontal: 22, justifyContent: 'center' },
  cancelText: { fontSize: 14.5, fontWeight: '600', color: C.soft },
  submit: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 6, paddingVertical: 13, paddingHorizontal: 22 },
  submitText: { fontSize: 14.5, fontWeight: '600', color: '#fff' },

  lb: { flex: 1, backgroundColor: '#090c14' },
  lbBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  lbTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  lbSub: { fontFamily: mono, fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginTop: 2 },
  lbBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.18)', borderRadius: 50, paddingVertical: 10, paddingHorizontal: 14 },
  lbBtnText: { color: '#fff', fontSize: 11.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  nav: { position: 'absolute', top: '50%', marginTop: -24, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' },
  lbCaption: { textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,.45)', paddingVertical: 12 },

  toastWrap: { position: 'absolute', left: 16, right: 16, bottom: 24, alignItems: 'center', gap: 8 },
  toast: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, maxWidth: 340, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
});