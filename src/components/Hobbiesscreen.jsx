import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Alert, ActivityIndicator, Animated, RefreshControl,
  KeyboardAvoidingView, LayoutAnimation, Platform, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enableLayoutAnimation } from '../utils/layoutAnimation';
import useCachedResource from '../hooks/useCachedResource';
import { apiSend } from '../api/http';
import { fetchResource, TTL } from '../api/resources';

enableLayoutAnimation();


const C = {
  white: '#ffffff', border: '#d8d4cc', green: '#2d6a4f', greenLt: '#e4f1ea', dark: '#1a1a2e',
  soft: '#7a7567', muted: '#eceae3', danger: '#c0392b', dangerLt: '#fdecea', ph: '#bdb8ad',
};
const EMPTY_FORM = { emoji: '', title: '', text: '' };
const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const openShadow = { shadowColor: '#1a1a2e', shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 };
const anim = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

const Btn = ({ children, onPress, ghost, busy, small, style }) => (
  <Pressable
    onPress={onPress} disabled={busy}
    style={({ pressed }) => [s.btn, ghost ? s.btnGhost : s.btnDark, small && { paddingVertical: 8, paddingHorizontal: 15 }, busy && { opacity: 0.55 }, pressed && { opacity: 0.85 }, style]}
  >
    {busy ? <ActivityIndicator size="small" color={ghost ? C.soft : '#fff'} />
      : <Text style={[s.btnText, ghost && { color: C.soft }, small && { fontSize: 12.5 }]}>{children}</Text>}
  </Pressable>
);

function SkeletonRow() {
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ height: 62, borderRadius: 14, backgroundColor: '#ebebeb', opacity: a }} />;
}

