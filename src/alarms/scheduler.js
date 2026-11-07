/**
 * Alarm scheduler — mirrors the store into OS-scheduled notifications.
 *
 * - `normalizeWeekdays(alarm)` → array of 0-6 (Sun-Sat). Legacy `weekday`
 *   (single number) migrates to `[weekday]`. Empty = one-time fallback.
 * - `nextFireMs(alarm, from)` → next fire time honoring snoozeUntil + skipNext.
 * - `buildTriggersForAlarm(alarm)` → trigger[] (multi-weekday = N WEEKLY).
 * - `syncAlarmNotification(alarm)` cancels old handles and schedules all.
 *   Returns string[] of OS notification ids (empty when disabled/fired).
 * - `rescheduleEnabledAlarms()` startup pass, idempotent.
 *
 * Scheduling is local: alarms fire with no connectivity.
 */
import {
  buildTrigger,
  cancelRawNotification,
  scheduleRawNotification,
} from '../notifications/reminders';

export function normalizeWeekdays(alarm) {
  if (Array.isArray(alarm.weekdays)) {
    return alarm.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  }
  if (Number.isInteger(alarm.weekday) && alarm.weekday >= 0 && alarm.weekday <= 6) {
    return [alarm.weekday];
  }
  return [];
}

/** Next fire time (ms) for display + past-checks. Null when it never fires again. */
export function nextFireMs(alarm, from = Date.now()) {
  // Snooze override wins while it is in the future.
  if (alarm.snoozeUntil && alarm.snoozeUntil > from) return alarm.snoozeUntil;

  const { kind, hour, minute } = alarm;
  let t = null;

  if (kind === 'once') {
    const d = alarm.date ? new Date(alarm.date).getTime() : NaN;
    if (Number.isNaN(d)) return null;
    t = d > from ? d : null;
  } else if (kind === 'daily') {
    const base = new Date(from);
    base.setHours(hour, minute, 0, 0);
    if (base.getTime() <= from) base.setDate(base.getDate() + 1);
    t = base.getTime();
  } else if (kind === 'weekly') {
    const days = normalizeWeekdays(alarm);
    if (!days.length) {
      // No days selected = one-time at next occurrence of HH:MM.
      const base = new Date(from);
      base.setHours(hour, minute, 0, 0);
      if (base.getTime() <= from) base.setDate(base.getDate() + 1);
      t = base.getTime();
    } else {
      const base = new Date(from);
      base.setHours(hour, minute, 0, 0);
      let best = null;
      for (const wd of days) {
        const c = new Date(base);
        let delta = (wd - c.getDay() + 7) % 7;
        if (delta === 0 && c.getTime() <= from) delta = 7;
        c.setDate(c.getDate() + delta);
        if (best === null || c.getTime() < best) best = c.getTime();
      }
      t = best;
    }
  }

  if (t === null) return null;
  // Skip-next-ring: if the computed fire matches skipNext (±90s), jump once.
  if (alarm.skipNext && Math.abs(t - alarm.skipNext) < 90000) {
    const after = alarm.skipNext + 61000;
    if (kind === 'once') return null; // skipping a one-shot means it never fires
    // Recompute strictly after the skipped moment (avoid infinite recursion).
    const clone = { ...alarm, skipNext: null, snoozeUntil: null };
    return nextFireMs(clone, after);
  }
  return t;
}

function triggerForWeekly(wd, hour, minute) {
  // reminders.buildTrigger expects 0=Sun..6=Sat in `weekday`.
  return buildTrigger({ kind: 'weekly', weekday: wd, hour, minute });
}

