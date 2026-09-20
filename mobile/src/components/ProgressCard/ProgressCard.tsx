import { feedback } from '@/utils/feedback';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Card } from '@/components/Card';
import { resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type ProgressCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  target: string;
  progress: number;
  progressLabel?: string;
  backgroundColor?: AppColor;
  iconBackgroundColor?: AppColor;
  progressColor?: AppColor;
  progressTrackColor?: AppColor;
  labelColor?: AppColor;
  valueColor?: AppColor;
  targetColor?: AppColor;
  animated?: boolean;
  animatedValue?: number;
  animationDuration?: number;
  formatAnimatedValue?: (value: number) => string;
  square?: boolean;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_CARD_WIDTH = 160;
const MIN_RING_SIZE = 32;
const MAX_RING_SIZE = 82;
const RING_WIDTH_RATIO = 0.42;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function inferAnimatedValue(value: string) {
  if (!/^\d[\d\s]*$/.test(value)) {
    return undefined;
  }

  return Number(value.replace(/\s/g, ''));
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('fr-FR');
}

export function ProgressCard({
  icon,
  label,
  value,
  target,
  progress,
  progressLabel,
  backgroundColor = 'surface',
  iconBackgroundColor = 'coral',
  progressColor = 'energy',
  progressTrackColor = 'lavender',
  labelColor = 'primary',
  valueColor = '#141b41',
  targetColor = '#7380a3',
  animated = true,
  animatedValue,
  animationDuration = 800,
  formatAnimatedValue,
  square = true,
  style,
}: ProgressCardProps) {
  const [cardWidth, setCardWidth] = useState(0);
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [displayedValue, setDisplayedValue] = useState(0);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; }; }, []));
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const valueAnimation = useRef(new Animated.Value(0)).current;
  const layoutWidth = cardWidth || DEFAULT_CARD_WIDTH;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const resolvedAnimatedValue = animatedValue ?? inferAnimatedValue(value);
  const cardPadding = clamp(Math.round(layoutWidth * 0.085), 6, 16);
  const ringSize = clamp(Math.round(layoutWidth * RING_WIDTH_RATIO), MIN_RING_SIZE, MAX_RING_SIZE);
  const iconSize = clamp(Math.round(layoutWidth * 0.3), 22, 56);
  const ringStrokeWidth = clamp(Math.round(ringSize * 0.1), 4, 8);
  const ringRadius = (ringSize - ringStrokeWidth) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const animatedProgress = animated ? displayedProgress : clampedProgress;
  const progressOffset = ringCircumference * (1 - animatedProgress / 100);
  const progressFontSize = clamp(Math.round(ringSize * 0.195), 9, 16);
  const labelFontSize = clamp(Math.round(layoutWidth * 0.078), 7, 13);
  const valueFontSize = clamp(Math.round(layoutWidth * 0.145), 12, 24);
  const targetFontSize = clamp(Math.round(layoutWidth * 0.084), 7, 14);
  const metricsMargin = clamp(Math.round(layoutWidth * 0.024), 2, 4);
  const resolvedDisplayedValue =
    resolvedAnimatedValue === undefined
      ? undefined
      : animated
        ? displayedValue
        : resolvedAnimatedValue;
  const displayedValueLabel =
    resolvedDisplayedValue === undefined
      ? value
      : formatAnimatedValue?.(resolvedDisplayedValue) ?? formatNumber(resolvedDisplayedValue);

  useEffect(() => {
    progressAnimation.stopAnimation();
    valueAnimation.stopAnimation();
    progressAnimation.setValue(0);
    valueAnimation.setValue(0);

    if (!animated) {
      setDisplayedProgress(clampedProgress);
      setDisplayedValue(resolvedAnimatedValue ?? 0);
      return;
    }

    setDisplayedProgress(0);
    setDisplayedValue(0);

    const progressSubscription = progressAnimation.addListener(({ value: progressValue }) => {
      setDisplayedProgress(progressValue);
    });
    const valueSubscription = valueAnimation.addListener(({ value: metricValue }) => {
      setDisplayedValue(metricValue);
    });
    const animations = [
      Animated.timing(progressAnimation, {
        toValue: clampedProgress,
        duration: animationDuration,
        useNativeDriver: false,
      }),
    ];

    if (resolvedAnimatedValue !== undefined) {
      animations.push(
        Animated.timing(valueAnimation, {
          toValue: resolvedAnimatedValue,
          duration: animationDuration,
          useNativeDriver: false,
        }),
      );
    }

    const animation = Animated.parallel(animations);
    animation.start(({ finished }) => { if (finished && focused.current) feedback('selection'); });

    return () => {
      animation.stop();
      progressAnimation.removeListener(progressSubscription);
      valueAnimation.removeListener(valueSubscription);
    };
  }, [
    animated,
    animationDuration,
    clampedProgress,
    progressAnimation,
    resolvedAnimatedValue,
    valueAnimation,
  ]);

  function handleLayout({ nativeEvent }: LayoutChangeEvent) {
    setCardWidth(nativeEvent.layout.width);
  }

  return (
    <Card
      onLayout={handleLayout}
      style={[
        styles.card,
        square && styles.square,
        { backgroundColor: resolveColor(backgroundColor), padding: cardPadding },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: resolveColor(iconBackgroundColor),
              borderRadius: iconSize / 2,
              height: iconSize,
              width: iconSize,
            },
          ]}
        >
          {icon}
        </View>

        <View style={[styles.progressRing, { height: ringSize, width: ringSize }]}>
          <Svg height={ringSize} width={ringSize}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              fill="none"
              r={ringRadius}
              stroke={resolveColor(progressTrackColor)}
              strokeWidth={ringStrokeWidth}
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              fill="none"
              r={ringRadius}
              stroke={resolveColor(progressColor)}
              strokeDasharray={ringCircumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              strokeWidth={ringStrokeWidth}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <Text
            style={[
              styles.progressLabel,
              { color: resolveColor(valueColor), fontSize: progressFontSize },
            ]}
          >
            {progressLabel ?? `${Math.round(animatedProgress)}%`}
          </Text>
        </View>
      </View>

      <View style={[styles.metrics, { marginTop: metricsMargin }]}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: resolveColor(labelColor),
              fontSize: labelFontSize,
              lineHeight: Math.round(labelFontSize * 1.2),
            },
          ]}
        >
          {label}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
          style={[
            styles.value,
            {
              color: resolveColor(valueColor),
              fontSize: valueFontSize,
              lineHeight: Math.round(valueFontSize * 1.12),
            },
          ]}
        >
          {displayedValueLabel}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
          style={[
            styles.target,
            {
              color: resolveColor(targetColor),
              fontSize: targetFontSize,
              lineHeight: Math.round(targetFontSize * 1.2),
            },
          ]}
        >
          {target}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    elevation: 2,
    padding: 16,
    shadowColor: '#111827',
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.045,
    shadowRadius: 8,
  },
  square: {
    aspectRatio: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    fontFamily: fontFamily.bold,
    position: 'absolute',
  },
  metrics: {},
  label: {
    fontFamily: fontFamily.semiBold,
  },
  value: {
    fontFamily: fontFamily.extraBold,
  },
  target: {
    fontFamily: fontFamily.medium,
  },
});
