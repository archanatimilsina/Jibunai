/**
 * Staging for offline-created image uploads.
 *
 * ImagePicker hands us cache-dir URIs that the OS may purge, so any file
 * attached to a queued (offline) write is copied into a persistent
 * `jibunai-uploads/` folder first. The sync engine uploads the staged copy
 * on replay and deletes it afterwards.
 */
import * as FileSystem from 'expo-file-system';

const DIR_NAME = 'jibunai-uploads';

let dirReady = false;

async function baseDir() {
  const base =
    FileSystem.documentDirectory || FileSystem.cacheDirectory || null;
  if (!base) return null;
  return `${base}${DIR_NAME}/`;
}

async function ensureDir() {
  if (dirReady) return true;
  const dir = await baseDir();
  if (!dir) return false;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // Already exists — makeDirectoryAsync throws in that case on some builds.
  }
  dirReady = true;
  return true;
}

/** Copy a picked image into persistent storage. Returns the staged URI. */
export async function stageFile(uri, name) {
  if (!uri) return null;
  try {
    if (!(await ensureDir())) return uri; // fall back to the original URI
    const dir = await baseDir();
    const safe = String(name || `upload-${Date.now()}.jpg`).replace(/[^\w.\-]+/g, '-');
    const dest = `${dir}${Date.now()}-${safe}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/** Best-effort check whether a staged file still exists. */
export async function stagedFileExists(uri) {
  if (!uri) return false;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return !!info?.exists;
  } catch {
    return false;
  }
}

/** Delete a staged copy (after a successful upload). Never throws. */
export async function cleanupStagedFile(uri) {
  if (!uri) return;
  try {
    const dir = await baseDir();
    if (dir && uri.startsWith(dir)) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}
