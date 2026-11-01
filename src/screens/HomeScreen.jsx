import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, mono } from '../theme';
import TodaysTasks from '../components/TodaysTasks';

export default function HomeScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const compact = width < 380;
  const wide = width >= 700;

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
        {}
        <View style={[st.hero, wide && st.heroWide]}>
          <Image
            source={require('../../assets/jibunai-logo.png')}
            style={[st.heroLogo, compact && { height: compact ? 116 : 148 }]}
            resizeMode="contain"
          />
          <Text style={[st.brand, compact && { fontSize: 34 }]}>Jibunai</Text>
          <Text style={st.tagline}>yours, quietly</Text>
        </View>

        {/* what is still waiting to be done */}
        <TodaysTasks onNavigate={onNavigate} />

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
