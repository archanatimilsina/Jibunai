/**
 * Safe-removal engine for systems.
 *
 * - `systemDataCount(systemKey)` — how many items the system currently holds
 *   (server when online, on-device copy when offline).
 * - `exportSystemData(systemKey)` — writes a JSON snapshot to the cache dir
 *   and opens the share sheet. Never throws without a message.
 *
 * Removal itself never touches the server: disabling a system only hides it
 * locally, so re-adding restores everything after a sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { systemByKey } from './catalog';
import { fetchResource } from '../api/resources';
import { getEntry, hydrateResource } from '../api/cache';
import { isOnlineNow } from '../api/connectivity';

const countItems = (data) => {
  if (Array.isArray(data)) return data.length;
  if (data && Array.isArray(data.results)) return data.results.length;
  if (data && typeof data === 'object') return Object.keys(data).length > 0 ? 1 : 0;
  return 0;
};

/** Read one resource: server truth when online, disk cache when offline. */
async function readResourceData(resourceKey) {
  if (isOnlineNow()) {
    try {
      return await fetchResource(resourceKey);
    } catch {
      /* fall through to the on-device copy */
    }
  }
  const cached = getEntry(resourceKey)?.data;
  if (cached !== undefined && cached !== null) return cached;
  try {
    const stored = await hydrateResource(resourceKey);
    return stored ? stored.data : null;
  } catch {
    return null;
  }
}

/** Total items across everything a system owns (resources + local strokes). */
export async function systemDataCount(systemKey) {
  const sys = systemByKey(systemKey);
  if (!sys) return 0;
  let total = 0;
  for (const ref of sys.resources || []) {
    try {
      total += countItems(await readResourceData(ref.key));
    } catch {
      /* unreadable counts as zero — removal stays safe */
    }
  }
  for (const key of sys.storageKeys || []) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      total += Array.isArray(parsed) ? parsed.length : 1;
    } catch {
      /* ignore */
    }
  }
  return total;
}

const fileSafeDate = () => new Date().toISOString().slice(0, 10);

/** Build the export payload (does not write or share anything). */
export async function buildSystemExport(systemKey) {
  const sys = systemByKey(systemKey);
  if (!sys) throw new Error('Unknown system.');
  const data = {};
  for (const ref of sys.resources || []) {
    try {
      data[ref.key] = (await readResourceData(ref.key)) ?? null;
    } catch {
      data[ref.key] = null;
    }
  }
  for (const key of sys.storageKeys || []) {
    try {
      const raw = await AsyncStorage.getItem(key);
      data[key] = raw ? JSON.parse(raw) : null;
    } catch {
      data[key] = null;
    }
  }
  return {
    app: 'jibunai',
    system: sys.key,
    label: sys.label,
    exportedAt: new Date().toISOString(),
    exportedOnline: isOnlineNow(),
    data,
  };
}

/**
 * Write the export file and open the share sheet.
 * @returns the file URI (handy for a "saved" confirmation).
 */
export async function exportSystemData(systemKey) {
  const sys = systemByKey(systemKey);
  if (!sys) throw new Error('Unknown system.');
  const payload = await buildSystemExport(systemKey);
  const base = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!base) throw new Error('No writable storage on this device.');
  const name = `jibunai-${sys.key}-${fileSafeDate()}.json`;
  const uri = `${base}${name}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  const available = await Sharing.isAvailableAsync().catch(() => false);
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: `Export ${sys.label} data`,
    });
  }
  return uri;
}
