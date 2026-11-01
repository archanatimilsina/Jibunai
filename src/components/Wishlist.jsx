import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Animated, Alert,
  StyleSheet, useWindowDimensions, Platform, StatusBar, SafeAreaView,
  KeyboardAvoidingView, RefreshControl, ActivityIndicator, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import {
  Syne_400Regular, Syne_600SemiBold, Syne_700Bold, Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';

import useCachedResource from '../hooks/useCachedResource';
import { apiSend } from '../api/http';
import { fetchResource, TTL } from '../api/resources';



const C = {
  pageBg: '#fafaf8',
  white: '#ffffff',
  border: '#d8d4cc',
  green: '#2d6a4f',
  greenDim: '#245741',
  greenLt: '#e4f1ea',
  dark: '#1a1a2e',
  soft: '#7a7567',
  muted: '#eceae3',
  danger: '#c0392b',
  dangerLt: '#fdecea',
  dangerBorder: '#fecaca',
  mintBorder: '#a7f3d0',
  mintText: '#047857',
};

const F = {
  syne: 'Syne_700Bold',
  syneSemi: 'Syne_600SemiBold',
  syneHeavy: 'Syne_800ExtraBold',
  syneReg: 'Syne_400Regular',
  sans: 'DMSans_400Regular',
  sansMed: 'DMSans_500Medium',
  mono: 'DMMono_400Regular',
  monoMed: 'DMMono_500Medium',
};

const EMPTY_NEW = { emoji: '', wish: '' };
const MIN_CARD = 280;
const GAP = 17;

const shadow = (h = 6, o = 0.08, r = 16) => Platform.select({
  ios: { shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: h }, shadowOpacity: o, shadowRadius: r },
  android: { elevation: Math.max(1, Math.round(h * 0.8)) },
  default: {},
});

function FadeUp({ children, delay = 0, distance = 10, duration = 400, style }) {
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

function PanelButton({ label, onPress, muted, disabled, small, style, loading }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => {
        const bg = muted ? (pressed ? C.border : C.muted) : (pressed ? C.green : C.dark);
        const bd = muted ? C.border : (pressed ? C.green : C.dark);
        return [
          st.panelBtn,
          small && st.panelBtnSmall,
          { backgroundColor: bg, borderColor: bd },
          disabled && { opacity: 0.5 },
          style,
        ];
      }}
    >
      {({ pressed }) => (
        loading
          ? <ActivityIndicator size="small" color={muted ? C.soft : C.white} />
          : (
            <Text
              style={[
                st.panelBtnText,
                small && { fontSize: 12.5 },
                { color: muted ? (pressed ? C.dark : C.soft) : C.white },
              ]}
            >
              {label}
            </Text>
          )
      )}
    </Pressable>
  );
}

function Dot({ delay }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(y, { toValue: -5, duration: 400, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.delay(200),
    ]));
    loop.start();
    return () => loop.stop();
  }, [y, delay]);
  return <Animated.View style={[st.dot, { transform: [{ translateY: y }] }]} />;
}

function Toast({ toast, wide }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [toast, a]);
  const err = toast.type === 'error';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.toast,
        wide ? { right: 24 } : { left: 16, right: 16, alignItems: 'center' },
        { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      <View
        style={[
          st.toastBox,
          {
            backgroundColor: err ? C.dangerLt : C.greenLt,
            borderColor: err ? C.dangerBorder : C.mintBorder,
          },
        ]}
      >
        <Text style={[st.toastText, { color: err ? C.danger : C.green }]}>{toast.msg}</Text>
      </View>
    </Animated.View>
  );
}

function MysticBar() {
  const [w, setW] = useState(0);
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const s = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    const p = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    s.start(); p.start();
    return () => { s.stop(); p.stop(); };
  }, [shimmer, pulse]);

  const glyphStyle = { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) };
  const bandW = Math.max(w * 0.4, 80);

  return (
    <LinearGradient
      colors={[C.greenLt, '#eafff6', C.greenLt]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={st.mystic}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            st.shimmerBand,
            {
              width: bandW,
              transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-bandW, w] }) }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <Animated.Text style={[st.mysticGlyph, glyphStyle]}>✦</Animated.Text>
      <Text style={st.mysticText}>
        A wish written here is <Text style={st.mysticEm}>bound</Text>. Once you write, it cannot be removed.
      </Text>
      <Animated.Text style={[st.mysticGlyph, glyphStyle]}>✦</Animated.Text>
    </LinearGradient>
  );
}


