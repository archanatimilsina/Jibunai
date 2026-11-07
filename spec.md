# For all the project 
- if you compare the backend from the folder `backend` and backend from the `Portfolio/backend` what are the differences?
- can we use `Portfolio/backend` this backend for this project instead of `backend` because the `Portfolio/backend` this has the backend already deployed in the render 
- when i use build this app using the eas cli,can i use the backend from `Portfolio/backend` ?



# new features add
- for the authentication let's take the three things from the user one is username, their dream and secret code it could be name and number combined together 
- when the user enter through the splash screen give the user to input their name, and after the namecomplete mean first gate check then go to the next gate that check the dream and then if this gate also passed then the third gate that takes the secret code unique like password and the length of the password is from 4 to 8 and it could have any symbol, any letter, any number 
- after the three gate completes then the user then authenticate finally 
- also make the register page or sign up page to take these data and also take the  full name, date of birth, username no password but in place of password we take the secret code from user i.e full_name, username, date_of_birth, dream, secret code 
- handle all the authorization for the user for the user's security 


nov 2 

# offline system - ticked
- since this app is used for the personal purpose every page data creation should be offline and online both but even it is offline no problem should be seen 
- every screens should be able to be used offline 
- i could see my all data history being offline
- i should be able to create, read, update and delete data offline
- i should be greatly authorized to access my data
- since this app is really personal and it carries the user's secret data too this app should be really safe
- since it is going to manage a person's life so it should be easily available and it should be highly available
- it should be adaptive/responsive in any type of phone or devices
- it should have great notification system to keep the remainder to the user

# ADD THESE FOUR SYSTEM IN THIS APP
- After the user is registered in this app, ask them to choose which systems they want and which system they don't want
- give them the list of every system we have, like let the user choose what are the system they want to have 
- in setting let the user remove or add more system if they want and can remove the system from their app also 


# menu -> setting -> Add or remove systems
- in this screen the user should be able to add new features and remove the features
- when removing the used feature and if they have data saved in them then they should do something about those data we let them export their data or skip and remove that is the imp part for eg if the user is using the note from so long then if they want to remove the note system then the system should ask first to the user if they want to remove the note, if they want to export or remove and continue

# menu -> alarm system
- here this is exactly like the system alarm, but it should be more useful and flexible 
- in this alarm system, there will be group select and turn off / turn on system mean you can select multiple on or off alarms to turn off all of them in bulk or turn on them on bulk 
- other systems can be same as the system alarm system like adding alarm, turn on, turn off, daily, only once
- it should have a system inside it subsystem called remind me and this alarm is to remind for something like in exact date and time, suppose if the user has imp meeting at 2026/11/19 at 12:30 pm then this system will remind them exactly at that time and this should be really imp even in the offline this whole system should work 

# menu->date keeper system
- This is the system that contains all the user's imp date or the date they want to remember
- system should have monthly reminder or daily remainder or the yearly remainder or no remainder feature which send the notification to the user in that reminding interval

# menu -> pdf previewing and editing system (that make the easy reading a pdf)
- this system should be exactly like the pdf manager system but it is more for the reading and editing the pdf
- editing mean there are drawing tools so that we can draw and write notes when we read the pdf
- and when drawing or when we are editing the two finger scrolling
- good zooming system slow but smooth 
- landscape and portrait mode to read
- save the edited pdf so that we can see that later or discard edit 


# music player 
- 




from the above list what are the things do you think is best to add in this system and it won't cause any system issue in the coming feature so collect them first and make checklisted plan after deciding how you want to make these features 





Here are the finer details I'd expect for each Alarm feature. As before, this is my suggestion rather than a description of your app, and I'm assuming Android, where alarm reliability is the hardest part.

## 1. Repeating alarms on chosen weekdays
- Time picker with a clock face or scroll wheel, plus a 12/24-hour setting that follows the system
- Weekday chips (M T W T F S S) with presets: Every day, Weekdays, Weekends
- Choose which day the week starts on
- No days selected means a one-time alarm that fires at the next occurrence of that time
- Show the next ring on each card, such as "Mon, 6:30 AM"
- Optional "skip next ring" for one-off holidays without turning the alarm off
- Optional start and end dates for temporary routines like exam week
- Handle daylight saving and time zone changes, so a 6:30 alarm stays at 6:30 local time
- Warn if an alarm is set within the last minute ("Rings tomorrow, not today")

