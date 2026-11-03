/**
 * First-run system picker — shown once, right after the auth gates.
 * The user chooses which systems live in their app. Everything starts on;
 * turning a system off here simply hides it (data stays safe on the server).
 */
import React, { useState } from 'react';
import {
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

import { SYSTEMS } from '../systems/catalog';
import { completeOnboarding } from '../systems/prefs';
import { C } from '../theme';

export default function SystemPickerScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const [picked, setPicked] = useState(() => new Set(SYSTEMS.map((s) => s.key)));
  const [saving, setSaving] = useState(false);

  const toggle = (key) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const done = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await completeOnboarding([...picked]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={[st.body, wide && st.bodyWide]} keyboardShouldPersistTaps="handled">
        <Text style={st.kicker}>SET UP</Text>
        <Text style={st.title}>Choose your systems</Text>
        <Text style={st.desc}>
          Jibunai is yours — keep only what you need. You can add or remove
          systems anytime in Settings, and removing one never deletes your data.
        </Text>

        <View style={st.list}>
          {SYSTEMS.map((s) => {
            const on = picked.has(s.key);
            return (
              <Pressable
                key={s.key}
                onPress={() => toggle(s.key)}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${s.label}, ${on ? 'on' : 'off'}`}
                style={({ pressed }) => [st.row, on && st.rowOn, pressed && { opacity: 0.85 }]}
              >
                <View style={[st.icon, on && st.iconOn]}>
                  <Feather name={s.icon} size={17} color={on ? C.green : C.soft} />
                </View>
                <View style={st.meta}>
                  <Text style={st.label}>{s.label}</Text>
                  <Text style={st.sub}>{s.description}</Text>
                </View>
                <Switch value={on} onValueChange={() => toggle(s.key)} trackColor={{ true: C.green }} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={done}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Continue to my app"
          style={({ pressed }) => [st.cta, saving && { opacity: 0.6 }, pressed && { opacity: 0.88 }]}
        >
          <Text style={st.ctaText}>
            {saving ? 'Saving…' : `Continue with ${picked.size} system${picked.size === 1 ? '' : 's'}`}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f5f0' },
  body: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 48 },
  bodyWide: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: '#7a7567', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: '#1a1a2e', marginBottom: 8 },
  desc: { fontSize: 14.5, lineHeight: 22, color: '#7a7567', marginBottom: 24 },
  list: { gap: 10, marginBottom: 28 },
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
  cta: {
    backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
