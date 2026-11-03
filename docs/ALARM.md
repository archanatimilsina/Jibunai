# Alarm system

Like the system alarm, but more flexible — and fully offline.

## What it does
- **Alarms tab** — once / daily / weekly alarms, each with its own on/off switch.
- **Remind me tab** — exact date+time one-shot reminders
  (e.g. meeting on 2026/11/19 at 12:30 PM).
- **Bulk group select** — Select → check many → turn On / Off or Delete together.
- Per-alarm upcoming info ("in 3h · today", "Tomorrow", "Nov 19"), edit,
  duplicate, delete. Long-press a row to start selecting.
- Fired one-time alarms auto-disable at startup; everything is re-registered
  at startup so alarms survive reboots and fire with no connectivity.

## How it connects
| File | Job |
|---|---|
| `src/alarms/store.js` | `jibunai:alarms:v1` CRUD, toggles, bulk ops, `bootAlarms()`, `useAlarms()` |
| `src/alarms/scheduler.js` | `nextFireMs()`, `syncAlarmNotification()`, `rescheduleEnabledAlarms()` |
| `src/screens/AlarmScreen.jsx` | Tabs, bulk bar, add/edit modal, pickers |
| `src/notifications/reminders.js` | Raw primitives (`scheduleRawNotification`, `cancelRawNotification`, `buildTrigger`) |
| `src/systems/catalog.js` | `alarm` entry → picker, settings, wheel, export all follow |

App.js runs `bootAlarms()` after notification init. No backend: the store is
local, firing is done by the OS.

## Verify
```bash
node --check src/alarms/*.js
```
Logic tests: next-fire math (daily rollover, past-once null, weekly), CRUD +
bulk on/off/delete, validation rejects past once-alarms, boot retires fired ones.
