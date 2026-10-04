import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, typography } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

// Same rule the server enforces, so a code that gets this far is never rejected there.
const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

// Shown right before the paywall: an optional referral code. It's saved with the
// account's onboarding answers; it isn't checked against anything here.
export function ReferralScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Referral'>>();
  const stored = useOnboardingStore((s) => s.referralCode);
  const setField = useOnboardingStore((s) => s.setField);
  const [code, setCode] = useState(stored ?? '');
  const [error, setError] = useState<string | null>(null);

  const goOn = () => navigation.navigate('Paywall');

  const handleContinue = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setField('referralCode', null);
      goOn();
      return;
    }
    if (!CODE_PATTERN.test(trimmed)) {
      setError('Codes are 3–32 letters, numbers or dashes.');
      return;
    }
    setField('referralCode', trimmed.toUpperCase());
    goOn();
  };

  const handleSkip = () => {
    setField('referralCode', null);
    goOn();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Have a referral code?</Text>
          <Text style={[typography.subtitle, { marginBottom: 28 }]}>Enter it now and we'll add it to your account. No code? Just skip.</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={code}
            onChangeText={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            placeholder="Referral code"
            placeholderTextColor={colors.textDimmer}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={32}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label="Continue" onPress={handleContinue} />
          <PrimaryButton label="Skip" variant="ghost" onPress={handleSkip} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24 },
  input: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.track,
    paddingVertical: 18,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  inputError: { borderColor: colors.red },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.red, marginTop: 10, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 18 },
});