function HobbyItem({ hobby, open, editing, editHobby, setEditHobby, updating, onToggle, onEdit, onCancel, onUpdate, onDelete }) {
  return (
    <View style={[s.item, open && [{ borderColor: C.green }, openShadow]]}>
      <Pressable
        onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={({ pressed }) => [s.head, pressed && { backgroundColor: C.muted }]}
      >
        <Text style={s.emoji}>{hobby.emoji || '✨'}</Text>
        <Text style={s.topic} numberOfLines={2}>{hobby.title}</Text>
        <Text style={[s.chevron, { transform: [{ rotate: open ? '180deg' : '0deg' }] }]}>⌄</Text>
      </Pressable>

      {open && (
        <View style={s.panel}>
          {editing ? (
            <View>
              <View style={{ marginBottom: 10, gap: 6 }}>
                <Text style={s.flabel}>EMOJI & TITLE</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[s.input, { width: 60, textAlign: 'center', fontSize: 18 }]} maxLength={12}
                    value={editHobby.emoji} onChangeText={(v) => setEditHobby((p) => ({ ...p, emoji: v }))} />
                  <TextInput style={[s.input, { flex: 1 }]} value={editHobby.title}
                    onChangeText={(v) => setEditHobby((p) => ({ ...p, title: v }))} />
                </View>
              </View>
              <View style={{ marginBottom: 14, gap: 6 }}>
                <Text style={s.flabel}>DESCRIPTION</Text>
                <TextInput style={[s.input, s.multiline]} multiline value={editHobby.text}
                  onChangeText={(v) => setEditHobby((p) => ({ ...p, text: v }))} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small busy={updating} onPress={onUpdate}>Update</Btn>
                <Btn small ghost onPress={onCancel}>Cancel</Btn>
              </View>
            </View>
          ) : (
            <>
              <Text style={s.hobbyText}>{hobby.text}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <Pressable onPress={onEdit} style={s.ctrl} accessibilityLabel="Edit hobby"><Text style={{ fontSize: 13 }}>✏️</Text></Pressable>
                <Pressable onPress={onDelete} style={[s.ctrl, { backgroundColor: C.dangerLt, borderColor: '#fecaca' }]} accessibilityLabel="Delete hobby">
                  <Text style={{ fontSize: 13, color: C.danger, fontWeight: '800' }}>✕</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function HobbiesScreen() {
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 2 : 1;
  const stackForm = width < 768;
  const stackHeader = width < 640;
  const pad = width >= 768 ? 40 : 20;

  const {
    data: hobbies,
    loading,
    refreshing,
    errorText: fetchError,
    refresh,
    mutate,
  } = useCachedResource('hobbies', () => fetchResource('hobbies'), {
    ttl: TTL.STATIC,
    initial: [],
    errorMessage: 'Could not load hobbies. Make sure the backend is running.',
  });
  const [toast, setToast] = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newHobby, setNewHobby] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editHobby, setEditHobby] = useState(EMPTY_FORM);
  const [updating, setUpdating] = useState(false);
  const [openId, setOpenId] = useState(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);
  }, [toastAnim]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const handleCreate = async () => {
    if (!newHobby.title.trim() || !newHobby.text.trim()) { showToast('Add a title and a description.', 'error'); return; }
    setCreating(true);
    try {
      const created = await apiSend('/hobbies/', 'POST', {
        emoji: newHobby.emoji.trim() || '✨',
        title: newHobby.title.trim(),
        text: newHobby.text.trim(),
      });
      anim();
      mutate((p) => [...(p || []), created]);
      setOpenId(created.id);
      setNewHobby(EMPTY_FORM);
      setIsCreating(false);
      showToast('Hobby added.');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const startEditing = (h) => {
    anim();
    setOpenId(h.id); setEditingId(h.id);
    setEditHobby({ emoji: h.emoji, title: h.title, text: h.text });
  };

  const handleUpdate = async (id) => {
    if (!editHobby.title.trim() || !editHobby.text.trim()) { showToast('Add a title and a description.', 'error'); return; }
    setUpdating(true);
    try {
      const updated = await apiSend(`/hobbies/${id}/`, 'PATCH', {
        emoji: editHobby.emoji.trim() || '✨',
        title: editHobby.title.trim(),
        text: editHobby.text.trim(),
      });
      anim();
      mutate((p) => (p || []).map((h) => (h.id === id ? updated : h)));
      setEditingId(null);
      showToast('Hobby updated.');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setUpdating(false); }
  };

  const deleteNow = async (id) => {
    try {
      await apiSend(`/hobbies/${id}/`, 'DELETE');
      anim();
      mutate((p) => (p || []).filter((h) => h.id !== id));
      if (openId === id) setOpenId(null);
      showToast('Hobby removed.');
    } catch (e) { showToast(e.message, 'error'); }
  };
  const handleDelete = (h) => Alert.alert('Remove this hobby permanently?', `“${h.title}” will be deleted.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => deleteNow(h.id) },
  ]);

  const toggleOpen = (id) => { anim(); setOpenId((prev) => (prev === id ? null : id)); };

  const columns = useMemo(() => {
    const out = Array.from({ length: cols }, () => []);
    hobbies.forEach((h, i) => out[i % cols].push(h));
    return out;
  }, [hobbies, cols]);

  const toastErr = toast?.type === 'error';

  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 90 }} keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.green} onRefresh={refresh} />}
        >
          <View style={[s.wrap, { paddingHorizontal: pad }]}>
            <View style={s.secHeading}>
              <Text style={s.secHeadingText}>HOBBIES</Text>
              <View style={s.secRule} />
            </View>

            <View style={[s.headerRow, stackHeader && { flexDirection: 'column', alignItems: 'stretch', gap: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, { fontSize: width >= 768 ? 38 : 30 }]}>Things I <Text style={{ color: C.green }}>Love</Text> Doing</Text>
                <Text style={s.desc}>Beyond the code editor — the things that keep me human and curious.</Text>
              </View>
              <Btn ghost={isCreating} onPress={() => { anim(); setIsCreating((p) => !p); setNewHobby(EMPTY_FORM); }}>
                {isCreating ? 'Close Panel' : '+ Add New Hobby'}
              </Btn>
            </View>

            {isCreating && (
              <View style={[s.formBlock, stackForm && { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={[s.fgroup, !stackForm && { flex: 0.12, minWidth: 76 }]}>
                  <Text style={s.flabel}>EMOJI</Text>
                  <TextInput style={[s.input, { textAlign: 'center', fontSize: 18 }]} placeholder="📸" placeholderTextColor={C.ph}
                    maxLength={12} value={newHobby.emoji} onChangeText={(v) => setNewHobby((p) => ({ ...p, emoji: v }))} />
                </View>
                <View style={[s.fgroup, !stackForm && { flex: 0.35 }]}>
                  <Text style={s.flabel}>TITLE</Text>
                  <TextInput style={s.input} placeholder="e.g. Astronomy" placeholderTextColor={C.ph}
                    value={newHobby.title} onChangeText={(v) => setNewHobby((p) => ({ ...p, title: v }))} />
                </View>
                <View style={[s.fgroup, !stackForm && { flex: 1 }]}>
                  <Text style={s.flabel}>DESCRIPTION</Text>
                  <TextInput style={[s.input, stackForm && s.multiline]} placeholder="What makes you love this?" placeholderTextColor={C.ph}
                    multiline={stackForm} value={newHobby.text} onChangeText={(v) => setNewHobby((p) => ({ ...p, text: v }))} />
                </View>
                <Btn busy={creating} onPress={handleCreate} style={{ height: 44 }}>Save Hobby</Btn>
              </View>
            )}

            {!!fetchError && (
              <View style={s.errBanner}><Text style={{ color: C.danger, fontFamily: mono, fontSize: 12.5 }}>{fetchError}</Text></View>
            )}

            {loading && <View style={{ gap: 14 }}><SkeletonRow /><SkeletonRow /><SkeletonRow /></View>}

            {!loading && !fetchError && hobbies.length === 0 && (
              <View style={s.empty}>
                <Text style={{ fontSize: 40 }}>🌱</Text>
                <Text style={{ fontSize: 15, color: C.soft }}>No hobbies yet. Add something you love above.</Text>
              </View>
            )}

            {!loading && hobbies.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                {columns.map((col, ci) => (
                  <View key={ci} style={{ flex: 1, gap: 14 }}>
                    {col.map((h) => (
                      <HobbyItem
                        key={h.id} hobby={h} open={openId === h.id} editing={editingId === h.id}
                        editHobby={editHobby} setEditHobby={setEditHobby} updating={updating}
                        onToggle={() => toggleOpen(h.id)} onEdit={() => startEditing(h)}
                        onCancel={() => { anim(); setEditingId(null); }} onUpdate={() => handleUpdate(h.id)}
                        onDelete={() => handleDelete(h)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <Animated.View pointerEvents="none" style={[s.toastWrap, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
          <View style={[s.toast, { backgroundColor: toastErr ? C.dangerLt : C.greenLt, borderColor: toastErr ? '#fecaca' : '#a7f3d0' }]}>
            <Text style={{ color: toastErr ? C.danger : C.green, fontFamily: mono, fontSize: 12.5, fontWeight: '600' }}>{toast.msg}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fafaf8' },
  wrap: { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingTop: 34 },

  secHeading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  secHeadingText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 3, color: C.soft },
  secRule: { flex: 1, height: 1, backgroundColor: C.border },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, marginBottom: 32 },
  title: { fontWeight: '800', letterSpacing: -1, color: C.dark, marginBottom: 8 },
  desc: { fontSize: 15, lineHeight: 25, color: C.soft, maxWidth: 560 },

  btn: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 20 },
  btnDark: { backgroundColor: C.dark, borderColor: C.dark },
  btnGhost: { backgroundColor: C.muted, borderColor: C.border },
  btnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  formBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, backgroundColor: C.muted, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 20, marginBottom: 28 },
  fgroup: { gap: 6 },
  flabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.soft },
  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 15, color: C.dark },
  multiline: { minHeight: 76, textAlignVertical: 'top', lineHeight: 22 },

  errBanner: { backgroundColor: C.dangerLt, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 14, marginBottom: 22 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 64, paddingHorizontal: 20 },

  item: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 20 },
  emoji: { fontSize: 24, lineHeight: 30 },
  topic: { flex: 1, fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2, color: C.dark },
  chevron: { fontSize: 24, lineHeight: 26, color: C.green },
  panel: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.muted },
  hobbyText: { fontSize: 14.5, lineHeight: 24, color: C.soft },
  ctrl: { width: 36, height: 36, borderRadius: 9, backgroundColor: C.muted, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  toastWrap: { position: 'absolute', top: 60, left: 16, right: 16, alignItems: 'center' },
  toast: { borderWidth: 1, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 18, maxWidth: 380, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
});