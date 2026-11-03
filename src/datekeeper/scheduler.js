/**
 * Date-keeper scheduler — mirrors the store into OS notifications.
 *
 * Repeats supported: none (no notification), daily, monthly, yearly.
 * - `syncDateNotification(entry)` cancels the old schedule and (re)schedules
 *   when the entry is enabled and has a repeat. Returns the id (or null).
 * - `nextOccurrenceMs(entry, from)` → next calendar occurrence for countdown
 *   + sorting. Leap-day (Feb 29) rolls to Feb 28 on non-leap years.
 * - `rescheduleDateKeeper(list)` → startup pass, returns { rescheduled }.
 */
import {
  buildTrigger,
  cancelRawNotification,
  scheduleRawNotification,
} from '../notifications/reminders';

export const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Clamp Feb 29 → Feb 28 outside leap years. Returns { month, day }. */
export function clampDay(month, day, year) {
  if (month === 2 && day === 29 && !isLeapYear(year)) return { month, day: 28 };
  return { month, day };
}

const atTime = (d, hour, minute) => {
  const c = new Date(d);
  c.setHours(hour, minute, 0, 0);
  return c;
};

/** Next occurrence (ms) of an entry's month/day at its reminder time. */
export function nextOccurrenceMs(entry, from = Date.now()) {
  const now = new Date(from);
  const hour = entry.hour ?? 9;
  const minute = entry.minute ?? 0;
  const tryYear = (year) => {
    const { month, day } = clampDay(entry.month, entry.day, year);
    return atTime(new Date(year, month - 1, day), hour, minute).getTime();
  };
  if (entry.repeat === 'daily') {
    let t = atTime(now, hour, minute).getTime();
    if (t <= from) t += 86400000;
    return t;
  }
  let t = tryYear(now.getFullYear());
  if (t <= from) t = tryYear(now.getFullYear() + 1);
  return t;
}

/** Whole days until the next occurrence (0 = today). */
export function daysUntil(entry, from = Date.now()) {
  const startOfToday = new Date(from);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfFire = new Date(nextOccurrenceMs(entry, from));
  startOfFire.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((startOfFire - startOfToday) / 86400000));
}

/** Anniversary/age count at the upcoming occurrence (needs entry.year). */
export function yearsAtNext(entry, from = Date.now()) {
  if (!entry.year) return null;
  const fireYear = new Date(nextOccurrenceMs(entry, from)).getFullYear();
  const n = fireYear - entry.year;
  return n >= 0 ? n : null;
}

export function ordinal(n) {
  if (n === null || n === undefined) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function triggerFor(entry) {
  const hour = entry.hour ?? 9;
  const minute = entry.minute ?? 0;
  if (entry.repeat === 'daily') return buildTrigger({ kind: 'daily', hour, minute });
  if (entry.repeat === 'monthly') {
    const { day } = clampDay(entry.month, entry.day, new Date().getFullYear());
    return buildTrigger({ kind: 'monthly', day, hour, minute });
  }
  // yearly
  const { month, day } = clampDay(entry.month, entry.day, new Date().getFullYear());
  return buildTrigger({ kind: 'yearly', month, day, hour, minute });
}

export async function syncDateNotification(entry) {
  await cancelRawNotification(entry.notificationId);
  if (!entry.enabled || entry.repeat === 'none') return null;
  try {
    return await scheduleRawNotification({
      title: entry.title,
      body: entry.note || repeatBody(entry),
      data: { datekeeperId: entry.id, repeat: entry.repeat, category: entry.category },
      trigger: triggerFor(entry),
    });
  } catch {
    return null;
  }
}

const repeatBody = (entry) => {
  if (entry.repeat === 'daily') return 'Your daily reminder';
  if (entry.repeat === 'monthly') return 'Your monthly reminder';
  return 'Your yearly reminder';
};

export async function rescheduleDateKeeper(list) {
  let rescheduled = 0;
  const handles = {};
  for (const entry of list) {
    if (!entry.enabled || entry.repeat === 'none') {
      await cancelRawNotification(entry.notificationId);
      continue;
    }
    const id = await syncDateNotification(entry);
    if (id) {
      rescheduled += 1;
      handles[entry.id] = id;
    }
  }
  return { rescheduled, handles };
}
