/**
 * Settings → Add or remove systems.
 *
 * Toggling a system on takes effect instantly. Toggling one off first checks
 * whether it holds data:
 *   - empty      → removed immediately
 *   - has data   → Export & remove / Remove without export / Cancel
 *
 * Removal only hides the system on this device — the server copy is kept, so
 * re-adding restores everything after a sync.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { SYSTEMS, systemByKey } from '../systems/catalog';
import { useSystems } from '../systems/prefs';
import { exportSystemData, systemDataCount } from '../systems/exporter';
import { C } from '../theme';

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const { isEnabled, setEnabled } = useSystems();

  const [checkingKey, setCheckingKey] = useState(null);
  const [confirm, setConfirm] = useState(null); // { key, count }
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState(null); // { msg, err }
  const noticeTimer = useRef(null);

  const showNotice = useCallback((msg, err = false) => {
    setNotice({ msg, err });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3600);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const flip = async (key, next) => {
    if (next) {
      await setEnabled(key, true);
      showNotice(`${systemByKey(key)?.label} added.`);
      return;
    }
    // Turning off: check for data first.
    setCheckingKey(key);
    try {
      const count = await systemDataCount(key);
      setCheckingKey(null);
      if (count > 0) {
        setConfirm({ key, count });
      } else {
        await setEnabled(key, false);
        showNotice(`${systemByKey(key)?.label} removed.`);
      }
    } catch {
      setCheckingKey(null);
      showNotice('Could not check for saved data — try again.', true);
    }
  };

  const removeWithoutExport = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      await setEnabled(confirm.key, false);
      showNotice(`${systemByKey(confirm.key)?.label} removed. Your server copy is kept.`);
      setConfirm(null);
    } finally {
      setWorking(false);
    }
  };

  const exportAndRemove = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      await exportSystemData(confirm.key);
      await setEnabled(confirm.key, false);
      showNotice(`${systemByKey(confirm.key)?.label} exported and removed.`);
      setConfirm(null);
    } catch (e) {
      showNotice(e?.message || 'Export failed — nothing was removed.', true);
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={[st.body, wide && st.bodyWide]} keyboardShouldPersistTaps="handled">
        <Text style={st.kicker}>SETTINGS</Text>
        <Text style={st.title}>Add or remove systems</Text>
        <Text style={st.desc}>
          Your app, your rules. Removing a system hides it here — your data
          stays safe on the server and comes back if you re-add it.
        </Text>

        <View style={st.list}>
          {SYSTEMS.map((s) => {
            const on = isEnabled(s.key);
            const busy = checkingKey === s.key;
            return (
              <View key={s.key} style={[st.row, on && st.rowOn]}>
                <View style={[st.icon, on && st.iconOn]}>
                  <Feather name={s.icon} size={17} color={on ? C.green : C.soft} />
                </View>
                <View style={st.meta}>
                  <Text style={st.label}>{s.label}</Text>
                  <Text style={st.sub}>{s.description}</Text>
                </View>
                {busy
                  ? <ActivityIndicator size="small" color={C.green} />
                  : (
                    <Switch
                      value={on}
                      onValueChange={(next) => flip(s.key, next)}
                      trackColor={{ true: C.green }}
                      accessibilityLabel={`Toggle ${s.label}`}
                    />
                  )}
              </View>
            );
          })}
        </View>

        {!!notice && (
          <View style={[st.notice, notice.err && st.noticeErr]}>
            <Feather name={notice.err ? 'alert-triangle' : 'check'} size={14} color={notice.err ? C.danger : C.green} />
            <Text style={st.noticeText}>{notice.msg}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => !working && setConfirm(null)}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !working && setConfirm(null)} accessibilityLabel="Cancel" />
          <View style={st.modal}>
            <Text style={st.modalTitle}>
              {confirm ? `Remove ${systemByKey(confirm.key)?.label}?` : ''}
            </Text>
            <Text style={st.modalDesc}>
              {confirm
                ? `It holds ${confirm.count} saved item${confirm.count === 1 ? '' : 's'}. Export a backup file first, or remove it from this app and keep the server copy.`
                : ''}
            </Text>
            <View style={st.modalActions}>
              <Pressable
                onPress={exportAndRemove}
                disabled={working}
                style={({ pressed }) => [st.btn, st.btnPrimary, working && { opacity: 0.6 }, pressed && { opacity: 0.88 }]}
              >
                {working
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[st.btnText, { color: '#fff' }]}>Export & remove</Text>}
              </Pressable>
            </View>
            <View style={st.modalActionsSecondary}>
              <Pressable onPress={() => !working && setConfirm(null)} disabled={working} style={st.linkBtn}>
                <Text style={st.linkText}>Keep it</Text>
              </Pressable>
              <Pressable onPress={removeWithoutExport} disabled={working} style={st.linkBtn}>
                <Text style={[st.linkText, { color: C.danger }]}>Remove without export</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f5f0' },
  body: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 48 },
  bodyWide: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: '#7a7567', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: '#1a1a2e', marginBottom: 8 },
  desc: { fontSize: 14.5, lineHeight: 22, color: '#7a7567', marginBottom: 24 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e4e0d6',
    borderRadius: 14, padding: 13,
  },
  rowOn: { borderColor: '#2d6a4f', backgroundColor: '#f2f8f4' },
  icon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eceae3',
  },
  iconOn: { backgroundColor: '#e4f1ea' },
  meta: { flex: 1, minWidth: 0 },
  label: { fontSize: 15.5, fontWeight: '700', color: '#1a1a2e' },
  sub: { fontSize: 13, lineHeight: 18, color: '#7a7567', marginTop: 1 },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18,
    backgroundColor: '#e4f1ea', borderWidth: 1, borderColor: '#b7e4c7',
    borderRadius: 12, padding: 12,
  },
  noticeErr: { backgroundColor: '#fdecea', borderColor: '#fecaca' },
  noticeText: { flex: 1, fontSize: 13.5, color: '#1a1a2e' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 16, padding: 22,
    width: '100%', maxWidth: 380,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  modalDesc: { fontSize: 14, lineHeight: 21, color: '#7a7567', marginBottom: 20 },
  modalActions: { marginBottom: 6 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 10,
  },
  btnPrimary: { backgroundColor: '#1a1a2e' },
  btnText: { fontSize: 15, fontWeight: '800' },
  modalActionsSecondary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  linkBtn: { padding: 8 },
  linkText: { fontSize: 14, fontWeight: '700', color: '#7a7567' },
});