## 2. One-time reminders at an exact date and time
- Date picker plus time picker with shortcuts like Tomorrow, Next Monday, and In 1 hour
- A separate Reminders tab or type toggle, so reminders don't clutter the daily alarm list
- Title and optional note, shown on the ringing screen
- Past dates are blocked, and a reminder set a few seconds ahead still fires
- Auto-delete or move to "Completed" after it rings, as a setting
- Optional repeat after the first ring: every day, week, month, or year
- Pre-alert, such as a heads-up 10 minutes or 1 day before
- "Missed" state if the phone was off at the time, with a notification on next boot
- Edit date or time later without recreating the reminder

## 3. Bulk on/off toggle for all alarms
- Master switch at the top of the screen, with a clear on/off state
- Tapping it asks for confirmation when turning everything off
- Remember which alarms were on, so turning all back on restores the previous state instead of enabling everything
- Separate master toggles for Alarms and Reminders
- Optional "Pause all until…" (tomorrow morning, a chosen date), with auto-resume
- A "Vacation mode" banner showing alarms are paused and when they come back
- Persistent notification or status line while paused, so you don't forget
- Optional home-screen widget or quick-settings tile with the same toggle

## 4. Offline firing via local scheduling
- Schedule with `AlarmManager.setAlarmClock()`, which works without internet, is exempt from Doze, and shows the alarm icon in the status bar
- Request the exact-alarm permission on Android 12+ (`SCHEDULE_EXACT_ALARM`), with a settings shortcut if the user denies it
- A health-check screen listing everything that must be granted: exact alarms, notifications, full-screen alerts, and battery optimization exemption
- Keep every alarm in a local database, with no server dependency
- Re-schedule the next occurrence right after one fires, rather than scheduling far into the future
- Fire correctly in airplane mode, in Do Not Disturb (as an alarm-priority sound), and with the app closed or force-stopped by the user
- Guide users with aggressive battery managers (some Xiaomi, Oppo, Vivo, Samsung models) to allow autostart and disable background restrictions
- A "Test alarm" button that rings in 10 seconds, so users can verify reliability
- Log the last scheduled and last fired times for debugging

## 5. Custom labels
- Optional text field, such as "Gym", "Medicine", or "Wake up"
- Label shown on the list card, the notification, and the ringing screen
- Suggestion chips for common labels, plus recently used labels
- Sensible character limit with a counter
- Emoji support
- Default label if empty, such as "Alarm" with the time
- Optional text-to-speech that reads the label aloud when the alarm rings

## 6. Ringtone selection, including your own audio
- Tabs for Built-in tones, Device ringtones, and My audio
- Pick any audio file through the system file picker, and keep access with a persistent URI permission
- Preview a tone with a play button before choosing
- Fall back to a default tone if the chosen file was moved or deleted, with a warning on the alarm card
- Option to start the file from a chosen point and loop it
- Per-alarm ringtone, plus a global default for new alarms
- Optional "Pick from Music Player" if your Music Player app shares its library
- Silent option for vibration-only alarms
- Play through the alarm audio stream, so it follows the alarm volume, not the media volume

## 7. Vibration setting
- On/off toggle per alarm
- Vibration patterns: Default, Short pulses, Long, Heartbeat, and SOS
- Preview the pattern on tap
- Vibration continues while the screen is showing, and stops on dismiss or snooze
- Optional "vibrate only" mode for quiet places
- Respect the system setting on devices without a vibration motor, hiding the option there

## 8. Snooze with adjustable duration
- Per-alarm snooze on/off
- Duration options: 1, 5, 10, 15, 30 minutes, plus a custom value
- Maximum snooze count (1, 3, 5, or unlimited), after which only Dismiss is available
- Snooze button on the full-screen screen and as a notification action
- Show "Snoozed until 6:45" in the notification and on the alarm card
- Optional "tap anywhere to snooze, slide to dismiss" gesture
- Snooze survives a reboot or force-close
- Optional "shorter each time" mode, such as 10, then 5, then 2 minutes
- Dismiss clears pending snoozes for that alarm

## 9. Gradual volume increase
- Toggle per alarm, with a duration slider from 10 seconds to 2 minutes
- Start at about 10% of the chosen alarm volume and ramp smoothly to the maximum
- A separate "alarm volume" slider on the alarm screen, with a test sound
- Option to override the system alarm volume for this alarm only
- Volume buttons during ringing either snooze, dismiss, or do nothing, as a setting
- Skip the ramp if the same alarm has already been snoozed, as an optional rule
- Respect the system's maximum volume and headphone safety

## 10. Reschedules itself after a phone reboot
- A `BOOT_COMPLETED` receiver re-registers every enabled alarm and reminder from the database
- Also handle `LOCKED_BOOT_COMPLETED`, so alarms work before the first unlock on devices with encryption
- Re-schedule on app update (`MY_PACKAGE_REPLACED`), time change, and time zone change
- Handle the clock being set manually, so alarms don't fire early or late
- Detect missed alarms (the device was off) and show a "You missed 7:00 AM Gym" notification
- Option to show missed one-time reminders for up to 24 hours afterward
- Make this logic idempotent, so running twice doesn't create duplicate alarms
- Cover it with a test checklist: reboot, power off overnight, airplane mode, and low battery

