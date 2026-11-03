/**
 * Date-keeper — every important date, with daily / monthly / yearly / no
 * reminders that fire as notifications, fully offline.
 *
 * Extras: countdowns ("in 23 days"), milestone counts ("turns 24",
 * "5th anniversary"), category filters, search, reminder time-of-day.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
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
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  CATEGORIES,
  REPEATS,
  createDate,
  deleteDate,
  duplicateDate,
  setDateEnabled,
  updateDate,
  useDateKeeper,
} from '../datekeeper/store';
import { daysUntil, nextOccurrenceMs, ordinal, yearsAtNext } from '../datekeeper/scheduler';

const pad2 = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const catOf = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
const fmtClock = (h, m) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad2(m)} ${ap}`;
};
const fmtDay = (month, day) => `${MONTHS[month - 1]} ${day}`;

function headline(entry) {
  const d = daysUntil(entry);
  const n = yearsAtNext(entry);
  const mile = n !== null
    ? entry.category === 'anniversary'
      ? `${ordinal(n)} anniversary`
      : entry.category === 'birthday'
        ? `turns ${n}`
        : `${ordinal(n)} year`
    : null;
  if (d === 0) return mile ? `Today · ${mile} 🎉` : 'Today 🎉';
  if (d === 1) return mile ? `Tomorrow · ${mile}` : 'Tomorrow';
  return mile ? `in ${d} days · ${mile}` : `in ${d} days`;
}

const repeatLabel = (e) => {
  if (!e.enabled) return 'Off';
  if (e.repeat === 'none') return 'No reminder';
  return `${REPEATS.find((r) => r.key === e.repeat)?.label} · ${fmtClock(e.hour, e.minute)}`;
};

function toDate(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

const EMPTY_FORM = {
  title: '', note: '', month: new Date().getMonth() + 1, day: new Date().getDate(),
  year: '', category: 'birthday', repeat: 'yearly', hour: 9, minute: 0,
};

function TimeModal({ visible, value, onPick, onClose }) {
  if (!visible) return null;
  const handle = (event, selected) => {
    if (Platform.OS === 'android') {
      onClose();
      if (event?.type === 'dismissed') return;
    }
    if (selected) onPick(selected);
  };
  if (Platform.OS === 'android') return <DateTimePicker value={value} mode="time" onChange={handle} />;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close picker" />
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>Reminder time</Text>
          <DateTimePicker value={value} mode="time" display="spinner" onChange={handle} themeVariant="light" />
          <Pressable onPress={onClose} style={st.sheetDone}><Text style={st.sheetDoneText}>Done</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DayModal({ visible, month, day, onPick, onClose }) {
  const [m, setM] = useState(month);
  const [d, setD] = useState(day);
  useEffect(() => {
    if (visible) {
      setM(month);
      setD(day);
    }
  }, [visible, month, day]);
  if (!visible) return null;
  const daysIn = new Date(2024, m, 0).getDate();
  const list = Array.from({ length: daysIn }, (_, i) => i + 1);
  // Feb 29 lives on the leap-year calendar so it stays pickable.
  const feb29 = m === 2 && !list.includes(29);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close picker" />
        <View style={[st.sheet, { maxHeight: '80%' }]}>
          <Text style={st.sheetTitle}>Pick month & day</Text>
          <View style={st.monthRow}>
            {MONTHS.map((label, i) => (
              <Pressable key={label} onPress={() => setM(i + 1)} style={[st.mchip, m === i + 1 && st.mchipOn]}>
                <Text style={[st.mchipText, m === i + 1 && st.mchipTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView style={{ width: '100%', marginTop: 10 }} contentContainerStyle={st.dayGrid}>
            {list.map((n) => (
              <Pressable key={n} onPress={() => setD(n)} style={[st.day, d === n && st.kindActive]}>
                <Text style={[st.kindText, d === n && st.kindTextActive]}>{n}</Text>
              </Pressable>
            ))}
            {feb29 && (
              <Pressable onPress={() => setD(29)} style={[st.day, d === 29 && st.kindActive]}>
                <Text style={[st.kindText, d === 29 && st.kindTextActive]}>29*</Text>
              </Pressable>
            )}
          </ScrollView>
          {m === 2 && d === 29 && <Text style={st.leapNote}>*Feb 29 reminds on Feb 28 in non-leap years.</Text>}
          <Pressable
            onPress={() => { onPick(m, Math.min(d, m === 2 && d === 29 ? 29 : daysIn)); onClose(); }}
            style={st.sheetDone}
          >
            <Text style={st.sheetDoneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function DateKeeperScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const dates = useDateKeeper();

  const [catFilter, setCatFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showDay, setShowDay] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef([]);

  useEffect(() => () => {
    toastTimers.current.forEach(clearTimeout);
    toastTimers.current = [];
  }, []);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-3));
    toastTimers.current.push(setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dates
      .filter((e) => (catFilter === 'all' ? true : e.category === catFilter))
      .filter((e) => (!q ? true : (e.title || '').toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q)))
      .sort((a, b) => nextOccurrenceMs(a) - nextOccurrenceMs(b));
  }, [dates, catFilter, query]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setFormErr('');
    setEditor({ mode: 'new' });
  };
  const openEdit = (entry) => {
    setForm({
      title: entry.title, note: entry.note || '',
      month: entry.month, day: entry.day,
      year: entry.year ? String(entry.year) : '',
      category: entry.category, repeat: entry.repeat,
      hour: entry.hour, minute: entry.minute,
    });
    setFormErr('');
    setEditor({ mode: 'edit', entry });
  };

  const buildInput = () => ({
    title: form.title.trim(),
    note: form.note.trim(),
    month: form.month,
    day: form.day,
    year: form.year.trim() === '' ? null : Number(form.year.trim()),
    category: form.category,
    repeat: form.repeat,
    hour: form.hour,
    minute: form.minute,
  });

  const save = async () => {
    setSaving(true);
    setFormErr('');
    try {
      if (editor.mode === 'new') {
        await createDate(buildInput());
        toast('Date saved ✓');
      } else {
        await updateDate(editor.entry.id, buildInput());
        toast('Updated ✓');
      }
      setEditor(null);
    } catch (e) {
      setFormErr(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const removeOne = async (entry) => {
    try {
      await deleteDate(entry.id);
      setEditor(null);
      toast('Date removed');
    } catch (e) {
      setFormErr(e?.message || 'Could not delete.');
    }
  };

  const copyOne = async (entry) => {
    try {
      await duplicateDate(entry.id);
      setEditor(null);
      toast('Duplicated ✓');
    } catch (e) {
      setFormErr(e?.message || 'Could not duplicate.');
    }
  };

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[st.body, wide && st.bodyWide]}>
        <View style={st.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.kicker}>DATE KEEPER</Text>
            <Text style={st.title}>Important dates</Text>
          </View>
          <Pressable onPress={openNew} style={st.addBtn} accessibilityLabel="Add date">
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={st.searchWrap}>
          <Feather name="search" size={15} color="#a8a396" style={st.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search dates"
            placeholderTextColor="#a8a396"
            style={st.searchInput}
            autoCorrect={false}
            accessibilityLabel="Search dates"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} style={st.searchClear} accessibilityLabel="Clear search">
              <Feather name="x" size={14} color="#a8a396" />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chips} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          {[['all', 'All', 'calendar'], ...CATEGORIES.map((c) => [c.key, c.label, c.icon])].map(([key, label, icon]) => {
            const active = catFilter === key;
            return (
              <Pressable key={key} onPress={() => setCatFilter(key)} style={[st.chip, active && st.chipActive]}>
                <Feather name={icon} size={12} color={active ? '#fff' : '#7a7567'} />
                <Text style={[st.chipText, active && st.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 90 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} tintColor="#2d6a4f" onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} />}
        >
          {visible.length === 0 ? (
            <View style={st.empty}>
              <Feather name="calendar" size={26} color="#b0a898" style={{ marginBottom: 10 }} />
              <Text style={st.emptyTitle}>No dates yet</Text>
              <Text style={st.emptyDesc}>Birthdays, anniversaries, bills — keep them all here with reminders.</Text>
              <Pressable onPress={openNew} style={st.emptyBtn}>
                <Text style={st.emptyBtnText}>+ Add a date</Text>
              </Pressable>
            </View>
          ) : (
            visible.map((e) => {
              const cat = catOf(e.category);
              return (
                <Pressable key={e.id} onPress={() => openEdit(e)} style={({ pressed }) => [st.row, !e.enabled && st.rowOff, pressed && { opacity: 0.85 }]}>
                  <View style={st.dateBadge}>
                    <Text style={st.dateDay}>{e.day}</Text>
                    <Text style={st.dateMon}>{MONTHS[e.month - 1]}</Text>
                  </View>
                  <View style={st.meta}>
                    <Text style={[st.rowTitle, !e.enabled && st.dim]} numberOfLines={1}>{e.title}</Text>
                    <Text style={st.rowHead}>{headline(e)}</Text>
                    <View style={st.rowTags}>
                      <View style={st.tag}>
                        <Feather name={cat.icon} size={10} color="#7a7567" />
                        <Text style={st.tagText}>{cat.label}</Text>
                      </View>
                      <Text style={st.rowSub}>{repeatLabel(e)}{e.year ? ` · since ${e.year}` : ''}</Text>
                    </View>
                  </View>
                  <Switch
                    value={e.enabled}
                    onValueChange={(v) => setDateEnabled(e.id, v).catch((err) => toast(err?.message || 'Failed.', true))}
                    trackColor={{ true: '#2d6a4f' }}
                    accessibilityLabel={`Remind for ${e.title}`}
                  />
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View pointerEvents="none" style={st.toastWrap}>
          {toasts.map((t) => (
            <View key={t.id} style={[st.toast, t.err && st.toastErr]}>
              <Feather name={t.err ? 'x' : 'check'} size={13} color={t.err ? '#c0392b' : '#2d6a4f'} />
              <Text style={st.toastText}>{t.msg}</Text>
            </View>
          ))}
        </View>
      </View>

      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => !saving && setEditor(null)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !saving && setEditor(null)} accessibilityLabel="Close editor" />
          <View style={st.modal}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={st.modalTitle}>{editor?.mode === 'new' ? 'New date' : 'Edit date'}</Text>

              <Text style={st.flabel}>TITLE</Text>
              <TextInput
                value={form.title}
                onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
                placeholder="e.g. Mom's birthday"
                placeholderTextColor="#b0a898"
                style={st.input}
                maxLength={80}
                accessibilityLabel="Date title"
              />

              <Text style={st.flabel}>DATE</Text>
              <Pressable onPress={() => setShowDay(true)} style={st.input} accessibilityLabel="Pick month and day">
                <Text style={st.inputText}>{fmtDay(form.month, form.day)}</Text>
              </Pressable>

              <Text style={st.flabel}>YEAR (OPTIONAL — FOR AGE / ANNIVERSARY COUNT)</Text>
              <TextInput
                value={form.year}
                onChangeText={(v) => setForm((p) => ({ ...p, year: v.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="e.g. 1990"
                placeholderTextColor="#b0a898"
                style={st.input}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="Year, optional"
              />

              <Text style={st.flabel}>CATEGORY</Text>
              <View style={st.kindRow}>
                {CATEGORIES.map((c) => {
                  const active = form.category === c.key;
                  return (
                    <Pressable key={c.key} onPress={() => setForm((p) => ({ ...p, category: c.key }))} style={[st.kind, active && st.kindActive]}>
                      <Feather name={c.icon} size={12} color={active ? '#2d6a4f' : '#7a7567'} />
                      <Text style={[st.kindText, active && st.kindTextActive]}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={st.flabel}>REMINDER</Text>
              <View style={st.kindRow}>
                {REPEATS.map((r) => {
                  const active = form.repeat === r.key;
                  return (
                    <Pressable key={r.key} onPress={() => setForm((p) => ({ ...p, repeat: r.key }))} style={[st.kind, active && st.kindActive]}>
                      <Text style={[st.kindText, active && st.kindTextActive]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {form.repeat !== 'none' && (
                <>
                  <Text style={st.flabel}>REMINDER TIME</Text>
                  <Pressable onPress={() => setShowTime(true)} style={st.input} accessibilityLabel="Pick reminder time">
                    <Text style={st.inputText}>{fmtClock(form.hour, form.minute)}</Text>
                  </Pressable>
                </>
              )}

              <Text style={st.flabel}>NOTE (OPTIONAL)</Text>
              <TextInput
                value={form.note}
                onChangeText={(v) => setForm((p) => ({ ...p, note: v }))}
                placeholder="Anything to remember with it"
                placeholderTextColor="#b0a898"
                style={[st.input, { minHeight: 64, textAlignVertical: 'top' }]}
                multiline
                maxLength={280}
                accessibilityLabel="Note"
              />

              {!!formErr && (
                <View style={st.errBox}>
                  <Text style={st.errText}>{formErr}</Text>
                </View>
              )}

              <View style={st.modalActions}>
                {editor?.mode === 'edit' && (
                  <>
                    <Pressable onPress={() => removeOne(editor.entry)} disabled={saving} style={[st.btn, st.btnDanger]}>
                      <Text style={[st.btnText, { color: '#fff' }]}>Delete</Text>
                    </Pressable>
                    <Pressable onPress={() => copyOne(editor.entry)} disabled={saving} style={[st.btn, st.btnGhost]}>
                      <Text style={[st.btnText, { color: '#1a1a2e' }]}>Duplicate</Text>
                    </Pressable>
                  </>
                )}
                <Pressable onPress={save} disabled={saving} style={[st.btn, st.btnDark, saving && { opacity: 0.6 }]}>
                  <Text style={[st.btnText, { color: '#fff' }]}>{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TimeModal
        visible={showTime}
        value={toDate(form.hour, form.minute)}
        onClose={() => setShowTime(false)}
        onPick={(d) => setForm((p) => ({ ...p, hour: d.getHours(), minute: d.getMinutes() }))}
      />
      <DayModal
        visible={showDay}
        month={form.month}
        day={form.day}
        onClose={() => setShowDay(false)}
        onPick={(m, d) => setForm((p) => ({ ...p, month: m, day: d }))}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f5f0' },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 26 },
  bodyWide: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: '#7a7567', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  addBtn: { backgroundColor: '#2d6a4f', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { marginBottom: 10, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d6', borderRadius: 10,
    paddingVertical: 10, paddingLeft: 36, paddingRight: 34, fontSize: 14.5, color: '#1a1a2e',
  },
  searchClear: { position: 'absolute', right: 10, padding: 4 },
  chips: { marginBottom: 12, flexGrow: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: '#e4e0d6', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#7a7567' },
  chipTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#7a7567', marginBottom: 4 },
  emptyDesc: { fontSize: 13.5, color: '#a8a396', textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#2d6a4f', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e4e0d6',
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  rowOff: { opacity: 0.62 },
  dateBadge: {
    width: 56, alignItems: 'center', backgroundColor: '#f2f8f4',
    borderRadius: 12, paddingVertical: 8,
  },
  dateDay: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  dateMon: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#2d6a4f', textTransform: 'uppercase' },
  dim: { color: '#a8a396' },
  meta: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  rowHead: { fontSize: 13.5, fontWeight: '800', color: '#2d6a4f', marginTop: 1 },
  rowTags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eceae3', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700', color: '#7a7567' },
  rowSub: { fontSize: 11.5, color: '#a8a396' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center', gap: 8 },
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
  modal: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 400, maxHeight: '92%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  flabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#7a7567', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f6f5f0', borderWidth: 1.5, borderColor: '#e4e0d6',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  inputText: { fontSize: 15, color: '#1a1a2e', fontWeight: '600' },
  kindRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kind: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e4e0d6',
  },
  kindActive: { borderColor: '#2d6a4f', backgroundColor: '#e4f1ea' },
  kindText: { fontSize: 13, fontWeight: '700', color: '#7a7567' },
  kindTextActive: { color: '#2d6a4f' },
  day: { width: 44, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: '#e4e0d6', alignItems: 'center', justifyContent: 'center' },
  errBox: { backgroundColor: '#fdecea', borderRadius: 10, padding: 10, marginTop: 14 },
  errText: { fontSize: 13, color: '#c0392b' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 4 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 13 },
  btnDark: { backgroundColor: '#1a1a2e' },
  btnGhost: { backgroundColor: '#eceae3' },
  btnDanger: { backgroundColor: '#c0392b' },
  btnText: { fontSize: 14.5, fontWeight: '800' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.30)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, alignItems: 'center' },
  sheetTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  sheetDone: { backgroundColor: '#2d6a4f', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 11, marginTop: 8 },
  sheetDoneText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  mchip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, borderWidth: 1.5, borderColor: '#e4e0d6' },
  mchipOn: { borderColor: '#2d6a4f', backgroundColor: '#e4f1ea' },
  mchipText: { fontSize: 12.5, fontWeight: '700', color: '#7a7567' },
  mchipTextOn: { color: '#2d6a4f' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingBottom: 6 },
  leapNote: { fontSize: 12, color: '#7a7567', marginTop: 4 },
});
