import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Modal, Alert, ActivityIndicator, Animated,
  RefreshControl, KeyboardAvoidingView, LayoutAnimation, Platform, StyleSheet,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown, Flame, X, Check, Clock, Lock, Plus, Calendar, Pencil, Trash2, Award, Sparkles,
} from 'lucide-react-native';

import { enableLayoutAnimation } from '../utils/layoutAnimation';
import useLocalCollection from '../hooks/useLocalCollection';
import { BREAKPOINTS } from '../utils/responsive';

enableLayoutAnimation();

const transformChallenge = (c) => ({
  id: c.id, title: c.title, type: c.type, startDate: c.start_date, durationDays: c.duration_days,
  endDate: c.end_date, instantStatus: c.instant_status,
  log: Object.fromEntries((c.completed_dates || []).map((d) => [d, 'completed'])),
  backendStats: c.stats,
});

const buildChallengePayload = (v) => {
  const body = { title: v.title, type: v.type, start_date: v.startDate };
  if (v.type === 'days') body.duration_days = v.durationDays; else body.end_date = v.endDate;
  return body;
};

const parseISODate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const formatISODate = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const d = parseISODate(iso); d.setDate(d.getDate() + n); return formatISODate(d); };
const calculateEndDate = (start, n) => (!start || !n || n < 1 ? '' : addDays(start, n - 1));
const generateDayRange = (start, n) => Array.from({ length: n }, (_, i) => addDays(start, i));
const todayISO = () => formatISODate(new Date());
const formatDisplayDate = (iso) => (iso ? parseISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const dayLabel = (iso) => parseISODate(iso).toLocaleDateString('en-US', { weekday: 'short' });
const getDayStatus = (iso, log) => {
  if (log[iso] === 'completed') return 'completed';
  const t = todayISO();
  return iso < t ? 'missed' : iso === t ? 'today' : 'upcoming';
};
const isEditable = (iso) => iso === todayISO();

const C = {
  bg: '#f6f5f0', card: '#ffffff', border: '#d8d4cc', borderStrong: '#c3bdb0', text: '#1a1a2e',
  muted: '#5c574c', soft: '#6b665b', green: '#2d6a4f', greenDark: '#245741', greenLt: '#e4f1ea',
  amber: '#d4af37', amberLt: '#fdf6dc', danger: '#c0392b', dangerLt: '#fdecea', fieldBg: '#f1efe8',
  flame: '#ea580c',
};
const softShadow = { shadowColor: '#14251c', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 };

const Label = ({ children }) => <Text style={s.label}>{children}</Text>;

function DateField({ value, onChange, min }) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISODate(value) : new Date();
  const handle = (_, d) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (d) onChange(formatISODate(d));
  };
  const picker = (
    <DateTimePicker
      value={date} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
      minimumDate={min ? parseISODate(min) : undefined} onChange={handle} accentColor={C.green}
    />
  );
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.dateBtn]}>
        <Calendar size={14} color={C.muted} />
        <Text style={{ color: C.text, fontSize: 14 }}>{formatDisplayDate(value) || 'Pick a date'}</Text>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={s.overlay} onPress={() => setOpen(false)}>
            <Pressable style={s.sheet} onPress={() => {}}>
              {picker}
              <Pressable onPress={() => setOpen(false)} style={[s.submitBtn, { alignSelf: 'stretch', alignItems: 'center' }]}>
                <Text style={s.submitText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : open && picker}
    </>
  );
}

