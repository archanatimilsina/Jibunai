import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, mono } from '../theme';
import { BREAKPOINTS } from '../utils/responsive';
import { ROUTE_META } from '../navigation/routeMeta';
import { systemForRoute } from '../systems/catalog';
import TodaysTasks from '../components/TodaysTasks';
import { useSystems } from '../systems/prefs';

export default function HomeScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { enabled, isEnabled } = useSystems();

  const compact = width < BREAKPOINTS.narrow;
  const wide = width >= BREAKPOINTS.medium;

  // every navigable menu except the dashboard itself, gated like the wheel
  const menus = useMemo(() => ROUTE_META.filter((m) => {
    if (m.key === 'home' || m.key === 'settings') return true;
    const sys = systemForRoute(m.key);
    if (!sys) return true;
    return enabled.includes(sys.key);
  }), [enabled]);

  return (
    <View style={[st.wrap, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          st.body,
          {
            paddingBottom: insets.bottom + 40,
            maxWidth: wide ? 1180 : undefined,
            alignSelf: wide ? 'center' : undefined,
            width: '100%',
          },
        ]}
      >
        <View style={[st.hero, wide && st.heroWide]}>
          <Image
            source={require('../../assets/jibunai-logo.png')}
            style={[st.heroLogo, compact && { height: 116 }]}
            resizeMode="contain"
          />
          <Text style={[st.brand, compact && { fontSize: 34 }]}>Jibunai</Text>
          <Text style={st.tagline}>yours, quietly</Text>
        </View>

        {/* horizontally scrolling menu container — all menus in one row */}
        <View style={st.menuWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.menuRow}
          >
            {menus.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => onNavigate?.(m.key)}
                accessibilityLabel={`Open ${m.label}`}
                style={st.menuChip}
              >
                <Feather name={m.icon} size={14} color={C.dark} />
                <Text style={st.menuLabel} numberOfLines={1}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {/* small triangle on the right edge showing there is more to pull */}
          <View style={st.pullTriangle} />
        </View>

        {/* what is still waiting to be done (only when tasks are enabled) */}
        {isEnabled('tasks') && <TodaysTasks onNavigate={onNavigate} />}

        <Text style={st.foot}>Jibunai · made for one</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: 18 },

  hero: { alignItems: 'center', paddingTop: 18, paddingBottom: 26 },
  heroWide: { paddingTop: 30, paddingBottom: 40 },
  heroLogo: { width: 168, height: 148 },
  brand: { marginTop: 14, fontSize: 40, fontWeight: '800', letterSpacing: 1.5, color: C.dark },
  tagline: {
    marginTop: 6,
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    color: C.soft,
  },

  menuWrap: { position: 'relative', marginTop: 10 },
  menuRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 2,
    paddingBottom: 6,
    alignItems: 'center',
  },
  menuChip: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderLt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
    minWidth: 78,
  },
  menuLabel: { fontSize: 11, fontWeight: '700', color: C.dark, letterSpacing: 0.4 },

  // pull indicator — small triangle on the right edge
  pullTriangle: {
    position: 'absolute',
    right: 6,
    top: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 0,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: C.soft,
  },

  foot: {
    marginTop: 34,
    textAlign: 'center',
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: C.ph,
  },
});
