import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, mono } from '../theme';

/** the artwork is 180dp — identical to the native splash icon (see app.json) */
const ART = 180;

export default function AppSplash({ onDone, hold = 700 }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const word = useRef(new Animated.Value(0)).current;
  const rule = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.timing(word, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(rule, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(hold),
    ]);

    intro.start(({ finished }) => {
      if (finished) onDone?.();
    });

    return () => intro.stop();
  }, [hold, word, rule, fade, onDone]);

  // the artwork sits exactly where the native splash icon was, so the
  // hand-over from the system splash to this one is invisible
  const centreY = height / 2;

  return (
    <View style={[st.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          st.logoBox,
          {
            width: ART,
            height: ART,
            left: (width - ART) / 2,
            top: centreY - ART / 2,
          },
        ]}
      >
        <Image source={require('../../assets/splash-artwork.png')} style={st.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View
        style={[
          st.block,
          {
            top: centreY + ART / 2 + 18,
            opacity: word,
            transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}
      >
        <Animated.Text
          style={[
            st.word,
            {
              opacity: word,
              transform: [
                { translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { scale: word.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) },
              ],
            },
          ]}
        >
          Jibunai
        </Animated.Text>

        <Animated.View
          style={[
            st.rule,
            {
              opacity: rule,
              // width is a layout property: animate it with scaleX instead.
              transform: [{ scaleX: rule.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
            },
          ]}
        />

        <Animated.Text style={[st.tagline, { opacity: fade }]}>yours, quietly</Animated.Text>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: C.bg,
  },

  logoBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  logo: { width: '100%', height: '100%' },

  block: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  word: {
    marginTop: 22,
    fontSize: 40,
    fontWeight: '800',
    color: C.dark,
    letterSpacing: 2.4,
  },
  rule: {
    marginTop: 16,
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.green,
  },
  tagline: {
    marginTop: 14,
    fontFamily: mono,
    fontSize: 11.5,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: C.soft,
  },
});
