import { feedback } from '@/utils/feedback';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Card } from '@/components/Card';
import {
  ProgressBar,
  type ProgressBarGradientColors,
} from '@/components/ProgressBar';
import { resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type DailyQuest = {
  currentValue: number;
  icon?: ReactNode;
  iconBackgroundColor?: AppColor;
  id: string;
  progressGradientColors?: ProgressBarGradientColors;
  progressLabel?: string;
  reward?: string;
  rewardBackgroundColor?: AppColor;
  rewardColor?: AppColor;
  targetValue: number;
  title: string;
};

type DailyQuestsProps = {
  animated?: boolean;
  animationDuration?: number;
  quests: DailyQuest[];
  style?: StyleProp<ViewStyle>;
  title?: string;
};

type DailyQuestItemProps = DailyQuest & {
  animated: boolean;
  animationDelay: number;
  animationDuration: number;
};

function getRewardParts(reward?: string) {
  const match = reward?.match(/^(.*?)(\d[\d\s]*)(.*)$/);

  if (!match) {
    return undefined;
  }

  return {
    prefix: match[1],
    suffix: match[3],
    value: Number(match[2].replace(/\s/g, '')),
  };
}

function formatWholeNumber(value: number) {
  return Math.round(value).toLocaleString('fr-FR');
}

function DailyQuestItem({
  animated,
  animationDelay,
  animationDuration,
  currentValue,
  icon,
  iconBackgroundColor = 'lavender',
  progressGradientColors = ['#3199ff', '#5b77fd'],
  progressLabel,
  reward,
  rewardBackgroundColor = '#eaf2ff',
  rewardColor = 'primary',
  targetValue,
  title,
}: DailyQuestItemProps) {
  const [displayedCurrentValue, setDisplayedCurrentValue] = useState(0);
  const [displayedRewardValue, setDisplayedRewardValue] = useState(0);
  const countAnimation = useRef(new Animated.Value(0)).current;
  const rewardAnimation = useRef(new Animated.Value(0)).current;
  const rewardEntrance = useRef(new Animated.Value(0)).current;
  const wasCompleted = useRef(currentValue >= targetValue && targetValue > 0);
  useEffect(() => {
    const complete = targetValue > 0 && currentValue >= targetValue;
    if (complete && !wasCompleted.current) feedback('success');
    wasCompleted.current = complete;
  }, [currentValue, targetValue]);
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const rewardParts = useMemo(() => getRewardParts(reward), [reward]);
  const visibleCurrentValue = animated ? displayedCurrentValue : currentValue;
  const visibleRewardValue = animated ? displayedRewardValue : rewardParts?.value;
  const rewardLabel = rewardParts
    ? `${rewardParts.prefix}${formatWholeNumber(visibleRewardValue ?? 0)}${rewardParts.suffix}`
    : reward;

  useEffect(() => {
    countAnimation.stopAnimation();
    rewardAnimation.stopAnimation();
    rewardEntrance.stopAnimation();
    countAnimation.setValue(animated ? 0 : currentValue);
    rewardAnimation.setValue(animated ? 0 : (rewardParts?.value ?? 0));
    rewardEntrance.setValue(animated ? 0 : 1);

    if (!animated) {
      setDisplayedCurrentValue(currentValue);
      setDisplayedRewardValue(rewardParts?.value ?? 0);
      return;
    }

    setDisplayedCurrentValue(0);
    setDisplayedRewardValue(0);
    const countSubscription = countAnimation.addListener(({ value }) => {
      setDisplayedCurrentValue(value);
    });
    const rewardSubscription = rewardAnimation.addListener(({ value }) => {
      setDisplayedRewardValue(value);
    });
    const animations = [
      Animated.sequence([
        Animated.delay(animationDelay),
        Animated.timing(countAnimation, {
          toValue: currentValue,
          duration: animationDuration,
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.delay(animationDelay + 90),
        Animated.spring(rewardEntrance, {
          toValue: 1,
          bounciness: 8,
          speed: 18,
          useNativeDriver: true,
        }),
      ]),
    ];

    if (rewardParts) {
      animations.push(
        Animated.sequence([
          Animated.delay(animationDelay + 90),
          Animated.timing(rewardAnimation, {
            toValue: rewardParts.value,
            duration: animationDuration,
            useNativeDriver: false,
          }),
        ]),
      );
    }

    const animation = Animated.parallel(animations);
    animation.start();

    return () => {
      animation.stop();
      countAnimation.removeListener(countSubscription);
      rewardAnimation.removeListener(rewardSubscription);
    };
  }, [
    animated,
    animationDelay,
    animationDuration,
    countAnimation,
    currentValue,
    rewardAnimation,
    rewardEntrance,
    rewardParts,
  ]);

  return (
    <Card style={styles.quest}>
      {icon ? (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: resolveColor(iconBackgroundColor) },
          ]}
        >
          {icon}
        </View>
      ) : null}

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.questTitle}>
          {title}
        </Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {progressLabel ?? `${Math.round(visibleCurrentValue)} / ${targetValue}`}
          </Text>
          <ProgressBar
            animated={animated}
            animationDelay={animationDelay}
            animationDuration={animationDuration}
            gradientColors={progressGradientColors}
            height={10}
            progress={progress}
            style={styles.progressBar}
          />
        </View>
      </View>

      {reward ? (
        <Animated.View
          style={[
            styles.reward,
            { backgroundColor: resolveColor(rewardBackgroundColor) },
            {
              opacity: rewardEntrance,
              transform: [
                {
                  scale: rewardEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.65, 1],
                  }),
                },
                {
                  translateX: rewardEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.rewardLabel, { color: resolveColor(rewardColor) }]}>{rewardLabel}</Text>
        </Animated.View>
      ) : null}
    </Card>
  );
}

export function DailyQuests({
  animated = true,
  animationDuration = 700,
  quests,
  style,
  title = 'Quêtes du jour',
}: DailyQuestsProps) {
  return (
    <View style={[styles.container, style]}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.list}>
        {quests.map((quest, index) => (
          <DailyQuestItem
            key={quest.id}
            {...quest}
            animated={animated}
            animationDelay={index * 120}
            animationDuration={animationDuration}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionTitle: {
    color: '#141b41',
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  list: {
    gap: 8,
  },
  quest: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  content: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  questTitle: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 17,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  progressLabel: {
    color: '#6073a4',
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    lineHeight: 17,
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
  },
  reward: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rewardLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
  },
});
