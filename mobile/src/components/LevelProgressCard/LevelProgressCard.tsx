import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar, type ProgressBarProps } from '@/components/ProgressBar';
import { fontFamily } from '@/theme/typography';

type LevelProgressCardProps = Pick<
  ProgressBarProps,
  'animated' | 'animationDuration' | 'gradientColors' | 'progress' | 'trackColor'
> & {
  icon?: ReactNode;
  sectionTitle?: string;
  style?: StyleProp<ViewStyle>;
  title?: string;
  value?: string;
};

export function LevelProgressCard({
  animated,
  animationDuration,
  gradientColors,
  icon,
  progress,
  sectionTitle,
  style,
  title,
  trackColor,
  value,
}: LevelProgressCardProps) {
  return (
    <View style={styles.container}>
      {sectionTitle ? <Text style={styles.sectionTitle}>{sectionTitle}</Text> : null}

      <Card style={[styles.card, style]}>
        <LinearGradient
          colors={['#fff2dc', '#fdfcfb', '#fefefe']}
          end={{ x: 1, y: 0.5 }}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.5 }}
          style={styles.cardGradient}
        />
        <View style={styles.row}>
          {icon ? <View style={styles.iconSlot}>{icon}</View> : null}

          <View style={styles.content}>
            {title || value ? (
              <View style={styles.header}>
                {title ? <Text style={styles.title}>{title}</Text> : <View />}
                {value ? <Text style={styles.value}>{value}</Text> : null}
              </View>
            ) : null}

            <ProgressBar
              animated={animated}
              animationDuration={animationDuration}
              gradientColors={gradientColors}
              progress={progress}
              trackColor={trackColor}
            />
          </View>
        </View>
      </Card>
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
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 14,
  },
  cardGradient: {
    ...StyleSheet.absoluteFill,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  iconSlot: {
    alignItems: 'center',
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  content: {
    flex: 1,
    gap: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#141b41',
    flexShrink: 1,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    lineHeight: 24,
  },
  value: {
    color: '#7080ae',
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 12,
  },
});
