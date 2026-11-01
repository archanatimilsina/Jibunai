import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';

import { startCacheLifecycle } from './src/api/cacheLifecycle';
import AppSplash from './src/components/AppSplash';
import ScreenFrame from './src/components/ScreenFrame';
import WheelNav from './src/components/WheelNav';
import { getRoute } from './src/navigation/routes';
import { C } from './src/theme';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import RegisterScreen from './src/screens/RegisterScreen';
import Gate1Screen from './src/screens/Gate1Screen';
import Gate2Screen from './src/screens/Gate2Screen';
import Gate3Screen from './src/screens/Gate3Screen';

const ACCEPTS_BACK = new Set(['blog']);

const MENU_SIZE = 38;
const MENU_RIGHT = 12;
const MENU_TOP = 8;

/** a tiny steering-wheel glyph — the nav wheel in miniature */
function WheelGlyph({ size = 19, color = C.dark }) {
  const c = 12;
  const outer = 9.4;
  const inner = 3.1;
  const spokes = [0, 45, 90, 135, 180, 225, 270, 315];
  const point = (deg, r) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={c} cy={c} r={outer} stroke={color} strokeWidth="1.7" fill="none" />
      <Circle cx={c} cy={c} r={inner} stroke={color} strokeWidth="1.7" fill="none" />
      {spokes.map((deg) => {
        const a = point(deg, inner);
        const b = point(deg, outer);
        return <Line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="1.3" />;
      })}
    </Svg>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppBoot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppBoot() {
  const [booted, setBooted] = useState(false);
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });
  const { ready, isAuthenticated } = useAuth();

  // Splash plays first (covers font load), then the auth gate decides shell vs login flow.
  if (!booted) {
    return (
      <>
        <StatusBar style="dark" />
        <View style={st.root}>
          <AppSplash onDone={() => setBooted(true)} />
        </View>
      </>
    );
  }

  // Wait for fonts + SecureStore hydration before branching.
  if (!fontsLoaded || !ready) {
    return (
      <>
        <StatusBar style="dark" />
        <View style={st.root} />
      </>
    );
  }

  if (isAuthenticated) {
    return <AppShell />;
  }
  return <AuthFlow />;
}

/** Main app shell (wheel nav, home + feature screens) — only shown when authenticated. */
function AppShell() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { logout } = useAuth();
  const [wheelOpen, setWheelOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('home');

  const wheelRef = useRef(wheelOpen);
  wheelRef.current = wheelOpen;
  const keyRef = useRef(activeKey);
  keyRef.current = activeKey;

  const menuFade = useRef(new Animated.Value(1)).current;

  const wheelOrigin = useMemo(() => ({
    x: width - MENU_RIGHT - MENU_SIZE / 2,
    y: insets.top + MENU_TOP + MENU_SIZE / 2,
  }), [width, insets.top]);

  useEffect(() => {
    startCacheLifecycle();
  }, []);

  const navigate = useCallback((key) => {
    setActiveKey(key);
    setWheelOpen(false);
  }, []);

  const goHome = useCallback(() => {
    setActiveKey('home');
    setWheelOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    // AuthFlow is rendered by AppBoot when isAuthenticated becomes false.
  }, [logout]);

  const toggleWheel = useCallback(() => setWheelOpen((v) => !v), []);
  const closeWheel = useCallback(() => setWheelOpen(false), []);

  useEffect(() => {
    Animated.timing(menuFade, {
      toValue: wheelOpen ? 0 : 1,
      duration: wheelOpen ? 150 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [wheelOpen, menuFade]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (wheelRef.current) {
        setWheelOpen(false);
        return true;
      }
      if (keyRef.current !== 'home') {
        setActiveKey('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const route = getRoute(activeKey);
  const Screen = route.screen;

  return (
    <>
      <StatusBar style="dark" />
      <View style={st.root}>
        {activeKey === 'home' ? (
          <Screen onNavigate={navigate} activeKey={activeKey} />
        ) : (
          <ScreenFrame
            title={route.label}
            subtitle={route.group}
            onHome={goHome}
          >
            <Screen
              {...(ACCEPTS_BACK.has(activeKey) ? { onBack: goHome } : {})}
              onNavigate={navigate}
            />
          </ScreenFrame>
        )}

        <WheelNav
          open={wheelOpen}
          activeKey={activeKey}
          onSelect={navigate}
          onClose={closeWheel}
          origin={wheelOrigin}
        />

        <Pressable
          onPress={toggleWheel}
          accessibilityRole="button"
          accessibilityLabel={wheelOpen ? 'Close navigation menu' : 'Open navigation menu'}
          accessibilityState={{ expanded: wheelOpen }}
          hitSlop={8}
          style={({ pressed }) => [
            st.wheelBtn,
            { top: insets.top + MENU_TOP, right: MENU_RIGHT },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Animated.View
            style={[
              st.wheelDotBox,
              {
                opacity: menuFade,
                transform: [{ scale: menuFade.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
              },
            ]}
          >
            <WheelGlyph />
          </Animated.View>
        </Pressable>

        <TouchableOpacity
          style={st.logoutBtn}
          onPress={handleLogout}
          accessibilityLabel="Logout"
        >
          <Text style={st.logoutText}>Logout</Text>
        </TouchableOpacity>

      </>
    );
  );
}

/** Register → Gate 1 → Gate 2 → Gate 3 → authenticated. */
function AuthFlow() {
  const { login, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('gate1'); // 'register' | 'gate1' | 'gate2' | 'gate3'
  const [preauthToken, setPreauthToken] = useState(null);

  // If login() was called from Gate 3, the provider flips isAuthenticated and
  // AppBoot switches to the shell. Keep this as a safety net.
  if (isAuthenticated) return null;

  const handleRegistered = useCallback(() => {
    setMode('gate1');
  }, []);

  const handleGate1Success = useCallback((token) => {
    setPreauthToken(token);
    setMode('gate2');
  }, []);

  const handleGate2Success = useCallback(() => {
    setMode('gate3');
  }, []);

  const handleGate3Success = useCallback(async (authToken, user) => {
    await login(authToken, user);
  }, [login]);

  const screenProps = {
    register: <RegisterScreen onRegistered={handleRegistered} />,
    gate1: (
      <Gate1Screen onSuccess={handleGate1Success} onRegister={() => setMode('register')} />
    ),
    gate2: (
      <Gate2Screen preauthToken={preauthToken} onSuccess={handleGate2Success} onBack={() => setMode('gate1')} />
    ),
    gate3: (
      <Gate3Screen
        preauthToken={preauthToken}
        onSuccess={handleGate3Success}
        onBack={() => setMode('gate2')}
      />
    ),
  };

  const Current = screenProps[mode];

  return (
    <View style={st.root}>
      <StatusBar style="dark" />
      {Current}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  wheelBtn: {
    position: 'absolute',
    width: MENU_SIZE,
    height: MENU_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  wheelDotBox: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderLt,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logoutBtn: {
    position: 'absolute',
    top: 10,
    left: 12,
    padding: 8,
    zIndex: 45,
  },
  logoutText: {
    fontFamily: C.mono,
    fontSize: 10,
    color: C.soft,
  },
});
