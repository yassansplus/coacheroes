import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { gradients } from '@/theme/colors';

export type ProgressBarGradientColors = readonly [string, string, ...string[]];

export type ProgressBarProps = {
  progress: number;
  accessibilityLabel?: string;
  animated?: boolean;
  animationDelay?: number;
  animationDuration?: number;
  gradientColors?: ProgressBarGradientColors;
  height?: number;
  style?: StyleProp<ViewStyle>;
  trackColor?: string;
};

export function ProgressBar({
  progress,
  accessibilityLabel = 'Progression',
  animated = true,
  animationDelay = 0,
  animationDuration = 800,
  gradientColors = gradients.emphasizedPrimary,
  height = 12,
  style,
  trackColor = '#e8edf8',
}: ProgressBarProps) {
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = height / 2;
  const width = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  useEffect(() => {
    progressAnimation.stopAnimation();
    progressAnimation.setValue(animated ? 0 : clampedProgress);

    if (!animated) {
      return;
    }

    const animation = Animated.sequence([
      Animated.delay(animationDelay),
      Animated.timing(progressAnimation, {
        toValue: clampedProgress,
        duration: animationDuration,
        useNativeDriver: false,
      }),
    ]);

    animation.start();

    return animation.stop;
  }, [animated, animationDelay, animationDuration, clampedProgress, progressAnimation]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: clampedProgress }}
      style={[styles.track, { backgroundColor: trackColor, borderRadius: radius, height }, style]}
    >
      <Animated.View style={[styles.fill, { borderRadius: radius, width }]}>
        <LinearGradient
          colors={gradientColors}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
});
