import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, mono } from '../theme';

export default function ScreenFrame({ title, subtitle, onHome, children }) {
  const insets = useSafeAreaInsets();

  const innerInsets = useMemo(
    // The bar above already consumed the top inset (paddingTop: insets.top),
    // so children start below it with top: 0 — no double notch padding.
    () => ({ ...insets, top: 0 }),
    [insets]
  );

  return (
    <View style={st.wrap}>
      <View style={[st.bar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onHome}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          hitSlop={8}
          style={({ pressed }) => [st.iconBtn, pressed && { opacity: 0.65 }]}
        >
          <Feather name="chevron-left" size={18} color={C.dark} />
        </Pressable>

        <View style={st.titles}>
          <Text style={st.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={st.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <SafeAreaInsetsContext.Provider value={innerInsets}>
        <View style={st.content}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLt,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderLt,
    backgroundColor: C.surface,
  },
  titles: { flex: 1, alignItems: 'center' },
  title: { fontFamily: F.sansBold, fontSize: 15, color: C.dark, letterSpacing: 0.2 },
  subtitle: {
    fontFamily: mono,
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: C.ph,
    marginTop: 2,
  },
  content: { flex: 1 },
});
