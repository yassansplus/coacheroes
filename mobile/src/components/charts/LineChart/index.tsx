import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text } from 'react-native-svg';

import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import type { LineChartProps } from './types';
import { useChartScrubber } from '../useChartScrubber';
import { feedback } from '@/utils/feedback';
import { useChartEntrance } from '../useChartEntrance';

/** A read-only trend using the same SVG runtime as the app's progress rings. */
export function LineChart({ data, accessibilityLabel, color = colors.success }: LineChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const values = data.filter(point => Number.isFinite(point.day) && Number.isFinite(point.value)).slice().sort((a, b) => a.day - b.day);
  const entrance = useChartEntrance(JSON.stringify([values, width, color]), values.length, width > 60);
  const scrub = useChartScrubber(values.length, 34, width - 14, setSelected);
  if (!values.length) return <EmptyState title="Pas encore de mesures" description="Ta tendance apparaîtra après tes premières saisies." />;

  const minimum = Math.min(...values.map(point => point.value));
  const maximum = Math.max(...values.map(point => point.value));
  const padding = Math.max((maximum - minimum) * 0.15, 0.2);
  const low = Math.floor((minimum - padding) * 10) / 10;
  const high = Math.ceil((maximum + padding) * 10) / 10;
  const ticks = [high, (low + high) / 2, low];
  const label = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const left = Math.max(34, ...ticks.map(value => label(value).length * 7 + 10));
  const right = Math.max(left + 1, width - 14);
  const top = 14;
  const bottom = 146;
  const firstDay = values[0].day;
  const lastDay = values[values.length - 1].day;
  const y = (value: number) => bottom - (value - low) / (high - low) * (bottom - top);
  const points = values.map(point => ({ ...point,
    x: lastDay === firstDay ? (left + right) / 2 : left + (point.day - firstDay) / (lastDay - firstDay) * (right - left),
    y: y(point.value),
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
  const labelEvery = Math.max(1, Math.ceil(values.length / Math.max(2, Math.floor((right - left) / 28))));

  return <View ref={scrub.ref} {...scrub.panHandlers} accessible accessibilityLabel={accessibilityLabel} style={styles.container}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > left + 20 ? <Svg width={width} height={180}>
      <Defs><ClipPath id={`${gradientId}-reveal`}><Rect x={0} y={0} width={(right + 4) * entrance.line} height={180} /></ClipPath><LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={color} stopOpacity={0.25} />
        <Stop offset="1" stopColor={color} stopOpacity={0.02} />
      </LinearGradient></Defs>
      {ticks.map((tick, index) => <Text key={index} x={left - 8} y={y(tick) + 4}
        textAnchor="end" fontFamily={fontFamily.regular} fontSize={10} fill={colors.textSecondary}>{label(tick)}</Text>)}
      <Line x1={left} y1={top} x2={left} y2={bottom} stroke={colors.border} />
      <Line x1={left} y1={bottom} x2={right} y2={bottom} stroke={colors.border} />
      {selected !== null && points[selected] ? <><Line x1={points[selected].x} x2={points[selected].x} y1={top} y2={bottom} stroke={color} strokeDasharray="3 3" /><Text x={right} y={10} textAnchor="end" fontFamily={fontFamily.semiBold} fontSize={10} fill={colors.text}>{points[selected].label} · {label(points[selected].value)}</Text></> : null}
      {points.length > 1 ? <G clipPath={`url(#${gradientId}-reveal)`}><Path d={area} fill={`url(#${gradientId})`} opacity={entrance.line} />
        <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /></G> : null}
      {points.map((point, index) => { const reveal = entrance.point(index); return reveal.visible ? <Circle key={index} cx={point.x} cy={point.y} r={(selected === index ? 6 : 4) * reveal.scale} onPress={() => { feedback(); setSelected(index); }}
        fill={color} stroke={colors.surface} strokeWidth={1.5} opacity={reveal.opacity} /> : null; })}
      {points.map((point, index) => index % labelEvery === 0 || index === points.length - 1
        ? <Text key={index} x={point.x} y={bottom + 22} textAnchor="middle"
          fontFamily={fontFamily.medium} fontSize={10} fill={colors.textSecondary}>{point.label}</Text> : null)}
    </Svg> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { height: 180, width: '100%' },
});
