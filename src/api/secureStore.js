/**
 * Encrypted-at-rest storage for secrets (auth token, pre-auth tokens).
 *
 * Uses expo-secure-store when available (Keychain on iOS / EncryptedSharedPreferences
 * on Android) and falls back to AsyncStorage on web or when the native module is
 * missing. Non-secret payloads (cached lists, user profile) stay in AsyncStorage /
 * the resource cache — only secrets go through here.
 *
 * NOTE: SecureStore values are limited to ~2048 bytes. Never store whole objects
 * here — store the token only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore = null;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

export const secureAvailable = () => !!SecureStore?.setItemAsync;

export async function secureGet(key) {
  if (SecureStore?.getItemAsync) {
    try {
      const v = await SecureStore.getItemAsync(key);
      if (v !== null && v !== undefined) return v;
    } catch {
      /* fall through to AsyncStorage */
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function secureSet(key, value) {
  const v = String(value ?? '');
  if (SecureStore?.setItemAsync) {
    try {
      await SecureStore.setItemAsync(key, v, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    } catch {
      /* fall through to AsyncStorage */
    }
  }
  try {
    await AsyncStorage.setItem(key, v);
  } catch {
    /* storage unavailable — session just won't survive a restart */
  }
}

export async function secureDelete(key) {
  if (SecureStore?.deleteItemAsync) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
