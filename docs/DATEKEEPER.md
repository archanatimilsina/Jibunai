# Date-keeper system

Every important date, with daily / monthly / yearly / no reminders that fire
as notifications — fully offline, reboot-safe.

## What it does (beyond the spec)
- **Intervals**: no reminder, daily, monthly, yearly — each with its own
  time-of-day, per-date on/off switch.
- **Countdowns + milestones**: "in 23 days", "Today 🎉", "turns 24",
  "5th anniversary" (auto-counted when a year is saved).
- **Categories**: birthday, anniversary, appointment, bill, custom — with
  filter chips, search, and upcoming-first sorting.
- **Leap-day safe**: Feb 29 reminds on Feb 28 in non-leap years.
- Edit, duplicate, delete per date. Validation rejects impossible dates
  (Feb 30) and empty titles.

## How it connects
| File | Job |
|---|---|
| `src/datekeeper/store.js` | `jibunai:datekeeper:v1` CRUD, toggles, `bootDateKeeper()`, `useDateKeeper()` |
| `src/datekeeper/scheduler.js` | `nextOccurrenceMs()`, `daysUntil()`, `yearsAtNext()`, sync + reschedule |
| `src/screens/DateKeeperScreen.jsx` | List, filters, search, add/edit modal, day/time pickers |
| `src/systems/catalog.js` | `datekeeper` entry → picker, settings, wheel, export |

App.js runs `bootDateKeeper()` after notification init. No backend: local
store, OS-scheduled firing.

## Verify
```bash
node --check src/datekeeper/*.js
```
Logic tests: leap math + clamping, daily/monthly/yearly rollover, countdown,
age counting, ordinals, CRUD, repeat-none cancels schedule, validation.
