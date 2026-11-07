import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_400Regular_Italic,
} from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  Syne_400Regular,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';

import { startCacheLifecycle, stopCacheLifecycle } from './src/api/cacheLifecycle';
import { startConnectivity } from './src/api/connectivity';
import { startSyncEngine, syncNow } from './src/api/syncEngine';
import { initNotifications, rescheduleOnBoot } from './src/notifications/reminders';
import { bootAlarms } from './src/alarms/store';
import { bootDateKeeper } from './src/datekeeper/store';
import SyncBanner from './src/components/SyncBanner';
import { attachPlayer, pause as pausePlayback, subscribePlayer, toggle as togglePlayback } from './src/player/engine';
import {
  ACTION_STOP,
  ACTION_TOGGLE,
  clearPlaybackNotification,
  ensurePlaybackSetup,
  showPlaybackNotification,
} from './src/player/playbackNotification';
import AppSplash from './src/components/AppSplash';
import ScreenFrame from './src/components/ScreenFrame';
import WheelNav from './src/components/WheelNav';
import { getRoute } from './src/navigation/routes';
import { C, F } from './src/theme';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useAudioPlayer } from 'expo-audio';
import { useSystems } from './src/systems/prefs';
import { systemForRoute } from './src/systems/catalog';
import RegisterScreen from './src/screens/RegisterScreen';
import Gate1Screen from './src/screens/Gate1Screen';
import Gate2Screen from './src/screens/Gate2Screen';
import Gate3Screen from './src/screens/Gate3Screen';
import SystemPickerScreen from './src/screens/SystemPickerScreen';

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
    DMSans_400Regular_Italic,
    DMMono_400Regular,
    DMMono_500Medium,
    // Preloaded so Wishlist / MusicVibes per-screen useFonts() resolve from
    // cache instead of flashing a spinner mid-navigation.
    Syne_400Regular,
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
  });
  const { ready, isAuthenticated } = useAuth();
  const systems = useSystems();

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

  // Wait for fonts + auth + system prefs hydration before branching.
  if (!fontsLoaded || !ready || !systems.ready) {
    return (
      <>
        <StatusBar style="dark" />
        <View style={st.root} />
      </>
    );
  }

  if (isAuthenticated) {
    // First run (or first run after this feature): choose systems.
    if (!systems.onboarded) {
      return (
        <View style={st.root}>
          <StatusBar style="dark" />
          <SystemPickerScreen />
        </View>
      );
    }
    return <AppShell />;
  }
  return <AuthFlow />;
}

/** Main app shell (wheel nav, home + feature screens) — only shown when authenticated. */
function AppShell() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { logout } = useAuth();
  const { enabled } = useSystems();
  const [wheelOpen, setWheelOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('home');
  // One audio player for the whole session — music keeps playing across screens.
  const audioPlayer = useAudioPlayer();

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
    startConnectivity();
    startCacheLifecycle();
    startSyncEngine();
    attachPlayer(audioPlayer);
    // Background playback: keep audio alive with the screen locked or the
    // app backgrounded (fully offline — files play from this device).
    try {
      const Audio = require('expo-audio');
      Audio.setAudioModeAsync?.({
        playsInSilentMode: true,
        allowsRecording: false,
        staysActiveInBackground: true,
        interruptionMode: 'duckOthers',
      }).catch(() => {});
    } catch {
      /* expo-audio mode is best-effort on web/older builds */
    }
    // Notification-shade card (pull down from the top): Pause/Play + ✕ Stop.
    let unsubPlayer = null;
    let notifSub = null;
    try {
      ensurePlaybackSetup().catch(() => {});
      unsubPlayer = subscribePlayer((snap) => {
        if (snap.track) showPlaybackNotification(snap.track, snap.playing).catch(() => {});
        else clearPlaybackNotification().catch(() => {});
      }) || null;
      const N = require('expo-notifications');
      notifSub = N.addNotificationResponseReceivedListener?.((res) => {
        const action = res?.actionIdentifier;
        if (action === ACTION_STOP) {
          pausePlayback();
          clearPlaybackNotification().catch(() => {});
        } else if (action === ACTION_TOGGLE) {
          togglePlayback();
        }
      }) || null;
    } catch {
      /* shade controls are best-effort */
    }
    initNotifications().then(() => {
      rescheduleOnBoot().catch(() => {});
      bootAlarms().catch(() => {});
      bootDateKeeper().catch(() => {});
      // Drain anything queued while the app was closed.
      syncNow().catch(() => {});
    }).catch(() => {});
    return () => {
      stopCacheLifecycle();
      try {
        unsubPlayer?.();
      } catch {
        /* ignore */
      }
      try {
        notifSub?.remove?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const navigate = useCallback((key) => {
    // A disabled system's screen can never be opened (wheel hides it too —
    // this is the backstop for programmatic navigation).
    const sys = systemForRoute(key);
    if (sys && !enabled.includes(sys.key)) return;
    setActiveKey(key);
    setWheelOpen(false);
  }, [enabled]);

  const goHome = useCallback(() => {
    setActiveKey('home');
    setWheelOpen(false);
  }, []);

  // If the open screen's system gets disabled (e.g. from Settings), fall home.
  useEffect(() => {
    const sys = systemForRoute(activeKey);
    if (sys && !enabled.includes(sys.key)) setActiveKey('home');
  }, [enabled, activeKey]);

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

        <SyncBanner />
      </View>
    </>
  );
}

/** Register → Gate 1 → Gate 2 → Gate 3 → authenticated. */
function AuthFlow() {
  const { login, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('gate1'); // 'register' | 'gate1' | 'gate2' | 'gate3'
  const [preauthToken, setPreauthToken] = useState(null);
  const [pendingDream, setPendingDream] = useState('');

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

  const handleGate2Success = useCallback((token, dream) => {
    if (token) setPreauthToken(token);
    setPendingDream(dream);
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
        dream={pendingDream}
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
    fontFamily: F.mono,
    fontSize: 10,
    color: C.soft,
  },
});