const WishCard = memo(function WishCard({
  wish, index, width, isEditing, editWish, setEditWish, updating,
  onStartEdit, onCancelEdit, onSubmitEdit, onDelete,
}) {
  const lift = useRef(new Animated.Value(0)).current;
  const pressTo = (v) => Animated.spring(lift, { toValue: v, friction: 7, tension: 120, useNativeDriver: true }).start();

  return (
    <FadeUp delay={Math.min(index, 12) * 40} style={{ width }}>
      <Animated.View
        style={{
          transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
        }}
      >
        <Pressable
          onPressIn={() => !isEditing && pressTo(1)}
          onPressOut={() => pressTo(0)}
          onLongPress={() => !isEditing && onStartEdit(wish)}
          delayLongPress={350}
          accessibilityHint="Long press to edit"
          style={[st.wishCard, isEditing && { borderColor: C.green }]}
        >
          {isEditing ? (
            <View style={{ width: '100%' }}>
              <View style={st.editRow}>
                <TextInput
                  value={editWish.emoji}
                  onChangeText={(v) => setEditWish((p) => ({ ...p, emoji: v }))}
                  maxLength={2}
                  style={[st.input, st.editEmoji]}
                  textAlign="center"
                  accessibilityLabel="Emoji"
                />
                <TextInput
                  value={editWish.wish}
                  onChangeText={(v) => setEditWish((p) => ({ ...p, wish: v }))}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => onSubmitEdit(wish.id)}
                  style={[st.input, st.editWish]}
                  accessibilityLabel="Wish"
                />
              </View>
              <View style={st.editActions}>
                <PanelButton
                  label="Update"
                  small
                  loading={updating}
                  disabled={updating || !editWish.wish.trim()}
                  onPress={() => onSubmitEdit(wish.id)}
                />
                <PanelButton label="Cancel" small muted onPress={onCancelEdit} />
              </View>
            </View>
          ) : (
            <>
              <Text style={st.wishEmoji}>{wish.emoji || '✨'}</Text>
              <Text style={st.wishText}>{wish.wish}</Text>
              <View style={st.cardControls}>
                <Pressable
                  onPress={() => onStartEdit(wish)}
                  hitSlop={6}
                  accessibilityLabel="Edit wish"
                  style={({ pressed }) => [
                    st.controlBtn,
                    pressed && { backgroundColor: C.dark, borderColor: C.dark },
                  ]}
                >
                  <Text style={{ fontSize: 12 }}>✏️</Text>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(wish.id)}
                  hitSlop={6}
                  accessibilityLabel="Delete wish"
                  style={({ pressed }) => [
                    st.controlBtn, st.controlBtnDanger,
                    pressed && { backgroundColor: C.danger, borderColor: C.danger },
                  ]}
                >
                  {({ pressed }) => <Text style={{ fontSize: 12, color: pressed ? C.white : C.danger }}>✕</Text>}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Animated.View>
    </FadeUp>
  );
});