## 11. Full-screen alarm over the lock screen
- Show an activity over the lock screen and turn the screen on, using a high-priority full-screen intent
- Request the full-screen intent permission on Android 14+ and guide the user to settings if it's off
- Fall back to a heads-up notification with Snooze and Dismiss when the phone is in use
- Large clock, label, date, and next alarm preview on a clean high-contrast screen
- Big Snooze and Dismiss controls, with a swipe or slide-to-dismiss to prevent accidental taps
- Optional dismiss challenge: solve a simple math problem, shake the phone, or type a phrase
- Keep the screen on until the user acts
- Auto-silence after a set time (1, 5, or 10 minutes), with a "Missed alarm" notification
- Show the current weather or a quote as an optional extra
- Handle an incoming call by pausing, then resuming afterward

## 12. "Rings in 6h 20m" next-alarm countdown
- Banner at the top of the list: "Next alarm: Mon 6:30 AM, rings in 6h 20m"
- Updates live each minute, and each second in the final minute
- Natural wording: "less than a minute", "1 day 2h", and "tomorrow"
- A toast after saving an alarm showing how long until it rings
- Include reminders and alarms, using whichever is nearest
- "No upcoming alarms" empty state with an Add button
- Persistent notification showing the countdown, as an optional setting
- Also feed the system's next-alarm status through `setAlarmClock`, so it appears on the lock screen
- Home-screen widget showing the next alarm and countdown

## 13. Duplicate and multi-select delete
- Long-press an alarm to enter selection mode, with a checkmark on each selected card
- "Select all" and "Invert selection" in the toolbar
- Selection count in the title, such as "3 selected"
- Actions: Delete, Duplicate, Enable, Disable, and Change label or sound for all
- Duplicate copies time, days, label, ringtone, vibration, and snooze, and appends "(copy)" to the label
- Opens the duplicate in the editor right away, so the time can be changed
- Confirmation dialog before deleting several alarms, with an Undo snackbar for a few seconds
- Deleting cancels the scheduled alarm immediately, so nothing rings after removal
- Swipe a single alarm to delete, as a faster alternative
- Trash or recently deleted section for quick recovery

## Small extras that tie it together
- Alarm groups or profiles, such as Work days, Weekend, and Travel, switched on or off together
- Sort by time, by label, or by next ring
- Local backup and restore of all alarms
- Dark theme and a bedside "night clock" mode
- Quick-add buttons like "+5 min timer" from the main screen
- A first-run setup wizard that walks through the permissions in order

Want me to do the same for Date Keeper next? It overlaps with Alarm on reminders and scheduling. from the above list what are the things do you think is best to add in this system and it won't cause any system issue in the coming feature so collect them first and make checklisted plan after deciding how you want to make these features don't remove anything that is already there 






Here are the finer details I'd expect for each My Day feature, with a new instant take-and-upload feature added after #3. As before, these are my suggestions, not a description of your app.

## 1. Plan today's activities (checklist or time-blocked)
- Two planning modes per day: a simple checklist, or a time-blocked schedule with start and end times
- Quick add: type a title and press Enter to add the next one. Typing "7pm gym" can auto-fill the time
- Time blocks show duration, and the app warns when two blocks overlap
- Color or emoji per activity, plus optional categories like Work, Health, Family, and Study
- Templates such as "Weekday routine" and "Weekend", plus a "Copy yesterday's plan" button
- Optional reminder per activity, such as 10 minutes before
- Unfinished items can roll over to tomorrow with one tap, or be dropped
- Optional estimated duration, so the day's total planned time is visible
- A "free time" indicator between blocks

## 2. Log what actually happened
- A separate "Log" entry type, so the plan stays intact and reality is recorded next to it
- "Log now" button that stamps the current time automatically, with the time editable afterward
- Convert a planned item into a log entry with one tap, such as "Done at 7:40 instead of 7:00"
- Free-text log entries for things that weren't planned
- Actual start and end times, so planned vs. actual duration can be compared
- Optional tags like Work, Meal, Travel, and Fun
- Voice-to-text for quick logging
- Backfill: add entries to earlier hours of today or to past days
- Optional "evening review" reminder that prompts you to fill gaps

