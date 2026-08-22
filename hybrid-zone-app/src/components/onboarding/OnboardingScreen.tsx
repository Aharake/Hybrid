import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/theme/tokens';
import { OnboardingHeader } from './OnboardingHeader';

interface Props {
  progress?: number; // omit for no-header screens (loading/plan-preview/paywall)
  footer?: React.ReactNode;
  children: React.ReactNode;
}

// Matches Onboarding.html's .stage shell: .qheader + .screen-scroll + .footer.
export function OnboardingScreen({ progress, footer, children }: Props) {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {progress !== undefined && (
        <OnboardingHeader progress={progress} canGoBack={navigation.canGoBack()} onBack={() => navigation.goBack()} />
      )}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  footer: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 26 },
});
