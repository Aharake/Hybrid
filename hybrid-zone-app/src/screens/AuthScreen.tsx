import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { isGoogleSignInConfigured, useAuthStore } from '@/store/authStore';
import { colors, fonts, radius, typography } from '@/theme/tokens';

interface Props {
  // Called after a successful sign-up/sign-in. The two call sites do
  // different things afterward (onboarding: sync answers then enter the
  // Tracker; standalone post-logout: just re-enter the Tracker) so that
  // logic lives with the caller, not this form.
  onAuthenticated: () => void | Promise<void>;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, signUp, signIn, signInWithGoogle, clearError } = useAuthStore();

  const submit = async () => {
    const ok =
      mode === 'signUp' ? await signUp(email.trim(), password, name.trim()) : await signIn(email.trim(), password);
    if (ok) {
      await onAuthenticated();
    }
  };

  const submitGoogle = async () => {
    const ok = await signInWithGoogle();
    if (ok) {
      await onAuthenticated();
    }
  };

  const canSubmit = email.trim().length > 3 && password.length >= 8 && (mode === 'signIn' || name.trim().length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[typography.title, { color: colors.text, marginBottom: 8 }]}>
            {mode === 'signUp' ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={[typography.subtitle, { marginBottom: 28 }]}>
            {mode === 'signUp'
              ? 'Save your plan and progress so it follows you across devices.'
              : 'Log in to pick up where you left off.'}
          </Text>

          {mode === 'signUp' && (
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textDimmer}
                style={styles.input}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textDimmer}
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textDimmer}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signUp' ? 'new-password' : 'password'}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton
            label={loading ? 'Please wait…' : mode === 'signUp' ? 'Create account' : 'Log in'}
            onPress={submit}
            disabled={!canSubmit || loading}
            style={{ marginTop: 8 }}
          />

          <PrimaryButton
            label={mode === 'signUp' ? 'I already have an account' : 'Create a new account instead'}
            onPress={() => {
              clearError();
              setMode(mode === 'signUp' ? 'signIn' : 'signUp');
            }}
            variant="ghost"
          />

          {isGoogleSignInConfigured && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <PrimaryButton
                label="Continue with Google"
                onPress={submitGoogle}
                disabled={loading}
                color="white"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
  field: { marginBottom: 16 },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDim, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 15.5,
    color: colors.text,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.track },
  dividerLabel: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textDimmer },
});