## 3. Attach photos to entries (camera or gallery)
- Add one or more photos to any plan or log entry
- Attach from camera or gallery, and pick multiple from the gallery at once
- Reorder photos and choose a cover photo for the entry
- Auto-compress to a sensible size, while keeping the original orientation
- Basic edit before saving: crop, rotate, and a simple draw or text caption
- Per-photo caption and optional timestamp
- Thumbnails on the entry card, with a full-screen viewer that supports swipe and pinch-zoom
- Delete a photo without deleting the entry
- Show a photo count badge, such as "3 photos"
- Request the camera and photo permissions only when first needed, with a short explanation

## 3b. Quick Snap: take a photo and upload instantly (new)
- A camera button on the main screen, and a long-press shortcut from the home screen or a widget, that opens the camera in one tap
- After you take the photo, it is saved straight into today's log as a new entry with the current time. No form and no extra steps
- Optional "Snap & caption" screen: take the photo, type one line, and save
- Choose where it goes: a new log entry, an existing plan item (for example, attach to "Lunch"), or just today's photo stream
- Save the photo inside the app first, so nothing is lost even if the phone is offline or the app closes
- Compress in the background so saving feels instant
- **Upload, not a URL:** the file itself is stored in the app. If cloud backup is on, a background queue uploads the photo when you're online
- Upload queue with status on each photo (waiting, uploading, done, failed), automatic retry, and a "Retry now" button
- Upload on Wi-Fi only, as an optional setting, so mobile data isn't used
- Progress indicator on the thumbnail while it uploads, and a small checkmark when finished
- Burst mode: take several photos in a row without leaving the camera, then save them all together
- Option for front or back camera, flash control, and tap-to-focus
- Auto-attach a location or place name, as an optional setting, with a toggle in the camera screen
- Optional "photo of the day" star, so one image represents the day in the calendar and timeline
- Undo for a few seconds after saving, in case of an accidental snap
- Saved photos are not duplicated into the phone's gallery unless you turn on "Also save to gallery"

## 4. Day-by-day navigation with calendar jump
- Left and right arrows and swipe gestures to move between days
- "Today" button that appears whenever you're on another day
- Tap the date header to open a month calendar and jump to any date
- Dots or small markers on calendar days that have entries, with different colors for plan-only, log, or photos
- Optional heat coloring by completion percentage
- Year and month quick-pickers for fast jumps to older dates
- Week strip at the top for quick switching
- Remember the last viewed day when the app reopens, or always open on today (setting)
- Future days can be planned in advance, with a "Future" label

## 5. Mood or energy tag for each day
- Mood scale of 5 faces or emoji, and a separate energy level (low, medium, high)
- Optional mood check-ins at morning, afternoon, and evening, instead of just once a day
- Quick-pick factors such as sleep, weather, work, family, and exercise
- Short note field beside the mood
- Mood color shown in the calendar and the day header
- Monthly mood chart, weekly average, and most common mood
- Optional correlations, such as "Your energy is highest on days you exercise"
- Gentle reminder to log mood, with a choice of time

## 6. Planned vs. done completion view
- Progress ring or bar showing completed items out of planned items
- Side-by-side columns for Planned and Actual, with matched items linked
- Status for each item: done, partly done, skipped, moved, and unplanned (logged but not planned)
- Time comparison for each block, such as "Planned 60 min, actual 85 min"
- Weekly and monthly completion trends with a simple chart
- Best day and most skipped category insights
- Optional reason for skipped items, chosen from presets like "No time", "Tired", or "Not needed"
- A short summary line at the end of the day, such as "6 of 8 done, 2 unplanned"

## 7. Daily highlight or gratitude prompt
- A "Highlight of the day" field, with the question "What was the best part of today?"
- One to three gratitude lines, with a rotating set of prompts (for example, "Who helped you today?")
- Optional morning prompt for an intention and an evening prompt for reflection
- Choose a photo or log entry as the highlight with one tap
- Highlights collected in a "Best moments" list with search
- "On this day" look back at highlights from last month and last year
- Optional streak for days with a gratitude entry
- Prompts can be turned off or customized

## 8. Timeline view of the day's entries
- Vertical timeline ordered by time, with plan and log entries shown as different colors
- Hour markers and a "now" line that moves through the day
- Photos shown as thumbnails along the timeline
- Gaps between entries displayed as free time
- Tap an entry to expand or edit it
- Zoom between hour-by-hour and compact views
- Toggle to show plan only, log only, or both
- Optional all-day section at the top for entries without a time
- Mood markers appear at the time they were set

## 9. Edit, delete, and reorder entries
- Tap to edit all fields: title, time, category, notes, photos, and status
- Drag handle to reorder checklist items, with haptic feedback
- Time-blocked items move by dragging on the timeline, with snapping to 5 or 15 minutes
- Swipe left to delete and swipe right to mark done, with the swipe actions customizable
- Undo snackbar after delete, and a short-lived trash for recovery
- Multi-select to delete, move to another day, change category, or mark done in bulk
- Duplicate an entry, or copy it to another day
- Show "edited" time stamps, so you know when a log was changed
- Lock past days, as an optional setting, so old logs aren't accidentally changed

