import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, LayoutAnimation, Platform, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enableLayoutAnimation } from '../utils/layoutAnimation';
import useCachedResource from '../hooks/useCachedResource';
import { apiSend } from '../api/http';
import { fetchResource, TTL } from '../api/resources';

enableLayoutAnimation();

const C = {
  white: '#ffffff', border: '#d8d4cc', greenLt: '#e4f1ea', green: '#2d6a4f', muted: '#eceae3',
  dark: '#1a1a2e', soft: '#7a7567', danger: '#c0392b', dangerLt: '#fdecea', ph: '#bdb8ad',
};
const softShadow = { shadowColor: '#1a1a2e', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 };

const Spinner = ({ large, light = true }) => (
  <ActivityIndicator size={large ? 'small' : 'small'} color={light ? '#fff' : C.green} style={large ? undefined : { transform: [{ scale: 0.75 }] }} />
);

const Btn = ({ children, onPress, ghost, busy, disabled, small, style, type }) => (
  <Pressable
    onPress={onPress} disabled={busy || disabled}
    style={({ pressed }) => [
      s.btn, ghost ? s.btnGhost : s.btnDark, small && { paddingVertical: 7, paddingHorizontal: 12 },
      (busy || disabled) && { opacity: 0.55 }, pressed && { opacity: 0.85 }, style,
    ]}
  >
    {busy ? <Spinner light={!ghost} /> : <Text style={[s.btnText, ghost && { color: C.dark }, small && { fontSize: 12 }]}>{children}</Text>}
  </Pressable>
);

const DayBox = React.memo(function DayBox({ day, busy, size, onToggle }) {
  return (
    <Pressable
      onPress={() => !busy && onToggle(day.day_number)}
      accessibilityLabel={`Day ${day.day_number}, ${day.done ? 'done' : 'not done'}`}
      style={({ pressed }) => [
        s.day, { width: size, height: size },
        day.done && { backgroundColor: C.green, borderColor: C.green },
        busy && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.92 }] },
      ]}
    >
      {busy
        ? <ActivityIndicator size="small" color={day.done ? '#fff' : C.green} style={{ transform: [{ scale: 0.6 }] }} />
        : <Text style={[s.dayText, day.done && { color: '#fff' }]}>{day.day_number}</Text>}
    </Pressable>
  );
});

