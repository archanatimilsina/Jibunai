/**
 * Alarm system — like the system alarm, but more flexible.
 * - Alarms tab: once / daily / weekly (multi-weekday) with per-alarm on/off.
 * - Remind me tab: exact date+time one-shot reminders (meeting use-case).
 * - Bulk group select, master pause/resume, countdown banner, snooze + skip.
 * Everything is OS-scheduled, fully offline (re-registered at startup).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
  LABEL_SUGGESTIONS,
  clearSkip,
  createAlarm,
  deleteAlarm,
  deleteAlarms,
  dismissAlarm,
  duplicateAlarm,
  getPauseState,
  getRecentLabels,
  pauseAll,
  restoreAlarms,
  resumeAll,
  setAlarmEnabled,
  setAlarmsEnabled,
  skipNextRing,
  snoozeAlarm,
  updateAlarm,
  useAlarms,
} from '../alarms/store';
import { formatCountdown, nextFireMs, normalizeWeekdays } from '../alarms/scheduler';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS = [
  { key: 'once', label: 'Only once' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
];
const GROUPS = ['none', 'Work', 'Weekend', 'Travel'];
const SNOOZE_OPTS = [1, 5, 10, 15, 30];
const PRE_OPTS = [0, 10, 60, 1440];

const pad2 = (n) => String(n).padStart(2, '0');
const fmtClock = (h, m, s = 0, showSeconds = false) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  const sec = showSeconds ? `:${pad2(s)}` : '';
  return `${hh}:${pad2(m)}${sec} ${ap}`;
};
const fmtDateLong = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function describeNext(alarm) {
  if (!alarm.enabled) return 'Off';
  if (alarm.snoozeUntil && alarm.snoozeUntil > Date.now()) {
    return `Snoozed until ${fmtClock(new Date(alarm.snoozeUntil).getHours(), new Date(alarm.snoozeUntil).getMinutes())}`;
  }
  const t = nextFireMs(alarm);
  if (t === null) return 'Fired';
  const d = new Date(t);
  const now = new Date();
  const cd = formatCountdown(t);
  const rel = cd === 'less than a minute' ? '<1m' : cd === 'tomorrow' ? '' : `in ${cd}`;
  if (sameDay(d, now)) return `${WEEKDAYS[d.getDay()]}, ${fmtClock(d.getHours(), d.getMinutes())}${rel ? ` · ${rel}` : ''}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(d, tomorrow)) return `Tomorrow, ${fmtClock(d.getHours(), d.getMinutes())}`;
  if (t - Date.now() < 7 * 86400000) return `${WEEKDAYS[d.getDay()]}, ${fmtClock(d.getHours(), d.getMinutes())}`;
  return `${WEEKDAYS[d.getDay()]}, ${fmtDateLong(d.toISOString())}`;
}

const kindLabel = (a) => {
  if (a.snoozeUntil && a.snoozeUntil > Date.now()) return 'Snoozed';
  if (a.kind === 'daily') return 'Daily';
  if (a.kind === 'weekly') {
    const days = normalizeWeekdays(a);
    if (!days.length) return 'Once (no days)';
    if (days.length === 7) return 'Every day';
    return days.map((d) => WEEKDAYS[d]).join(' ');
  }
  return fmtDateLong(a.date);
};

function toDate(hour, minute, second = 0) {
  const d = new Date();
  d.setHours(hour, minute, second, 0);
  return d;
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function mergeDateTime(dateISO, hour, minute, second = 0) {
  const [y, m, dd] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, dd, hour, minute, second, 0).toISOString();
}

const EMPTY_FORM = { title: '', note: '', kind: 'daily', hour: 8, minute: 0, second: 0, timeMode: 'at', dateISO: toISODate(new Date()), weekdays: [1, 2, 3, 4, 5], snoozeMinutes: 5, preAlertMin: 0, group: 'none', autoDelete: false };

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

  const [tab, setTab] = useState('alarm');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showSeconds, setShowSeconds] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(null);
  const [recent, setRecent] = useState([]);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [sortBy, setSortBy] = useState('next');
  const toastTimers = useRef([]);

  useEffect(() => () => {
    toastTimers.current.forEach(clearTimeout);
    toastTimers.current = [];
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    getPauseState().then(setPaused).catch(() => {});
    getRecentLabels().then(setRecent).catch(() => {});
  }, []);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-3));
    toastTimers.current.push(setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200));
  }, []);

  const visible = useMemo(() => {
    const list = alarms.filter((a) => (tab === 'alarm' ? a.collection !== 'remindme' : a.collection === 'remindme'));
    const sorted = [...list];
    if (sortBy === 'time') sorted.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
    else if (sortBy === 'label') sorted.sort((x, y) => x.title.localeCompare(y.title));
    else sorted.sort((a, b) => (nextFireMs(a) ?? Infinity) - (nextFireMs(b) ?? Infinity));
    return sorted;
  }, [alarms, tab, sortBy, tick]);

  const nextUp = useMemo(() => {
    let best = null;
    let bestT = Infinity;
    for (const a of visible) {
      if (!a.enabled) continue;
      const t = nextFireMs(a);
      if (t !== null && t < bestT) {
        bestT = t;
        best = a;
      }
    }
    return best ? { alarm: best, t: bestT } : null;
  }, [visible, tick]);

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
    const now = new Date();
    setForm({ ...EMPTY_FORM, kind: tab === 'remindme' ? 'once' : 'daily', title: '', note: '', hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds(), timeMode: 'at', dateISO: toISODate(now) });
    setFormErr('');
    setEditor({ mode: 'new' });
  };
  const openEdit = (alarm) => {
    setForm({
      title: alarm.title,
      note: alarm.note || '',
      kind: alarm.kind,
      hour: alarm.hour,
      minute: alarm.minute,
      second: alarm.second ?? 0,
      timeMode: 'at',
      dateISO: alarm.date ? toISODate(new Date(alarm.date)) : toISODate(new Date()),
      weekdays: normalizeWeekdays(alarm),
      snoozeMinutes: alarm.snoozeMinutes || 5,
      preAlertMin: alarm.preAlertMin || 0,
      group: alarm.group || 'none',
      autoDelete: !!alarm.autoDelete,
    });
    setFormErr('');
    setEditor({ mode: 'edit', alarm });
  };

  const buildInput = () => {
    const base = {
      title: form.title.trim() || (tab === 'remindme' ? 'Reminder' : 'Alarm'),
      note: form.note.trim(),
      collection: tab,
      kind: tab === 'remindme' ? 'once' : form.kind,
      hour: form.hour,
      minute: form.minute,
      second: form.second ?? 0,
      date: null,
      weekday: null,
      weekdays: null,
      snoozeMinutes: form.snoozeMinutes,
      preAlertMin: form.preAlertMin,
      group: form.group,
      autoDelete: form.autoDelete,
    };
    if (base.kind === 'once') base.date = mergeDateTime(form.dateISO, form.hour, form.minute, form.second ?? 0);
    if (base.kind === 'weekly') {
      base.weekdays = [...form.weekdays].sort();
      base.weekday = base.weekdays[0] ?? null;
    }
    return base;
  };

  const save = async () => {
    setSaving(true);
    setFormErr('');
    try {
      let saved;
      if (editor.mode === 'new') {
        saved = await createAlarm(buildInput());
      } else {
        saved = await updateAlarm(editor.alarm.id, buildInput());
      }
      const t = nextFireMs(saved);
      const warn = t && t - Date.now() < 60000 ? ' (rings tomorrow, not today)' : '';
      toast(t ? `Set · rings in ${formatCountdown(t)}${warn} ✓` : 'Saved ✓');
      getRecentLabels().then(setRecent).catch(() => {});
      setEditor(null);
    } catch (e) {
      setFormErr(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const removeOne = async (alarm) => {
    try {
      const gone = [{ ...alarm }];
      await deleteAlarm(alarm.id);
      setLastDeleted(gone.map((g) => g.id));
      setEditor(null);
      toast('Deleted · Undo available');
    } catch (e) {
      setFormErr(e?.message || 'Could not delete.');
    }
  };

  const copyOne = async (alarm) => {
    try {
      const dup = await duplicateAlarm(alarm.id);
      setEditor(null);
      openEdit(dup);
      toast('Duplicated — adjust time');
    } catch (e) {
      setFormErr(e?.message || 'Could not duplicate.');
    }
  };

  const bulk = async (action) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      if (action === 'delete') {
        const gone = alarms.filter((a) => selected.has(a.id));
        await deleteAlarms(ids);
        setLastDeleted(gone.map((g) => g.id));
        toast(`${ids.length} deleted · Undo available`);
      } else {
        await setAlarmsEnabled(ids, action === 'on');
        toast(`${ids.length} turned ${action === 'on' ? 'on' : 'off'}`);
      }
      setSelecting(false);
    } catch (e) {
      toast(e?.message || 'Bulk action failed.', true);
    }
  };

  const undoDelete = async () => {
    if (!lastDeleted?.length) return;
    try {
      await restoreAlarms(lastDeleted);
      setLastDeleted(null);
      toast('Restored ✓');
    } catch (e) {
      toast('Restore failed.', true);
    }
  };

  const confirmBulkDelete = () => {
    Alert.alert(`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`, 'Undo available for 30 days via Trash restore.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => bulk('delete') },
    ]);
  };

  const toggleMaster = async (v) => {
    try {
      if (!v) {
        Alert.alert(`Turn off all ${tab === 'alarm' ? 'alarms' : 'reminders'}?`, 'Previous on/off state is remembered.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn off',
            style: 'destructive',
            onPress: async () => {
              await pauseAll(tab);
              setPaused(await getPauseState());
              toast('All paused · resume anytime');
            },
          },
        ]);
      } else {
        await resumeAll();
        setPaused(null);
        toast('Restored previous state ✓');
      }
    } catch (e) {
      toast(e?.message || 'Failed.', true);
    }
  };

  const quickAdd = async (mins) => {
    try {
      const d = new Date(Date.now() + mins * 60000);
      const saved = await createAlarm({
        title: `+${mins} min timer`,
        collection: tab,
        kind: 'once',
        hour: d.getHours(),
        minute: d.getMinutes(),
        date: d.toISOString(),
      });
      const t = nextFireMs(saved);
      toast(t ? `Set · rings in ${formatCountdown(t)} ✓` : 'Saved ✓');
    } catch (e) {
      toast(e?.message || 'Failed.', true);
    }
  };

  const testAlarm = async () => {
    try {
      const d = new Date(Date.now() + 10000);
      await createAlarm({
        title: 'Test alarm',
        collection: tab,
        kind: 'once',
        hour: d.getHours(),
        minute: d.getMinutes(),
        date: d.toISOString(),
      });
      toast('Test rings in ~10s ✓');
    } catch (e) {
      toast(e?.message || 'Failed.', true);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const allSelected = visible.length > 0 && visible.every((a) => selected.has(a.id));
  const pausedForTab = paused?.paused && (paused.scope === 'all' || paused.scope === tab);
  const masterOn = !pausedForTab && visible.some((a) => a.enabled);

  const toggleWeekday = (d) => {
    setForm((p) => {
      const has = p.weekdays.includes(d);
      const next = has ? p.weekdays.filter((x) => x !== d) : [...p.weekdays, d].sort((a, b) => a - b);
      return { ...p, weekdays: next };
    });
  };
  const applyPreset = (name) => {
    if (name === 'every') setForm((p) => ({ ...p, weekdays: [0, 1, 2, 3, 4, 5, 6] }));
    else if (name === 'weekdays') setForm((p) => ({ ...p, weekdays: [1, 2, 3, 4, 5] }));
    else if (name === 'weekends') setForm((p) => ({ ...p, weekdays: [0, 6] }));
    else setForm((p) => ({ ...p, weekdays: [] }));
  };

  const shortcut = (name) => {
    const now = new Date();
    let d = new Date(now);
    if (name === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(form.hour, form.minute, 0, 0);
    } else if (name === 'monday') {
      const delta = ((8 - now.getDay()) % 7) || 7;
      d.setDate(d.getDate() + delta);
      d.setHours(form.hour, form.minute, 0, 0);
    } else {
      d = new Date(Date.now() + 3600000);
    }
    setForm((p) => ({ ...p, dateISO: toISODate(d), hour: d.getHours(), minute: d.getMinutes() }));
  };

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

        {nextUp && !selecting && (
          <View style={st.banner}>
            <Feather name="bell" size={14} color="#2d6a4f" />
            <Text style={st.bannerText} numberOfLines={2}>
              Next: {nextUp.alarm.title} · {WEEKDAYS[new Date(nextUp.t).getDay()]} {fmtClock(new Date(nextUp.t).getHours(), new Date(nextUp.t).getMinutes())} · rings in {formatCountdown(nextUp.t)}
            </Text>
          </View>
        )}
        {!nextUp && !selecting && (
          <View style={st.bannerDim}>
            <Text style={st.bannerDimText}>No upcoming {tab === 'alarm' ? 'alarms' : 'reminders'} — tap + to add one.</Text>
          </View>
        )}

        {pausedForTab && (
          <View style={st.paused}>
            <Feather name="pause-circle" size={14} color="#92400e" />
            <Text style={st.pausedText}>Paused — resume to restore previous on/off state.</Text>
            <Pressable onPress={() => toggleMaster(true)} style={st.pausedBtn}>
              <Text style={st.pausedBtnText}>Resume</Text>
            </Pressable>
          </View>
        )}

        <View style={st.toolRow}>
          <View style={st.masterRow}>
            <Text style={st.masterLabel}>All {tab === 'alarm' ? 'alarms' : 'reminders'}</Text>
            <Switch value={masterOn} onValueChange={toggleMaster} trackColor={{ true: '#2d6a4f' }} />
          </View>
          <View style={st.sortRow}>
            {[
              ['next', 'Next'],
              ['time', 'Time'],
              ['label', 'A–Z'],
            ].map(([k, label]) => (
              <Pressable key={k} onPress={() => setSortBy(k)} style={[st.sortChip, sortBy === k && st.sortChipOn]}>
                <Text style={[st.sortText, sortBy === k && st.sortTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={st.quickRow}>
          <Pressable onPress={() => quickAdd(5)} style={st.quick} accessibilityLabel="Add 5 minute timer">
            <Text style={st.quickText}>+5 min</Text>
          </Pressable>
          <Pressable onPress={() => quickAdd(30)} style={st.quick} accessibilityLabel="Add 30 minute timer">
            <Text style={st.quickText}>+30 min</Text>
          </Pressable>
          <Pressable onPress={testAlarm} style={st.quick} accessibilityLabel="Test alarm in 10 seconds">
            <Text style={st.quickText}>Test 10s</Text>
          </Pressable>
        </View>

        <View style={st.tabs} accessibilityRole="tablist">
          {[
            ['alarm', 'Alarms'],
            ['remindme', 'Remind me'],
          ].map(([key, label]) => {
            const active = tab === key;
            return (
              <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[st.tab, active && st.tabActive]}>
                <Text style={[st.tabText, active && st.tabTextActive]} maxFontSizeMultiplier={1.3}>{label}</Text>
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
              <Text style={st.emptyDesc}>{tab === 'alarm' ? 'Add your first alarm — daily, weekly or just once.' : 'Set an exact date and time — it fires even offline.'}</Text>
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
                    <Text style={st.rowSub}>{kindLabel(a)}{a.group !== 'none' ? ` · ${a.group}` : ''}{a.preAlertMin ? ` · heads-up ${a.preAlertMin}m` : ''}</Text>
                    {!selecting && a.enabled && (
                      <View style={st.cardActions}>
                        {a.snoozeUntil && a.snoozeUntil > Date.now() ? (
                          <Pressable onPress={() => dismissAlarm(a.id).catch((e) => toast(e?.message || 'Failed.', true))} hitSlop={6}>
                            <Text style={st.cardLink}>Dismiss snooze</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => snoozeAlarm(a.id).then(() => toast(`Snoozed ${a.snoozeMinutes}m ✓`)).catch((e) => toast(e?.message || 'Failed.', true))} hitSlop={6}>
                            <Text style={st.cardLink}>Snooze {a.snoozeMinutes}m</Text>
                          </Pressable>
                        )}
                        {a.skipNext ? (
                          <Pressable onPress={() => clearSkip(a.id).catch((e) => toast(e?.message || 'Failed.', true))} hitSlop={6}>
                            <Text style={st.cardLink}>Unskip</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => skipNextRing(a.id).then(() => toast('Next ring skipped')).catch((e) => toast(e?.message || 'Failed.', true))} hitSlop={6}>
                            <Text style={st.cardLink}>Skip next</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                  {!selecting && (
                    <Switch value={a.enabled} onValueChange={(v) => setAlarmEnabled(a.id, v).catch((e) => toast(e?.message || 'Failed.', true))} trackColor={{ true: '#2d6a4f' }} accessibilityLabel={`Turn ${a.title} ${a.enabled ? 'off' : 'on'}`} />
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
              <Pressable onPress={() => bulk('on')} disabled={!selected.size} style={[st.bulkBtn, st.bulkOn, !selected.size && { opacity: 0.4 }]} accessibilityLabel="Turn selected on">
                <Feather name="bell" size={14} color="#fff" />
                <Text style={st.bulkBtnText}>On</Text>
              </Pressable>
              <Pressable onPress={() => bulk('off')} disabled={!selected.size} style={[st.bulkBtn, st.bulkOff, !selected.size && { opacity: 0.4 }]} accessibilityLabel="Turn selected off">
                <Feather name="bell-off" size={14} color="#fff" />
                <Text style={st.bulkBtnText}>Off</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const ids = [...selected];
                  if (ids.length === 1) {
                    const first = visible.find((a) => a.id === ids[0]);
                    if (first) {
                      const inv = new Set(visible.map((a) => a.id));
                      inv.delete(first.id);
                      setSelected(inv);
                      toast('Inverted ✓');
                      return;
                    }
                  }
                  const all = new Set(visible.map((a) => a.id));
                  const inv = new Set([...all].filter((id) => !selected.has(id)));
                  setSelected(inv);
                }}
                style={st.bulkBtn}
                accessibilityLabel="Invert selection"
              >
                <Feather name="repeat" size={14} color="#fff" />
              </Pressable>
              <Pressable onPress={confirmBulkDelete} disabled={!selected.size} style={[st.bulkBtn, st.bulkDel, !selected.size && { opacity: 0.4 }]} accessibilityLabel="Delete selected">
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
        {lastDeleted?.length > 0 && !selecting && (
          <Pressable onPress={undoDelete} style={st.undo} accessibilityLabel="Undo delete">
            <Feather name="rotate-ccw" size={14} color="#fff" />
            <Text style={st.undoText}>Undo delete</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => !saving && setEditor(null)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !saving && setEditor(null)} accessibilityLabel="Close editor" />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={st.modal}>
              <Text style={st.modalTitle}>{editor?.mode === 'new' ? (tab === 'remindme' ? 'New reminder' : 'New alarm') : 'Edit'}</Text>

              <Text style={st.flabel}>TITLE · {form.title.length}/80</Text>
              <TextInput value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} placeholder={tab === 'remindme' ? 'e.g. Team meeting' : 'e.g. Morning run'} placeholderTextColor="#b0a898" style={st.input} maxLength={80} accessibilityLabel="Alarm title" />
              <View style={st.chips}>
                {[...LABEL_SUGGESTIONS.slice(0, 4), ...recent.filter((r) => !LABEL_SUGGESTIONS.includes(r)).slice(0, 4)].map((s) => (
                  <Pressable key={s} onPress={() => setForm((p) => ({ ...p, title: s }))} style={st.chip}>
                    <Text style={st.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'remindme' && (
                <>
                  <Text style={st.flabel}>NOTE (SHOWN WHEN IT RINGS)</Text>
                  <TextInput value={form.note} onChangeText={(v) => setForm((p) => ({ ...p, note: v }))} placeholder="e.g. Bring slides, Room 3B" placeholderTextColor="#b0a898" style={st.input} maxLength={140} accessibilityLabel="Reminder note" />
                </>
              )}

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
              <View style={st.timeModeRow}>
                <Pressable onPress={() => setForm((p) => ({ ...p, timeMode: 'at' }))} style={[st.timeModeChip, form.timeMode === 'at' && st.timeModeChipActive]}>
                  <Text style={[st.timeModeText, form.timeMode === 'at' && st.timeModeTextActive]}>At a time</Text>
                </Pressable>
                <Pressable onPress={() => setForm((p) => ({ ...p, timeMode: 'in' }))} style={[st.timeModeChip, form.timeMode === 'in' && st.timeModeChipActive]}>
                  <Text style={[st.timeModeText, form.timeMode === 'in' && st.timeModeTextActive]}>In…</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setShowTime(true)} style={st.input} accessibilityLabel="Pick time">
                <Text style={st.inputText}>{fmtClock(form.hour, form.minute, form.second ?? 0, showSeconds)}</Text>
              </Pressable>
              <Pressable onPress={() => setShowSeconds(!showSeconds)} style={st.nowBtn} accessibilityLabel={showSeconds ? 'Hide seconds' : 'Show seconds'}>
                <Text style={st.nowBtnText}>{showSeconds ? 'Hide seconds' : 'Show seconds'}</Text>
              </Pressable>
              <Pressable onPress={() => {
                const now = new Date();
                setForm((p) => ({ ...p, hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() }));
              }} style={st.nowBtn} accessibilityLabel="Set to now">
                <Text style={st.nowBtnText}>Now</Text>
              </Pressable>
              {form.timeMode === 'at' && (
                <>
                  <Text style={st.flabel}>ADD MINUTES</Text>
                  <View style={st.chips}>
                    {[1, 5, 10, 15, 30, 60].map((m) => (
                      <Pressable key={m} onPress={() => {
                        const d = new Date();
                        d.setHours(form.hour, form.minute, form.second ?? 0);
                        d.setMinutes(d.getMinutes() + m);
                        setForm((p) => ({ ...p, hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() }));
                      }} style={st.chip}>
                        <Text style={st.chipText}>+{m} min</Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => {
                      const now = new Date();
                      setForm((p) => ({ ...p, hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() }));
                    }} style={st.chipReset}>
                      <Text style={st.chipResetText}>Reset</Text>
                    </Pressable>
                  </View>
                  <Text style={st.preview}>
                    Rings at {fmtClock(form.hour, form.minute, form.second ?? 0, showSeconds)} · in {Math.max(0, Math.round(((new Date().setHours(form.hour, form.minute, form.second ?? 0, 0) - Date.now()) / 60000) % 1440))} min
                  </Text>
                </>
              )}
              {form.timeMode === 'in' && (
                <>
                  <Text style={st.flabel}>DURATION</Text>
                  <View style={st.chips}>
                    {[1, 5, 10, 15, 30, 60].map((m) => (
                      <Pressable key={m} onPress={() => {
                        const d = new Date();
                        d.setMinutes(d.getMinutes() + m);
                        setForm((p) => ({ ...p, hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds(), timeMode: 'in' }));
                      }} style={st.chip}>
                        <Text style={st.chipText}>+{m} min</Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => {
                      const now = new Date();
                      setForm((p) => ({ ...p, hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds(), timeMode: 'in' }));
                    }} style={st.chipReset}>
                      <Text style={st.chipResetText}>Reset</Text>
                    </Pressable>
                  </View>
                  <Text style={st.preview}>
                    Rings at {fmtClock(form.hour, form.minute, form.second ?? 0, showSeconds)} · in {Math.max(0, Math.round(((new Date().setHours(form.hour, form.minute, form.second ?? 0, 0) - Date.now()) / 60000) % 1440))} min
                  </Text>
                </>
              )}

              {form.kind === 'once' && (
                <>
                  <Text style={st.flabel}>DATE</Text>
                  <View style={st.chips}>
                    {[
                      ['tomorrow', 'Tomorrow'],
                      ['monday', 'Next Mon'],
                      ['hour', 'In 1h'],
                    ].map(([k, label]) => (
                      <Pressable key={k} onPress={() => shortcut(k)} style={st.chip}>
                        <Text style={st.chipText}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable onPress={() => setShowDate(true)} style={st.input} accessibilityLabel="Pick date">
                    <Text style={st.inputText}>{fmtDateLong(new Date(form.dateISO + 'T12:00:00').toISOString())}</Text>
                  </Pressable>
                </>
              )}

              {form.kind === 'weekly' && tab === 'alarm' && (
                <>
                  <Text style={st.flabel}>DAYS · EMPTY = ONCE</Text>
                  <View style={st.chips}>
                    {[
                      ['every', 'Every day'],
                      ['weekdays', 'Weekdays'],
                      ['weekends', 'Weekends'],
                      ['clear', 'Clear'],
                    ].map(([k, label]) => (
                      <Pressable key={k} onPress={() => applyPreset(k)} style={st.chip}>
                        <Text style={st.chipText}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={st.kindRow}>
                    {WEEKDAYS.map((d, i) => {
                      const active = form.weekdays.includes(i);
                      return (
                        <Pressable key={d} onPress={() => toggleWeekday(i)} style={[st.day, active && st.kindActive]}>
                          <Text style={[st.kindText, active && st.kindTextActive]}>{d[0]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              <Text style={st.flabel}>SNOOZE (MIN)</Text>
              <View style={st.kindRow}>
                {SNOOZE_OPTS.map((m) => (
                  <Pressable key={m} onPress={() => setForm((p) => ({ ...p, snoozeMinutes: m }))} style={[st.kind, form.snoozeMinutes === m && st.kindActive]}>
                    <Text style={[st.kindText, form.snoozeMinutes === m && st.kindTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={st.flabel}>HEADS-UP PRE-ALERT</Text>
              <View style={st.kindRow}>
                {PRE_OPTS.map((m) => (
                  <Pressable key={m} onPress={() => setForm((p) => ({ ...p, preAlertMin: m }))} style={[st.kind, form.preAlertMin === m && st.kindActive]}>
                    <Text style={[st.kindText, form.preAlertMin === m && st.kindTextActive]}>{m === 0 ? 'Off' : m >= 60 ? `${m / 60}h` : `${m}m`}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={st.flabel}>GROUP</Text>
              <View style={st.kindRow}>
                {GROUPS.map((g) => (
                  <Pressable key={g} onPress={() => setForm((p) => ({ ...p, group: g }))} style={[st.kind, form.group === g && st.kindActive]}>
                    <Text style={[st.kindText, form.group === g && st.kindTextActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>

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
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <PickerModal visible={showTime} mode="time" title="Pick a time" value={toDate(form.hour, form.minute, form.second ?? 0)} onClose={() => setShowTime(false)} onPick={(d) => setForm((p) => ({ ...p, hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() }))} />
      <PickerModal visible={showDate} mode="date" title="Pick a date" value={new Date(form.dateISO + 'T12:00:00')} onClose={() => setShowDate(false)} onPick={(d) => setForm((p) => ({ ...p, dateISO: toISODate(d) }))} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f5f0' },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 26 },
  bodyWide: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: '#7a7567', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  headBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eceae3' },
  headBtnText: { fontSize: 13.5, fontWeight: '700', color: '#2d6a4f' },
  addBtn: { backgroundColor: '#2d6a4f', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e4f1ea', borderWidth: 1, borderColor: '#bfe0cf', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1d4d33' },
  bannerDim: { backgroundColor: '#eceae3', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  bannerDimText: { fontSize: 13, color: '#7a7567', fontWeight: '600' },
  paused: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  pausedText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#92400e' },
  pausedBtn: { backgroundColor: '#92400e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pausedBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  masterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  masterLabel: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eceae3' },
  sortChipOn: { backgroundColor: '#1a1a2e' },
  sortText: { fontSize: 12, fontWeight: '700', color: '#7a7567' },
  sortTextOn: { color: '#fff' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quick: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e4e0d6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  quickText: { fontSize: 13, fontWeight: '800', color: '#2d6a4f' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12, backgroundColor: '#eceae3', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  tabText: { fontSize: 13.5, fontWeight: '700', color: '#7a7567' },
  tabTextActive: { color: '#1a1a2e' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#7a7567', marginBottom: 4 },
  emptyDesc: { fontSize: 13.5, color: '#a8a396', textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#2d6a4f', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e4e0d6', borderRadius: 14, padding: 14, marginBottom: 10 },
  rowOff: { opacity: 0.62 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: '#c3bdb0', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#2d6a4f', borderColor: '#2d6a4f' },
  timeWrap: { minWidth: 92 },
  time: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.3 },
  next: { fontSize: 12, color: '#2d6a4f', fontWeight: '700', marginTop: 1 },
  dim: { color: '#a8a396' },
  meta: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  rowSub: { fontSize: 12.5, color: '#7a7567', marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cardLink: { fontSize: 12.5, fontWeight: '800', color: '#2d6a4f', textDecorationLine: 'underline' },
  bulkBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#1a1a2e', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bulkCount: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulkCountText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bulkAll: { color: '#a8a396', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  bulkBtns: { flexDirection: 'row', gap: 8 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#3a3a52' },
  bulkBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  bulkOn: { backgroundColor: '#2d6a4f' },
  bulkOff: { backgroundColor: '#7a7567' },
  bulkDel: { backgroundColor: '#c0392b' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center', gap: 8 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d6', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 },
  toastErr: { borderColor: '#fecaca' },
  toastText: { fontSize: 13.5, color: '#1a1a2e' },
  undo: { position: 'absolute', right: 18, bottom: 54, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a1a2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  undoText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.30)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 420, maxHeight: '92%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  flabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#7a7567', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f6f5f0', borderWidth: 1.5, borderColor: '#e4e0d6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  inputText: { fontSize: 16, color: '#1a1a2e', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: { backgroundColor: '#eceae3', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700', color: '#2d6a4f' },
  chipReset: { backgroundColor: '#fdecea', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipResetText: { fontSize: 12, fontWeight: '700', color: '#c0392b' },
  timeModeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  timeModeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#e4e0d6' },
  timeModeChipActive: { borderColor: '#2d6a4f', backgroundColor: '#e4f1ea' },
  timeModeText: { fontSize: 12, fontWeight: '700', color: '#7a7567' },
  timeModeTextActive: { color: '#2d6a4f' },
  nowBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#e4e0d6', marginTop: 2 },
  nowBtnText: { fontSize: 12, fontWeight: '700', color: '#7a7567' },
  preview: { fontSize: 12, fontWeight: '600', color: '#5c574c', marginTop: 4 },
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