function ChallengeForm({ editingChallenge, onCreate, onUpdate, onCancel }) {
  const isEditing = Boolean(editingChallenge);
  const [title, setTitle] = useState(editingChallenge?.title ?? '');
  const [type, setType] = useState(editingChallenge?.type ?? 'days');
  const [startDate, setStartDate] = useState(editingChallenge?.startDate ?? todayISO());
  const [durationDays, setDurationDays] = useState(String(editingChallenge?.type === 'days' ? editingChallenge.durationDays : 30));
  const [instantEnd, setInstantEnd] = useState(editingChallenge?.type === 'instant' ? editingChallenge.endDate : addDays(todayISO(), 9));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const endDate = useMemo(
    () => (type === 'days' ? calculateEndDate(startDate, Number(durationDays) || 0) : instantEnd),
    [type, startDate, durationDays, instantEnd],
  );
  const totalDays = useMemo(
    () => (!startDate || !endDate ? 0 : Math.round((parseISODate(endDate) - parseISODate(startDate)) / 86400000) + 1),
    [startDate, endDate],
  );

  const submit = async () => {
    if (!title.trim() || !startDate || !endDate) { setFormError('Add a title and valid dates.'); return; }
    if (totalDays < 1) { setFormError('End date must be on or after the start date.'); return; }
    setSubmitting(true); setFormError('');
    try {
      const values = {
        title: title.trim(), type, startDate, endDate,
        durationDays: type === 'days' ? Number(durationDays) : totalDays,
      };
      if (isEditing) await onUpdate(editingChallenge.id, values); else await onCreate(values);
    } catch (e) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={[s.formCard, softShadow]}>
      <View style={s.field}>
        <Label>Challenge title</Label>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. 30 Days of DSA" placeholderTextColor={C.soft} />
      </View>

      <View style={s.field}>
        <Label>Challenge type</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[['days', 'Days challenge'], ['instant', 'Instant challenge']].map(([k, l]) => (
            <Pressable key={k} onPress={() => setType(k)} style={[s.typeBtn, type === k && s.typeBtnOn]}>
              <Text style={[s.typeText, type === k && { color: C.greenDark }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[s.field, { flexDirection: 'row', gap: 12 }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Label>Start date</Label>
          <DateField value={startDate} onChange={setStartDate} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {type === 'days' ? (
            <>
              <Label>Duration (days)</Label>
              <TextInput style={s.input} value={durationDays} keyboardType="number-pad" onChangeText={(v) => setDurationDays(v.replace(/\D/g, ''))} />
            </>
          ) : (
            <>
              <Label>End date</Label>
              <DateField value={instantEnd} min={startDate} onChange={setInstantEnd} />
            </>
          )}
        </View>
      </View>

      <View style={s.endInfo}>
        <Calendar size={15} color={C.green} />
        <Text style={s.endInfoText}>
          Ends <Text style={s.strong}>{formatDisplayDate(endDate) || '—'}</Text>
          <Text style={{ color: C.soft }}>  ·  </Text>
          <Text style={s.strong}>{totalDays}</Text> total days
        </Text>
      </View>

      {!!formError && <Text style={s.errorText}>{formError}</Text>}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={submit} disabled={submitting} style={[s.submitBtn, submitting && { opacity: 0.6 }]}>
          {submitting && <ActivityIndicator size="small" color="#fff" />}
          <Text style={s.submitText}>
            {submitting ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save changes' : 'Create challenge'}
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} style={s.cancelBtn}><Text style={s.cancelText}>Cancel</Text></Pressable>
      </View>
    </View>
  );
}

const CELL = {
  completed: { bg: C.green, border: C.green, fg: '#fff', dashed: false },
  missed: { bg: C.fieldBg, border: C.border, fg: C.soft, dashed: false },
  today: { bg: C.greenLt, border: C.green, fg: C.greenDark, dashed: false },
  upcoming: { bg: 'transparent', border: C.border, fg: C.soft, dashed: true },
};

function DayCell({ iso, log, onToggle }) {
  const status = getDayStatus(iso, log);
  const editable = isEditable(iso);
  const st = CELL[status];
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!(editable && status === 'today')) return undefined;
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [editable, status, pulse]);

  return (
    <Pressable
      disabled={!editable} onPress={() => onToggle(iso)}
      accessibilityLabel={`${formatDisplayDate(iso)}, ${status}${editable ? ', tap to toggle' : ''}`}
      style={[s.cell, { backgroundColor: st.bg, borderColor: st.border, borderStyle: st.dashed ? 'dashed' : 'solid' }]}
    >
      {editable && status === 'today' && (
        <Animated.View pointerEvents="none" style={[s.pulse, {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] }) }],
        }]} />
      )}
      <Text style={[s.dayLetter, { color: st.fg }]}>{dayLabel(iso).slice(0, 1)}</Text>
      <Text style={[s.dateNum, { color: st.fg }]}>{parseISODate(iso).getDate()}</Text>
      {status === 'missed' && <View style={s.missedDot} />}
      {!editable && status === 'upcoming' && <Lock size={9} color={C.soft} style={s.lock} />}
    </Pressable>
  );
}

