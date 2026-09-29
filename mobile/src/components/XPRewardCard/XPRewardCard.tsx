import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { Motion, RewardBurst } from '@/components/Motion';
import { ProgressBar } from '@/components/ProgressBar';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import { feedback } from '@/utils/feedback';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type XPRewardCardProps = { gainedXP: number; level?: number; initialXP?: number; currentXP?: number; levelTarget?: number; animated?: boolean; haptics?: boolean; animationDuration?: number };

export function XPRewardCard({ gainedXP, level = 8, initialXP = 0, currentXP, levelTarget = 500, animated = true, haptics = true, animationDuration = 2200 }: XPRewardCardProps) {
  useLanguage();
  const target = Math.max(1, levelTarget);
  const reward = Math.max(0, Math.round(Number.isFinite(gainedXP) ? gainedXP : 0));
  const [count] = useMetricMotion([reward], { duration: Math.max(400, animationDuration), haptic: haptics ? 'rain' : false, enabled: animated });
  const total = currentXP ?? initialXP + Math.round(count);
  const currentLevel = currentXP === undefined ? level + Math.floor(total / target) : level;
  const seenLevel = useRef(level + Math.floor(initialXP / target));
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (currentLevel > seenLevel.current && animated) {
      setBurst(value => value + 1);
      if (haptics) feedback('success');
    }
    seenLevel.current = Math.max(seenLevel.current, currentLevel);
  }, [currentLevel, animated, haptics]);
  return <Card style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Motion trigger={currentLevel} pop><Illustration name="star" size={70} /></Motion>
      <View style={{ flex: 1 }}>
        <Text accessibilityLabel={localizeLabel(t("{p0} XP gagnés", { p0: reward }))} style={{ fontFamily: fontFamily.bold, fontSize: 30, color: colors.text }}>+{Math.round(count)} XP</Text>
        <Motion trigger={currentLevel} pop><Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: colors.textSecondary }}>Niveau {currentLevel}</Text></Motion>
      </View>
    </View>
    <ProgressBar animated={false} progress={total % target / target * 100} accessibilityLabel={localizeLabel("Progression du niveau")} />
    <Text style={{ fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary }}>{total % target} / {target} XP</Text>
    {burst > 0 ? <RewardBurst key={burst} /> : null}
  </Card>;
}
