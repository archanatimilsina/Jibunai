/**
 * Alarm store — the Alarm system + Remind-me subsystem own their data here.
 *
 * AsyncStorage `jibunai:alarms:v1` (works offline; no backend):
 *   alarm = {
 *     id, title, note,
 *     collection: 'alarm' | 'remindme',
 *     kind: 'once' | 'daily' | 'weekly',
 *     hour, minute,
 *     date: ISO string | null,          // once
 *     weekday: 0-6 | null,              // legacy single (migrated)
 *     weekdays: number[] | null,        // weekly multi-day; [] = one-time fallback
 *     enabled: bool,
 *     notificationId: string | null,   // legacy primary (compat)
 *     notificationIds: string[],       // all OS handles (multi-weekday + pre-alert)
 *     skipNext: number | null,         // ms epoch to skip once
 *     snoozeEnabled: bool, snoozeMinutes: number,
 *     snoozeUntil: number | null, snoozeCount: number, maxSnoozes: number (0=∞),
 *     preAlertMin: number,             // 0 = off
 *     group: string,                   // 'none' | custom tag
 *     autoDelete: bool,                // once/remindme: delete instead of disable
 *     createdAt, updatedAt,
 *   }
 *
 * Trash: `jibunai:alarms:trash:v1` (30-day recovery).
 * Pause memory: `jibunai:alarms:paused:v1` { paused, scope, prev }.
 * Every mutation goes through `syncAlarmNotification()` (scheduler.js).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { cancelAllForAlarm, nextFireMs, rescheduleEnabledAlarms, syncAlarmNotification } from './scheduler';

const STORE_KEY = 'jibunai:alarms:v1';
const TRASH_KEY = 'jibunai:alarms:trash:v1';
const PAUSED_KEY = 'jibunai:alarms:paused:v1';

export const ALARM_KINDS = ['once', 'daily', 'weekly'];
export const LABEL_SUGGESTIONS = ['Wake up', 'Gym', 'Medicine', 'Work', 'Study', 'Meeting', 'Water', 'Prayer'];
const RECENT_KEY = 'jibunai:alarms:recent-labels:v1';

let alarms = [];
let loaded = false;
let loadPromise = null;
const listeners = new Set();

const notify = () => {
  const snap = [...alarms];
  listeners.forEach((cb) => {
    try {
      cb(snap);
    } catch {
      /* ignore */
    }
  });
};

async function persist() {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(alarms));
  } catch {
    /* in-memory copy still drives this session */
  }
  notify();
}

function shape(a) {
  const weekdays = Array.isArray(a.weekdays)
    ? a.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : Number.isInteger(a.weekday) && a.weekday >= 0 && a.weekday <= 6
      ? [a.weekday]
      : a.kind === 'weekly'
        ? []
        : null;
  const ids = Array.isArray(a.notificationIds)
    ? a.notificationIds.filter(Boolean)
    : a.notificationId
      ? [a.notificationId]
      : [];
  return {
    ...a,
    title: typeof a.title === 'string' ? a.title : 'Alarm',
    note: typeof a.note === 'string' ? a.note : '',
    weekdays,
    notificationIds: ids,
    notificationId: ids[0] || a.notificationId || null,
    skipNext: a.skipNext || null,
    snoozeEnabled: a.snoozeEnabled !== false,
    snoozeMinutes: Number.isInteger(a.snoozeMinutes) && a.snoozeMinutes > 0 ? a.snoozeMinutes : 5,
    snoozeUntil: a.snoozeUntil || null,
    snoozeCount: Number.isInteger(a.snoozeCount) ? a.snoozeCount : 0,
    maxSnoozes: Number.isInteger(a.maxSnoozes) ? a.maxSnoozes : 0,
    preAlertMin: Number.isInteger(a.preAlertMin) && a.preAlertMin > 0 ? a.preAlertMin : 0,
    group: typeof a.group === 'string' && a.group ? a.group : 'none',
    autoDelete: a.autoDelete === true,
  };
}

