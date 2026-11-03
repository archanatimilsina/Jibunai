/**
 * Date-keeper store — important dates and their reminder intervals.
 *
 * AsyncStorage `jibunai:datekeeper:v1` (offline-first, no backend):
 *   entry = {
 *     id, title, note,
 *     month: 1-12, day: 1-31, year: number | null (for age/anniversary count),
 *     category: 'birthday' | 'anniversary' | 'appointment' | 'bill' | 'custom',
 *     repeat: 'none' | 'daily' | 'monthly' | 'yearly',
 *     hour, minute,            // reminder time of day
 *     enabled: bool,
 *     notificationId: string | null,
 *     createdAt, updatedAt,
 *   }
 *
 * Every mutation re-syncs the OS notification (scheduler.js).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { cancelRawNotification } from '../notifications/reminders';
import { rescheduleDateKeeper, syncDateNotification } from './scheduler';

const STORE_KEY = 'jibunai:datekeeper:v1';

export const CATEGORIES = [
  { key: 'birthday', label: 'Birthday', icon: 'gift' },
  { key: 'anniversary', label: 'Anniversary', icon: 'heart' },
  { key: 'appointment', label: 'Appointment', icon: 'calendar' },
  { key: 'bill', label: 'Bill', icon: 'credit-card' },
  { key: 'custom', label: 'Custom', icon: 'star' },
];

export const REPEATS = [
  { key: 'none', label: 'No reminder' },
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

let entries = [];
let loaded = false;
let loadPromise = null;
const listeners = new Set();

const notify = () => {
  const snap = [...entries];
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
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(entries));
  } catch {
    /* in-memory copy still drives this session */
  }
  notify();
}

export async function loadDates() {
  if (loaded) return [...entries];
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      entries = [];
    }
    loaded = true;
    return [...entries];
  })();
  return loadPromise;
}

export function subscribeDates(listener) {
  listeners.add(listener);
  loadDates().then(() => listener([...entries]));
  return () => listeners.delete(listener);
}

const uid = () => `dk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => new Date().toISOString();
const validCats = new Set(CATEGORIES.map((c) => c.key));
const validRepeats = new Set(REPEATS.map((r) => r.key));

function validate(e) {
  if (!e.title || !e.title.trim()) throw new Error('Give the date a title.');
  if (!Number.isInteger(e.month) || e.month < 1 || e.month > 12) throw new Error('Month must be 1–12.');
  if (!Number.isInteger(e.day) || e.day < 1 || e.day > 31) throw new Error('Day must be 1–31.');
  if (e.year !== null && e.year !== undefined && (!Number.isInteger(e.year) || e.year < 1900 || e.year > 2100)) {
    throw new Error('Year looks wrong.');
  }
  if (!validCats.has(e.category)) throw new Error('Pick a category.');
  if (!validRepeats.has(e.repeat)) throw new Error('Pick a reminder interval.');
  if (!Number.isInteger(e.hour) || e.hour < 0 || e.hour > 23) throw new Error('Hour must be 0–23.');
  if (!Number.isInteger(e.minute) || e.minute < 0 || e.minute > 59) throw new Error('Minute must be 0–59.');
  const daysInMonth = new Date(e.year || 2024, e.month, 0).getDate();
  if (e.day > daysInMonth && !(e.month === 2 && e.day === 29)) {
    throw new Error(`That month has ${daysInMonth} days.`);
  }
}

export async function createDate(input) {
  await loadDates();
  const clean = {
    id: uid(),
    title: (input.title || '').trim(),
    note: (input.note || '').trim(),
    month: Number(input.month),
    day: Number(input.day),
    year: input.year === null || input.year === undefined || input.year === '' ? null : Number(input.year),
    category: input.category || 'custom',
    repeat: input.repeat || 'yearly',
    hour: Number(input.hour ?? 9),
    minute: Number(input.minute ?? 0),
    enabled: input.enabled !== false,
    notificationId: null,
    createdAt: stamp(),
    updatedAt: stamp(),
  };
  validate(clean);
  entries = [...entries, clean];
  await persist();
  clean.notificationId = await syncDateNotification(clean);
  await persist();
  return clean;
}

export async function updateDate(id, patch) {
  await loadDates();
  const found = entries.find((e) => e.id === id);
  if (!found) throw new Error('Date not found.');
  const next = { ...found, ...patch, id: found.id, updatedAt: stamp() };
  if (typeof next.title === 'string') next.title = next.title.trim();
  if (typeof next.note === 'string') next.note = next.note.trim();
  validate(next);
  entries = entries.map((e) => (e.id === id ? next : e));
  await persist();
  next.notificationId = await syncDateNotification(next);
  await persist();
  return next;
}

export async function setDateEnabled(id, enabled) {
  return updateDate(id, { enabled });
}

export async function deleteDate(id) {
  await loadDates();
  const found = entries.find((e) => e.id === id);
  entries = entries.filter((e) => e.id !== id);
  await persist();
  if (found) await cancelRawNotification(found.notificationId);
}

export async function duplicateDate(id) {
  await loadDates();
  const found = entries.find((e) => e.id === id);
  if (!found) throw new Error('Date not found.');
  return createDate({ ...found, title: `${found.title} copy` });
}

export function useDateKeeper() {
  const [list, setList] = useState([...entries]);
  useEffect(() => subscribeDates(setList), []);
  return list;
}

/** Startup pass: re-register every enabled reminder (reboot-safe). */
export async function bootDateKeeper() {
  await loadDates();
  const { handles } = await rescheduleDateKeeper(entries);
  entries = entries.map((e) => (handles[e.id] !== undefined
    ? { ...e, notificationId: handles[e.id], updatedAt: stamp() }
    : e));
  await persist();
}
