import React, { useState, useCallback } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { C, F, radii } from '../theme';
import {
  validateRequired,
  validateUsername,
  validateDateOfBirth,
  validateSecretCode,
} from '../utils/validation';
import { register } from '../api/auth';
import { friendlyErrorMessage } from '../api/http';

/**
 * Sign-up screen.
 * Collects: full_name, username, date_of_birth, dream, secret_code.
 * There is no password field — the secret code (4-8 chars, any symbol/letter/number)
 * is the user's credential and is hashed on the server.
 */
export default function RegisterScreen({ onRegistered }) {
  const insets = useSafeAreaInsets();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateValue, setDateValue] = useState(null);
  const [fields, setFields] = useState({
    full_name: '',
    username: '',
    date_of_birth: '',
    dream: '',
    secret_code: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback((key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  const showDatePicker = () => setDatePickerOpen(true);

  const onPickerChange = useCallback((event, selectedDate) => {
    if (event?.type === 'dismissed') {
      setDatePickerOpen(false);
      return;
    }
    const d = selectedDate || dateValue || new Date();
    setDateValue(d);
    const iso = d.toISOString().slice(0, 10);
    setFields((prev) => ({ ...prev, date_of_birth: iso }));
    setErrors((prev) => ({ ...prev, date_of_birth: null }));
    if (Platform.OS !== 'ios') setDatePickerOpen(false);
  }, [dateValue]);

  const validate = useCallback(() => {
    const next = {};
    const f = fields;
    const eFull = validateRequired(f.full_name, 'Full name');
    if (eFull) next.full_name = eFull;
    const eUser = validateUsername(f.username);
    if (eUser) next.username = eUser;
    const eDob = validateDateOfBirth(f.date_of_birth);
    if (eDob) next.date_of_birth = eDob;
    const eDream = validateRequired(f.dream, 'Dream');
    if (eDream) next.dream = eDream;
    const eSecret = validateSecretCode(f.secret_code);
    if (eSecret) next.secret_code = eSecret;
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [fields]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const user = await register({
        full_name: fields.full_name.trim(),
        username: fields.username.trim(),
        date_of_birth: fields.date_of_birth,
        dream: fields.dream.trim(),
        secret_code: fields.secret_code,
      });
      if (onRegistered) onRegistered(user);
    } catch (err) {
      Alert.alert('Registration failed', friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [fields, validate, onRegistered]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      contentContainerStyle={st.wrap}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ paddingTop: insets.top }}
    >
      <View style={st.card}>
        <Text style={st.title}>Create your account</Text>
        <Text style={st.subtitle}>Jibunai · yours, quietly</Text>

        <Text style={st.label}>Full name</Text>
        <TextInput
          style={[st.input, errors.full_name && st.inputError]}
          value={fields.full_name}
          onChangeText={(v) => setField('full_name', v)}
          placeholder="e.g. Archana Timilsina"
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
        {errors.full_name && <Text style={st.error}>{errors.full_name}</Text>}

        <Text style={st.label}>Username</Text>
        <TextInput
          style={[st.input, errors.username && st.inputError]}
          value={fields.username}
          onChangeText={(v) => setField('username', v)}
          placeholder="e.g. archana_95"
          autoComplete="username"
          returnKeyType="next"
        />
        {errors.username && <Text style={st.error}>{errors.username}</Text>}

        <Text style={st.label}>Date of birth</Text>
        <TouchableOpacity style={st.input} onPress={showDatePicker} activeOpacity={0.8}>
          <Text style={[st.inputText, { color: fields.date_of_birth ? C.dark : C.ph }]}>
            {fields.date_of_birth || 'Select your date of birth'}
          </Text>
        </TouchableOpacity>
        {errors.date_of_birth && <Text style={st.error}>{errors.date_of_birth}</Text>}

        <Text style={st.label}>Your dream</Text>
        <TextInput
          style={[st.input, st.multiline, errors.dream && st.inputError]}
          value={fields.dream}
          onChangeText={(v) => setField('dream', v)}
          placeholder="What is your portal dream?"
          autoComplete="off"
          returnKeyType="next"
        />
        {errors.dream && <Text style={st.error}>{errors.dream}</Text>}

        <Text style={st.label}>Secret code (4-8 chars)</Text>
        <TextInput
          style={[st.input, errors.secret_code && st.inputError]}
          value={fields.secret_code}
          onChangeText={(v) => setField('secret_code', v)}
          placeholder="Any letters, numbers or symbols"
          autoComplete="off"
          secureTextEntry
          maxLength={8}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {errors.secret_code && <Text style={st.error}>{errors.secret_code}</Text>}

        <TouchableOpacity
          style={[st.button, submitting && st.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityLabel="Create account"
        >
          <Text style={st.buttonText}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Text>
        </TouchableOpacity>

        <Text style={st.foot}>
          Already registered? You will enter through the 3 gates (name → dream → secret code).
        </Text>
      </View>

      {datePickerOpen && (
        <View style={st.pickerOverlay}>
          <DateTimePicker
            value={dateValue || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'default' : 'spinner'}
            onChange={onPickerChange}
            minimumDate={new Date(1900, 0, 1)}
            maximumDate={new Date()}
          />
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignSelf: 'stretch',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  title: {
    fontFamily: F.sansBold,
    fontSize: 26,
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
    height: 88,
    textAlignVertical: 'top',
  },
  inputText: {
    flex: 1,
    color: C.dark,
  },
  inputError: {
    borderColor: C.danger,
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
    marginTop: 26,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontFamily: F.sansBold,
    fontSize: 16,
    color: C.white,
  },
  foot: {
    marginTop: 20,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
    color: C.soft,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
