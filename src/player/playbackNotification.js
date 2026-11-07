/**
 * Playback notification — the "music at the top" surface.
 *
 * When you pull down from the top of the phone (the notification shade),
 * a sticky "Now playing" card shows the current song with Pause/Play and
 * a ✕ Stop button. Tapping ✕ pauses the music and removes the card.
 *
 * This is a plain local notification (no server, fully offline). It is the
 * replacement for the old in-app mini bar: controls live in the shade, so
 * they work from any screen, on the lock screen, and while browsing.
 *
 * Honest limit (Expo managed workflow): the sound itself is played by the
 * app process. Music keeps playing with the screen locked or the app
 * backgrounded, but if the app is swiped away / force-stopped, playback
 * stops — only a native track-player service could survive that, which
 * would require leaving the managed build.
 */
let Notifications = null;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

const CHANNEL_ID = 'playback';
const CATEGORY_ID = 'jibunai-playback';
export const ACTION_TOGGLE = 'playback-toggle';
export const ACTION_STOP = 'playback-stop';

let currentId = null;
let lastKey = '';

export const playbackNotifAvailable = () => !!Notifications?.scheduleNotificationAsync;

export async function ensurePlaybackSetup() {
  if (!Notifications) return false;
  try {
    if (Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Now playing',
        importance: Notifications.AndroidImportance?.LOW ?? 2,
        sound: null,
        vibrationPattern: [],
        showBadge: false,
      });
    }
    if (Notifications.setNotificationCategoryAsync) {
      await Notifications.setNotificationCategoryAsync(
        CATEGORY_ID,
        [
          { identifier: ACTION_TOGGLE, buttonTitle: 'Pause', options: { opensAppToForeground: false } },
          { identifier: ACTION_STOP, buttonTitle: 'Stop', options: { opensAppToForeground: false } },
        ],
        { previewPlaceholderContent: { title: 'Now playing' } },
      );
    }
    return true;
  } catch {
    return false;
  }
}

/** Show (or refresh) the sticky card. No-op when nothing changed. */
export async function showPlaybackNotification(track, playing) {
  if (!Notifications?.scheduleNotificationAsync || !track) return null;
  const key = `${track.id}-${playing ? 'p' : 's'}`;
  if (key === lastKey && currentId) return currentId;
  lastKey = key;
  try {
    if (currentId && Notifications.dismissNotificationAsync) {
      await Notifications.dismissNotificationAsync(currentId).catch(() => {});
    }
    currentId = await Notifications.scheduleNotificationAsync({
      content: {
        title: track.title || 'Now playing',
        body: playing ? `${track.artist || 'Unknown artist'} · Playing` : `${track.artist || 'Unknown artist'} · Paused`,
        data: { playback: true, trackId: track.id },
        categoryIdentifier: CATEGORY_ID,
        sticky: true,
        autoDismiss: false,
        sound: null,
      },
      trigger: null,
    });
    return currentId;
  } catch {
    return null;
  }
}

export async function clearPlaybackNotification() {
  lastKey = '';
  if (!currentId) return;
  const id = currentId;
  currentId = null;
  if (!Notifications?.dismissNotificationAsync) return;
  try {
    await Notifications.dismissNotificationAsync(id);
  } catch {
    /* already gone */
  }
}
