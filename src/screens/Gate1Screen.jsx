import React, { useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, radii } from '../theme';
import { validateRequired } from '../utils/validation';
import { gate1 } from '../api/auth';
import { friendlyErrorMessage } from '../api/http';

/**
 * Gate 1 — name / username.
 * Identifies the account. On success the server issues a short-lived
 * pre-auth token that gates 2 and 3 require.
 */
export default function Gate1Screen({ onSuccess, onRegister }) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const nameError = validateRequired(username, 'Name');
    if (nameError) {
      setError('Enter your name / username.');
      return;
    }
    setSubmitting(true);
    try {
      const { preauth_token } = await gate1(username.trim());
      onSuccess(preauth_token);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'Invalid credentials. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [username, onSuccess]);

  return (
    <View style={[st.wrap, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.scroll}>
          <View style={st.card}>
          <Text style={st.title}>Gate 1 of 3</Text>
          <Text style={st.subtitle}>Enter your name</Text>

          <Text style={st.label}>Name / username</Text>
          <TextInput
            style={st.input}
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. archana_95"
            autoComplete="username"
            returnKeyType="next"
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={st.error}>{error}</Text>}

          <TouchableOpacity style={st.button} onPress={handleSubmit} disabled={submitting} accessibilityLabel="Next gate">
            <Text style={st.buttonText}>
              {submitting ? 'Checking…' : 'Next → Gate 2: Dream'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={st.footer}>
          <Text style={st.foot}>Don't have an account?</Text>
          <TouchableOpacity style={st.link} onPress={onRegister} accessibilityRole="button" accessibilityLabel="Create account">
            <Text style={st.linkText}>Create account</Text>
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
  footer: { marginTop: 30, alignItems: 'center' },
  foot: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
    color: C.soft,
  },
  link: { marginTop: 6 },
  linkText: {
    color: C.green,
    fontFamily: F.sansBold,
    textDecorationLine: 'underline',
  },
});
