/**
 * Alarm store — the Alarm system + Remind-me subsystem own their data here.
 *
 * AsyncStorage `jibunai:alarms:v1` (works offline; no backend):
 *   alarm = {
 *     id, title,
 *     collection: 'alarm' | 'remindme',
 *     kind: 'once' | 'daily' | 'weekly',
 *     hour, minute,            // all kinds
 *     date: ISO string | null, // once
 *     weekday: 0-6 | null,     // weekly (0 = Sunday)
 *     enabled: bool,
 *     notificationId: string | null, // OS schedule handle
 *     createdAt, updatedAt,
 *   }
 *
 * Every mutation goes through `syncAlarmNotification()` (scheduler.js) so the
 * OS schedule always mirrors the store. Firing itself needs no network.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { cancelRawNotification } from '../notifications/reminders';
import { rescheduleEnabledAlarms, syncAlarmNotification } from './scheduler';

const STORE_KEY = 'jibunai:alarms:v1';

export const ALARM_KINDS = ['once', 'daily', 'weekly'];

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
  // The OS handle must survive restarts (needed to cancel/reschedule).
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(alarms));
  } catch {
    /* in-memory copy still drives this session */
  }
  notify();
}

export async function loadAlarms() {
  if (loaded) return [...alarms];
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      alarms = Array.isArray(parsed) ? parsed : [];
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

function validate({ kind, hour, minute, date, weekday }) {
  if (!ALARM_KINDS.includes(kind)) throw new Error('Pick once, daily or weekly.');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('Hour must be 0–23.');
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('Minute must be 0–59.');
  if (kind === 'once') {
    const d = date ? new Date(date) : null;
    if (!d || Number.isNaN(d.getTime())) throw new Error('Pick a date and time.');
    if (d.getTime() <= Date.now()) throw new Error('That moment is already past.');
  }
  if (kind === 'weekly' && (weekday === null || weekday === undefined || weekday < 0 || weekday > 6)) {
    throw new Error('Pick a weekday.');
  }
}

export async function createAlarm(input) {
  await loadAlarms();
  const clean = {
    id: uid(),
    title: (input.title || 'Alarm').trim() || 'Alarm',
    collection: input.collection === 'remindme' ? 'remindme' : 'alarm',
    kind: input.kind || 'daily',
    hour: Number(input.hour ?? 8),
    minute: Number(input.minute ?? 0),
    date: input.date || null,
    weekday: input.weekday ?? null,
    enabled: input.enabled !== false,
    notificationId: null,
    createdAt: stamp(),
    updatedAt: stamp(),
  };
  validate(clean);
  alarms = [...alarms, clean];
  await persist();
  clean.notificationId = await syncAlarmNotification(clean);
  await persist();
  return clean;
}

export async function updateAlarm(id, patch) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  if (!found) throw new Error('Alarm not found.');
  const next = { ...found, ...patch, id: found.id, updatedAt: stamp() };
  validate(next);
  alarms = alarms.map((a) => (a.id === id ? next : a));
  await persist();
  next.notificationId = await syncAlarmNotification(next);
  await persist();
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
    const next = { ...a, enabled, updatedAt: stamp() };
    touched.push(next);
    return next;
  });
  await persist();
  for (const a of touched) {
    a.notificationId = await syncAlarmNotification(a);
  }
  await persist();
  return touched.length;
}

export async function deleteAlarm(id) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  alarms = alarms.filter((a) => a.id !== id);
  await persist();
  if (found) await cancelRawNotification(found.notificationId);
}

/** Delete many alarms at once (bulk group action). */
export async function deleteAlarms(ids) {
  await loadAlarms();
  const set = new Set(ids);
  const gone = alarms.filter((a) => set.has(a.id));
  alarms = alarms.filter((a) => !set.has(a.id));
  await persist();
  for (const a of gone) await cancelRawNotification(a.notificationId);
  return gone.length;
}

export async function duplicateAlarm(id) {
  await loadAlarms();
  const found = alarms.find((a) => a.id === id);
  if (!found) throw new Error('Alarm not found.');
  return createAlarm({
    title: `${found.title} copy`,
    collection: found.collection,
    kind: found.kind,
    hour: found.hour,
    minute: found.minute,
    date: found.date,
    weekday: found.weekday,
    enabled: found.enabled,
  });
}

export function useAlarms() {
  const [list, setList] = useState([...alarms]);
  useEffect(() => subscribeAlarms(setList), []);
  return list;
}

/**
 * Startup pass: re-register every enabled alarm (reboot-safe), auto-disable
 * fired one-time alarms, drop stale OS handles. Call once per launch.
 */
export async function bootAlarms() {
  await loadAlarms();
  const { retired, handles } = await rescheduleEnabledAlarms(alarms);
  const retiredSet = new Set(retired);
  alarms = alarms.map((a) => {
    if (retiredSet.has(a.id)) return { ...a, enabled: false, notificationId: null, updatedAt: stamp() };
    if (handles[a.id] !== undefined) return { ...a, notificationId: handles[a.id], updatedAt: stamp() };
    return a;
  });
  await persist();
  return { retired: retired.length };
}
