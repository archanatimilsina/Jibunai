import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Modal, Animated, Alert,
  StyleSheet, useWindowDimensions, Platform, StatusBar, SafeAreaView,
  KeyboardAvoidingView, ActivityIndicator, Easing,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';


const API_BASE = process.env.EXPO_PUBLIC_API_URL;
import useCachedResource from '../hooks/useCachedResource';
import { apiSend } from '../api/http';
import { fetchResource, TTL } from '../api/resources';

const C = {
  bg: '#f6f5f0',
  panel: '#ffffff',
  input: '#f0eee7',
  border: '#d8d4cc',
  text: '#1a1a2e',
  textSecondary: '#7a7567',
  accent: '#2d6a4f',
  accentGlow: 'rgba(45,106,79,0.30)',
  danger: '#c0392b',
  dangerSoft: 'rgba(192,57,43,0.10)',
  success: '#52d68a',
};

const F = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
};

const DAY_COLORS = [
  { name: 'Forest',  strong: '#2d6a4f', tint: '#eaf4ee', tintDeep: '#d8ebe0', line: '#b7d8c5' },
  { name: 'Ocean',   strong: '#2b6cb0', tint: '#eaf1fa', tintDeep: '#d7e6f6', line: '#b4cdea' },
  { name: 'Amber',   strong: '#b7791f', tint: '#fcf4e2', tintDeep: '#f8e8c4', line: '#ecd39a' },
  { name: 'Rose',    strong: '#b83280', tint: '#fbeaf3', tintDeep: '#f6d5e6', line: '#e8b0cf' },
  { name: 'Violet',  strong: '#6b46c1', tint: '#f0ebfa', tintDeep: '#e2d8f5', line: '#c8b8ea' },
  { name: 'Teal',    strong: '#0f766e', tint: '#e4f5f3', tintDeep: '#cdeae6', line: '#a3d5cf' },
  { name: 'Coral',   strong: '#c2410c', tint: '#fcece3', tintDeep: '#f8d9c8', line: '#efb99b' },
  { name: 'Indigo',  strong: '#3949ab', tint: '#eaecf8', tintDeep: '#d5d9f0', line: '#b0b7e0' },
];

const shadow = (h = 6, o = 0.12, r = 16) => Platform.select({
  ios: { shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: h }, shadowOpacity: o, shadowRadius: r },
  android: { elevation: Math.max(1, Math.round(h * 0.9)) },
  default: {},
});


const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toISODate(new Date());
const fromISODate = (s) => {
  const [y, m, d] = (s || today()).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatDisplayDate = (dateStr) => new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
  weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
});
const formatShortDate = (dateStr) => new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
});

const colorForDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const days = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
  return DAY_COLORS[((days % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
};


function FadeUp({ children, delay = 0, distance = 20, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
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

function ErrorPill({ message, onDismiss, onRetry }) {
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.55, duration: 1000, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View style={[st.errorPill, { opacity: o }]} accessibilityLiveRegion="polite">
      <Text style={st.errorPillText} numberOfLines={2}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={10} accessibilityLabel="Retry">
          <Feather name="refresh-cw" size={14} color={C.danger} />
        </Pressable>
      ) : null}
      <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss error">
        <Feather name="x" size={14} color={C.danger} />
      </Pressable>
    </Animated.View>
  );
}

function DatePickerControl({ visible, value, onChange, onClose }) {
  if (!visible) return null;
  const handle = (event, selected) => {
    if (Platform.OS === 'android') {
      onClose();
      if (event?.type === 'dismissed') return;
    }
    if (selected) onChange(toISODate(selected));
  };
  if (Platform.OS === 'android') {
    return <DateTimePicker value={fromISODate(value)} mode="date" onChange={handle} />;
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.dateOverlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={st.dateSheet}>
          <DateTimePicker
            value={fromISODate(value)}
            mode="date"
            display="inline"
            onChange={handle}
            accentColor={C.accent}
            themeVariant="light"
          />
          <Pressable onPress={onClose} style={st.dateDone} accessibilityRole="button">
            <Text style={st.dateDoneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const TaskCard = memo(function TaskCard({ task, palette, isSaving, onToggle, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const inputRef = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => { if (isEditing) setTimeout(() => inputRef.current?.focus(), 30); }, [isEditing]);

  const startEdit = () => {
    if (isSaving || task.completed) return;
    cancelRef.current = false;
    setEditText(task.text);
    setIsEditing(true);
  };

  const submitEdit = () => {
    if (cancelRef.current) { cancelRef.current = false; return; }
    const next = editText.trim();
    setIsEditing(false);
    if (next && next !== task.text) onEdit(task, next);
  };

  const cancelEdit = () => {
    cancelRef.current = true;
    setEditText(task.text);
    setIsEditing(false);
  };

  return (
    <View
      style={[
        st.card,
        task.completed
          ? { backgroundColor: 'rgba(255,255,255,0.55)', borderColor: 'transparent' }
          : { backgroundColor: C.panel, borderColor: palette.line, borderLeftColor: palette.strong },
        isSaving && { opacity: 0.55 },
      ]}
    >
      <View style={st.cardMain}>
        <Pressable
          onPress={() => !isSaving && onToggle(task)}
          disabled={isSaving}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed, disabled: isSaving }}
          accessibilityLabel={task.completed ? 'Mark pending' : 'Mark complete'}
          style={[
            st.checkbox,
            { borderColor: task.completed ? palette.strong : C.textSecondary },
            task.completed && { backgroundColor: palette.strong },
          ]}
        >
          {isSaving
            ? <ActivityIndicator size="small" color={palette.strong} style={{ transform: [{ scale: 0.6 }] }} />
            : task.completed ? <Feather name="check" size={13} color="#fff" /> : null}
        </Pressable>

        {isEditing ? (
          <TextInput
            ref={inputRef}
            value={editText}
            onChangeText={setEditText}
            onBlur={submitEdit}
            onSubmitEditing={submitEdit}
            returnKeyType="done"
            blurOnSubmit
            editable={!isSaving}
            style={[st.inlineEdit, { color: palette.strong, borderBottomColor: palette.strong }]}
            accessibilityLabel="Edit task"
          />
        ) : (
          <Text
            onLongPress={startEdit}
            suppressHighlighting
            style={[st.taskText, task.completed && st.taskTextDone]}
          >
            {task.text}
          </Text>
        )}
      </View>

      <View style={st.cardActions}>
        {isEditing ? (
          <>
            <Pressable onPress={submitEdit} hitSlop={8} style={st.actionBtn} accessibilityLabel="Save edit">
              <Feather name="check" size={17} color={palette.strong} />
            </Pressable>
            <Pressable onPressIn={cancelEdit} hitSlop={8} style={st.actionBtn} accessibilityLabel="Cancel edit">
              <Feather name="x" size={17} color={C.textSecondary} />
            </Pressable>
          </>
        ) : (
          <>
            {!task.completed && (
              <Pressable
                onPress={startEdit}
                disabled={isSaving}
                hitSlop={8}
                style={({ pressed }) => [st.actionBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Edit"
              >
                <Feather name="edit-2" size={15} color={C.textSecondary} />
              </Pressable>
            )}
            <Pressable
              onPress={() => onDelete(task.id)}
              disabled={isSaving}
              hitSlop={8}
              style={({ pressed }) => [st.actionBtn, pressed && { opacity: 0.6 }]}
              accessibilityLabel="Delete"
            >
              <Feather name="trash-2" size={15} color={C.danger} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
});


const DayColumn = memo(function DayColumn({
  dayGroup, width, maxHeight, savingId, onToggle, onEdit, onDelete, onDeleteDay, index,
}) {
  const palette = colorForDate(dayGroup.date);
  const total = dayGroup.tasks.length;
  const completed = dayGroup.tasks.filter((t) => t.completed).length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const isToday = dayGroup.date === today();

  const progressAnim = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, progressAnim]);

  return (
    <FadeUp delay={Math.min(index, 6) * 70} style={{ width }}>
      <View
        style={[
          st.column,
          { backgroundColor: palette.tint, borderColor: palette.line, maxHeight },
        ]}
      >
        <View style={[st.colBar, { backgroundColor: palette.strong }]} />
        <View style={[st.colHeader, { backgroundColor: palette.tintDeep, borderBottomColor: palette.line }]}>
          <View style={st.dateRow}>
            <View style={[st.dateDot, { backgroundColor: palette.strong }]} />
            <Text style={st.dateHeader} numberOfLines={1}>{dayGroup.displayDate}</Text>
            {isToday && (
              <View style={[st.todayBadge, { backgroundColor: palette.strong }]}>
                <Text style={st.todayBadgeText}>TODAY</Text>
              </View>
            )}
          </View>
          <View style={st.colActions}>
            <Text style={[st.taskCount, { color: palette.strong }]}>{completed} / {total} Done</Text>
            <Pressable
              onPress={() => onDeleteDay(dayGroup.date)}
              hitSlop={10}
              accessibilityLabel="Delete day pipeline"
              style={({ pressed }) => [st.deleteDayBtn, pressed && { backgroundColor: C.dangerSoft }]}
            >
              <Feather name="x" size={16} color={C.textSecondary} />
            </Pressable>
          </View>
          <View style={st.progressTrack}>
            <Animated.View
              style={[
                st.progressFill,
                { backgroundColor: palette.strong, width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
        </View>

        <ScrollView
          style={st.taskFeedScroll}
          contentContainerStyle={st.taskFeed}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {dayGroup.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              palette={palette}
              isSaving={savingId === task.id}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ScrollView>
      </View>
    </FadeUp>
  );
});


export default function ChronosTaskFlow() {
  const [fontsLoaded] = useFonts({
    [F.regular]: Inter_400Regular,
    [F.medium]: Inter_500Medium,
    [F.semi]: Inter_600SemiBold,
    [F.bold]: Inter_700Bold,
    [F.heavy]: Inter_800ExtraBold,
  });

  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const sidePad = wide ? 28 : 16;
  const colGap = 16;
  const colWidth = wide ? 320 : Math.min(width - sidePad * 2, 380);
  const barSpace = wide ? 120 : 170;

  const [apiError, setApiError] = useState('');
  const {
    data: allTasks,
    loading,
    errorText: loadError,
    refresh,
    mutate,
  } = useCachedResource('tasks', () => fetchResource('tasks'), {
    ttl: TTL.LIVE,
    initial: [],
    errorMessage: 'Failed to load tasks. Check your connection.',
  });
  const [savingId, setSavingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [taskInput, setTaskInput] = useState('');
  const [dateInput, setDateInput] = useState(today());
  const [showDate, setShowDate] = useState(false);

  const [timelineH, setTimelineH] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const timelineRef = useRef(null);
  const taskInputRef = useRef(null);

  /** the + button in the header jumps to the task field */
  const focusTaskInput = useCallback(() => {
    taskInputRef.current?.focus();
  }, []);

  const handleAddTask = async () => {
    if (!taskInput.trim() || !dateInput || submitting) return;
    setSubmitting(true);
    setApiError('');
    try {
      const created = await apiSend('/tasks/', 'POST', {
        text: taskInput.trim(),
        dueDate: dateInput,
        completed: false,
      });
      mutate((prev) => [created, ...(prev || [])]);
      setTaskInput('');
    } catch (err) {
      setApiError(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTask = useCallback(async (task) => {
    setSavingId(task.id);
    setApiError('');
    try {
      const updated = await apiSend(`/tasks/${task.id}/`, 'PATCH', { completed: !task.completed });
      mutate((prev) => (prev || []).map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setApiError(err.message || 'Could not update task.');
    } finally {
      setSavingId(null);
    }
  }, []);

  const editTask = useCallback(async (task, newText) => {
    if (!newText.trim()) return;
    setSavingId(task.id);
    setApiError('');
    try {
      const updated = await apiSend(`/tasks/${task.id}/`, 'PUT', {
        text: newText.trim(),
        dueDate: task.dueDate,
        completed: task.completed,
      });
      mutate((prev) => (prev || []).map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setApiError(err.message || 'Failed to update task.');
    } finally {
      setSavingId(null);
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    setSavingId(taskId);
    setApiError('');
    try {
      await apiSend(`/tasks/${taskId}/`, 'DELETE');
      mutate((prev) => (prev || []).filter((t) => t.id !== taskId));
    } catch (err) {
      setApiError(err.message || 'Could not delete task.');
    } finally {
      setSavingId(null);
    }
  }, []);

  const performDeleteDay = useCallback(async (dateStr, dayTasks) => {
    mutate((prev) => (prev || []).filter((t) => t.dueDate !== dateStr));
    try {
      await Promise.all(dayTasks.map((t) => apiSend(`/tasks/${t.id}/`, 'DELETE')));
    } catch (err) {
      console.log(err);
      setApiError('Day deletion partially failed. Refreshing...');
      refresh();
    }
  }, [mutate, refresh]);

  const deleteDay = useCallback((dateStr) => {
    const dayTasks = allTasks.filter((t) => t.dueDate === dateStr);
    Alert.alert(
      'Delete this day?',
      `All ${dayTasks.length} ${dayTasks.length === 1 ? 'task' : 'tasks'} on ${formatShortDate(dateStr)} will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete day', style: 'destructive', onPress: () => performDeleteDay(dateStr, dayTasks) },
      ],
    );
  }, [allTasks, performDeleteDay]);

  const visibleDayGroups = useMemo(() => {
    const grouped = allTasks.reduce((groups, task) => {
      const d = task.dueDate;
      if (!groups[d]) groups[d] = [];
      groups[d].push(task);
      return groups;
    }, {});

    return Object.keys(grouped)
      .filter((date) => grouped[date].some((t) => !t.completed))
      .sort((a, b) => new Date(a) - new Date(b))
      .map((date) => ({
        date,
        displayDate: formatDisplayDate(date),
        tasks: [...grouped[date]].sort(
          (a, b) => a.completed - b.completed || new Date(b.createdAt) - new Date(a.createdAt),
        ),
      }));
  }, [allTasks]);

  const pendingCount = useMemo(() => allTasks.filter((t) => !t.completed).length, [allTasks]);

  const snap = colWidth + colGap;
  const onScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / snap);
    setPageIndex(Math.max(0, Math.min(idx, visibleDayGroups.length - 1)));
  };
  const scrollToIndex = (i) => {
    timelineRef.current?.scrollTo({ x: i * snap, animated: true });
    setPageIndex(i);
  };

  const canSubmit = !!taskInput.trim() && !submitting;

  if (!fontsLoaded) {
    return (
      <View style={[st.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const dateChip = (
    <Pressable
      onPress={() => setShowDate(true)}
      disabled={submitting}
      accessibilityRole="button"
      accessibilityLabel="Choose due date"
      style={({ pressed }) => [st.dateChip, !wide && { flex: 1 }, pressed && { borderColor: C.accent }]}
    >
      <Feather name="calendar" size={15} color={C.accent} />
      <Text style={st.dateChipText} numberOfLines={1}>
        {dateInput === today() ? `Today · ${formatShortDate(dateInput)}` : formatShortDate(dateInput)}
      </Text>
    </Pressable>
  );

  const submitBtn = (
    <Pressable
      onPress={handleAddTask}
      disabled={!canSubmit}
      accessibilityRole="button"
      style={({ pressed }) => [
        st.submitBtn,
        !wide && { flex: 1 },
        !canSubmit && st.submitBtnDisabled,
        pressed && canSubmit && { transform: [{ translateY: 1 }] },
      ]}
    >
      {submitting
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={[st.submitText, !canSubmit && { color: C.textSecondary }]}>Archive Objective</Text>}
    </Pressable>
  );

  const taskField = (
    <TextInput
      ref={taskInputRef}
      value={taskInput}
      onChangeText={setTaskInput}
      placeholder="Inject new objective..."
      placeholderTextColor={C.textSecondary}
      editable={!submitting}
      returnKeyType="done"
      onSubmitEditing={handleAddTask}
      style={[st.taskInput, wide && { flex: 1 }]}
      accessibilityLabel="New task"
    />
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.appWrapper, { paddingHorizontal: sidePad }]}>
          {}
          <View style={[st.header, !wide && st.headerStacked]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.brand}>Tasks</Text>
              <Text style={st.brandNote}>one step at a time</Text>
            </View>
            <View style={[st.headerRight, !wide && { justifyContent: 'space-between' }]}>
              <Text style={st.status}>
                Active Pipeline: <Text style={st.statusStrong}>{pendingCount} Pending</Text>
              </Text>
              <Pressable
                onPress={focusTaskInput}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Add a task"
                style={({ pressed }) => [st.addBtn, pressed && { opacity: 0.8 }]}
              >
                <Feather name="plus" size={17} color="#fff" />
              </Pressable>
            </View>
          </View>

          {!!(apiError || loadError) && (
            <View style={{ marginTop: 12 }}>
              <ErrorPill
                message={apiError || loadError}
                onDismiss={() => { setApiError(''); }}
                onRetry={loadError ? refresh : undefined}
              />
            </View>
          )}

          {}
          {loading ? (
            <View style={st.centered}>
              <ActivityIndicator size="small" color={C.accent} />
              <Text style={st.centeredText}>Loading pipeline...</Text>
            </View>
          ) : visibleDayGroups.length === 0 ? (
            <View style={st.emptyState}>
              <View style={st.emptyIcon}><Feather name="check-circle" size={26} color={C.accent} /></View>
              <Text style={st.emptyTitle}>All pipelines clear.</Text>
              <Text style={st.emptyDesc}>
                Your timeline is empty. Use the control bar below to inject a new task.
              </Text>
            </View>
          ) : (
            <>
              {!wide && visibleDayGroups.length > 1 && (
                <View style={st.dots} accessibilityLabel="Day navigation">
                  {visibleDayGroups.map((g, i) => {
                    const p = colorForDate(g.date);
                    const active = i === pageIndex;
                    return (
                      <Pressable
                        key={g.date}
                        onPress={() => scrollToIndex(i)}
                        hitSlop={8}
                        accessibilityLabel={`Go to ${formatShortDate(g.date)}`}
                      >
                        <View
                          style={[
                            st.dot,
                            { backgroundColor: p.strong, opacity: active ? 1 : 0.35, width: active ? 22 : 8 },
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={{ flex: 1 }} onLayout={(e) => setTimelineH(e.nativeEvent.layout.height)}>
                <ScrollView
                  ref={timelineRef}
                  horizontal
                  showsHorizontalScrollIndicator={wide}
                  decelerationRate="fast"
                  snapToInterval={snap}
                  snapToAlignment="start"
                  disableIntervalMomentum
                  onMomentumScrollEnd={onScrollEnd}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={[
                    st.timeline,
                    { gap: colGap, paddingRight: wide ? 300 : sidePad },
                  ]}
                  style={{ flexGrow: 0 }}
                >
                  {visibleDayGroups.map((dayGroup, i) => (
                    <DayColumn
                      key={dayGroup.date}
                      index={i}
                      dayGroup={dayGroup}
                      width={colWidth}
                      maxHeight={timelineH ? Math.max(220, timelineH - barSpace - 16) : undefined}
                      savingId={savingId}
                      onToggle={toggleTask}
                      onEdit={editTask}
                      onDelete={deleteTask}
                      onDeleteDay={deleteDay}
                    />
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          {}
          <View pointerEvents="box-none" style={[st.controlBarHost, { paddingHorizontal: sidePad }]}>
            <View style={[st.controlBar, wide ? st.controlBarWide : st.controlBarNarrow]}>
              {wide ? (
                <View style={st.inputGroupWide}>
                  {taskField}
                  {dateChip}
                  {submitBtn}
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {taskField}
                  <View style={st.inputRowNarrow}>
                    {dateChip}
                    {submitBtn}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <DatePickerControl
        visible={showDate}
        value={dateInput}
        onChange={setDateInput}
        onClose={() => setShowDate(false)}
      />
    </SafeAreaView>
  );
}


const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  appWrapper: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 34 : 18, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  headerStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  brand: { fontFamily: F.heavy, fontSize: 25, letterSpacing: -1.2, color: C.text },
  brandNote: { fontFamily: F.regular, fontSize: 13, color: C.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  status: { fontFamily: F.regular, fontSize: 14, color: C.textSecondary },
  statusStrong: { fontFamily: F.semi, color: C.text },
  addBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  errorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start',
    backgroundColor: 'rgba(192,57,43,0.09)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.30)',
    borderRadius: 100, paddingVertical: 7, paddingHorizontal: 14, maxWidth: '100%',
  },
  errorPillText: { flexShrink: 1, fontFamily: F.medium, fontSize: 12.5, color: C.danger },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 120 },
  centeredText: { fontFamily: F.regular, fontSize: 14, color: C.textSecondary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 140 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(45,106,79,0.10)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: F.bold, fontSize: 22, color: C.text, marginBottom: 8, letterSpacing: -0.4 },
  emptyDesc: { fontFamily: F.regular, fontSize: 14.5, lineHeight: 22, color: C.textSecondary, textAlign: 'center', maxWidth: 400 },

  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 14, paddingBottom: 2 },
  dot: { height: 8, borderRadius: 4 },

  timeline: { paddingTop: 16, alignItems: 'flex-start' },

  column: {
    borderWidth: 1, borderRadius: 14, overflow: 'hidden',
    ...shadow(8, 0.10, 20),
  },
  colBar: { height: 5 },
  colHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  dateDot: { width: 9, height: 9, borderRadius: 5 },
  dateHeader: { flexShrink: 1, fontFamily: F.bold, fontSize: 16, letterSpacing: -0.3, color: C.text },
  todayBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  todayBadgeText: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 0.6, color: '#fff' },
  colActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  taskCount: { fontFamily: F.semi, fontSize: 12.5 },
  deleteDayBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  taskFeedScroll: { flexGrow: 0, flexShrink: 1 },
  taskFeed: { padding: 12, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    borderWidth: 1, borderLeftWidth: 4, borderRadius: 9, paddingVertical: 12, paddingHorizontal: 12,
    ...shadow(2, 0.05, 5),
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  taskText: { flex: 1, fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, color: C.text },
  taskTextDone: { color: C.textSecondary, textDecorationLine: 'line-through' },
  inlineEdit: {
    flex: 1, fontFamily: F.medium, fontSize: 14.5, paddingVertical: 2, paddingHorizontal: 0,
    borderBottomWidth: 1.5, borderStyle: 'dashed',
  },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  controlBarHost: {
    position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'ios' ? 8 : 16,
    alignItems: 'center', zIndex: 100,
  },
  controlBar: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: C.border,
    ...shadow(14, 0.16, 34),
  },
  controlBarWide: { maxWidth: 800, borderRadius: 50, padding: 10 },
  controlBarNarrow: { borderRadius: 26, padding: 10 },
  inputGroupWide: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputRowNarrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskInput: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border, borderRadius: 30,
    paddingHorizontal: 20, paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontFamily: F.medium, fontSize: 15, color: C.text,
  },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border, borderRadius: 30,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, minWidth: 150,
  },
  dateChipText: { fontFamily: F.medium, fontSize: 13.5, color: C.text, flexShrink: 1 },
  submitBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, borderRadius: 30,
    paddingHorizontal: 24, paddingVertical: Platform.OS === 'ios' ? 14 : 12, minHeight: 46,
    ...shadow(4, 0.25, 10),
  },
  submitBtnDisabled: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, elevation: 0, shadowOpacity: 0 },
  submitText: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },

  dateOverlay: { flex: 1, backgroundColor: 'rgba(26,26,46,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dateSheet: {
    backgroundColor: '#fff', borderRadius: 16, padding: 12, width: '100%', maxWidth: 360,
    ...shadow(16, 0.25, 40),
  },
  dateDone: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  dateDoneText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});