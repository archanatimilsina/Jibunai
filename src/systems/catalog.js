/**
 * System catalog — the twelve toggleable systems of the app.
 *
 * A system = one user-facing feature, owning:
 *   - routes:      nav keys from ROUTE_META that belong to it
 *   - resources:   cache/resource keys holding its server data (for
 *                  data-presence checks + export)
 *   - localKeys:   AsyncStorage keys holding its on-device extras
 *                  (pins, likes — kept on removal so re-adding restores them)
 *
 * `fetchKind` tells the exporter how to read the data:
 *   - 'resource' — via fetchResource(key), server when online / cache offline
 *   - 'storage'  — raw AsyncStorage JSON (Gesture Draw keeps strokes local)
 *
 * Settings itself is not a system — it is always available.
 */
export const SYSTEMS = [
  {
    key: 'myday',
    label: 'My Day',
    description: 'Plan and log today, with photos.',
    icon: 'sun',
    group: 'Everyday',
    routes: ['myday'],
    resources: [{ key: 'daylogs', fetchKind: 'resource' }],
    localKeys: ['myday:extras:v1', 'myday:view'],
    defaultEnabled: true,
  },
  {
    key: 'tasks',
    label: 'Chronos',
    description: 'Task flow by day, plus the home checklist.',
    icon: 'clock',
    group: 'Everyday',
    routes: ['chronos'],
    resources: [{ key: 'tasks', fetchKind: 'resource' }],
    localKeys: [],
    defaultEnabled: true,
  },
  {
    key: 'goals',
    label: 'Goals',
    description: 'Daily streaks toward what matters.',
    icon: 'target',
    group: 'Everyday',
    routes: ['goals'],
    resources: [{ key: 'goals', fetchKind: 'resource' }],
    localKeys: [],
    defaultEnabled: true,
  },
  {
    key: 'challenges',
    label: 'Challenges',
    description: 'Track a challenge day by day.',
    icon: 'award',
    group: 'Everyday',
    routes: ['challenge'],
    resources: [{ key: 'challenges', fetchKind: 'resource' }],
    localKeys: [],
    defaultEnabled: true,
  },
  {
    key: 'notes',
    label: 'Notes',
    description: 'Fast markdown notes, offline-first.',
    icon: 'file-text',
    group: 'Write',
    routes: ['notes'],
    resources: [{ key: 'notes', fetchKind: 'resource' }],
    localKeys: ['notes:pinned-ids'],
    defaultEnabled: true,
  },
  {
    key: 'blog',
    label: 'Blog',
    description: 'Write and publish stories.',
    icon: 'edit-2',
    group: 'Write',
    routes: ['blog'],
    resources: [{ key: 'blogPosts', fetchKind: 'resource' }],
    localKeys: ['blog:liked-ids'],
    defaultEnabled: true,
  },
  {
    key: 'gesture',
    label: 'Gesture Draw',
    description: 'Sketch ideas with your finger.',
    icon: 'pen-tool',
    group: 'Write',
    routes: ['gesture'],
    resources: [],
    localKeys: [],
    // Strokes live only on this device (no server copy).
    storageKeys: ['gesturedraw:strokes'],
    defaultEnabled: true,
  },
  {
    key: 'archive',
    label: 'Archive',
    description: 'Everything saved, in one place.',
    icon: 'archive',
    group: 'Write',
    routes: ['archive'],
    resources: [{ key: 'archive', fetchKind: 'resource' }],
    localKeys: [],
    defaultEnabled: true,
  },
  {
    key: 'hobbies',
    label: 'Hobbies',
    description: 'What you build and love.',
    icon: 'heart',
    group: 'Life',
    routes: ['hobbies'],
    resources: [{ key: 'hobbies', fetchKind: 'resource' }],
    localKeys: [],
    defaultEnabled: true,
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
    description: 'Things to get someday.',
    icon: 'star',
    group: 'Life',
    routes: ['wishlist'],
    resources: [{ key: 'wishes', fetchKind: 'resource' }],
    localKeys: [],
    defaultEnabled: true,
  },
  {
    key: 'watchlist',
    label: 'Watchlist',
    description: 'Shows and films to watch.',
    icon: 'tv',
    group: 'Life',
    routes: ['watchlist'],
    resources: [{ key: 'watchlist', fetchKind: 'resource' }],
    localKeys: [],
    defaultEnabled: true,
  },
  {
    key: 'alarm',
    label: 'Alarm',
    description: 'Alarms and exact reminders, even offline.',
    icon: 'bell',
    group: 'Everyday',
    routes: ['alarm'],
    resources: [],
    localKeys: [],
    // Alarms live only on this device (OS-scheduled, no server copy).
    storageKeys: ['jibunai:alarms:v1', 'jibunai:alarms:trash:v1', 'jibunai:alarms:paused:v1', 'jibunai:alarms:recent-labels:v1'],
    defaultEnabled: true,
  },
  {
    key: 'datekeeper',
    label: 'Date Keeper',
    description: 'Important dates with daily, monthly or yearly reminders.',
    icon: 'calendar',
    group: 'Everyday',
    routes: ['datekeeper'],
    resources: [],
    localKeys: [],
    // Dates live only on this device (OS-scheduled, no server copy).
    storageKeys: ['jibunai:datekeeper:v1'],
    defaultEnabled: true,
  },
  {
    key: 'player',
    label: 'Music Player',
    description: 'All your songs, with covers and full controls.',
    icon: 'play',
    group: 'Life',
    routes: ['player'],
    resources: [],
    localKeys: [],
    // Library index + covers + favorites live only on this device.
    storageKeys: ['jibunai:player:v1'],
    defaultEnabled: true,
  },
];

export const systemByKey = (key) => SYSTEMS.find((s) => s.key === key) || null;

/** Which system owns a nav route key (home/settings belong to none). */
export function systemForRoute(routeKey) {
  if (!routeKey) return null;
  return SYSTEMS.find((s) => (s.routes || []).includes(routeKey)) || null;
}

/** All resource keys owned by a system (for presence checks + export). */
export function systemResourceKeys(systemKey) {
  const sys = systemByKey(systemKey);
  if (!sys) return [];
  return (sys.resources || []).map((r) => r.key);
}
