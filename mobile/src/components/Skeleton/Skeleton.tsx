import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type SkeletonProps = {
  borderRadius?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  width?: number | `${number}%`;
};

export function Skeleton({ borderRadius = 12, height = 16, style, width = '100%' }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.45,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.skeleton, { borderRadius, height, opacity, width }, style]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#dfe7f4',
  },
});
