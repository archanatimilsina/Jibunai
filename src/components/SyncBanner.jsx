/**
 * Global sync status pill — the offline/online face of the app.
 *
 * - Offline:      "Offline — changes save on this device" (amber)
 * - Online+queued:"Syncing N changes…" with a manual Retry (blue)
 * - Fully synced: renders nothing
 *
 * Place once near the root (AppShell) so every screen inherits it.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { subscribeOnline, isOnlineNow } from '../api/connectivity';
import { subscribeOutbox } from '../api/outbox';
import { syncNow } from '../api/syncEngine';

export function useSyncStatus() {
  const [online, setOnline] = useState(isOnlineNow());
  const [pending, setPending] = useState(0);
  useEffect(() => subscribeOnline(setOnline), []);
  useEffect(() => subscribeOutbox((ops) => setPending(ops.length)), []);
  return { online, pending };
}

export default function SyncBanner({ onPressRetry }) {
  const { online, pending } = useSyncStatus();
  const [syncing, setSyncing] = useState(false);

  if (online && pending === 0) return null;

  const retry = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncNow();
    } catch {
      /* banner re-renders from queue state */
    } finally {
      setSyncing(false);
    }
    onPressRetry?.();
  };

  return (
    <View pointerEvents="box-none" style={st.wrap}>
      <View style={[st.pill, !online ? st.offline : st.queued]}>
        {syncing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Feather name={!online ? 'wifi-off' : 'refresh-cw'} size={13} color="#fff" />
        )}
        <Text style={st.text}>
          {!online
            ? `Offline — changes save on this device${pending ? ` (${pending} to sync)` : ''}`
            : `Syncing ${pending} change${pending === 1 ? '' : 's'}…`}
        </Text>
        {online && pending > 0 && (
          <Pressable onPress={retry} hitSlop={8} style={st.retry} accessibilityLabel="Retry sync now">
            <Text style={st.retryText}>{syncing ? '…' : 'Retry'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
    zIndex: 60,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  offline: { backgroundColor: '#92600a' },
  queued: { backgroundColor: '#2d6a4f' },
  text: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  retry: {
    marginLeft: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
