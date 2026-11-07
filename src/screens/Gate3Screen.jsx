import React, { useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, radii } from '../theme';
import { validateSecretCode } from '../utils/validation';
import {
  gate3,
  verifyOfflineCredentials,
  makeLocalToken,
  cacheOfflineCredentials,
} from '../api/auth';
import { friendlyErrorMessage } from '../api/http';

/**
 * Gate 3 — secret code (4-8 chars, any symbol/letter/number).
 * Requires a valid pre-auth token from Gate 2. On success the server
 * issues the long-lived auth token and the user is fully authenticated.
 * When the server is unreachable, falls back to locally cached credentials
 * (stored after the first successful online login) so the user can still
 * log in offline — the music player and everything else stay fully local.
 */
export default function Gate3Screen({ preauthToken, dream, onSuccess, onBack }) {
  const insets = useSafeAreaInsets();
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const codeErr = validateSecretCode(secretCode);
    if (codeErr) {
      setError(codeErr);
      return;
    }
    setSubmitting(true);
    try {
      const { auth_token, user } = await gate3(preauthToken, secretCode);
      if (!auth_token) throw new Error('Invalid secret code. Try again.');
      await cacheOfflineCredentials(dream, secretCode, user);
      await onSuccess(auth_token, user);
    } catch (err) {
      // Offline fallback: verify against locally cached credentials so the
      // app stays usable with no network (token expired, airplane mode, etc.).
      const offlineUser = await verifyOfflineCredentials(dream, secretCode);
      if (offlineUser) {
        const token = makeLocalToken(offlineUser);
        await cacheOfflineCredentials(dream, secretCode, offlineUser);
        await onSuccess(token, offlineUser);
        return;
      }
      setError(friendlyErrorMessage(err, 'Invalid secret code. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [preauthToken, dream, secretCode, onSuccess]);

  return (
    <View style={[st.wrap, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.scroll}>
          <View style={st.card}>
          <Text style={st.title}>Gate 3 of 3</Text>
          <Text style={st.subtitle}>Enter your secret code</Text>

          <Text style={st.label}>Secret code (4-8 characters)</Text>
          <TextInput
            style={st.input}
            value={secretCode}
            onChangeText={setSecretCode}
            placeholder="Any letters, numbers or symbols"
            autoComplete="off"
            secureTextEntry
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={st.error}>{error}</Text>}
          <Text style={st.hint}>
            4 to 8 characters — any symbol, letter or number is allowed.
          </Text>

          <TouchableOpacity style={st.button} onPress={handleSubmit} disabled={submitting} accessibilityLabel="Finish authentication">
            <Text style={st.buttonText}>
              {submitting ? 'Verifying…' : 'Authenticate → Enter Jibunai'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={st.footer}>
          <TouchableOpacity style={st.back} onPress={onBack} accessibilityLabel="Back to gate 2">
            <Text style={st.backText}>← Back to Gate 2</Text>
          </TouchableOpacity>
          <Text style={st.foot}>Jibunai · yours, quietly</Text>
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  title: {
    fontFamily: F.sansBold,
    fontSize: 27,
    color: C.dark,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: C.soft,
    textAlign: 'center',
    marginBottom: 26,
  },
  label: {
    fontFamily: F.sansMed,
    fontSize: 13,
    color: C.ink,
    marginTop: 16,
    marginLeft: 2,
  },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: F.sans,
    fontSize: 16,
    color: C.dark,
    marginTop: 4,
  },
  error: {
    marginTop: 4,
    fontFamily: F.sans,
    fontSize: 12,
    color: C.danger,
  },
  hint: {
    marginTop: 6,
    fontFamily: F.mono,
    fontSize: 10.5,
    letterSpacing: 1,
    color: C.soft,
    textAlign: 'center',
  },
  button: {
    backgroundColor: C.green,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  buttonText: {
    fontFamily: F.sansBold,
    fontSize: 16,
    color: C.white,
  },
  footer: { marginTop: 26, alignItems: 'center' },
  back: { marginBottom: 10 },
  backText: {
    color: C.soft,
    fontFamily: F.sansMed,
    textDecorationLine: 'underline',
  },
  foot: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
    color: C.soft,
  },
});