## 10. Search and browse past days
- Search across titles, notes, captions, tags, and highlights, with live results
- Filters: date range, category, mood, has photos, and completed or skipped
- Highlight matching text in the results and group results by day
- Photo gallery view of all days, grouped by month
- Browse by week, month, or year in a list or a calendar
- Quick filters such as "Best days" (high mood) and "Hard days" (low mood)
- Recent searches and a clear button
- Jump from any result straight to that day in the timeline

## 11. Share or export a day summary
- Summary card showing the date, mood, highlight, completion score, and a few photos
- Share as an image, text, or PDF through the system share sheet
- Choose what to include, such as hide notes, hide times, or photos only
- Photo collage option for the day, with a few layout themes
- Weekly and monthly summary export, not just single days
- Export all data as CSV or JSON, and entries with photos as a ZIP
- Optional "Private" tag on entries that are always excluded from sharing
- Preview before sharing, with an editable caption

## 12. Local storage with backup
- Everything is stored on the device in a local database, so it works fully offline
- Photos saved in the app's private folder, with a small thumbnail cache for speed
- Autosave on every change, with no manual save button
- Manual backup to a file, including photos, that the user can store anywhere, such as Drive or a USB drive
- Optional automatic backup every day or week, with a "last backup" time displayed
- Restore from a backup file, with the choice to merge into existing data or replace it
- Backup includes a version number, so older backups still restore after app updates
- Backup verification, so a corrupted file is caught before restoring
- Storage usage screen showing how much space entries and photos use
- Optional app lock using PIN or biometrics, and an option to hide previews in the app switcher
- Warning that uninstalling the app removes local data unless a backup exists
- Optional encrypted backup with a password

## Small extras that tie it together
- Home-screen widget with today's progress and a quick-add or Quick Snap button
- Daily reminders: morning to plan, evening to review
- Dark theme and large-text support
- "Weekly review" screen with completion trend, mood trend, and top photos
- Link entries to other apps in your set, such as turning a plan item into a Chronos task or saving a day as an Archive memory
- Streak for days logged, with a gentle "you missed yesterday" backfill prompt
- First-run walkthrough showing the plan, log, and Quick Snap flow

Want the same depth for another app, like Challenges or Date Keeper?
from the above list what are the things do you think is best to add in this system and it won't cause any system issue in the coming feature so collect them first and make checklisted plan after deciding how you want to make these features don't remove anything that is already there 






# Mobile Screen Sizes and Responsive Handling

Sizes are in **CSS px (web) = pt (iOS) = dp (Android)**, portrait, and approximate, since vendors and "display size" settings shift Android values by a few dp. Newer 2026 devices fall into the same buckets.

---

## 1. Basics