export default function Wishlist() {
  const [fontsLoaded] = useFonts({
    [F.syne]: Syne_700Bold,
    [F.syneSemi]: Syne_600SemiBold,
    [F.syneHeavy]: Syne_800ExtraBold,
    [F.syneReg]: Syne_400Regular,
    [F.sans]: DMSans_400Regular,
    [F.sansMed]: DMSans_500Medium,
    [F.mono]: DMMono_400Regular,
    [F.monoMed]: DMMono_500Medium,
  });

  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const stackHeader = width < 640;
  const sidePad = wide ? 48 : 20;
  const contentWidth = Math.min(width, 1280) - sidePad * 2;
  const cols = Math.max(1, Math.floor((contentWidth + GAP) / (MIN_CARD + GAP)));
  const cardWidth = Math.floor((contentWidth - GAP * (cols - 1)) / cols);
  const titleSize = width >= 900 ? 38 : width >= 500 ? 30 : 26;

  const {
    data: wishes,
    loading,
    refreshing,
    errorText: fetchError,
    refresh,
    mutate,
  } = useCachedResource('wishes', () => fetchResource('wishes'), {
    ttl: TTL.STATIC,
    initial: [],
    errorMessage: 'Could not load wishes. Make sure the backend is running.',
  });
  const [toast, setToast] = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newWish, setNewWish] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editWish, setEditWish] = useState(EMPTY_NEW);
  const [updating, setUpdating] = useState(false);

  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, k: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const handleCreate = async () => {
    if (!newWish.wish.trim() || creating) return;
    setCreating(true);
    try {
      const created = await apiSend('/wishes/', 'POST', {
        emoji: newWish.emoji.trim() || '✨',
        wish: newWish.wish.trim(),
      });
      mutate((p) => [created, ...(p || [])]);
      setNewWish(EMPTY_NEW);
      setIsCreating(false);
      showToast('Wish added ✨');
    } catch (err) {
      showToast(err.message || 'Failed to save.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = useCallback((item) => {
    setEditingId(item.id);
    setEditWish({ emoji: item.emoji || '', wish: item.wish });
  }, []);

  const cancelEditing = useCallback(() => setEditingId(null), []);

  const handleUpdate = useCallback(async (id) => {
    if (!editWish.wish.trim()) return;
    setUpdating(true);
    try {
      const updated = await apiSend(`/wishes/${id}/`, 'PUT', {
        emoji: editWish.emoji.trim() || '✨',
        wish: editWish.wish.trim(),
      });
      mutate((p) => (p || []).map((w) => (w.id === id ? updated : w)));
      setEditingId(null);
      showToast('Wish updated.');
    } catch (err) {
      showToast(err.message || 'Update failed.', 'error');
    } finally {
      setUpdating(false);
    }
  }, [editWish, showToast]);

  const performDelete = useCallback(async (id) => {
    try {
      await apiSend(`/wishes/${id}/`, 'DELETE');
      mutate((p) => (p || []).filter((w) => w.id !== id));
      showToast('Wish removed.');
    } catch (err) {
      showToast(err.message || 'Delete failed.', 'error');
    }
  }, [showToast]);

  const handleDelete = useCallback((id) => {
    Alert.alert('Remove this wish?', 'This will remove it permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => performDelete(id) },
    ]);
  }, [performDelete]);

  const togglePanel = () => {
    setIsCreating((p) => !p);
    setNewWish(EMPTY_NEW);
  };

  const list = useMemo(() => wishes, [wishes]);

  if (!fontsLoaded) {
    return (
      <View style={[st.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.green} />
      </View>
    );
  }

  const canCreate = !!newWish.wish.trim() && !creating;

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.pageBg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[st.scroll, { paddingHorizontal: sidePad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              tintColor={C.green}
              colors={[C.green]}
              onRefresh={refresh}
            />
          )}
        >
          <FadeUp style={{ width: contentWidth, alignSelf: 'center' }} duration={400}>
            {}
            <View style={st.secHeadingRow}>
              <Text style={st.secHeading}>WISH LIST</Text>
              <View style={st.secLine} />
            </View>

            {}
            <View style={[st.headerRow, stackHeader && { flexDirection: 'column', gap: 16 }]}>
              <View style={{ flex: stackHeader ? undefined : 1 }}>
                <Text style={[st.secTitle, { fontSize: titleSize, lineHeight: titleSize * 1.18 }]}>
                  Things I <Text style={{ color: C.green }}>Dream About</Text>
                </Text>
                <Text style={st.secDesc}>
                  Not needs. Pure wants. The daydreams I return to when I need a reason to keep going.
                </Text>
              </View>
              <PanelButton
                label={isCreating ? 'Close Panel' : '+ Add Dream Wish'}
                muted={isCreating}
                onPress={togglePanel}
                style={stackHeader && { alignSelf: 'stretch' }}
              />
            </View>

            {}
            {isCreating && (
              <FadeUp distance={10} duration={250}>
                <View style={[st.formBlock, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={[st.formGroup, wide && { flex: 0.12, minWidth: 84 }]}>
                    <Text style={st.formLabel}>EMOJI</Text>
                    <TextInput
                      value={newWish.emoji}
                      onChangeText={(v) => setNewWish((p) => ({ ...p, emoji: v }))}
                      placeholder="✨"
                      placeholderTextColor={C.soft}
                      maxLength={2}
                      style={[st.input, { textAlign: 'center', fontSize: 18 }]}
                      accessibilityLabel="Emoji"
                    />
                  </View>
                  <View style={[st.formGroup, wide && { flex: 1 }]}>
                    <Text style={st.formLabel}>DREAM / WANT</Text>
                    <TextInput
                      value={newWish.wish}
                      onChangeText={(v) => setNewWish((p) => ({ ...p, wish: v }))}
                      placeholder="Describe your daydream…"
                      placeholderTextColor={C.soft}
                      returnKeyType="done"
                      onSubmitEditing={handleCreate}
                      style={st.input}
                      accessibilityLabel="Dream or want"
                    />
                  </View>
                  <PanelButton
                    label="Save Wish"
                    loading={creating}
                    disabled={!canCreate}
                    onPress={handleCreate}
                    style={{ height: 46, justifyContent: 'center' }}
                  />
                </View>
              </FadeUp>
            )}

            <MysticBar />

            {!!fetchError && (
              <View style={st.errorBanner}>
                <Text style={st.errorText}>{fetchError}</Text>
                <Pressable onPress={refresh} hitSlop={8}>
                  <Text style={st.errorRetry}>Try again</Text>
                </Pressable>
              </View>
            )}

            {loading && (
              <View style={st.loadRow}>
                <Dot delay={0} /><Dot delay={150} /><Dot delay={300} />
                <Text style={st.loadText}>Loading wishes…</Text>
              </View>
            )}

            {!loading && !fetchError && wishes.length === 0 && (
              <View style={st.emptyState}>
                <Text style={{ fontSize: 40 }}>✨</Text>
                <Text style={st.emptyText}>No wishes yet. Add your first daydream above.</Text>
              </View>
            )}

            {list.length > 0 && (
              <View style={[st.grid, { gap: GAP }]}>
                {list.map((w, i) => (
                  <WishCard
                    key={w.id}
                    wish={w}
                    index={i}
                    width={cardWidth}
                    isEditing={editingId === w.id}
                    editWish={editWish}
                    setEditWish={setEditWish}
                    updating={updating}
                    onStartEdit={startEditing}
                    onCancelEdit={cancelEditing}
                    onSubmitEdit={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}
          </FadeUp>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && <Toast key={toast.k} toast={toast} wide={wide} />}
    </SafeAreaView>
  );
}


const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.pageBg },
  scroll: { paddingTop: Platform.OS === 'android' ? 44 : 26, paddingBottom: 90 },

  toast: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 56, zIndex: 1000 },
  toastBox: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, ...shadow(4, 0.1, 16) },
  toastText: { fontFamily: F.monoMed, fontSize: 12.5 },

  secHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  secHeading: { fontFamily: F.syne, fontSize: 11.5, letterSpacing: 3, color: C.soft },
  secLine: { flex: 1, height: 1, backgroundColor: C.border },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, marginBottom: 34 },
  secTitle: { fontFamily: F.syneHeavy, color: C.dark, letterSpacing: -0.9, marginBottom: 8 },
  secDesc: { fontFamily: F.sans, fontSize: 15, lineHeight: 25, color: C.soft, maxWidth: 560 },

  panelBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20,
  },
  panelBtnSmall: { paddingVertical: 8, paddingHorizontal: 16 },
  panelBtnText: { fontFamily: F.syne, fontSize: 14 },
  input: {
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontFamily: F.sans, fontSize: 15, color: C.dark,
  },

  formBlock: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 16,
    backgroundColor: C.muted, borderWidth: 1.5, borderColor: C.border, borderRadius: 16,
    padding: 22, marginBottom: 28,
  },
  formGroup: { gap: 7 },
  formLabel: { fontFamily: F.syneHeavy, fontSize: 11, letterSpacing: 1, color: C.soft },

  mystic: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 20, marginBottom: 28,
    borderRadius: 10, borderWidth: 1, borderColor: C.mintBorder, overflow: 'hidden',
  },
  shimmerBand: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  mysticGlyph: { fontSize: 13, color: C.green },
  mysticText: {
    flexShrink: 1, fontFamily: F.mono, fontSize: 12.5, lineHeight: 20, letterSpacing: 0.3,
    textAlign: 'center', color: C.mintText, maxWidth: 620,
  },
  mysticEm: { fontFamily: F.monoMed, color: C.dark },

  errorBanner: {
    backgroundColor: C.dangerLt, borderWidth: 1, borderColor: C.dangerBorder, borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 18, marginBottom: 24, gap: 8,
  },
  errorText: { fontFamily: F.mono, fontSize: 12.5, lineHeight: 19, color: C.danger },
  errorRetry: { fontFamily: F.monoMed, fontSize: 12.5, color: C.danger, textDecorationLine: 'underline' },
  loadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 48 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  loadText: { fontFamily: F.mono, fontSize: 13, color: C.soft, marginLeft: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 12 },
  emptyText: { fontFamily: F.sans, fontSize: 15, color: C.soft, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wishCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingVertical: 19, paddingHorizontal: 22, minHeight: 74,
    ...shadow(3, 0.05, 10),
  },
  wishEmoji: { fontSize: 26 },
  wishText: {
    flex: 1, fontFamily: F.sansMed, fontSize: 15, lineHeight: 22, color: C.dark, paddingRight: 68,
  },
  cardControls: {
    position: 'absolute', right: 16, top: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  controlBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center',
  },
  controlBtnDanger: { backgroundColor: C.dangerLt, borderColor: C.dangerBorder },

  editRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  editEmoji: { width: 54, paddingHorizontal: 6, fontSize: 18 },
  editWish: { flex: 1, paddingHorizontal: 10 },
  editActions: { flexDirection: 'row', gap: 8 },
});