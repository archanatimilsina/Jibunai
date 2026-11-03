/**
 * Local reminders / alarms — fully offline.
 *
 * These are OS-scheduled local notifications: once scheduled they fire even
 * with no connectivity, with the app killed, and (on Android) after a reboot
 * once `rescheduleOnBoot()` re-registers future ones at startup.
 *
 * Reminder kinds:
 *   - once    exact date+time (the "remind me" alarm: 2026/11/19 12:30pm)
 *   - daily   every day at HH:MM
 *   - weekly  every week on a weekday at HH:MM
 *   - monthly every month on a day at HH:MM
 *   - yearly  every year on month/day at HH:MM (birthdays, anniversaries)
 *
 * Metadata is persisted in AsyncStorage so the date-keeper screen can list,
 * edit and cancel reminders across restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let Notifications = null;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

const STORE_KEY = 'jibunai:reminders:v1';
const CHANNEL_ID = 'reminders';

export const reminderAvailable = () => !!Notifications?.scheduleNotificationAsync;

const uid = () => `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function readStore() {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(list) {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

async function saveMeta(meta) {
  const list = await readStore();
  const next = [...list.filter((r) => r.id !== meta.id), meta];
  await writeStore(next);
  return meta;
}

async function dropMeta(id) {
  await writeStore((await readStore()).filter((r) => r.id !== id));
}

/**
 * One-time setup: permissions + foreground behaviour + Android channel.
 * Safe to call on every launch; no-ops when the module is unavailable (Expo Go
 * web, missing install) so the app never crashes without notifications.
 */
export async function initNotifications() {
  if (!Notifications) return { granted: false, available: false };
  try {
    if (Notifications.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let granted = existing === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Reminders',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
    return { granted, available: true };
  } catch {
    return { granted: false, available: !!Notifications };
  }
}

const weekdayToTrigger = (n) => (((n % 7) + 7) % 7) + 1; // 0=Sun..6=Sat -> 1..7 (Sun=1)

/**
 * Build an OS trigger for a reminder spec.
 * spec: { kind: 'once'|'daily'|'weekly'|'monthly'|'yearly',
 *         date?: ISO string (once), hour?, minute?, weekday?, day?, month? }
 */
export function buildTrigger(spec) {
  const T = Notifications.SchedulableTriggerInputTypes;
  switch (spec.kind) {
    case 'daily':
      return { type: T.DAILY, hour: spec.hour ?? 9, minute: spec.minute ?? 0, channelId: CHANNEL_ID };
    case 'weekly':
      return {
        type: T.WEEKLY,
        weekday: weekdayToTrigger(spec.weekday ?? 1),
        hour: spec.hour ?? 9,
        minute: spec.minute ?? 0,
        channelId: CHANNEL_ID,
      };
    case 'monthly':
      return {
        type: T.MONTHLY,
        day: spec.day ?? 1,
        hour: spec.hour ?? 9,
        minute: spec.minute ?? 0,
        channelId: CHANNEL_ID,
      };
    case 'yearly':
      return {
        type: T.YEARLY,
        month: spec.month ?? 1,
        day: spec.day ?? 1,
        hour: spec.hour ?? 9,
        minute: spec.minute ?? 0,
        channelId: CHANNEL_ID,
      };
    case 'once':
    default: {
      const date = spec.date ? new Date(spec.date) : null;
      if (!date || Number.isNaN(date.getTime())) throw new Error('Reminder needs a valid date.');
      if (date.getTime() <= Date.now()) throw new Error('Reminder time is in the past.');
      return { type: T.DATE, date, channelId: CHANNEL_ID };
    }
  }
}

export async function scheduleReminder({ title, body = '', data = {}, ...spec }) {
  if (!Notifications) throw new Error('Notifications are not available on this device.');
  if (!title || !title.trim()) throw new Error('Reminder needs a title.');
  const trigger = buildTrigger(spec);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: { title: title.trim(), body, data: { reminderKind: spec.kind || 'once', ...data }, sound: 'default' },
    trigger,
  });
  const meta = {
    id: uid(),
    notificationId,
    title: title.trim(),
    body,
    data,
    kind: spec.kind || 'once',
    spec: { ...spec },
    createdAt: new Date().toISOString(),
  };
  await saveMeta(meta);
  return meta;
}

/** Daily/weekly/monthly/yearly convenience wrapper. */
export async function scheduleRepeatingReminder({ title, body, interval = 'daily', ...rest }) {
  return scheduleReminder({ title, body, kind: interval, ...rest });
}

export async function cancelReminder(id) {
  const list = await readStore();
  const meta = list.find((r) => r.id === id);
  if (meta?.notificationId && Notifications?.cancelScheduledNotificationAsync) {
    try {
      await Notifications.cancelScheduledNotificationAsync(meta.notificationId);
    } catch {
      /* already fired / gone */
    }
  }
  await dropMeta(id);
}

export async function cancelAllReminders() {
  if (Notifications?.cancelAllScheduledNotificationsAsync) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      /* ignore */
    }
  }
  await writeStore([]);
}

/** Stored reminder metadata (for the date-keeper / alarm screens). */
export function listReminders() {
  return readStore();
}

/* ------------------------- raw primitives (alarms) ------------------------- */

/**
 * Schedule a bare OS notification without touching the reminders store.
 * Used by the Alarm system, which owns its metadata in `src/alarms/store.js`.
 * @returns the OS notification id (store it to cancel/reschedule later).
 */
export async function scheduleRawNotification({ title, body = '', data = {}, trigger }) {
  if (!Notifications?.scheduleNotificationAsync) {
    throw new Error('Notifications are not available on this device.');
  }
  if (!title || !title.trim()) throw new Error('Reminder needs a title.');
  return Notifications.scheduleNotificationAsync({
    content: { title: title.trim(), body, data, sound: 'default' },
    trigger,
  });
}

/** Cancel one OS notification by its id. Never throws. */
export async function cancelRawNotification(notificationId) {
  if (!notificationId || !Notifications?.cancelScheduledNotificationAsync) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    /* already fired / gone */
  }
}

/** OS-level scheduled notifications still pending. */
export async function listScheduled() {
  if (!Notifications?.getAllScheduledNotificationsAsync) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}

/**
 * Re-register future one-time reminders after a reboot/upgrade.
 * Call once at startup (AppShell effect). Repeating triggers persist on the
 * OS side; only 'once' reminders with past notification ids need a refresh.
 */
export async function rescheduleOnBoot() {
  if (!Notifications) return 0;
  const list = await readStore();
  let fixed = 0;
  const now = Date.now();
  const kept = [];
  for (const meta of list) {
    if (meta.kind !== 'once' || !meta.spec?.date) {
      kept.push(meta);
      continue;
    }
    if (new Date(meta.spec.date).getTime() <= now) continue; // past — drop
    try {
      const trigger = buildTrigger(meta.spec);
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: meta.title,
          body: meta.body || '',
          data: { reminderKind: 'once', ...(meta.data || {}) },
          sound: 'default',
        },
        trigger,
      });
      kept.push({ ...meta, notificationId });
      fixed += 1;
    } catch {
      kept.push(meta);
    }
  }
  await writeStore(kept);
  return fixed;
}