- **Physical px ÷ density = dp/CSS px.** Examples: 1080×2400 at 3x = 360×800; 1080×2400 at 2.625x = 412×914; 720×1600 at 2x = 360×800.
- **Android density buckets:** mdpi 1x, hdpi 1.5x, xhdpi 2x, xxhdpi 3x, xxxhdpi 4x.
- **iOS scale:** @2x or @3x only.
- **Always design in dp/pt/CSS px, never physical px.**
- **Web viewport tag:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`

---

## 2. iPhone sizes (portrait)

| Device | Diagonal | Size | Scale |
|---|---|---|---|
| iPhone 5/5s/SE 1 | 4" | 320×568 | @2x |
| iPhone 6/7/8/SE 2/SE 3 | 4.7" | 375×667 | @2x |
| iPhone 6/7/8 Plus | 5.5" | 414×736 | @3x |
| iPhone X/XS/11 Pro | 5.8" | 375×812 | @3x |
| iPhone 12 mini/13 mini | 5.4" | 375×812 | @3x |
| iPhone XR/11 | 6.1" | 414×896 | @2x |
| iPhone XS Max/11 Pro Max | 6.5" | 414×896 | @3x |
| iPhone 12/12 Pro/13/13 Pro/14/16e | 6.1" | 390×844 | @3x |
| iPhone 12 Pro Max/13 Pro Max/14 Plus | 6.7" | 428×926 | @3x |
| iPhone 14 Pro/15/15 Pro/16 | 6.1" | 393×852 | @3x |
| iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus | 6.7" | 430×932 | @3x |
| iPhone 16 Pro/17/17 Pro | 6.3" | 402×874 | @3x |
| iPhone Air | 6.5" | 420×912 | @3x |
| iPhone 16 Pro Max/17 Pro Max | 6.9" | 440×956 | @3x |

**iPad (portrait):**

| Device | Size |
|---|---|
| iPad mini (older 7.9") | 768×1024 |
| iPad mini 8.3" | 744×1133 |
| iPad 10.2" | 810×1080 |
| iPad 10.9" / Air 11" | 820×1180 |
| iPad Pro 11" | 834×1194 |
| iPad Air 13" / Pro 12.9" | 1024×1366 |
| iPad Pro 13" (M4) | 1032×1376 |

---

## 3. Android sizes (dp, portrait)

| Class | Width×Height | Typical devices |
|---|---|---|
| Tiny | 320×480–533 | Old mdpi/hdpi phones |
| Old mainstream | 360×640 | Galaxy S5–S7, 5" HD |
| Most common | 360×720 / 760 / 780 / 800 | Galaxy A/S base, Redmi, Poco, realme, Moto, budget |
| Samsung FHD+ | 384×~824 | Galaxy Plus/Ultra at default scaling |
| Mid-wide | 393×851–873 | Pixel 5, many Xiaomi/Oppo |
| Pixel/standard | 411–412×731–923 | Pixel 2XL–10, OnePlus, Nothing |
| Pixel XL/Pro | 448×998 | Pixel 8 Pro, 9 Pro XL |
| Large phablets | 450–480 wide | QHD at 3x, some Xiaomi/Honor |

**Foldables (approximate):**

| Device | Size |
|---|---|
| Galaxy Z Fold cover | ~344–360 wide, very tall (22:9+) |
| Galaxy Z Fold inner | ~670–700×830–900, near-square |
| Z Flip main | ~412×~1000 |
| Z Flip cover | Widgets/limited UI only |
| Pixel Fold/Pro Fold cover | ~412 wide |
| Pixel Fold/Pro Fold inner | ~700–840, near-square |

**Android tablets (portrait):**

| Size | Width |
|---|---|
| 7" | ~600 |
| 8–8.7" | ~800 |
| 10–11" | ~800–850 |
| 12–14.6" | ~1000–1480 |

**Material window size classes:**

| Class | Width | Height |
|---|---|---|
| Compact | <600 | <480 |
| Medium | 600–839 | 480–899 |
| Expanded | 840–1199 | ≥900 |
| Large | 1200–1599 | n/a |
| Extra-large | 1600+ | n/a |

---

## 4. Layout rules per width bucket

| Width | Devices | Cols | Body | H1 | H2 | Padding | Gap | Nav |
|---|---|---|---|---|---|---|---|---|
| 280–319 | Fold cover, tiny | 1 | 14 | 22 | 18 | 12 | 8 | Hamburger |
| 320–359 | SE 1, small Android | 1 | 15 | 24 | 20 | 16 | 8–12 | Bottom tabs ≤4 |
| 360–389 | Most Android, 375 iPhones | 1 (2 for tiles) | 16 | 26 | 20 | 16 | 12 | Bottom tabs ≤5 |
| 390–429 | iPhone 12–17, Pixel, 412/414 | 1–2 | 16 | 28 | 22 | 16–20 | 12–16 | Bottom tabs 5 |
| 430–479 | Plus/Max/Pro XL | 2 (3 for icons) | 16–17 | 30 | 24 | 20 | 16 | Bottom tabs |
| 480–599 | Phablets, big covers | 2–3 | 16–17 | 32 | 24 | 20–24 | 16 | Tabs or rail |
| 600–839 | Tablets portrait, fold inner | 2–3 or list-detail | 17 | 32–36 | 26 | 24 | 16–24 | Nav rail |
| 840–1199 | Tablets landscape | 3–4, two-pane | 17–18 | 36 | 28 | 24–32 | 24 | Rail or drawer |
| 1200+ | Large tablets, desktop | 12-col grid, max-width | 18 | 40 | 30 | 32–48 | 24–32 | Permanent drawer |

Font sizes are in px/sp. Use `rem` on web.

---

## 5. Detail per bucket

### 280–319
- Stack everything and hide secondary info behind accordions.
- Any row with 3 or more items becomes `flex-direction: column`.
- Buttons go full-width, forms stack with labels above inputs, and tables become card lists.
- Keep app bars to a one-line truncated title with at most 2 actions.
- Fixed widths over 280 cause horizontal overflow.

### 320–359
- Use one column, with 2-up only for small icon tiles (each ≈140px).
- Allow chips to wrap or scroll horizontally with snap.
- Bottom tabs take short labels (10 characters or fewer) at 11–12px, or switch to a hamburger.
- Dialogs become full-screen sheets, with width = 100% − 32.
- Product cards use a 1-column list or compact 2-up (image + price only).
- Cap the text-scale multiplier on tab labels and buttons so they don't break.

### 360–389
- This is the most important design target, since most Android phones and the 375 iPhones land here.
- Primary and secondary buttons sit side-by-side only if both labels are 12 characters or fewer. Otherwise stack them.
- Flex 2-up cards use `flex: 1 1 calc(50% - 6px)` with a minimum of 150px.
- Horizontal carousels peek the next card at about 85% width to signal scroll.
- Bottom sheets open to 50% height with a drag handle.
- Lists use a 56–72px row height with a leading 40px avatar or icon.

### 390–429
- Use a 2-column product or content grid (card min ≈160px).
- Form fields can pair short fields (e.g., City | ZIP) as 2-up.
- Hero images use 16:9 or 4:3 with `aspect-ratio`, not fixed heights.
- Place primary actions in the bottom thumb zone (sticky bottom bar), and keep headers light.
- Toasts and snackbars sit above the bottom nav with a 16px margin.

### 430–479
- Use 2 columns, with 3 for icon or category grids.
- Horizontal chips and filters fit more items before scrolling.
- Reachability is a problem, so keep primary actions in the lower half and use a bottom sheet instead of top menus.
- Side-by-side button groups are safe for most labels.

### 480–599
- Use 2–3 columns, and show more secondary info (subtitle, metadata).
- Landscape phones and large foldable covers also land here, so apply the landscape rules in section 6.
- Optional: move bottom tabs to a nav rail if height is under 480.

### 600–839
- Switch to a nav rail (72–80px) instead of bottom tabs.
- Use list-detail only if both panes fit (list 320–360 + detail ≥ 360).
- Content max-width is about 600–720px centered, or use 2–3 columns.
- Dialogs become centered, with width 280–560px instead of full-screen sheets.
- Keep line length at 60–75 characters.

### 840–1199
- Use two-pane layouts (list 320–400 + detail flexible), or a 3-pane at 1000+.
- Use a permanent rail or a drawer (256–360px), and modals use centered dialogs.
- Grid `repeat(auto-fill, minmax(240px, 1fr))`.
- Hover and keyboard focus states matter here (stylus/trackpad users).

### 1200+
- Use a 12-column grid with a max content width of 1200–1440px, centered.
- Show a permanent drawer and keep line length at 75 characters or less.
- Use multi-pane dashboards and denser tables (no card-stacking).

---

## 6. Landscape phones and foldable postures

- **Landscape phones:** width 568–956, height 320–440 (height compact).
  - Hide bottom tabs and use a side rail.
  - Reduce vertical padding and collapse headers.
  - Set modals to `max-height: 90dvh` with scroll.
  - Use 2-column forms.
  - Apply left and right safe-area insets for the notch.
- **Foldables:**
  - Handle fold and unfold without losing state (resize, not restart).
  - Avoid placing content across the hinge, using Jetpack WindowManager `FoldingFeature`, Flutter `DisplayFeatureSubScreen`, or CSS `horizontal-viewport-segments` where supported.
  - In tabletop posture (half-open), put media on top and controls below.
  - Use size class changes, not device checks.
- **Split-screen and multi-window:** widths can drop to 320 or below on any device, so use window size, not screen size.

---

## 7. Flex and wrap rules

- Default to `flex-wrap: wrap` with `gap` instead of margins.
- Set `min-width: 0` on flex children, or long text won't shrink or truncate.
- Use `flex: 1 1 <basis>` where basis is 140–160px under 430, 180–240px at 600+, and 240–320px at 840+.
- Use `grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr))` to avoid overflow on tiny screens.
- Use `flex-direction: column` below 360px for rows with 3 or more items.
- For long text, use `overflow-wrap: anywhere`, `hyphens: auto`, and `line-clamp` (2–3 lines for titles).
- Avoid fixed `height` on text containers. Use `min-height`.
- For equal-height cards, use `align-items: stretch` and push actions to the bottom with `margin-top: auto`.

---

## 8. Typography handling

- Base font is 16px. Inputs must be at least 16px on iOS, or Safari zooms on focus.
- **Fluid type:** `font-size: clamp(0.9375rem, 0.875rem + 0.3vw, 1.125rem)` for body, `clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem)` for H1.
- Line-height is 1.4–1.6 for body and 1.1–1.25 for headings.
- Minimum caption size is 11–12px.
- **User text scaling:**
  - iOS Dynamic Type goes up to about 310% with accessibility sizes.
  - Android font scale runs 0.85–2.0x.
  - Test at 85%, 100%, 130%, and 200%.
  - Use `sp` on Android, text styles on iOS, `rem` on web, `TextScaler` in Flutter, and `allowFontScaling` in React Native.
  - Cap tab labels and badges only (e.g., `maxFontSizeMultiplier=1.3`). Never block scaling for body text.
- Long-word languages (German, Finnish) need wrapping or hyphenation, never fixed widths.

---

## 9. Component handling

- **Touch targets:** Android 48×48dp minimum, iOS 44×44pt, with 8dp between targets. Small icons use padding or `hitSlop`.
- **Buttons:**
  - Height is 44–56px.
  - Use full-width on small screens and auto-width with a min of 88px on larger ones.
  - Never put 3 or more buttons in one row under 400px.
- **Inputs:**
  - Height is 48–56px.
  - Show labels above or floating, not as placeholder-only.
  - Show the right keyboard type, and scroll the focused field above the keyboard.
- **Navigation:**
  - Bottom tabs have 3–5 items (48–56dp Android, 49pt iOS + safe area).
  - Use a rail at 600+ and a drawer at 840+.
  - Collapse the top bar on scroll.
- **Cards and lists:** Full-bleed or 16px side margins, image `aspect-ratio` with `object-fit: cover`, and swipe actions on rows.
- **Images and media:** `max-width: 100%`, `srcset` and `sizes` for 1x/2x/3x, and lazy-load below the fold.
- **Modals and sheets:** Full-screen or bottom sheet under 600, centered dialog at 600+, and `max-height` with internal scroll.
- **Tables:**
  - Under 600, use card-stacked rows or horizontal scroll with a sticky first column.
  - At 600+, use real tables.
- **Tabs:** Scrollable when more than 4 on compact screens, fixed when they fit.
- **Carousels:** Snap scrolling, peek the next item, and use pagination dots (not arrows) on touch.
- **FAB and sticky bars:** Respect the bottom inset and don't overlap tabs. Reserve content `padding-bottom` equal to the bar height.
- **Charts and maps:** Scale with the container, reduce labels and ticks on narrow screens, and move the legend below the chart under 480.

---

## 10. Safe areas, bars, keyboard

**iOS:**
- Status bar or Dynamic Island inset is about 20pt (SE), 44–47pt (notch), and 59–62pt (Dynamic Island).
- The bottom home indicator inset is 34pt.
- Nav bar is 44pt (large title ≈96pt), and the tab bar is 49pt.
- On web, use `env(safe-area-inset-top|right|bottom|left)`.
- Use `keyboardLayoutGuide` or `KeyboardAvoidingView`.

**Android:**
- Status bar is 24–48dp.
- 3-button nav bar is 48dp, gesture pill ≈16–24dp.
- Edge-to-edge is enforced from Android 15 (target SDK 35), so handle `WindowInsets` (systemBars, ime, displayCutout).
- On Android 16, apps targeting SDK 36 can't opt out of orientation and resizability restrictions on large screens (600dp+).

**Keyboard:** Use `adjustResize` (Android), `dvh`/`visualViewport` (web), and scroll the active input into view. Avoid `100vh` on mobile and use `100dvh` instead.

---

## 11. Framework quick reference

- **CSS:** Mobile-first `min-width` media queries (360, 480, 600, 768, 840, 1024, 1200). Container queries for components, `clamp()`, `dvh`, and `env()`.
- **Tailwind defaults:** sm 640, md 768, lg 1024, xl 1280, 2xl 1536 (add `xs: 360/480` yourself).
- **Bootstrap:** 576, 768, 992, 1200, 1400.
- **React Native:** `useWindowDimensions`, `flexWrap: 'wrap'`, `SafeAreaView`/`react-native-safe-area-context`, `PixelRatio.getFontScale()`, and percent widths or `aspectRatio` instead of fixed px.
- **Flutter:** `LayoutBuilder`, `MediaQuery.sizeOf`, `Wrap`, `Flexible`/`Expanded`, `FittedBox`, `SafeArea`, `TextScaler`, and window size classes via the adaptive package.
- **Android Compose/Views:** `WindowSizeClass`, `ConstraintLayout`, resource qualifiers (`sw360dp`, `sw600dp`, `w840dp`, `h480dp`), and `ListDetailPaneScaffold` or `NavigationSuiteScaffold`.
- **SwiftUI/UIKit:** Size classes (iPhone portrait = compact width/regular height), `ViewThatFits`, `Layout` protocol, `@ScaledMetric`, and safe-area layout guides.

---

## 12. Minimum test set

Test at 320, 360, 375, 390, 412, 430, 600, 768, 840, 1024, plus landscape (e.g., 844×390, 915×412), a foldable inner screen (~700×840), and font scale 200%.

If you want, I can put this into an editable doc you can share or download as Word or PDF. check if these changes you have done now are they responsive to all these screen sizes or not make a plan to make it responsive in all the screen sizes and make it responosive according to the plan 