export default function GoalsScreen() {
  const { width } = useWindowDimensions();
  const narrow = width < 500;
  const stackForm = width < 600;
  const pad = width >= 600 ? 24 : 16;
  const daySize = width >= 600 ? 28 : 34;

  const [error, setError] = useState('');
  const {
    data: goals,
    loading,
    refreshing,
    errorText: loadError,
    refresh,
    mutate,
  } = useCachedResource('goals', () => fetchResource('goals'), {
    ttl: TTL.LIVE,
    initial: [],
    errorMessage: 'Failed to load goals. Check your network connection.',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [togglingDay, setTogglingDay] = useState(null);

  const [newGoal, setNewGoal] = useState({ title: '', timeline: '' });
  const [editGoal, setEditGoal] = useState({ title: '', timeline: '' });

  const anim = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const parseTimeline = (v) => parseInt(v, 10);
  const validTimeline = (n) => n && n > 0 && n <= 365;
  const replaceGoal = (updated) => mutate((p) => (p || []).map((g) => (g.id === updated.id ? updated : g)));

  const handleCreate = async () => {
    const t = parseTimeline(newGoal.timeline);
    if (!newGoal.title.trim()) { setError('Add an objective for your goal.'); return; }
    if (!validTimeline(t)) { setError('Timeline must be between 1 and 365 days.'); return; }
    setSavingId('new'); setError('');
    try {
      const created = await apiSend('/Goals/', 'POST', { title: newGoal.title.trim(), timeline: t });
      anim();
      mutate((p) => [created, ...(p || [])]);
      setNewGoal({ title: '', timeline: '' });
      setIsCreating(false);
    } catch (e) { setError(e.message || 'Failed to create goal.'); }
    finally { setSavingId(null); }
  };

  const toggleGoalStatus = async (goal) => {
    setSavingId(goal.id); setError('');
    try {
      const updated = await apiSend(`/Goals/${goal.id}/`, 'PATCH', { done: !goal.done });
      replaceGoal(updated);
    } catch (e) { setError(e.message || 'Could not update status.'); }
    finally { setSavingId(null); }
  };

  const toggleDay = async (goal, dayNumber) => {
    setTogglingDay(`${goal.id}-${dayNumber}`); setError('');
    try {
      const updated = await apiSend(`/Goals/${goal.id}/days/${dayNumber}/toggle/`, 'PATCH');
      replaceGoal(updated);
    } catch (e) { setError(e.message || 'Could not update that day.'); }
    finally { setTogglingDay(null); }
  };

  const startEditing = (goal) => {
    anim();
    setEditingId(goal.id);
    setEditGoal({ title: goal.title, timeline: String(goal.timeline) });
    setError('');
  };

  const handleUpdate = async (goal) => {
    const t = parseTimeline(editGoal.timeline);
    if (!editGoal.title.trim()) { setError('Add an objective for your goal.'); return; }
    if (!validTimeline(t)) { setError('Timeline must be between 1 and 365 days.'); return; }
    setSavingId(goal.id); setError('');
    try {
      const updated = await apiSend(`/Goals/${goal.id}/`, 'PATCH', {
        title: editGoal.title.trim(),
        timeline: t,
      });
      replaceGoal(updated);
      anim();
      setEditingId(null);
    } catch (e) { setError(e.message || 'Failed to update goal.'); }
    finally { setSavingId(null); }
  };

  const deleteNow = async (id) => {
    setSavingId(id); setError('');
    try {
      await apiSend(`/Goals/${id}/`, 'DELETE');
      anim();
      mutate((p) => (p || []).filter((g) => g.id !== id));
    } catch (e) { setError(e.message || 'Could not delete goal.'); }
    finally { setSavingId(null); }
  };
  const handleDelete = (g) => Alert.alert('Delete this goal permanently?', `“${g.title}” and its day check-ins will be removed.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteNow(g.id) },
  ]);

  const isNewSaving = savingId === 'new';
  const doneOf = (g) => g.days_completed ?? g.day_statuses?.filter((d) => d.done).length ?? 0;
  const summary = useMemo(() => {
    const total = goals.length;
    return { total, done: goals.filter((g) => g.done).length };
  }, [goals]);

  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.green} onRefresh={refresh} />}
        >
          <View style={[s.wrap, { paddingHorizontal: pad }]}>
            <Text style={s.kicker}>GOALS</Text>

            <View style={[s.headerRow, narrow && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, { fontSize: narrow ? 30 : 35 }]}>Things I'm <Text style={{ color: C.green }}>Working Toward</Text></Text>
                <Text style={s.desc}>Going to the destination!</Text>
              </View>
              <Btn ghost={isCreating} onPress={() => { anim(); setIsCreating(!isCreating); setError(''); }}>
                {isCreating ? 'Cancel' : '+ Add Goal'}
              </Btn>
            </View>

            {!!(error || loadError) && (
              <Pressable onPress={() => setError('')} style={s.errBanner}>
                <Text style={{ flex: 1, color: C.danger, fontSize: 13.5 }}>{error || loadError}</Text>
                <Text style={{ color: C.danger, fontSize: 14 }}>✕</Text>
              </Pressable>
            )}

            {isCreating && (
              <View style={[s.formBlock, stackForm && { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={[s.fgroup, !stackForm && { flex: 0.65 }]}>
                  <Text style={s.flabel}>OBJECTIVE</Text>
                  <TextInput style={s.input} placeholder="What are you building?" placeholderTextColor={C.ph}
                    value={newGoal.title} editable={!isNewSaving} onChangeText={(v) => setNewGoal({ ...newGoal, title: v })} />
                </View>
                <View style={[s.fgroup, !stackForm && { flex: 0.35 }]}>
                  <Text style={s.flabel}>TIMELINE (DAYS)</Text>
                  <TextInput style={s.input} placeholder="e.g. 20" placeholderTextColor={C.ph} keyboardType="number-pad"
                    maxLength={3} value={newGoal.timeline} editable={!isNewSaving}
                    onChangeText={(v) => setNewGoal({ ...newGoal, timeline: v.replace(/\D/g, '') })} />
                </View>
                <Btn busy={isNewSaving} onPress={handleCreate} style={{ height: 40 }}>Save</Btn>
              </View>
            )}

            {loading && (
              <View style={s.loadingRow}><ActivityIndicator color={C.green} /><Text style={{ color: C.soft, fontSize: 14.5 }}>Loading goals...</Text></View>
            )}

            {!loading && goals.length === 0 && !error && !loadError && (
              <View style={s.empty}><Text style={s.emptyText}>No goals yet. Add your first one above.</Text></View>
            )}

            {!loading && goals.length > 0 && (
              <>
                <Text style={s.summary}>{summary.done} of {summary.total} goals complete</Text>
                <View style={{ gap: 14 }}>
                  {goals.map((g) => {
                    const editingThis = editingId === g.id;
                    const busy = savingId === g.id;
                    const completed = doneOf(g);
                    const pct = g.timeline ? Math.min(100, (completed / g.timeline) * 100) : 0;

                    return (
                      <View key={g.id} style={[s.item, softShadow, g.done && { borderColor: C.greenLt }, busy && { opacity: 0.6 }]}>
                        {editingThis ? (
                          <View style={{ gap: 10 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              <TextInput style={[s.input, { flex: 1, minWidth: 180, paddingVertical: Platform.OS === 'ios' ? 9 : 6 }]}
                                value={editGoal.title} editable={!busy} onChangeText={(v) => setEditGoal({ ...editGoal, title: v })} />
                              <TextInput style={[s.input, { width: 110, paddingVertical: Platform.OS === 'ios' ? 9 : 6 }]}
                                value={editGoal.timeline} keyboardType="number-pad" maxLength={3} editable={!busy}
                                onChangeText={(v) => setEditGoal({ ...editGoal, timeline: v.replace(/\D/g, '') })} />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Btn small busy={busy} onPress={() => handleUpdate(g)}>Update</Btn>
                              <Btn small ghost disabled={busy} onPress={() => { anim(); setEditingId(null); }}>Cancel</Btn>
                            </View>
                          </View>
                        ) : (
                          <View style={s.topRow}>
                            <Pressable onPress={() => !busy && toggleGoalStatus(g)} accessibilityLabel="Toggle overall completion"
                              style={[s.check, g.done && { backgroundColor: C.greenLt, borderColor: '#b7e4c7' }]}>
                              {busy ? <ActivityIndicator size="small" color={C.green} /> : <Text style={{ color: C.green, fontSize: 15, fontWeight: '800' }}>{g.done ? '✓' : ''}</Text>}
                            </Pressable>

                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={[s.goalTitle, g.done && { color: C.soft, textDecorationLine: 'line-through' }]}>{g.title}</Text>
                              <Text style={s.goalTime}>{completed}/{g.timeline} days done</Text>
                              <View style={s.track}><View style={[s.fill, { width: `${pct}%` }]} /></View>

                              <View style={s.dayGrid}>
                                {(g.day_statuses || []).map((day) => (
                                  <DayBox key={day.id} day={day} size={daySize}
                                    busy={togglingDay === `${g.id}-${day.day_number}`} onToggle={(n) => toggleDay(g, n)} />
                                ))}
                              </View>
                            </View>

                            <View style={s.controls}>
                              <Pressable onPress={() => startEditing(g)} disabled={busy} hitSlop={6} style={[s.ctrl, busy && { opacity: 0.4 }]} accessibilityLabel="Edit goal">
                                <Text style={{ fontSize: 12 }}>✏️</Text>
                              </Pressable>
                              <Pressable onPress={() => handleDelete(g)} disabled={busy} hitSlop={6}
                                style={[s.ctrl, { backgroundColor: C.dangerLt, borderColor: '#fecaca' }, busy && { opacity: 0.4 }]} accessibilityLabel="Delete goal">
                                <Text style={{ fontSize: 12, color: C.danger, fontWeight: '800' }}>✕</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f5f0' },
  wrap: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingTop: 34 },

  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 1.5, color: C.soft, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 32 },
  title: { fontWeight: '800', letterSpacing: -0.8, lineHeight: 40, color: C.dark, marginBottom: 12 },
  desc: { fontSize: 15.5, lineHeight: 24, color: C.soft },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 18 },
  btnDark: { backgroundColor: C.dark, borderColor: C.dark },
  btnGhost: { backgroundColor: C.muted, borderColor: C.border },
  btnText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },

  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.dangerLt, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 20 },

  formBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, backgroundColor: C.muted, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 18, marginBottom: 26 },
  fgroup: { gap: 6 },
  flabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6, color: C.soft },
  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8, fontSize: 15, color: C.dark },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 32 },
  empty: { alignItems: 'center', paddingVertical: 48, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border, borderRadius: 14 },
  emptyText: { fontSize: 15, color: C.soft },
  summary: { fontSize: 12.5, fontWeight: '600', color: C.soft, marginBottom: 12 },

  item: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 18 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  check: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.muted, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22, color: C.dark, paddingRight: 64 },
  goalTime: { fontSize: 12.5, color: C.soft, marginTop: 2, marginBottom: 8 },
  track: { height: 5, borderRadius: 100, backgroundColor: C.muted, overflow: 'hidden', marginBottom: 12 },
  fill: { height: '100%', borderRadius: 100, backgroundColor: C.green },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { borderRadius: 7, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 11.5, fontWeight: '700', color: C.soft },

  controls: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', gap: 6 },
  ctrl: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.muted, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});