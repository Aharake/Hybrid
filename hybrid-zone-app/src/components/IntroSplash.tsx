import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/tokens';

const MIN_SHOW_MS = 1500;
const FADE_OUT_MS = 380;
const LOGO_W = 104;
const LOGO_H = Math.round((LOGO_W * 480) / 423); // logo-mark.png is 423 × 480

// The launch screen: the Hyvo mark with the name under it, drawn by the app
// itself (a vector font and the logo at its real size) instead of being baked
// into a small bitmap that the OS stretches — which is what made the old
// native splash look soft. The native splash is now plain black, so this
// picks up seamlessly. It stays up at least MIN_SHOW_MS and until the app has
// worked out where to go (`ready`), then fades away.
export function IntroSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logo = useSharedValue(0);
  const name = useSharedValue(0);
  const out = useSharedValue(1);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    logo.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    name.value = withDelay(300, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    const t = setTimeout(() => setMinElapsed(true), MIN_SHOW_MS);
    return () => clearTimeout(t);
  }, [logo, name]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    out.value = withTiming(0, { duration: FADE_OUT_MS });
    // A plain timer, not an animation callback: callbacks that call back into
    // JS from the UI thread are what crashed this app before.
    const t = setTimeout(onDone, FADE_OUT_MS + 30);
    return () => clearTimeout(t);
  }, [ready, minElapsed, out, onDone]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: out.value }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scale: 0.86 + 0.14 * logo.value }] }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: (1 - name.value) * 10 }] }));

  return (
    <Animated.View style={[styles.wrap, wrapStyle]} pointerEvents="auto">
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image source={require('../../assets/logo-mark.png')} style={{ width: LOGO_W, height: LOGO_H, tintColor: '#fff' }} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={nameStyle}>
          <Text style={styles.name}>HYVO</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  center: { alignItems: 'center', gap: 22 },
  name: { fontFamily: fonts.extraBold, fontSize: 34, letterSpacing: 12, color: '#fff', paddingLeft: 12 }, // paddingLeft balances the trailing letter-spacing so the word is centred
});
