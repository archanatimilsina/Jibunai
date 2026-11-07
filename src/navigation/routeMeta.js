/**
 * Route metadata only — no screen imports.
 *
 * Keeping this module free of component imports avoids a require cycle:
 *   navigation/routes.jsx -> screens/HomeScreen.jsx -> navigation/routes.jsx
 * Screens and other consumers import from here instead.
 */
export const ROUTE_META = [
  { key: 'home', label: 'Home', caption: 'Your landing page', group: 'Start', icon: 'home' },

  { key: 'myday', label: 'My Day', caption: 'Plan and log today', group: 'Everyday', icon: 'sun' },
  { key: 'chronos', label: 'Chronos', caption: 'Task flow by day', group: 'Everyday', icon: 'clock' },
  { key: 'goals', label: 'Goals', caption: 'Daily streaks', group: 'Everyday', icon: 'target' },
  { key: 'challenge', label: 'Challenges', caption: 'Track a challenge', group: 'Everyday', icon: 'award' },

  { key: 'notes', label: 'Notes', caption: 'Markdown node matrix', group: 'Write', icon: 'file-text' },
  { key: 'blog', label: 'Blog', caption: 'Write and publish', group: 'Write', icon: 'edit-2' },
  { key: 'gesture', label: 'Gesture Draw', caption: 'Sketch ideas', group: 'Write', icon: 'pen-tool' },
  { key: 'archive', label: 'Archive', caption: 'Everything saved', group: 'Write', icon: 'archive' },

  { key: 'hobbies', label: 'Hobbies', caption: 'What you build', group: 'Life', icon: 'heart' },
  { key: 'wishlist', label: 'Wishlist', caption: 'Things to get', group: 'Life', icon: 'star' },
  { key: 'watchlist', label: 'Watchlist', caption: 'Shows and films', group: 'Life', icon: 'tv' },

  { key: 'alarm', label: 'Alarm', caption: 'Alarms & reminders', group: 'Everyday', icon: 'bell' },
  { key: 'datekeeper', label: 'Date Keeper', caption: 'Never miss a date', group: 'Everyday', icon: 'calendar' },
  { key: 'player', label: 'Player', caption: 'All your songs', group: 'Life', icon: 'play' },
  { key: 'settings', label: 'Settings', caption: 'Systems & preferences', group: 'Start', icon: 'settings' },
];

export const GROUPS = ['Start', 'Everyday', 'Write', 'Life'];
