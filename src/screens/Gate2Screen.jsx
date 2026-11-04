import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, radii } from '../theme';
import { validateRequired } from '../utils/validation';
import { gate2 } from '../api/auth';
import { friendlyErrorMessage } from '../api/http';

/**
 * Gate 2 — dream.
 * Requires a valid pre-auth token from Gate 1. Compares the dream against
 * the one saved at registration (case-insensitive).
 */
export default function Gate2Screen({ preauthToken, onSuccess, onBack }) {
  const insets = useSafeAreaInsets();
  const [dream, setDream] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const dreamError = validateRequired(dream, 'Dream');
    if (dreamError) {
      setError('Please enter your dream.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await gate2(preauthToken, dream.trim());
      onSuccess(res?.preauth_token || preauthToken);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'Invalid credentials. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [preauthToken, dream, onSuccess]);

  return (
    <View style={[st.wrap, { paddingTop: insets.top }]}>
      <View style={st.scroll}>
        <View style={st.card}>
          <Text style={st.title}>Gate 2 of 3</Text>
          <Text style={st.subtitle}>Enter your dream</Text>

          <Text style={st.label}>Your dream</Text>
          <TextInput
            style={[st.input, st.multiline]}
            value={dream}
            onChangeText={setDream}
            placeholder="What is your portal dream?"
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={st.error}>{error}</Text>}

          <TouchableOpacity style={st.button} onPress={handleSubmit} disabled={submitting} accessibilityLabel="Next gate">
            <Text style={st.buttonText}>
              {submitting ? 'Checking…' : 'Next → Gate 3: Secret code'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={st.footer}>
          <TouchableOpacity style={st.back} onPress={onBack} accessibilityLabel="Back to gate 1">
            <Text style={st.backText}>← Back to Gate 1</Text>
          </TouchableOpacity>
          <Text style={st.foot}>Jibunai · yours, quietly</Text>
        </View>
      </View>
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
    fontSize: 15,
    color: C.dark,
    marginTop: 4,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  error: {
    marginTop: 4,
    fontFamily: F.sans,
    fontSize: 12,
    color: C.danger,
  },
  button: {
    backgroundColor: C.green,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
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
