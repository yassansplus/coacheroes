import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, gradients } from '@/theme/colors';

export function ScreenBackdrop() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <LinearGradient colors={gradients.onboarding} style={StyleSheet.absoluteFill} />
    <Svg width="100%" height="100%" viewBox="0 0 400 860" preserveAspectRatio="none">
      <Path d="M0 0H135Q180 50 110 100Q40 145 0 145Z" fill={colors.primaryTint} opacity={0.3} />
      <Path d="M400 0H295Q260 60 400 130Z" fill={colors.accentSurface} opacity={0.65} />
      <Path d="M400 645Q315 655 240 775Q200 820 140 860H400Z" fill={colors.accentSurface} opacity={0.6} />
      <Path d="M0 735Q95 730 180 860H0Z" fill={colors.primaryTint} opacity={0.35} />
    </Svg>
  </View>;
}
