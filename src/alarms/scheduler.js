/**
 * Alarm scheduler — mirrors the store into OS-scheduled notifications.
 *
 * - `syncAlarmNotification(alarm)` cancels the old schedule and (re)schedules
 *   when the alarm is enabled. Returns the notification id (or null).
 * - `rescheduleEnabledAlarms()` runs at startup: re-registers everything
 *   enabled (reboot-safe; the store survives, the OS schedule may not) and
 *   auto-disables one-time alarms whose moment already passed.
 *
 * Scheduling is local: alarms fire with no connectivity.
 */
import {
  buildTrigger,
  cancelRawNotification,
  scheduleRawNotification,
} from '../notifications/reminders';

/** Next fire time (ms) for display + past-checks. Null when it never fires again. */
export function nextFireMs(alarm, from = Date.now()) {
  const { kind, hour, minute } = alarm;
  if (kind === 'once') {
    const t = alarm.date ? new Date(alarm.date).getTime() : NaN;
    if (Number.isNaN(t)) return null;
    return t > from ? t : null;
  }
  const base = new Date(from);
  base.setHours(hour, minute, 0, 0);
  if (kind === 'daily') {
    if (base.getTime() <= from) base.setDate(base.getDate() + 1);
    return base.getTime();
  }
  if (kind === 'weekly') {
    const wd = alarm.weekday ?? 0;
    let delta = (wd - base.getDay() + 7) % 7;
    if (delta === 0 && base.getTime() <= from) delta = 7;
    base.setDate(base.getDate() + delta);
    return base.getTime();
  }
  return null;
}

function triggerFor(alarm) {
  if (alarm.kind === 'once') {
    return buildTrigger({ kind: 'once', date: alarm.date });
  }
  if (alarm.kind === 'daily') {
    return buildTrigger({ kind: 'daily', hour: alarm.hour, minute: alarm.minute });
  }
  return buildTrigger({ kind: 'weekly', weekday: (alarm.weekday ?? 0) + 1, hour: alarm.hour, minute: alarm.minute });
}

export async function syncAlarmNotification(alarm) {
  await cancelRawNotification(alarm.notificationId);
  if (!alarm.enabled) return null;
  if (alarm.kind === 'once' && nextFireMs(alarm) === null) return null;
  try {
    const id = await scheduleRawNotification({
      title: alarm.title,
      body: alarm.kind === 'once' ? 'Reminder' : 'Alarm',
      data: { alarmId: alarm.id, collection: alarm.collection, kind: alarm.kind },
      trigger: triggerFor(alarm),
    });
    return id;
  } catch {
    // Notifications unavailable (permissions denied, unsupported device):
    // the alarm stays stored and will reschedule when possible.
    return null;
  }
}

/**
 * Startup pass over a snapshot of the store.
 * Returns { rescheduled, retired, handles } where handles maps alarm id →
 * fresh OS notification id, and retired lists fired one-time alarm ids.
 * The caller (store.bootAlarms) applies both to the store.
 */
export async function rescheduleEnabledAlarms(list) {
  let rescheduled = 0;
  const retired = [];
  const handles = {};
  for (const alarm of list) {
    if (!alarm.enabled) {
      await cancelRawNotification(alarm.notificationId);
      continue;
    }
    if (alarm.kind === 'once' && nextFireMs(alarm) === null) {
      retired.push(alarm.id);
      await cancelRawNotification(alarm.notificationId);
      continue;
    }
    const id = await syncAlarmNotification(alarm);
    if (id) {
      rescheduled += 1;
      handles[alarm.id] = id;
    }
  }
  return { rescheduled, retired, handles };
}