export async function loadAlarms() {
  if (loaded) return [...alarms];
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      alarms = (Array.isArray(parsed) ? parsed : []).map(shape);
    } catch {
      alarms = [];
    }
    loaded = true;
    return [...alarms];
  })();
  return loadPromise;
}

export function subscribeAlarms(listener) {
  listeners.add(listener);
  loadAlarms().then(() => listener([...alarms]));
  return () => listeners.delete(listener);
}

export function getAlarmsSync() {
  return [...alarms];
}

const uid = () => `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => new Date().toISOString();

function validate({ kind, hour, minute, date, weekdays }) {
  if (!ALARM_KINDS.includes(kind)) throw new Error('Pick once, daily or weekly.');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('Hour must be 0–23.');
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('Minute must be 0–59.');
  if (kind === 'once') {
    const d = date ? new Date(date) : null;
    if (!d || Number.isNaN(d.getTime())) throw new Error('Pick a date and time.');
    if (d.getTime() <= Date.now()) throw new Error('That moment is already past.');
  }
  if (kind === 'weekly' && weekdays && !weekdays.every((d) => d >= 0 && d <= 6)) {
    throw new Error('Pick weekdays 0–6.');
  }
}

async function rememberLabel(title) {
  const t = (title || '').trim();
  if (!t) return;
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = [t, ...(Array.isArray(list) ? list.filter((x) => x !== t) : [])].slice(0, 8);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export async function getRecentLabels() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function createAlarm(input) {
  await loadAlarms();
  const clean = shape({
    id: uid(),
    title: (input.title || 'Alarm').trim() || 'Alarm',
    note: input.note || '',
    collection: input.collection === 'remindme' ? 'remindme' : 'alarm',
    kind: input.kind || 'daily',
    hour: Number(input.hour ?? 8),
    minute: Number(input.minute ?? 0),
    date: input.date || null,
    weekday: input.weekday ?? null,
    weekdays: Array.isArray(input.weekdays) ? input.weekdays : input.weekday ?? null,
    enabled: input.enabled !== false,
    notificationId: null,
    notificationIds: [],
    skipNext: null,
    snoozeEnabled: input.snoozeEnabled !== false,
    snoozeMinutes: Number(input.snoozeMinutes ?? 5),
    snoozeUntil: null,
    snoozeCount: 0,
    maxSnoozes: Number(input.maxSnoozes ?? 0),
    preAlertMin: Number(input.preAlertMin ?? 0),
    group: input.group || 'none',
    autoDelete: input.autoDelete === true,
    createdAt: stamp(),
    updatedAt: stamp(),
  });
  validate(clean);
  alarms = [...alarms, clean];
  await persist();
  const ids = await syncAlarmNotification(clean);
  clean.notificationIds = ids;
  clean.notificationId = ids[0] || null;
  await persist();
  rememberLabel(clean.title).catch(() => {});
  return clean;
}

export async function updateAlarm(id, patch) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  if (!found) throw new Error('Alarm not found.');
  const next = shape({ ...found, ...patch, id: found.id, updatedAt: stamp() });
  validate(next);
  // Changing time/days clears skip + snooze (stale overrides).
  if (patch.hour !== undefined || patch.minute !== undefined || patch.date !== undefined || patch.weekdays !== undefined || patch.weekday !== undefined || patch.kind !== undefined) {
    next.skipNext = null;
    next.snoozeUntil = null;
  }
  alarms = alarms.map((a) => (a.id === id ? next : a));
  await persist();
  const ids = await syncAlarmNotification(next);
  next.notificationIds = ids;
  next.notificationId = ids[0] || null;
  await persist();
  if (patch.title) rememberLabel(next.title).catch(() => {});
  return next;
}

export async function setAlarmEnabled(id, enabled) {
  return updateAlarm(id, { enabled });
}

/** Enable/disable many alarms at once (bulk group action). */
export async function setAlarmsEnabled(ids, enabled) {
  await loadAlarms();
  const set = new Set(ids);
  const touched = [];
  alarms = alarms.map((a) => {
    if (!set.has(a.id) || a.enabled === enabled) return a;
    const next = shape({ ...a, enabled, updatedAt: stamp() });
    touched.push(next);
    return next;
  });
  await persist();
  for (const a of touched) {
    const newIds = await syncAlarmNotification(a);
    a.notificationIds = newIds;
    a.notificationId = newIds[0] || null;
  }
  await persist();
  return touched.length;
}

/* ---------------- trash (30-day recovery) ---------------- */

async function readTrash() {
  try {
    const raw = await AsyncStorage.getItem(TRASH_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function pushTrash(items) {
  try {
    const trash = await readTrash();
    const stamped = items.map((a) => ({ ...a, trashedAt: Date.now() }));
    await AsyncStorage.setItem(TRASH_KEY, JSON.stringify([...stamped, ...trash].slice(0, 100)));
  } catch {
    /* ignore */
  }
}

export async function listTrash() {
  const trash = await readTrash();
  const cutoff = Date.now() - 30 * 86400000;
  return trash.filter((t) => (t.trashedAt || 0) > cutoff);
}

export async function restoreAlarms(ids) {
  const trash = await readTrash();
  const set = new Set(ids);
  const back = trash.filter((t) => set.has(t.id));
  if (!back.length) return 0;
  await loadAlarms();
  const existing = new Set(alarms.map((a) => a.id));
  const fresh = back.filter((t) => !existing.has(t.id)).map((t) => {
    const { trashedAt, ...rest } = t;
    return shape({ ...rest, enabled: true, notificationIds: [], notificationId: null, updatedAt: stamp() });
  });
  alarms = [...fresh, ...alarms];
  await persist();
  for (const a of fresh) {
    const newIds = await syncAlarmNotification(a);
    a.notificationIds = newIds;
    a.notificationId = newIds[0] || null;
  }
  await persist();
  try {
    await AsyncStorage.setItem(TRASH_KEY, JSON.stringify(trash.filter((t) => !set.has(t.id))));
  } catch {
    /* ignore */
  }
  return fresh.length;
}

export async function clearTrash() {
  try {
    await AsyncStorage.removeItem(TRASH_KEY);
  } catch {
    /* ignore */
  }
}

export async function deleteAlarm(id) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  alarms = alarms.filter((a) => a.id !== id);
  await persist();
  if (found) {
    await cancelAllForAlarm(found);
    pushTrash([found]).catch(() => {});
  }
}

/** Delete many alarms at once (bulk group action). Returns deleted items for Undo. */
export async function deleteAlarms(ids) {
  await loadAlarms();
  const set = new Set(ids);
  const gone = alarms.filter((a) => set.has(a.id));
  alarms = alarms.filter((a) => !set.has(a.id));
  await persist();
  for (const a of gone) await cancelAllForAlarm(a);
  pushTrash(gone).catch(() => {});
  return gone;
}

export async function duplicateAlarm(id) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  if (!found) throw new Error('Alarm not found.');
  return createAlarm({
    title: `${found.title} (copy)`,
    note: found.note,
    collection: found.collection,
    kind: found.kind,
    hour: found.hour,
    minute: found.minute,
    date: found.date,
    weekday: found.weekday,
    weekdays: found.weekdays,
    enabled: found.enabled,
    snoozeMinutes: found.snoozeMinutes,
    preAlertMin: found.preAlertMin,
    group: found.group,
  });
}

/* ---------------- snooze + skip ---------------- */

export async function snoozeAlarm(id) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  if (!found) throw new Error('Alarm not found.');
  if (found.snoozeEnabled === false) throw new Error('Snooze is off for this alarm.');
  if (found.maxSnoozes > 0 && found.snoozeCount >= found.maxSnoozes) throw new Error('No snoozes left.');
  const until = Date.now() + found.snoozeMinutes * 60000;
  return updateAlarm(id, { snoozeUntil: until, snoozeCount: (found.snoozeCount || 0) + 1 });
}

export async function dismissAlarm(id) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  if (!found) return null;
  // Dismiss clears pending snooze; one-shot without repeat retires (or auto-deletes).
  if (found.kind === 'once' && !found.snoozeUntil) {
    if (found.autoDelete) {
      await deleteAlarm(id);
      return null;
    }
  }
  return updateAlarm(id, { snoozeUntil: null, snoozeCount: 0 });
}

export async function skipNextRing(id) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  if (!found) throw new Error('Alarm not found.');
  const t = nextFireMs(found);
  if (t === null) throw new Error('Nothing to skip.');
  return updateAlarm(id, { skipNext: t, snoozeUntil: null, snoozeCount: 0 });
}

export async function clearSkip(id) {
  return updateAlarm(id, { skipNext: null });
}

/* ---------------- master pause / resume ---------------- */

export async function getPauseState() {
  try {
    const raw = await AsyncStorage.getItem(PAUSED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function pauseAll(scope = 'all') {
  await loadAlarms();
  const prev = {};
  const targets = alarms.filter((a) => {
    if (!a.enabled) return false;
    if (scope !== 'all' && a.collection !== scope) return false;
    return true;
  });
  targets.forEach((a) => {
    prev[a.id] = true;
  });
  try {
    await AsyncStorage.setItem(PAUSED_KEY, JSON.stringify({ paused: true, scope, prev, at: Date.now() }));
  } catch {
    /* ignore */
  }
  return setAlarmsEnabled(Object.keys(prev), false);
}

export async function resumeAll() {
  let saved = null;
  try {
    const raw = await AsyncStorage.getItem(PAUSED_KEY);
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  try {
    await AsyncStorage.removeItem(PAUSED_KEY);
  } catch {
    /* ignore */
  }
  if (saved?.prev && Object.keys(saved.prev).length) {
    return setAlarmsEnabled(Object.keys(saved.prev), true);
  }
  return 0;
}

/* ---------------- backup / restore ---------------- */

export function exportAlarmsJSON() {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), alarms }, null, 2);
}

export async function importAlarmsJSON(text, mode = 'merge') {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.alarms;
  if (!Array.isArray(list)) throw new Error('Invalid backup file.');
  await loadAlarms();
  if (mode === 'replace') {
    for (const a of alarms) await cancelAllForAlarm(a);
    alarms = [];
  }
  let added = 0;
  for (const raw of list) {
    try {
      const clean = shape({
        ...raw,
        id: raw.id && !alarms.some((a) => a.id === raw.id) ? raw.id : uid(),
        notificationIds: [],
        notificationId: null,
        updatedAt: stamp(),
      });
      validate(clean);
      alarms.push(clean);
      added += 1;
    } catch {
      /* skip invalid rows */
    }
  }
  await persist();
  const { handles } = await rescheduleEnabledAlarms(alarms);
  alarms = alarms.map((a) => (handles[a.id] !== undefined
    ? { ...a, notificationIds: handles[a.id], notificationId: handles[a.id][0] || null }
    : a));
  await persist();
  return added;
}

export function useAlarms() {
  const [list, setList] = useState([...alarms]);
  useEffect(() => subscribeAlarms(setList), []);
  return list;
}

/**
 * Startup pass: re-register every enabled alarm (reboot-safe), auto-disable
 * fired one-time alarms (or auto-delete when set), drop stale OS handles.
 */
export async function bootAlarms() {
  await loadAlarms();
  alarms = alarms.map(shape);
  const { retired, handles } = await rescheduleEnabledAlarms(alarms);
  const retiredSet = new Set(retired);
  const autoDeleted = [];
  alarms = alarms
    .map((a) => {
      if (retiredSet.has(a.id)) {
        if (a.autoDelete) {
          autoDeleted.push(a);
          return null;
        }
        return { ...a, enabled: false, notificationIds: [], notificationId: null, snoozeUntil: null, skipNext: null, updatedAt: stamp() };
      }
      if (handles[a.id] !== undefined) {
        return { ...a, notificationIds: handles[a.id], notificationId: handles[a.id][0] || null, updatedAt: stamp() };
      }
      return a;
    })
    .filter(Boolean);
  await persist();
  if (autoDeleted.length) pushTrash(autoDeleted).catch(() => {});
  return { retired: retired.length };
}