function InstantControls({ status, onChange }) {
  const opts = [
    { key: 'completed', label: 'Completed', Icon: Check, bg: C.greenLt, bd: C.green, fg: C.greenDark },
    { key: 'not_completed', label: 'Not done', Icon: X, bg: C.dangerLt, bd: '#f87171', fg: '#dc2626' },
    { key: 'pending', label: 'Pending', Icon: Clock, bg: C.amberLt, bd: C.amber, fg: '#b45309' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {opts.map(({ key, label, Icon, bg, bd, fg }) => {
        const on = status === key;
        return (
          <Pressable key={key} onPress={() => onChange(key)}
            style={[s.ctrlBtn, on && { backgroundColor: bg, borderColor: bd }]}>
            <Icon size={14} color={on ? fg : C.muted} />
            <Text style={[s.ctrlText, on && { color: fg }]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChallengeCard({ challenge, onToggleDay, onSetInstantStatus, onEdit, onDelete, onBadge }) {
  const { width } = useWindowDimensions();
  const wide = width >= BREAKPOINTS.medium;
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    if (challenge.type !== 'days' || !challenge.backendStats) return null;
    const b = challenge.backendStats;
    return {
      totalDays: b.total_days, completed: b.completed, missed: b.missed, remaining: b.remaining,
      currentStreak: b.current_streak, longestStreak: b.longest_streak, completionPct: b.completion_pct,
      status: b.status, days: generateDayRange(challenge.startDate, challenge.durationDays),
    };
  }, [challenge]);

  const clickable = challenge.type === 'days';
  const isEnded = clickable && stats?.status === 'ended';
  const pct = stats?.completionPct ?? 0;
  const cols = wide ? 10 : 7;

  const toggle = () => {
    if (!clickable) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={[s.card, softShadow]}>
      <Pressable onPress={toggle} disabled={!clickable} style={s.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle} numberOfLines={1}>{challenge.title}</Text>
            <View style={s.typeBadge}><Text style={s.typeBadgeText}>{challenge.type === 'days' ? 'Days' : 'Instant'}</Text></View>
            {stats && (
              <View style={[s.pill, { backgroundColor: isEnded ? C.greenLt : C.amberLt }]}>
                <Text style={[s.pillText, { color: isEnded ? C.greenDark : '#b45309' }]}>{isEnded ? 'Ended' : 'Ongoing'}</Text>
              </View>
            )}
          </View>
          <Text style={s.dateRange}>{formatDisplayDate(challenge.startDate)} → {formatDisplayDate(challenge.endDate)}</Text>
        </View>

        <View style={s.metaRow}>
          {stats && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Flame size={15} color={C.flame} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.flame }}>{stats.currentStreak}</Text>
              </View>
              {wide && <View style={[s.track, { width: 64 }]}><View style={[s.fill, { width: `${pct}%` }]} /></View>}
            </>
          )}
          <Pressable hitSlop={8} onPress={() => onEdit(challenge)} style={s.iconBtn} accessibilityLabel="Edit challenge"><Pencil size={14} color={C.soft} /></Pressable>
          <Pressable hitSlop={8} onPress={() => onDelete(challenge.id)} style={s.iconBtn} accessibilityLabel="Delete challenge"><Trash2 size={14} color={C.soft} /></Pressable>
          {stats && <ChevronDown size={18} color={C.muted} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />}
        </View>
      </Pressable>

      {stats && !wide && <View style={[s.track, { marginHorizontal: 16, marginBottom: 14, marginTop: -2 }]}><View style={[s.fill, { width: `${pct}%` }]} /></View>}

      {challenge.type === 'instant' && (
        <View style={s.cardBody}>
          <InstantControls status={challenge.instantStatus} onChange={(v) => onSetInstantStatus(challenge.id, v)} />
        </View>
      )}

      {clickable && expanded && stats && (
        <View style={s.cardBody}>
          <View style={s.statsGrid}>
            {[['Done', stats.completed], ['Missed', stats.missed], ['Remaining', stats.remaining],
              ['Best streak', stats.longestStreak], ['Complete', `${stats.completionPct}%`]].map(([l, v]) => (
              <View key={l} style={s.statCard}>
                <Text style={s.statValue}>{v}</Text>
                <Text style={s.statLabel}>{l}</Text>
              </View>
            ))}
          </View>

          <View style={s.daysGrid}>
            {stats.days.map((iso) => (
              <View key={iso} style={{ width: `${100 / cols}%`, padding: 2.5 }}>
                <DayCell iso={iso} log={challenge.log} onToggle={(d) => onToggleDay(challenge.id, d)} />
              </View>
            ))}
          </View>

          {isEnded && (
            <View style={s.actionRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                <Award size={15} color={C.green} />
                <Text style={s.endedNotice}>Finished at {stats.completionPct}% completion. Nice work!</Text>
              </View>
              <Pressable onPress={() => onBadge(challenge, stats)} style={s.badgeBtn}>
                <Award size={15} color="#fff" />
                <Text style={s.badgeBtnText}>Share badge</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const BadgeArt = React.forwardRef(({ data }, ref) => (
  <View ref={ref} collapsable={false} style={s.badge}>
    <View style={s.badgeInner}>
      <Text style={s.badgeKicker}>CHALLENGE COMPLETE</Text>
      <Text style={s.badgeTitle} numberOfLines={2}>{data.challenge.title}</Text>
      <Text style={s.badgeDates}>{formatDisplayDate(data.challenge.startDate)}  →  {formatDisplayDate(data.challenge.endDate)}</Text>
      <Text style={s.badgePct}>{data.stats.completionPct}%</Text>
      <Text style={s.badgeSub}>COMPLETION</Text>
      <Text style={s.badgeFoot}>{data.stats.completed}/{data.stats.totalDays} days done  ·  Best streak {data.stats.longestStreak}</Text>
    </View>
  </View>
));

export default function ChallengeTrackerScreen() {
  const { width } = useWindowDimensions();
  const pad = width >= BREAKPOINTS.medium ? 24 : 16;

  const [actionError, setActionError] = useState('');
  const {
    items: rawChallenges,
    loading,
    errorText: loadError,
    create,
    update,
    remove,
    runCustom,
  } = useLocalCollection('challenges', {
    initial: [],
  });
  const challenges = useMemo(() => (rawChallenges || []).map(transformChallenge), [rawChallenges]);
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [badgeData, setBadgeData] = useState(null);
  const badgeRef = useRef(null);

  const ongoing = useMemo(() => challenges.filter((c) => c.type === 'instant' || c.backendStats?.status !== 'ended'), [challenges]);
  const ended = useMemo(() => challenges.filter((c) => c.type === 'days' && c.backendStats?.status === 'ended'), [challenges]);

  const fail = (msg, e) => setActionError(`${msg}: ${e.message}`);

  const onNewClick = () => {
    if (showForm && !editingChallenge) setShowForm(false);
    else { setEditingChallenge(null); setShowForm(true); }
  };
  const cancelForm = () => { setShowForm(false); setEditingChallenge(null); };

  const handleCreate = async (values) => {
    const payload = buildChallengePayload(values);
    const { offline } = await create(payload, {
      optimistic: { ...payload, completed_dates: [], stats: null },
    });
    if (offline) setActionError('');
    setShowForm(false);
  };
  const handleUpdate = async (id, values) => {
    const { offline } = await update(id, buildChallengePayload(values));
    if (offline) setActionError('');
    setShowForm(false); setEditingChallenge(null);
  };
  const deleteNow = async (id) => {
    try {
      const { offline } = await remove(id);
      if (offline) setActionError('');
      if (editingChallenge?.id === id) cancelForm();
    } catch (e) { fail('Delete failed', e); }
  };
  const handleDelete = (id) => Alert.alert('Delete this challenge?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteNow(id) },
  ]);

  const handleToggleDay = async (id, iso) => {
    if (!isEditable(iso)) return;
    try {
      // Optimistic toggle; the server response (or its replay) reconciles.
      const wasCompleted = (rawChallenges.find((c) => c.id === id)?.completed_dates || []).includes(iso);
      const { offline } = await runCustom(`/challenges/${id}/mark-day/`, 'POST', null, {
        updater: (prev) => (prev || []).map((c) => {
          if (c.id !== id) return c;
          const dates = new Set(c.completed_dates || []);
          if (wasCompleted) dates.delete(iso); else dates.add(iso);
          return { ...c, completed_dates: [...dates] };
        }),
      });
      if (offline) setActionError('');
    } catch (e) { fail('Could not mark day', e); }
  };
  const handleInstant = async (id, status) => {
    try {
      const { offline } = await runCustom(`/challenges/${id}/instant-status/`, 'PATCH', { instant_status: status }, {
        updater: (prev) => (prev || []).map((c) => (c.id === id ? { ...c, instant_status: status } : c)),
        targetId: id,
      });
      if (offline) setActionError('');
    } catch (e) { fail('Update failed', e); }
  };

  useEffect(() => {
    if (!badgeData) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const uri = await captureRef(badgeRef, { format: 'png', quality: 1, width: 800, height: 500 });
        if (alive && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your badge' });
        } else if (alive) setActionError('Sharing is not available on this device.');
      } catch (e) { if (alive) fail('Create failed', e); }
      finally { if (alive) setBadgeData(null); }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [badgeData]);

  const card = (c) => (
    <ChallengeCard key={c.id} challenge={c} onToggleDay={handleToggleDay} onSetInstantStatus={handleInstant}
      onEdit={(ch) => { setEditingChallenge(ch); setShowForm(true); }} onDelete={handleDelete}
      onBadge={(challenge, stats) => setBadgeData({ challenge, stats })} />
  );

  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.green} onRefresh={refresh} />}
        >
          <View style={[s.container, { paddingHorizontal: pad }]}>
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={20} color={C.green} />
                  <Text style={s.title}>Challenges</Text>
                </View>
                <Text style={s.subtitle}>Keep showing up. Only today is editable — yesterday's already locked in.</Text>
              </View>
              <Pressable onPress={onNewClick} disabled={loading} style={[s.newBtn, loading && { opacity: 0.6 }]}>
                <Plus size={16} color="#fff" strokeWidth={2.5} />
                <Text style={s.newBtnText}>New</Text>
              </Pressable>
            </View>

            {!!actionError && (
              <Pressable onPress={() => setActionError('')} style={s.banner}>
                <Text style={{ flex: 1, color: C.danger, fontSize: 13 }}>{actionError}</Text>
                <X size={14} color={C.danger} />
              </Pressable>
            )}

            {showForm && (
              <ChallengeForm
                key={editingChallenge ? `edit-${editingChallenge.id}` : 'new'}
                editingChallenge={editingChallenge} onCreate={handleCreate} onUpdate={handleUpdate} onCancel={cancelForm}
              />
            )}

            {loading && <ActivityIndicator color={C.green} style={{ marginTop: 24 }} />}
            {!loading && !!loadError && (
              <View style={s.banner}>
                <Text style={{ flex: 1, color: C.danger, fontSize: 13 }}>Couldn't load challenges: {loadError}</Text>
                <Pressable onPress={refresh} style={s.retry}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Retry</Text></Pressable>
              </View>
            )}

            {!loading && !loadError && (
              <>
                <View style={s.section}>
                  <Text style={s.sectionTitle}>ONGOING</Text>
                  <View style={{ gap: 14 }}>
                    {ongoing.map(card)}
                    {ongoing.length === 0 && <View style={s.empty}><Text style={s.emptyText}>No ongoing challenges. Start one above 🌱</Text></View>}
                  </View>
                </View>
                {ended.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>ENDED</Text>
                    <View style={{ gap: 14 }}>{ended.map(card)}</View>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {badgeData && <View pointerEvents="none" style={{ position: 'absolute', left: -2000, top: 0 }}><BadgeArt ref={badgeRef} data={badgeData} /></View>}
    </SafeAreaView>
  );
}

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  container: { width: '100%', maxWidth: 768, alignSelf: 'center', paddingTop: 22 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, color: C.text },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, color: C.muted },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.green, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, shadowColor: C.green, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.dangerLt, borderWidth: 1.5, borderColor: '#f0b4ad', borderRadius: 12, padding: 12, marginBottom: 16 },
  retry: { backgroundColor: C.danger, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 12.5, fontWeight: '700', letterSpacing: 1.2, color: C.soft, marginBottom: 12 },
  empty: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.borderStrong, backgroundColor: C.card, paddingVertical: 50, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.muted },

  formCard: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 20, marginBottom: 22 },
  field: { marginBottom: 16 },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: C.soft, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: C.fieldBg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 16, color: C.text },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.fieldBg, paddingVertical: 11, alignItems: 'center' },
  typeBtnOn: { borderColor: C.green, backgroundColor: C.greenLt },
  typeText: { fontSize: 13.5, fontWeight: '600', color: C.muted },
  endInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.greenLt, borderRadius: 10, padding: 11, marginBottom: 18 },
  endInfoText: { flex: 1, fontSize: 14, color: C.greenDark },
  strong: { fontWeight: '700', color: C.greenDark },
  submitBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.green, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 18 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 16 },
  cancelText: { color: C.muted, fontWeight: '600', fontSize: 14 },

  card: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16.5, fontWeight: '700', color: C.text, flexShrink: 1 },
  typeBadge: { backgroundColor: C.fieldBg, borderWidth: 1, borderColor: C.border, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.6, color: C.muted, textTransform: 'uppercase' },
  pill: { borderRadius: 100, paddingHorizontal: 9, paddingVertical: 2 },
  pillText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  dateRange: { marginTop: 4, fontSize: 12.5, color: C.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 6, borderRadius: 100, backgroundColor: C.fieldBg, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 100, backgroundColor: C.green },
  iconBtn: { padding: 5, borderRadius: 7 },
  cardBody: { borderTopWidth: 1.5, borderTopColor: C.border, padding: 16 },

  ctrlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.fieldBg, paddingVertical: 11, paddingHorizontal: 6 },
  ctrlText: { fontSize: 13, fontWeight: '600', color: C.muted },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { flexGrow: 1, flexBasis: 72, backgroundColor: C.fieldBg, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 10, letterSpacing: 0.6, color: C.muted, textTransform: 'uppercase', marginTop: 2 },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2.5 },
  cell: { aspectRatio: 1, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pulse: { ...StyleSheet.absoluteFillObject, borderRadius: 8, borderWidth: 2, borderColor: '#22c55e' },
  dayLetter: { fontSize: 9, lineHeight: 10, opacity: 0.75, textTransform: 'uppercase', fontWeight: '600' },
  dateNum: { fontSize: 12, lineHeight: 15, fontWeight: '700' },
  missedDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: C.soft },
  lock: { position: 'absolute', right: 3, top: 3, opacity: 0.6 },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: C.border },
  endedNotice: { flex: 1, fontSize: 13, color: C.muted },
  badgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.green, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  badgeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(26,26,46,.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: C.card, borderRadius: 16, padding: 14, width: '100%', maxWidth: 380, gap: 10 },

  badge: { width: 800, height: 500, backgroundColor: '#ecfdf5', padding: 18 },
  badgeInner: { flex: 1, borderWidth: 5, borderColor: '#22c55e', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 60 },
  badgeKicker: { fontSize: 20, fontWeight: '700', letterSpacing: 2, color: '#16a34a' },
  badgeTitle: { marginTop: 16, fontSize: 38, fontWeight: '700', color: '#14251c', textAlign: 'center' },
  badgeDates: { marginTop: 18, fontSize: 18, fontWeight: '500', color: '#6b7d74' },
  badgePct: { marginTop: 14, fontSize: 90, fontWeight: '700', color: '#22c55e', lineHeight: 100 },
  badgeSub: { fontSize: 16, fontWeight: '600', letterSpacing: 2, color: '#6b7d74' },
  badgeFoot: { marginTop: 22, fontSize: 18, fontWeight: '500', color: '#14251c' },
});