/** All OS triggers needed for one alarm (weekly multi-day = N triggers). */
export function buildTriggersForAlarm(alarm) {
  const next = nextFireMs(alarm);
  if (next === null) return [];
  // Snoozed: single one-shot at snoozeUntil.
  if (alarm.snoozeUntil && alarm.snoozeUntil > Date.now()) {
    return [buildTrigger({ kind: 'once', date: new Date(alarm.snoozeUntil).toISOString() })];
  }
  const hour = alarm.hour ?? 8;
  const minute = alarm.minute ?? 0;
  const triggers = [];
  if (alarm.kind === 'once') {
    triggers.push(buildTrigger({ kind: 'once', date: alarm.date }));
  } else if (alarm.kind === 'daily') {
    triggers.push(buildTrigger({ kind: 'daily', hour, minute }));
  } else if (alarm.kind === 'weekly') {
    const days = normalizeWeekdays(alarm);
    if (!days.length) {
      triggers.push(buildTrigger({ kind: 'once', date: new Date(next).toISOString() }));
    } else {
      for (const wd of days) triggers.push(triggerForWeekly(wd, hour, minute));
    }
  }
  // Pre-alert: heads-up DATE trigger before the next fire (once + daily/weekly-next).
  const pre = Number(alarm.preAlertMin || 0);
  if (pre > 0) {
    const at = next - pre * 60000;
    if (at > Date.now() + 5000) {
      try {
        triggers.push({ ...buildTrigger({ kind: 'once', date: new Date(at).toISOString() }), _preAlert: true });
      } catch {
        /* ignore bad pre-alert */
      }
    }
  }
  return triggers;
}

export async function cancelAllForAlarm(alarmOrIds) {
  const ids = Array.isArray(alarmOrIds)
    ? alarmOrIds
    : [...(Array.isArray(alarmOrIds?.notificationIds) ? alarmOrIds.notificationIds : []),
       ...(alarmOrIds?.notificationId ? [alarmOrIds.notificationId] : [])];
  for (const id of [...new Set(ids)]) await cancelRawNotification(id);
}

export async function syncAlarmNotification(alarm) {
  await cancelAllForAlarm(alarm);
  if (!alarm.enabled) return [];
  if (alarm.kind === 'once' && !alarm.snoozeUntil && nextFireMs(alarm) === null) return [];
  const triggers = buildTriggersForAlarm(alarm);
  if (!triggers.length) return [];
  const ids = [];
  const isPre = (t) => !!t._preAlert;
  for (const trigger of triggers) {
    const { _preAlert, ...real } = trigger;
    try {
      const id = await scheduleRawNotification({
        title: isPre(trigger) ? `Soon: ${alarm.title}` : alarm.title,
        body: isPre(trigger)
          ? `Rings in ${alarm.preAlertMin}m`
          : alarm.kind === 'once'
            ? alarm.note || 'Reminder'
            : 'Alarm',
        data: {
          alarmId: alarm.id,
          collection: alarm.collection,
          kind: alarm.kind,
          preAlert: isPre(trigger),
          snoozed: !!(alarm.snoozeUntil && alarm.snoozeUntil > Date.now()),
        },
        trigger: real,
      });
      ids.push(id);
    } catch {
      /* permissions denied — stays stored, reschedules later */
    }
  }
  return ids;
}

/**
 * Startup pass over a snapshot of the store.
 * Returns { rescheduled, retired, handles } where handles maps alarm id →
 * fresh OS notification id array, retired lists fired one-time alarm ids.
 */
export async function rescheduleEnabledAlarms(list) {
  let rescheduled = 0;
  const retired = [];
  const handles = {};
  for (const alarm of list) {
    if (!alarm.enabled) {
      await cancelAllForAlarm(alarm);
      continue;
    }
    // Expired snooze clears itself; expired skip clears itself.
    if (alarm.snoozeUntil && alarm.snoozeUntil <= Date.now()) {
      alarm.snoozeUntil = null;
      alarm.snoozeCount = 0;
    }
    if (alarm.kind === 'once' && !alarm.snoozeUntil && nextFireMs(alarm) === null) {
      retired.push(alarm.id);
      await cancelAllForAlarm(alarm);
      continue;
    }
    const ids = await syncAlarmNotification(alarm);
    if (ids.length) {
      rescheduled += 1;
      handles[alarm.id] = ids;
    }
  }
  return { rescheduled, retired, handles };
}

/** "6h 20m" / "less than a minute" / "tomorrow" wording for countdowns. */
export function formatCountdown(targetMs, from = Date.now()) {
  const diff = targetMs - from;
  if (diff <= 0) return 'now';
  if (diff < 60000) return 'less than a minute';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d === 1 && rh === 0) return 'tomorrow';
  return rh ? `${d}d ${rh}h` : `${d}d`;
}
