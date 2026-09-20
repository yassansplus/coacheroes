import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { fontFamily } from '@/theme/typography';
import { colors, gradients } from '@/theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';
export type ButtonRadius = 16 | 24 | 30 | '100%';
export type ButtonHapticFeedback = boolean | 'light' | 'medium' | 'heavy' | 'selection';

type ButtonProps = {
  text: string;
  onPress: () => void;
  variant?: ButtonVariant;
  radius?: ButtonRadius;
  backgroundColor?: string;
  textColor?: string;
  hapticFeedback?: ButtonHapticFeedback;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leading?: ReactNode;
  trailing?: ReactNode;
  accessibilityLabel?: string;
};

const BUTTON_RADII: Record<ButtonRadius, number> = {
  16: 16,
  24: 24,
  30: 30,
  '100%': 999,
};

const HAPTIC_STYLES = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

const reversedPrimaryGradient = [gradients.primary[1], gradients.primary[0]] as const;

export function Button({
  text,
  onPress,
  variant = 'primary',
  radius = 24,
  backgroundColor,
  textColor,
  hapticFeedback = false,
  disabled = false,
  style,
  containerStyle,
  textStyle,
  leading,
  trailing,
  accessibilityLabel,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const gradientInversion = useRef(new Animated.Value(0)).current;
  const buttonRadius = BUTTON_RADII[radius];
  const displaysPrimaryGradient = variant === 'primary' && !backgroundColor;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    },
    [scale],
  );

  const animateGradientTo = useCallback(
    (toValue: number) => {
      Animated.timing(gradientInversion, {
        toValue,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    },
    [gradientInversion],
  );

  const triggerHapticFeedback = useCallback(async () => {
    if (!hapticFeedback) {
      return;
    }

    try {
      if (hapticFeedback === 'selection') {
        await Haptics.selectionAsync();
        return;
      }

      const feedbackStyle = hapticFeedback === true ? 'light' : hapticFeedback;
      await Haptics.impactAsync(HAPTIC_STYLES[feedbackStyle]);
    } catch {
      // L'haptique est un confort : une plateforme non compatible ne doit pas bloquer l'action.
    }
  }, [hapticFeedback]);

  const handlePress = useCallback(() => {
    void triggerHapticFeedback();
    onPress();
  }, [onPress, triggerHapticFeedback]);

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? text}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={() => {
          animateTo(0.97);
          animateGradientTo(1);
        }}
        onPressOut={() => {
          animateTo(1);
          animateGradientTo(0);
        }}
        style={({ pressed }) => [
          styles.base,
          styles[variant],
          { borderRadius: buttonRadius },
          backgroundColor ? { backgroundColor } : undefined,
          disabled && styles.disabled,
          pressed && styles.pressed,
          style,
        ]}
      >
        {displaysPrimaryGradient ? (
          <>
            <LinearGradient
              colors={gradients.primary}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={[styles.gradient, { borderRadius: buttonRadius }]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.gradient,
                { borderRadius: buttonRadius, opacity: gradientInversion },
              ]}
            >
              <LinearGradient
                colors={reversedPrimaryGradient}
                end={{ x: 1, y: 0 }}
                start={{ x: 0, y: 0 }}
                style={styles.gradient}
              />
            </Animated.View>
          </>
        ) : null}
        {leading ? <View style={styles.accessory}>{leading}</View> : null}
        <Text
          style={[
            styles.label,
            styles[`${variant}Label`],
            textColor ? { color: textColor } : undefined,
            textStyle,
          ]}
        >
          {text}
        </Text>
        {trailing ? <View style={styles.accessory}>{trailing}</View> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    overflow: 'hidden',
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  primary: {
    backgroundColor: 'transparent',
  },
  secondary: {
    backgroundColor: '#e5e7eb',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    zIndex: 1,
    flexShrink: 1,
    textAlign: 'center',
  },
  accessory: { zIndex: 1 },
  primaryLabel: {
    color: '#ffffff',
  },
  secondaryLabel: {
    color: '#111827',
  },
  outlineLabel: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
});
