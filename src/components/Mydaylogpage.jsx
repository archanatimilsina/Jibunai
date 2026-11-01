import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Modal, Image, Animated, Alert,
  StyleSheet, useWindowDimensions, Platform, StatusBar, SafeAreaView,
  KeyboardAvoidingView, RefreshControl, ActivityIndicator, Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_800ExtraBold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';


import useCachedResource from '../hooks/useCachedResource';
import { apiSend, apiUpload } from '../api/http';
import { fetchResource, TTL } from '../api/resources';

const T = {
  pageBg: '#f5f0e8',
  ink: '#1a1a2e',
  inkWarm: '#1a1410',
  muted: '#7a7567',
  border: '#d8d4cc',
  cream: '#f6f5f0',
  warm: '#eceae3',
  tape: 'rgba(212,175,55,0.22)',
  tapeBorder: 'rgba(180,160,110,0.18)',
  green: '#2d6a4f',
  red: '#c0392b',
  amber: '#d4af37',
  stamp: '#a8957e',
  placeholder: '#c4b89a',
};

const F = {
  serif: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_700Bold_Italic',
  serifHeavy: 'PlayfairDisplay_800ExtraBold',
  sans: 'DMSans_400Regular',
  sansMed: 'DMSans_500Medium',
  sansSemi: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  mono: 'DMMono_400Regular',
  monoMed: 'DMMono_500Medium',
};

const MOODS = ['Happy', 'Fine', 'Neutral', 'Sad', 'Worse', 'Tired', 'Wooow'];

const MOOD_PALETTE = {
  Happy: { bg: '#d1f0e0', fg: '#1a5c36' },
  Fine: { bg: '#fde9cc', fg: '#7a4010' },
  Neutral: { bg: '#e8e2d8', fg: '#5a4f40' },
  Sad: { bg: '#d5e8f7', fg: '#1e3f6a' },
  Worse: { bg: '#fce8e8', fg: '#8b1a1a' },
  Tired: { bg: '#eaedf2', fg: '#374050' },
  Wooow: { bg: '#efe4fb', fg: '#5b2fa0' },
};

const shadow = (h = 4, o = 0.08, r = 12) => Platform.select({
  ios: { shadowColor: '#1a1410', shadowOffset: { width: 0, height: h }, shadowOpacity: o, shadowRadius: r },
  android: { elevation: Math.max(1, Math.round(h * 0.9)) },
  default: {},
});


