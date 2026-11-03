/**
 * Global mini-player — visible on every screen except the player itself,
 * so music keeps feeling alive while you browse. The engine holds playback;
 * this is just a window onto it.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { getPlayerPrefs, subscribePlayerPrefs } from '../player/prefs';
import { subscribePlayer, toggle } from '../player/engine';

const initials = (t) => ((t?.title || '?').trim().charAt(0) || '?').toUpperCase();

export default function MiniPlayer({ hidden }) {
  const [snap, setSnap] = useState(() => ({
    track: null, playing: false, position: 0, duration: 0,
  }));
  const [, force] = useState(0);
  useEffect(() => subscribePlayer(setSnap), []);
  // Covers may change while the same track plays — repaint on prefs sync.
  useEffect(() => subscribePlayerPrefs(() => force((n) => n + 1)), []);

  if (hidden || !snap.track) return null;
  const cover = getPlayerPrefs().covers[snap.track.id] || snap.track.coverUri || snap.track.artworkUri;

  return (
    <View style={st.wrap} pointerEvents="box-none">
      <View style={st.bar}>
        {cover ? (
          <Image source={{ uri: cover }} style={st.cover} />
        ) : (
          <View style={[st.cover, st.tile]}>
            <Text style={st.tileText}>{initials(snap.track)}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.title} numberOfLines={1}>{snap.track.title}</Text>
          <Text style={st.sub} numberOfLines={1}>{snap.track.artist}</Text>
        </View>
        <Pressable onPress={toggle} hitSlop={10} accessibilityLabel={snap.playing ? 'Pause' : 'Play'}>
          <Feather name={snap.playing ? 'pause' : 'play'} size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 76, zIndex: 55 },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(26,26,46,0.96)', borderRadius: 14,
    paddingVertical: 8, paddingHorizontal: 10,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  cover: { width: 38, height: 38, borderRadius: 8 },
  tile: { backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center' },
  tileText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  title: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  sub: { color: '#a8a396', fontSize: 11.5 },
});
