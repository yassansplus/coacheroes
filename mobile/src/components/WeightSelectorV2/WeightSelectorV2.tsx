import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Card } from '@/components/Card';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type WeightSelectorV2Props = {
  accessibilityLabel?: string;
  disabled?: boolean;
  maximum?: number;
  minimum?: number;
  onChange: (value: number) => void;
  step?: number;
  style?: StyleProp<ViewStyle>;
  unit?: string;
  value: number;
};

const TICK_COUNT = 23;
const CENTER_TICK = Math.floor(TICK_COUNT / 2);
const MIN_RULER_WIDTH = 260;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getPrecision(step: number) {
  const decimals = step.toString().split('.')[1];
  return decimals?.length ?? 0;
}

function normalizeWeight(value: number, minimum: number, maximum: number, step: number) {
  const precision = getPrecision(step);
  const clampedValue = clamp(value, minimum, maximum);
  const normalized = minimum + Math.round((clampedValue - minimum) / step) * step;

  return Number(normalized.toFixed(precision));
}

function formatWeight(value: number, precision: number) {
  return value.toFixed(precision).replace('.', ',');
}

export function WeightSelectorV2({
  accessibilityLabel = 'Sélecteur de poids',
  disabled = false,
  maximum = 300,
  minimum = 20,
  onChange,
  step = 0.1,
  style,
  unit = 'kg',
  value,
}: WeightSelectorV2Props) {
  const normalizedValue = normalizeWeight(value, minimum, maximum, step);
  const [displayValue, setDisplayValue] = useState(normalizedValue);
  const [rulerWidth, setRulerWidth] = useState(0);
  const wheelPosition = useRef(new Animated.Value(normalizedValue)).current;
  const displayValueRef = useRef(normalizedValue);
  const dragStartValue = useRef(normalizedValue);
  const isInteracting = useRef(false);
  const lastSelectedValue = useRef(normalizedValue);
  const lastHapticAt = useRef(0);
  const onChangeRef = useRef(onChange);
  const configurationRef = useRef({ maximum, minimum, step });
  const precision = getPrecision(step);
  const effectiveRulerWidth = Math.max(MIN_RULER_WIDTH, rulerWidth);
  const visualPixelsPerStep = Math.max(72, effectiveRulerWidth * 0.28);
  const gesturePixelsPerStep = Math.max(36, effectiveRulerWidth * 0.11);
  const tickSpacing = visualPixelsPerStep / 5;
  const selectedValue = normalizeWeight(displayValue, minimum, maximum, step);
  const minorStep = step / 5;
  const baseTickIndex = Math.floor(displayValue / minorStep + 0.000001);
  const fractionalTick = displayValue / minorStep - baseTickIndex;

  onChangeRef.current = onChange;
  configurationRef.current = { maximum, minimum, step };

  const emitValue = useCallback((nextValue: number) => {
    if (lastSelectedValue.current === nextValue) {
      return;
    }

    lastSelectedValue.current = nextValue;
    onChangeRef.current(nextValue);
    const now = Date.now();

    if (now - lastHapticAt.current >= 35) {
      lastHapticAt.current = now;
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, []);

  const settleTo = useCallback(
    (targetValue: number, withMomentum = false) => {
      const configuredStep = configurationRef.current.step;
      const duration = Math.min(
        440,
        160 + (Math.abs(targetValue - displayValueRef.current) / configuredStep) * 24,
      );
      const animation = withMomentum
        ? Animated.timing(wheelPosition, {
            toValue: targetValue,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          })
        : Animated.spring(wheelPosition, {
            bounciness: 4,
            speed: 16,
            toValue: targetValue,
            useNativeDriver: false,
          });

      animation.start(({ finished }) => {
        if (!finished) {
          return;
        }

        const { maximum: configuredMaximum, minimum: configuredMinimum, step: configuredStep } =
          configurationRef.current;
        emitValue(normalizeWeight(targetValue, configuredMinimum, configuredMaximum, configuredStep));
        isInteracting.current = false;
      });
    },
    [emitValue, wheelPosition],
  );

  const changeWeight = useCallback(
    (direction: -1 | 1) => {
      if (disabled) {
        return;
      }

      const { maximum: configuredMaximum, minimum: configuredMinimum, step: configuredStep } =
        configurationRef.current;
      const targetValue = normalizeWeight(
        displayValueRef.current + direction * configuredStep,
        configuredMinimum,
        configuredMaximum,
        configuredStep,
      );

      isInteracting.current = true;
      wheelPosition.stopAnimation();
      settleTo(targetValue);
    },
    [disabled, settleTo, wheelPosition],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabled && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          isInteracting.current = true;
          wheelPosition.stopAnimation();
          dragStartValue.current = displayValueRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const { maximum: configuredMaximum, minimum: configuredMinimum, step: configuredStep } =
            configurationRef.current;
          const nextValue = clamp(
            dragStartValue.current - (gestureState.dx / gesturePixelsPerStep) * configuredStep,
            configuredMinimum,
            configuredMaximum,
          );

          wheelPosition.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          const { maximum: configuredMaximum, minimum: configuredMinimum, step: configuredStep } =
            configurationRef.current;
          const inertiaDistance = clamp(
            gestureState.vx * 420,
            -gesturePixelsPerStep * 30,
            gesturePixelsPerStep * 30,
          );
          const projectedValue = clamp(
            displayValueRef.current - (inertiaDistance / gesturePixelsPerStep) * configuredStep,
            configuredMinimum,
            configuredMaximum,
          );

          settleTo(
            normalizeWeight(projectedValue, configuredMinimum, configuredMaximum, configuredStep),
            true,
          );
        },
        onPanResponderTerminate: () => {
          const { maximum: configuredMaximum, minimum: configuredMinimum, step: configuredStep } =
            configurationRef.current;
          settleTo(
            normalizeWeight(
              displayValueRef.current,
              configuredMinimum,
              configuredMaximum,
              configuredStep,
            ),
          );
        },
      }),
    [disabled, gesturePixelsPerStep, settleTo, wheelPosition],
  );

  useEffect(() => {
    const listener = wheelPosition.addListener(({ value: nextValue }) => {
      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (!isInteracting.current) {
        return;
      }

      const { maximum: configuredMaximum, minimum: configuredMinimum, step: configuredStep } =
        configurationRef.current;
      emitValue(normalizeWeight(nextValue, configuredMinimum, configuredMaximum, configuredStep));
    });

    return () => wheelPosition.removeListener(listener);
  }, [emitValue, wheelPosition]);

  useEffect(() => {
    if (isInteracting.current) {
      return;
    }

    lastSelectedValue.current = normalizedValue;
    displayValueRef.current = normalizedValue;
    wheelPosition.stopAnimation();
    wheelPosition.setValue(normalizedValue);
    setDisplayValue(normalizedValue);
  }, [normalizedValue, wheelPosition]);

  return (
    <Card style={[styles.card, disabled && styles.disabled, style]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Réduire le poids"
          accessibilityRole="button"
          disabled={disabled || selectedValue <= minimum}
          onPress={() => changeWeight(-1)}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>−</Text>
        </Pressable>

        <View style={styles.valueContainer}>
          <Text style={styles.value}>{formatWeight(selectedValue, precision)}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>

        <Pressable
          accessibilityLabel="Augmenter le poids"
          accessibilityRole="button"
          disabled={disabled || selectedValue >= maximum}
          onPress={() => changeWeight(1)}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>+</Text>
        </Pressable>
      </View>

      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        accessibilityValue={{ max: maximum, min: minimum, now: selectedValue }}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'increment') {
            changeWeight(1);
          }

          if (nativeEvent.actionName === 'decrement') {
            changeWeight(-1);
          }
        }}
        onLayout={({ nativeEvent }) => setRulerWidth(nativeEvent.layout.width)}
        style={styles.ruler}
        {...(disabled ? {} : panResponder.panHandlers)}
      >
        {Array.from({ length: TICK_COUNT }, (_, index) => {
          const distanceFromCenter = index - CENTER_TICK;
          const tickIndex = baseTickIndex + distanceFromCenter;
          const isMajor = tickIndex % 5 === 0;
          const left =
            effectiveRulerWidth / 2 + (distanceFromCenter - fractionalTick) * tickSpacing;

          return (
            <View
              key={index}
              pointerEvents="none"
              style={[
                styles.tick,
                isMajor ? styles.majorTick : styles.minorTick,
                { left },
              ]}
            />
          );
        })}

        <LinearGradient
          colors={[colors.primary, colors.accent]}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          start={{ x: 0.5, y: 0 }}
          style={styles.activeMarker}
        />

        {[-1, 0, 1].map((offset) => (
          <Text
            key={offset}
            pointerEvents="none"
            style={[
              styles.rulerLabel,
              offset === 0 && styles.activeRulerLabel,
              { left: effectiveRulerWidth / 2 + offset * visualPixelsPerStep },
            ]}
          >
            {formatWeight(selectedValue + offset * step, precision)}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#f8fbff',
    borderRadius: 30,
    elevation: 2,
    height: 60,
    justifyContent: 'center',
    shadowColor: '#7f9acb',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    width: 60,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonLabel: {
    color: colors.primary,
    fontFamily: fontFamily.medium,
    fontSize: 36,
    lineHeight: 40,
  },
  valueContainer: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  value: {
    color: '#141b41',
    fontFamily: fontFamily.extraBold,
    fontSize: 48,
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  unit: {
    color: '#7180a5',
    fontFamily: fontFamily.medium,
    fontSize: 20,
    lineHeight: 28,
    marginLeft: 8,
  },
  ruler: {
    height: 76,
    marginTop: 14,
    overflow: 'hidden',
    width: '100%',
  },
  tick: {
    backgroundColor: '#c4d0e8',
    position: 'absolute',
    top: 8,
    transform: [{ translateX: -1 }],
    width: 2,
  },
  minorTick: {
    height: 16,
  },
  majorTick: {
    height: 24,
  },
  activeMarker: {
    borderRadius: 3,
    height: 44,
    left: '50%',
    position: 'absolute',
    top: 0,
    transform: [{ translateX: -3 }],
    width: 6,
  },
  rulerLabel: {
    color: '#8090b0',
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    position: 'absolute',
    textAlign: 'center',
    top: 50,
    transform: [{ translateX: -28 }],
    width: 56,
  },
  activeRulerLabel: {
    color: colors.accent,
    fontFamily: fontFamily.bold,
  },
});
