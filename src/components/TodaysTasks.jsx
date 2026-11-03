import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { C, mono, radii, shadow } from '../theme';
import useOfflineCollection from '../hooks/useOfflineCollection';
import { TTL } from '../api/resources';

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISODate(new Date());

/**
 * "Still to do" — the open tasks you have to deal with.
 *
 * Everything that is not done yet and is due today *or was due earlier*
 * (overdue) is listed, so the block answers one question: what is still
 * waiting for me? Overdue tasks come first, oldest on top.
 */
export default function TodaysTasks({ onNavigate }) {
  const {
    items: data,
    loading,
    refreshing,
    errorText,
    refresh,
    update,
  } = useOfflineCollection('tasks', {
    ttl: TTL.LIVE,
    initial: [],
    createPath: '/tasks/',
    itemPath: (id) => `/tasks/${id}/`,
  });

  const [busyId, setBusyId] = useState(null);

  const today = todayISO();

  const pending = useMemo(() => {
    const open = (data || []).filter((t) => !t.completed && t.dueDate && t.dueDate <= today);
    // oldest first — the overdue ones bubble to the top
    return open.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [data, today]);

  const overdueCount = useMemo(
    () => pending.filter((t) => t.dueDate < today).length,
    [pending, today],
  );

  /** tick a task off straight from the home screen */
  const complete = useCallback(async (task) => {
    setBusyId(task.id);
    try {
      await update(task.id, { completed: true });
    } catch {
      // queued offline or failed — the next refresh will tell the truth
    } finally {
      setBusyId(null);
    }
  }, [update]);

  const openChronos = useCallback(() => onNavigate?.('chronos'), [onNavigate]);

  const subtitle = loading
    ? 'Checking your tasks…'
    : errorText
      ? errorText
      : pending.length
        ? `${pending.length} task${pending.length === 1 ? '' : 's'} left`
          + (overdueCount ? ` · ${overdueCount} overdue` : ' · due today')
        : 'Nothing left — the day is yours';

  return (
    <View style={st.wrap}>
      <View style={st.headRow}>
        <View style={st.headText}>
          <Text style={st.headTitle}>Still to do</Text>
          <Text style={st.headSub}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={refresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh tasks"
          disabled={loading || refreshing}
          style={({ pressed }) => [st.refreshBtn, pressed && { opacity: 0.6 }]}
        >
          {loading || refreshing ? (
            <ActivityIndicator size="small" color={C.green} />
          ) : (
            <Feather name="refresh-cw" size={14} color={C.green} />
          )}
        </Pressable>
      </View>

      {!loading && pending.length === 0 ? (
        <View style={[st.box, st.emptyBox, shadow(1)]}>
          <Feather name="check-circle" size={16} color={C.green} />
          <Text style={st.emptyText}>
            Nothing left to do. Anything you add to Chronos shows up here.
          </Text>
        </View>
      ) : (
        <View style={[st.box, shadow(1)]}>
          <View style={st.listPad}>
            {pending.map((task, i) => {
              const busy = busyId === task.id;
              return (
                <View
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.text}. Open Chronos`}
                  style={[st.item, i > 0 && st.itemSep]}
                >
                  <Pressable
                    onPress={() => complete(task)}
                    disabled={busy}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: false, disabled: busy }}
                    accessibilityLabel={`Mark ${task.text} as done`}
                    style={({ pressed }) => [st.check, pressed && { opacity: 0.6 }]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={C.green} />
                    ) : (
                      <Feather name="square" size={18} color={C.soft} />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={openChronos}
                    accessibilityLabel={`${task.text}. Open Chronos`}
                    style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={st.itemTitle} numberOfLines={2}>
                      {task.text}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 24 },

  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headText: { flex: 1 },
  headTitle: { fontSize: 17, fontWeight: '800', color: C.dark },
  headSub: { fontFamily: mono, fontSize: 10.5, letterSpacing: 0.4, color: C.soft, marginTop: 3 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderLt,
  },

  // the outer container the tasks sit in
  box: {
    backgroundColor: C.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.borderLt,
    overflow: 'hidden',
  },
  // breathing room between the container edge and the first/last task
  listPad: { paddingVertical: 8, paddingHorizontal: 10 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  itemSep: { borderTopWidth: 1, borderTopColor: C.borderLt },
  check: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { flex: 1, fontSize: 14.5, fontWeight: '600', color: C.dark, lineHeight: 21 },

  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 18,
  },
  emptyText: { flex: 1, fontSize: 12.5, color: C.soft, lineHeight: 18 },
});