const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISODate(new Date());
const fromISODate = (s) => {
  const [y, m, d] = (s || todayISO()).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const EMPTY_FORM = { title: '', date: todayISO(), mood: 'Neutral', remote_url: '', source: 'remote' };

const fmtDate = (str) =>
  new Date(`${str}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

const idNumber = (id) => (typeof id === 'number'
  ? id
  : String(id).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7));
const tiltFor = (id) => (((idNumber(id) * 7919) % 100) / 100 - 0.5) * 7;


function FadeUp({ children, delay = 0, distance = 20, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [a, delay]);
  return (
    <Animated.View
      style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

function LoadDot({ delay }) {
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
  return <Animated.View style={[st.loadDot, { transform: [{ translateY: y }] }]} />;
}

function Toast({ toast, wide }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [toast, a]);
  const err = toast.type === 'error';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.toast,
        wide ? { right: 24 } : { left: 16, right: 16, alignItems: 'center' },
        { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] },
      ]}
    >
      <View style={[st.toastBox, { backgroundColor: err ? '#3b0d0a' : '#0d2b1e', borderColor: err ? '#7f1d1d' : '#14532d' }]}>
        <Text style={[st.toastText, { color: err ? '#f87171' : '#4ade80' }]}>{toast.msg}</Text>
      </View>
    </Animated.View>
  );
}

function OBtn({ label, color, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [st.obtn, pressed && { transform: [{ scale: 1.06 }] }]}
    >
      <Text style={[st.obtnText, { color }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}


function PolaroidCard({ entry, index, active, onToggle, onEdit, onDelete }) {
  const tilt = useMemo(() => tiltFor(entry.id), [entry.id]);
  const tapeLeft = idNumber(entry.id) % 2 === 0;
  const mood = MOOD_PALETTE[entry.mood] || MOOD_PALETTE.Neutral;
  const [aspect, setAspect] = useState(4 / 3);

  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(t, { toValue: active ? 1 : 0, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [active, t]);

  return (
    <FadeUp delay={Math.min(index, 10) * 40} style={st.cardWrap}>
      <Animated.View
        style={{
          zIndex: active ? 10 : 1,
          transform: [
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, '0deg'] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
          ],
        }}
      >
        <Pressable onPress={() => onToggle(entry.id)} accessibilityRole="button" accessibilityLabel={`${entry.title}. Tap for actions.`}>
          <View style={[st.polaroid, active && st.polaroidActive]}>
            <View style={[st.tape, tapeLeft ? st.tapeLeft : st.tapeRight]} />

            {entry.url ? (
              <View style={st.photoArea}>
                <Image
                  source={{ uri: entry.url }}
                  style={[st.photo, { aspectRatio: aspect }]}
                  resizeMode="cover"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source || {};
                    if (width && height) setAspect(Math.min(Math.max(width / height, 0.6), 1.8));
                  }}
                />
                {active && (
                  <View style={st.photoOverlay}>
                    <OBtn label="Edit" color={T.green} onPress={() => onEdit(entry)} />
                    <OBtn label="Delete" color={T.red} onPress={() => onDelete(entry)} />
                  </View>
                )}
              </View>
            ) : (
              <View style={st.noPhoto}>
                <View style={st.noPhotoActions}>
                  <OBtn label="Edit" color={T.green} onPress={() => onEdit(entry)} />
                  <OBtn label="Delete" color={T.red} onPress={() => onDelete(entry)} />
                </View>
              </View>
            )}

            <View style={st.cardFoot}>
              <Text style={st.dateStamp}>{fmtDate(entry.date)}</Text>
              <View style={[st.moodTag, { backgroundColor: mood.bg }]}>
                <Text style={[st.moodTagText, { color: mood.fg }]}>{(entry.mood || '').toUpperCase()}</Text>
              </View>
              <Text style={st.cardTitle}>{entry.title}</Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </FadeUp>
  );
}


function EntryModal({
  visible, wide, isEditing, formData, setFormData, pickedFile, onPick, submitting, onClose, onSubmit,
}) {
  const [showDate, setShowDate] = useState(false);
  useEffect(() => { if (!visible) setShowDate(false); }, [visible]);

  const previewSrc = pickedFile?.uri || formData.remote_url;
  const canSubmit = !!formData.title.trim() && !!formData.date && !submitting;

  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (event?.type === 'dismissed') return;
    if (selected) setFormData((p) => ({ ...p, date: toISODate(selected) }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={wide ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[st.overlay, !wide && { justifyContent: 'flex-end', padding: 0 }]} onPress={onClose}>
          <Pressable
            onPress={() => {}}
            style={[st.modal, wide ? st.modalWide : st.modalSheet]}
            accessibilityViewIsModal
          >
            {!wide && <View style={st.sheetGrab} />}
            <Pressable onPress={onClose} hitSlop={10} style={st.modalClose} accessibilityLabel="Close">
              <Text style={st.modalCloseText}>×</Text>
            </Pressable>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[st.modalContent, !wide && { paddingBottom: 36 }]}
            >
              <Text style={st.modalTitle}>{isEditing ? 'Edit Day Stamp' : 'How was your day?'}</Text>

              {}
              <View style={st.field}>
                <Text style={st.fLabel}>TITLE *</Text>
                <TextInput
                  value={formData.title}
                  onChangeText={(v) => setFormData((p) => ({ ...p, title: v }))}
                  placeholder="What defined this day?"
                  placeholderTextColor={T.placeholder}
                  style={st.fInput}
                  returnKeyType="done"
                  accessibilityLabel="Title"
                />
              </View>

              {}
              <View style={st.field}>
                <Text style={st.fLabel}>DATE *</Text>
                <Pressable
                  onPress={() => setShowDate((s) => !s)}
                  style={[st.fInput, st.dateBtn, showDate && { borderColor: T.ink }]}
                  accessibilityRole="button"
                  accessibilityLabel="Choose date"
                >
                  <Text style={st.dateBtnText}>{fmtDate(formData.date)}</Text>
                  <Text style={{ color: T.muted, fontSize: 15 }}>▾</Text>
                </Pressable>
                {showDate && (
                  <View style={st.datePickerWrap}>
                    <DateTimePicker
                      value={fromISODate(formData.date)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={onDateChange}
                      accentColor={T.green}
                      themeVariant="light"
                    />
                  </View>
                )}
              </View>

              {}
              <View style={st.field}>
                <Text style={st.fLabel}>MOOD</Text>
                <View style={st.moodRow}>
                  {MOODS.map((m) => {
                    const sel = formData.mood === m;
                    const pal = MOOD_PALETTE[m];
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setFormData((p) => ({ ...p, mood: m }))}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: sel }}
                        style={[
                          st.moodChip,
                          sel && { backgroundColor: pal.bg, borderColor: pal.fg },
                        ]}
                      >
                        <Text style={[st.moodChipText, sel && { color: pal.fg, fontFamily: F.sansBold }]}>{m}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {}
              <View style={st.field}>
                <Text style={st.fLabel}>IMAGE</Text>
                <View style={st.uploadRow}>
                  <Pressable
                    onPress={onPick}
                    accessibilityRole="button"
                    style={({ pressed }) => [st.uploadBtn, pressed && { backgroundColor: T.warm, borderColor: T.muted }]}
                  >
                    <Text style={st.uploadBtnText}>{pickedFile ? '↺ Replace File' : '↑ Upload File'}</Text>
                  </Pressable>
                  {!!pickedFile && (
                    <Text style={st.fileStatus} numberOfLines={1}>✓ {pickedFile.fileName || 'photo'}</Text>
                  )}
                </View>
              </View>

              {!!previewSrc && (
                <View style={st.previewBox}>
                  <Image source={{ uri: previewSrc }} style={st.previewImg} resizeMode="cover" />
                </View>
              )}

              {}
              <View style={st.modalActions}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [st.mCancel, pressed && { backgroundColor: T.warm }]}
                >
                  <Text style={st.mCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={onSubmit}
                  disabled={!canSubmit}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    st.mSubmit,
                    { backgroundColor: isEditing ? T.ink : T.green },
                    !canSubmit && { opacity: 0.45 },
                    pressed && canSubmit && { opacity: 0.88 },
                  ]}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={st.mSubmitText}>{isEditing ? 'Save Changes' : 'Record My Day'}</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}


export default function MyDayLogPage() {
  const [fontsLoaded] = useFonts({
    [F.serif]: PlayfairDisplay_700Bold,
    [F.serifItalic]: PlayfairDisplay_700Bold_Italic,
    [F.serifHeavy]: PlayfairDisplay_800ExtraBold,
    [F.sans]: DMSans_400Regular,
    [F.sansMed]: DMSans_500Medium,
    [F.sansSemi]: DMSans_600SemiBold,
    [F.sansBold]: DMSans_700Bold,
    [F.mono]: DMMono_400Regular,
    [F.monoMed]: DMMono_500Medium,
  });

  const { width } = useWindowDimensions();
  const cols = width >= 1024 ? 3 : width >= 600 ? 2 : 1;
  const gap = cols === 1 ? 0 : 24;
  const sidePad = width >= 600 ? 32 : 18;
  const contentWidth = Math.min(width, 1320) - sidePad * 2;
  const wideModal = width >= 700;
  const heroSize = width >= 1024 ? 84 : width >= 600 ? 66 : 46;

  const {
    data: entries,
    loading,
    refreshing,
    errorText: fetchError,
    refresh,
    mutate,
  } = useCachedResource('daylogs', () => fetchResource('daylogs'), {
    ttl: TTL.EDITABLE,
    initial: [],
    errorMessage: 'Cannot reach backend. Check that the Django server is running.',
  });
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pickedFile, setPickedFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, k: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const openAdd = () => {
    setFormData({ ...EMPTY_FORM, date: todayISO() });
    setPickedFile(null);
    setIsEditing(false);
    setCurrentId(null);
    setActiveId(null);
    setIsModalOpen(true);
  };

  const openEdit = (entry) => {
    setFormData({
      title: entry.title,
      date: entry.date,
      mood: entry.mood,
      remote_url: entry.url || '',
      source: entry.source || 'remote',
    });
    setPickedFile(null);
    setIsEditing(true);
    setCurrentId(entry.id);
    setActiveId(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setPickedFile(null);
  }, []);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.status !== 'limited' && Platform.OS === 'ios') {
        showToast('Allow photo access in Settings to pick an image.', 'error');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });
      if (res.canceled || !res.assets?.length) return;
      setPickedFile(res.assets[0]);
      setFormData((p) => ({ ...p, source: 'local', remote_url: '' }));
    } catch {
      showToast("Couldn't open your photos.", 'error');
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.date) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append('title', formData.title.trim());
    fd.append('date', formData.date);
    fd.append('mood', formData.mood);

    if (pickedFile) {
      const name = pickedFile.fileName || `day-${Date.now()}.jpg`;
      fd.append('file', {
        uri: pickedFile.uri,
        name,
        type: pickedFile.mimeType || 'image/jpeg',
      });
      fd.append('source', 'local');
    } else {
      fd.append('source', 'remote');
      fd.append('remote_url', formData.remote_url || '');
    }

    const url = isEditing ? `/daylogs/${currentId}/` : '/daylogs/';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const saved = await apiUpload(url, fd, { method });
      if (isEditing) {
        mutate((p) => (p || []).map((e) => (e.id === saved.id ? saved : e)));
      } else {
        mutate((p) => [saved, ...(p || [])]);
      }
      closeModal();
      showToast(isEditing ? 'Day updated.' : 'Day logged.');
    } catch (err) {
      showToast(err.message || 'Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const performDelete = async (entry) => {
    try {
      await apiSend(`/daylogs/${entry.id}/`, 'DELETE');
      mutate((p) => (p || []).filter((e) => e.id !== entry.id));
      setActiveId(null);
      showToast('Memory removed.');
    } catch (err) {
      showToast(err.message || 'Delete failed.', 'error');
    }
  };

  const handleDelete = (entry) => {
    Alert.alert('Remove this memory?', 'This will remove it permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => performDelete(entry) },
    ]);
  };

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [entries],
  );

  const columns = useMemo(() => {
    const out = Array.from({ length: cols }, () => []);
    sorted.forEach((e, i) => out[i % cols].push({ entry: e, index: i }));
    return out;
  }, [sorted, cols]);

  const toggleActive = useCallback((id) => setActiveId((cur) => (cur === id ? null : id)), []);

  if (!fontsLoaded) {
    return (
      <View style={[st.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={T.green} />
      </View>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.pageBg} />

      {}
      <View pointerEvents="none" style={st.glowA} />
      <View pointerEvents="none" style={st.glowB} />

      <ScrollView
        contentContainerStyle={[st.scroll, { paddingHorizontal: sidePad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            tintColor={T.green}
            colors={[T.green]}
            onRefresh={refresh}
          />
        )}
      >
        <FadeUp style={{ width: contentWidth, alignSelf: 'center' }}>
          {}
          <View style={st.hero}>
            <View style={st.eyebrowRow}>
              <View style={st.eyebrowLine} />
              <Text style={st.eyebrow}>DAILY CHRONICLE</Text>
              <View style={st.eyebrowLine} />
            </View>

            <View style={st.titleRow}>
              <Text style={[st.heroTitle, { fontSize: heroSize, lineHeight: heroSize * 1.08 }]}>My </Text>
              <View>
                <Text style={[st.heroTitle, st.heroTitleEm, { fontSize: heroSize, lineHeight: heroSize * 1.08 }]}>Day Log</Text>
                <View style={[st.heroUnderline, { height: Math.max(6, heroSize * 0.12), bottom: heroSize * 0.1 }]} />
              </View>
            </View>

            <Text style={[st.heroSub, { fontSize: width >= 600 ? 16.5 : 15 }]}>
              Recording my days before my goldfish brain deletes it
            </Text>

            <Pressable
              onPress={openAdd}
              accessibilityRole="button"
              style={({ pressed }) => [st.addBtn, pressed && { transform: [{ translateY: -2 }], opacity: 0.95 }]}
            >
              <Text style={st.addPlus}>+</Text>
              <Text style={st.addBtnText}>Log New Day</Text>
            </Pressable>
          </View>

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
              <LoadDot delay={0} /><LoadDot delay={150} /><LoadDot delay={300} />
              <Text style={st.loadText}>Developing memories…</Text>
            </View>
          )}

          {!loading && !fetchError && entries.length === 0 && (
            <Pressable onPress={openAdd} style={({ pressed }) => [st.emptyFrame, pressed && { borderColor: T.green }]}>
              <Text style={st.emptyTitle}>Your archive is empty.</Text>
              <Text style={st.emptyHint}>Tap to log your first day memory.</Text>
            </Pressable>
          )}

          {sorted.length > 0 && (
            <View style={[st.masonry, { gap }]}>
              {columns.map((col, ci) => (
                <View key={ci} style={st.masonryCol}>
                  {col.map(({ entry, index }) => (
                    <PolaroidCard
                      key={entry.id}
                      entry={entry}
                      index={index}
                      active={activeId === entry.id}
                      onToggle={toggleActive}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </FadeUp>
      </ScrollView>

      <EntryModal
        visible={isModalOpen}
        wide={wideModal}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        pickedFile={pickedFile}
        onPick={pickImage}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {toast && <Toast key={toast.k} toast={toast} wide={width >= 700} />}
    </SafeAreaView>
  );
}


const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.pageBg },
  scroll: {
    paddingTop: Platform.OS === 'android' ? 40 : 28,
    paddingBottom: 120,
  },
  glowA: {
    position: 'absolute', top: -80, left: -120, width: 420, height: 420, borderRadius: 210,
    backgroundColor: 'rgba(180,160,120,0.08)',
  },
  glowB: {
    position: 'absolute', top: 40, right: -140, width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(180,160,120,0.06)',
  },

  toast: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 56, zIndex: 2000 },
  toastBox: {
    paddingVertical: 11, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1,
    ...shadow(8, 0.18, 24),
  },
  toastText: { fontFamily: F.monoMed, fontSize: 12.5 },

  hero: { alignItems: 'center', marginBottom: 56 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  eyebrowLine: { width: 44, height: 1, backgroundColor: T.border },
  eyebrow: { fontFamily: F.mono, fontSize: 11.5, letterSpacing: 3.4, color: T.muted },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 18 },
  heroTitle: { fontFamily: F.serifHeavy, color: T.ink, letterSpacing: -1.5 },
  heroTitleEm: { fontFamily: F.serifItalic, color: T.green },
  heroUnderline: {
    position: 'absolute', left: 0, right: 0, backgroundColor: T.green, opacity: 0.1, borderRadius: 2,
  },
  heroSub: {
    fontFamily: F.sans, color: T.muted, textAlign: 'center', lineHeight: 27,
    maxWidth: 520, marginBottom: 30,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.ink, borderRadius: 50, paddingVertical: 15, paddingHorizontal: 30,
    ...shadow(8, 0.22, 24),
  },
  addPlus: { color: '#fff', fontSize: 24, fontFamily: F.sans, lineHeight: 26, marginTop: -2 },
  addBtnText: { color: '#fff', fontSize: 16, fontFamily: F.sansSemi },

  errorBanner: {
    backgroundColor: '#fdf0ee', borderWidth: 1, borderColor: '#e8b4af', borderRadius: 8,
    paddingVertical: 14, paddingHorizontal: 18, marginBottom: 28, gap: 8,
  },
  errorText: { fontFamily: F.mono, fontSize: 12.5, lineHeight: 19, color: T.red },
  errorRetry: { fontFamily: F.monoMed, fontSize: 12.5, color: T.red, textDecorationLine: 'underline' },
  loadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 56 },
  loadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.green },
  loadText: { fontFamily: F.mono, fontSize: 13, color: T.muted, marginLeft: 6 },
  emptyFrame: {
    backgroundColor: T.cream, borderWidth: 1.5, borderColor: T.border, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 80, paddingHorizontal: 24, alignItems: 'center',
  },
  emptyTitle: { fontFamily: F.serif, fontSize: 26, color: T.muted, marginBottom: 6, textAlign: 'center' },
  emptyHint: { fontFamily: F.sans, fontSize: 15, color: T.muted, opacity: 0.7, textAlign: 'center' },

  masonry: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 12 },
  masonryCol: { flex: 1, minWidth: 0 },
  cardWrap: { marginBottom: 34, paddingHorizontal: 4 },

  polaroid: {
    backgroundColor: T.cream, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 22,
    borderRadius: 2, borderWidth: 1, borderColor: T.border,
    ...shadow(3, 0.08, 10),
  },
  polaroidActive: { ...shadow(16, 0.2, 34) },
  tape: {
    position: 'absolute', top: -8, width: 58, height: 19, zIndex: 5,
    backgroundColor: T.tape, borderWidth: 1, borderColor: T.tapeBorder,
  },
  tapeLeft: { left: 14, transform: [{ rotate: '-12deg' }] },
  tapeRight: { right: 14, transform: [{ rotate: '10deg' }] },
  photoArea: { position: 'relative', overflow: 'hidden', borderRadius: 1, backgroundColor: T.warm, marginBottom: 14 },
  photo: { width: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,20,16,0.5)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 3,
  },
  noPhoto: {
    backgroundColor: T.warm, borderWidth: 1, borderColor: T.border, borderStyle: 'dashed',
    borderRadius: 1, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  noPhotoActions: { flexDirection: 'row', gap: 12 },
  obtn: {
    backgroundColor: T.cream, borderRadius: 50, paddingVertical: 8, paddingHorizontal: 16,
    ...shadow(2, 0.12, 4),
  },
  obtnText: { fontFamily: F.sansBold, fontSize: 11.5, letterSpacing: 1 },
  cardFoot: { gap: 5 },
  dateStamp: { fontFamily: F.mono, fontSize: 11, color: T.stamp },
  moodTag: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 9, borderRadius: 3 },
  moodTagText: { fontFamily: F.monoMed, fontSize: 10.5, letterSpacing: 1.1 },
  cardTitle: { fontFamily: F.serif, fontSize: 17, lineHeight: 24, color: T.ink },

  overlay: {
    flex: 1, backgroundColor: 'rgba(26,20,16,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: { backgroundColor: T.cream, overflow: 'hidden' },
  modalWide: {
    width: '100%', maxWidth: 540, maxHeight: '90%', borderRadius: 14, ...shadow(24, 0.25, 60),
  },
  modalSheet: {
    width: '100%', maxHeight: '92%', borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  sheetGrab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, marginTop: 10 },
  modalClose: { position: 'absolute', top: 10, right: 18, zIndex: 20, padding: 4 },
  modalCloseText: { fontSize: 32, color: T.muted, lineHeight: 34, fontFamily: F.sans },
  modalContent: { padding: 26, paddingTop: 30, gap: 22 },
  modalTitle: {
    fontFamily: F.serif, fontSize: 26, color: T.ink, letterSpacing: -0.6,
    textAlign: 'center', marginBottom: 6,
  },

  field: { gap: 8 },
  fLabel: { fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.6, color: T.muted },
  fInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontFamily: F.sans, fontSize: 15.5, color: T.ink,
  },
  dateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtnText: { fontFamily: F.sans, fontSize: 15, color: T.ink, flexShrink: 1 },
  datePickerWrap: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 8,
    marginTop: 4, paddingVertical: 4, alignItems: 'center', overflow: 'hidden',
  },

  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 50,
    borderWidth: 1, borderColor: T.border, backgroundColor: '#fff',
  },
  moodChipText: { fontFamily: F.sansMed, fontSize: 13.5, color: T.muted },

  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  uploadBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 8,
    paddingVertical: 11, paddingHorizontal: 18,
  },
  uploadBtnText: { fontFamily: F.sansSemi, fontSize: 14, color: T.ink },
  fileStatus: { flexShrink: 1, fontFamily: F.monoMed, fontSize: 12, color: T.green },

  previewBox: { marginTop: -4 },
  previewImg: {
    width: 110, aspectRatio: 4 / 3, borderRadius: 6, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.warm,
  },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  mCancel: {
    borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 22,
  },
  mCancelText: { fontFamily: F.sansMed, fontSize: 15, color: T.muted },
  mSubmit: {
    borderRadius: 8, paddingVertical: 13, paddingHorizontal: 26, minWidth: 140,
    alignItems: 'center', justifyContent: 'center',
  },
  mSubmitText: { fontFamily: F.sansBold, fontSize: 15, color: '#fff' },
});