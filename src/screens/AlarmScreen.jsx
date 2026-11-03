/**
 * Alarm system — like the system alarm, but more flexible.
 *
 * - Alarms tab: once / daily / weekly alarms with per-alarm on/off.
 * - Remind me tab: exact date+time one-shot reminders (the meeting use-case).
 * - Bulk group select: pick many, turn on/off or delete them together.
 *
 * Everything is OS-scheduled, so it all fires fully offline — even with the
 * app closed or the device rebooted (re-registered at startup).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
  createAlarm,
  deleteAlarm,
  deleteAlarms,
  duplicateAlarm,
  setAlarmEnabled,
  setAlarmsEnabled,
  updateAlarm,
  useAlarms,
} from '../alarms/store';
import { nextFireMs } from '../alarms/scheduler';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS = [
  { key: 'once', label: 'Only once' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
];

const pad2 = (n) => String(n).padStart(2, '0');
const fmtClock = (h, m) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad2(m)} ${ap}`;
};
const fmtDateLong = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function describeNext(alarm) {
  if (!alarm.enabled) return 'Off';
  const t = nextFireMs(alarm);
  if (t === null) return 'Fired';
  const d = new Date(t);
  const now = new Date();
  const mins = Math.max(1, Math.round((t - Date.now()) / 60000));
  const rel = mins < 60 ? `in ${mins}m` : mins < 60 * 24 ? `in ${Math.round(mins / 60)}h` : null;
  if (sameDay(d, now)) return rel ? `${rel} · today` : 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(d, tomorrow)) return 'Tomorrow';
  if (t - Date.now() < 7 * 86400000) return WEEKDAYS[d.getDay()];
  return fmtDateLong(d.toISOString());
}

const kindLabel = (a) => {
  if (a.kind === 'daily') return 'Daily';
  if (a.kind === 'weekly') return `Every ${WEEKDAYS[a.weekday ?? 0]}`;
  return fmtDateLong(a.date);
};

function toDate(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function mergeDateTime(dateISO, hour, minute) {
  const [y, m, dd] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, dd, hour, minute, 0, 0).toISOString();
}

const EMPTY_FORM = { title: '', kind: 'daily', hour: 8, minute: 0, dateISO: toISODate(new Date()), weekday: 1 };

function PickerModal({ visible, mode, value, onPick, onClose, title }) {
  if (!visible) return null;
  const handle = (event, selected) => {
    if (Platform.OS === 'android') {
      onClose();
      if (event?.type === 'dismissed') return;
    }
    if (selected) onPick(selected);
  };
  if (Platform.OS === 'android') {
    return <DateTimePicker value={value} mode={mode} onChange={handle} />;
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close picker" />
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>{title}</Text>
          <DateTimePicker value={value} mode={mode} display={mode === 'time' ? 'spinner' : 'inline'} onChange={handle} themeVariant="light" />
          <Pressable onPress={onClose} style={st.sheetDone} accessibilityRole="button">
            <Text style={st.sheetDoneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function AlarmScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const alarms = useAlarms();

  const [tab, setTab] = useState('alarm'); // 'alarm' | 'remindme'
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [editor, setEditor] = useState(null); // null | { mode:'new' } | { mode:'edit', alarm }
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showDate, setShowDate] = useState(false);
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

  const visible = useMemo(
    () => alarms
      .filter((a) => (tab === 'alarm' ? a.collection !== 'remindme' : a.collection === 'remindme'))
      .sort((a, b) => {
        const na = nextFireMs(a) ?? Infinity;
        const nb = nextFireMs(b) ?? Infinity;
        return na - nb;
      }),
    [alarms, tab],
  );

  // Leaving selection mode clears the checkmarks; switching tabs too.
  useEffect(() => {
    if (!selecting) setSelected(new Set());
  }, [selecting]);
  useEffect(() => {
    setSelecting(false);
    setSelected(new Set());
  }, [tab]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openNew = () => {
    setForm({ ...EMPTY_FORM, kind: tab === 'remindme' ? 'once' : 'daily', title: '' });
    setFormErr('');
    setEditor({ mode: 'new' });
  };
  const openEdit = (alarm) => {
    setForm({
      title: alarm.title,
      kind: alarm.kind,
      hour: alarm.hour,
      minute: alarm.minute,
      dateISO: alarm.date ? toISODate(new Date(alarm.date)) : toISODate(new Date()),
      weekday: alarm.weekday ?? 1,
    });
    setFormErr('');
    setEditor({ mode: 'edit', alarm });
  };

  const buildInput = () => {
    const base = {
      title: form.title.trim() || (tab === 'remindme' ? 'Reminder' : 'Alarm'),
      collection: tab,
      kind: tab === 'remindme' ? 'once' : form.kind,
      hour: form.hour,
      minute: form.minute,
      date: null,
      weekday: null,
    };
    if (base.kind === 'once') base.date = mergeDateTime(form.dateISO, form.hour, form.minute);
    if (base.kind === 'weekly') base.weekday = form.weekday;
    return base;
  };

  const save = async () => {
    setSaving(true);
    setFormErr('');
    try {
      if (editor.mode === 'new') {
        await createAlarm(buildInput());
        toast(tab === 'remindme' ? 'Reminder set ✓' : 'Alarm set ✓');
      } else {
        await updateAlarm(editor.alarm.id, buildInput());
        toast('Saved ✓');
      }
      setEditor(null);
    } catch (e) {
      setFormErr(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const removeOne = async (alarm) => {
    try {
      await deleteAlarm(alarm.id);
      setEditor(null);
      toast(tab === 'remindme' ? 'Reminder deleted' : 'Alarm deleted');
    } catch (e) {
      setFormErr(e?.message || 'Could not delete.');
    }
  };

  const copyOne = async (alarm) => {
    try {
      await duplicateAlarm(alarm.id);
      setEditor(null);
      toast('Duplicated ✓');
    } catch (e) {
      setFormErr(e?.message || 'Could not duplicate.');
    }
  };

  const bulk = async (action) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      if (action === 'delete') {
        await deleteAlarms(ids);
        toast(`${ids.length} deleted`);
      } else {
        await setAlarmsEnabled(ids, action === 'on');
        toast(`${ids.length} turned ${action === 'on' ? 'on' : 'off'}`);
      }
      setSelecting(false);
    } catch (e) {
      toast(e?.message || 'Bulk action failed.', true);
    }
  };

  const confirmBulkDelete = () => {
    Alert.alert(`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`, 'Their reminders will never fire.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => bulk('delete') },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const allSelected = visible.length > 0 && visible.every((a) => selected.has(a.id));

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[st.body, wide && st.bodyWide]}>
        <View style={st.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.kicker}>ALARMS</Text>
            <Text style={st.title}>{tab === 'alarm' ? 'Alarms' : 'Remind me'}</Text>
          </View>
          {selecting ? (
            <Pressable onPress={() => setSelecting(false)} hitSlop={8} style={st.headBtn} accessibilityLabel="Cancel selection">
              <Text style={st.headBtnText}>Done</Text>
            </Pressable>
          ) : (
            <>
              {visible.length > 0 && (
                <Pressable onPress={() => setSelecting(true)} hitSlop={8} style={st.headBtn} accessibilityLabel="Select alarms">
                  <Text style={st.headBtnText}>Select</Text>
                </Pressable>
              )}
              <Pressable onPress={openNew} hitSlop={8} style={[st.headBtn, st.addBtn]} accessibilityLabel={tab === 'alarm' ? 'Add alarm' : 'Add reminder'}>
                <Feather name="plus" size={16} color="#fff" />
              </Pressable>
            </>
          )}
        </View>

        <View style={st.tabs} accessibilityRole="tablist">
          {[
            ['alarm', 'Alarms'],
            ['remindme', 'Remind me'],
          ].map(([key, label]) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[st.tab, active && st.tabActive]}
              >
                <Text style={[st.tabText, active && st.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: selecting ? 150 : 90 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} tintColor="#2d6a4f" onRefresh={onRefresh} />}
        >
          {visible.length === 0 ? (
            <View style={st.empty}>
              <Feather name={tab === 'alarm' ? 'bell' : 'bookmark'} size={26} color="#b0a898" style={{ marginBottom: 10 }} />
              <Text style={st.emptyTitle}>{tab === 'alarm' ? 'No alarms yet' : 'No reminders yet'}</Text>
              <Text style={st.emptyDesc}>
                {tab === 'alarm'
                  ? 'Add your first alarm — daily, weekly or just once.'
                  : 'Set an exact date and time — it fires even offline.'}
              </Text>
              <Pressable onPress={openNew} style={st.emptyBtn}>
                <Text style={st.emptyBtnText}>{tab === 'alarm' ? '+ Add alarm' : '+ Add reminder'}</Text>
              </Pressable>
            </View>
          ) : (
            visible.map((a) => {
              const checked = selected.has(a.id);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => (selecting ? toggleSelect(a.id) : openEdit(a))}
                  onLongPress={() => {
                    if (!selecting) {
                      setSelecting(true);
                      setSelected(new Set([a.id]));
                    }
                  }}
                  delayLongPress={280}
                  style={({ pressed }) => [st.row, !a.enabled && st.rowOff, pressed && { opacity: 0.85 }]}
                >
                  {selecting && (
                    <View style={[st.check, checked && st.checkOn]}>
                      {checked && <Feather name="check" size={14} color="#fff" />}
                    </View>
                  )}
                  <View style={st.timeWrap}>
                    <Text style={[st.time, !a.enabled && st.dim]}>{fmtClock(a.hour, a.minute)}</Text>
                    <Text style={st.next}>{describeNext(a)}</Text>
                  </View>
                  <View style={st.meta}>
                    <Text style={[st.rowTitle, !a.enabled && st.dim]} numberOfLines={1}>{a.title}</Text>
                    <Text style={st.rowSub}>{kindLabel(a)}</Text>
                  </View>
                  {!selecting && (
                    <Switch
                      value={a.enabled}
                      onValueChange={(v) => setAlarmEnabled(a.id, v).catch((e) => toast(e?.message || 'Failed.', true))}
                      trackColor={{ true: '#2d6a4f' }}
                      accessibilityLabel={`Turn ${a.title} ${a.enabled ? 'off' : 'on'}`}
                    />
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {selecting && (
          <View style={st.bulkBar}>
            <Pressable onPress={() => setSelected(allSelected ? new Set() : new Set(visible.map((a) => a.id)))} style={st.bulkCount} accessibilityLabel="Select all">
              <Text style={st.bulkCountText}>{selected.size} selected</Text>
              <Text style={st.bulkAll}>{allSelected ? 'Clear' : 'All'}</Text>
            </Pressable>
            <View style={st.bulkBtns}>
              <Pressable
                onPress={() => bulk('on')}
                disabled={!selected.size}
                style={[st.bulkBtn, st.bulkOn, !selected.size && { opacity: 0.4 }]}
                accessibilityLabel="Turn selected on"
              >
                <Feather name="bell" size={14} color="#fff" />
                <Text style={st.bulkBtnText}>On</Text>
              </Pressable>
              <Pressable
                onPress={() => bulk('off')}
                disabled={!selected.size}
                style={[st.bulkBtn, st.bulkOff, !selected.size && { opacity: 0.4 }]}
                accessibilityLabel="Turn selected off"
              >
                <Feather name="bell-off" size={14} color="#fff" />
                <Text style={st.bulkBtnText}>Off</Text>
              </Pressable>
              <Pressable
                onPress={confirmBulkDelete}
                disabled={!selected.size}
                style={[st.bulkBtn, st.bulkDel, !selected.size && { opacity: 0.4 }]}
                accessibilityLabel="Delete selected"
              >
                <Feather name="trash-2" size={14} color="#fff" />
              </Pressable>
            </View>
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

      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => !saving && setEditor(null)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !saving && setEditor(null)} accessibilityLabel="Close editor" />
          <View style={st.modal}>
            <Text style={st.modalTitle}>
              {editor?.mode === 'new' ? (tab === 'remindme' ? 'New reminder' : 'New alarm') : 'Edit'}
            </Text>

            <Text style={st.flabel}>TITLE</Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder={tab === 'remindme' ? 'e.g. Team meeting' : 'e.g. Morning run'}
              placeholderTextColor="#b0a898"
              style={st.input}
              maxLength={80}
              accessibilityLabel="Alarm title"
            />

            {tab === 'alarm' && (
              <>
                <Text style={st.flabel}>REPEATS</Text>
                <View style={st.kindRow}>
                  {KINDS.map(({ key, label }) => {
                    const active = form.kind === key;
                    return (
                      <Pressable key={key} onPress={() => setForm((p) => ({ ...p, kind: key }))} style={[st.kind, active && st.kindActive]}>
                        <Text style={[st.kindText, active && st.kindTextActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={st.flabel}>TIME</Text>
            <Pressable onPress={() => setShowTime(true)} style={st.input} accessibilityLabel="Pick time">
              <Text style={st.inputText}>{fmtClock(form.hour, form.minute)}</Text>
            </Pressable>

            {form.kind === 'once' && (
              <>
                <Text style={st.flabel}>DATE</Text>
                <Pressable onPress={() => setShowDate(true)} style={st.input} accessibilityLabel="Pick date">
                  <Text style={st.inputText}>{fmtDateLong(new Date(form.dateISO + 'T12:00:00').toISOString())}</Text>
                </Pressable>
              </>
            )}

            {form.kind === 'weekly' && tab === 'alarm' && (
              <>
                <Text style={st.flabel}>DAY</Text>
                <View style={st.kindRow}>
                  {WEEKDAYS.map((d, i) => {
                    const active = form.weekday === i;
                    return (
                      <Pressable key={d} onPress={() => setForm((p) => ({ ...p, weekday: i }))} style={[st.day, active && st.kindActive]}>
                        <Text style={[st.kindText, active && st.kindTextActive]}>{d}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {!!formErr && (
              <View style={st.errBox}>
                <Text style={st.errText}>{formErr}</Text>
              </View>
            )}

            <View style={st.modalActions}>
              {editor?.mode === 'edit' && (
                <>
                  <Pressable onPress={() => removeOne(editor.alarm)} disabled={saving} style={[st.btn, st.btnDanger]}>
                    <Text style={[st.btnText, { color: '#fff' }]}>Delete</Text>
                  </Pressable>
                  <Pressable onPress={() => copyOne(editor.alarm)} disabled={saving} style={[st.btn, st.btnGhost]}>
                    <Text style={[st.btnText, { color: '#1a1a2e' }]}>Duplicate</Text>
                  </Pressable>
                </>
              )}
              <Pressable onPress={save} disabled={saving} style={[st.btn, st.btnDark, saving && { opacity: 0.6 }]}>
                <Text style={[st.btnText, { color: '#fff' }]}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PickerModal
        visible={showTime}
        mode="time"
        title="Pick a time"
        value={toDate(form.hour, form.minute)}
        onClose={() => setShowTime(false)}
        onPick={(d) => setForm((p) => ({ ...p, hour: d.getHours(), minute: d.getMinutes() }))}
      />
      <PickerModal
        visible={showDate}
        mode="date"
        title="Pick a date"
        value={new Date(form.dateISO + 'T12:00:00')}
        onClose={() => setShowDate(false)}
        onPick={(d) => setForm((p) => ({ ...p, dateISO: toISODate(d) }))}
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
  headBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eceae3' },
  headBtnText: { fontSize: 13.5, fontWeight: '700', color: '#2d6a4f' },
  addBtn: { backgroundColor: '#2d6a4f', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16, backgroundColor: '#eceae3', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  tabText: { fontSize: 13.5, fontWeight: '700', color: '#7a7567' },
  tabTextActive: { color: '#1a1a2e' },
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
  check: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: '#c3bdb0',
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#2d6a4f', borderColor: '#2d6a4f' },
  timeWrap: { minWidth: 92 },
  time: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.3 },
  next: { fontSize: 12, color: '#2d6a4f', fontWeight: '700', marginTop: 1 },
  dim: { color: '#a8a396' },
  meta: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  rowSub: { fontSize: 12.5, color: '#7a7567', marginTop: 1 },
  bulkBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 26,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bulkCount: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulkCountText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bulkAll: { color: '#a8a396', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  bulkBtns: { flexDirection: 'row', gap: 8 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  bulkBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  bulkOn: { backgroundColor: '#2d6a4f' },
  bulkOff: { backgroundColor: '#7a7567' },
  bulkDel: { backgroundColor: '#c0392b' },
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
  modal: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 14 },
  flabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#7a7567', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f6f5f0', borderWidth: 1.5, borderColor: '#e4e0d6',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  inputText: { fontSize: 15, color: '#1a1a2e', fontWeight: '600' },
  kindRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kind: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#e4e0d6' },
  kindActive: { borderColor: '#2d6a4f', backgroundColor: '#e4f1ea' },
  kindText: { fontSize: 13, fontWeight: '700', color: '#7a7567' },
  kindTextActive: { color: '#2d6a4f' },
  day: { width: 42, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: '#e4e0d6', alignItems: 'center', justifyContent: 'center' },
  errBox: { backgroundColor: '#fdecea', borderRadius: 10, padding: 10, marginTop: 14 },
  errText: { fontSize: 13, color: '#c0392b' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 20 },
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
});
