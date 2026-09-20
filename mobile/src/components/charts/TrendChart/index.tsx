import { useId, useState } from 'react';
import { Text as Label, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text } from 'react-native-svg';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { useChartScrubber } from '../useChartScrubber';
import { feedback } from '@/utils/feedback';
import { useChartEntrance } from '../useChartEntrance';

export type TrendPoint = { label: string; value: number; detail?: string };
export type TrendSeries = { label: string; color: string; points: TrendPoint[]; kind?: 'line' | 'dots' | 'bar'; gradient?: boolean };
/** Shared SVG chart: bundled runtime, touch selection, responsive labels and empty state. */
export function TrendChart({ series, height = 220, unit = '', showValues = false, hideAxis = false, domain }: { series: TrendSeries[]; height?: number; unit?: string; showValues?: boolean; hideAxis?: boolean; domain?: [number, number] }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<{ series: number; point: number } | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const valid = series.map(item => ({ ...item, points: item.points.filter(point => Number.isFinite(point.value)) }));
  const all = valid.flatMap(item => item.points.map(point => point.value));
  const entrance = useChartEntrance(JSON.stringify([valid, width, height, domain]), Math.max(0, ...valid.map(item => item.points.length)), width > 60);
  const scrub = useChartScrubber(valid[0]?.points.length ?? 0, hideAxis ? 10 : 39, width - 20, index => setSelected({ series: 0, point: index }));
  if (!all.length) return <EmptyState title="Pas encore de données" description="Tes prochaines saisies apparaîtront ici." />;
  const range = Math.max(...all) - Math.min(...all);
  const low = domain?.[0] ?? (valid.some(item => item.kind === 'bar') ? 0 : Math.floor(Math.min(...all) - Math.max(range * 0.15, 1)));
  const high = domain?.[1] ?? Math.ceil(Math.max(...all) + Math.max(range * 0.15, 1));
  const left = hideAxis ? 10 : 39, right = Math.max(left + 1, width - 20), top = 26, bottom = height - 30;
  const x = (index: number, count: number) => count < 2 ? (left + right) / 2 : left + index / (count - 1) * (right - left);
  const y = (value: number) => bottom - (value - low) / Math.max(1, high - low) * (bottom - top);
  const format = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const active = selected ? valid[selected.series]?.points[selected.point] : undefined;
  const labels = valid.find(item => item.points.length)?.points ?? [];
  return <View ref={scrub.ref} {...scrub.panHandlers} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ gap: 8 }}>
    {active ? <Label accessibilityLiveRegion="polite" style={{ color: colors.text, fontFamily: fontFamily.semiBold, fontSize: 12, textAlign: 'right' }}>{active.detail ?? active.label} · {format(active.value)} {unit}</Label> : null}
    {width > 60 ? <Svg width={width} height={height} accessibilityLabel={valid.map(item => `${item.label} : ${item.points.map(p => `${p.detail ?? p.label} ${format(p.value)} ${unit}`).join(', ')}`).join('. ')}>
      <Defs><ClipPath id={`${uid}reveal`}><Rect x={0} y={0} width={(right + 4) * entrance.line} height={height} /></ClipPath>{valid.map((item, index) => <LinearGradient key={index} id={`${uid}g${index}`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={item.color} /><Stop offset="1" stopColor={item.gradient ? colors.accent : item.color} /></LinearGradient>)}</Defs>
      {[0, 1, 2, 3].map(tick => { const value = low + (high - low) * tick / 3; return <ViewGrid key={tick} left={left} right={right} y={y(value)} text={hideAxis ? '' : format(value)} />; })}
      {labels.map((point, index) => { const every = Math.max(1, Math.ceil(labels.length / 4)); return index % every === 0 || index === labels.length - 1 ? <Text key={index} x={x(index, labels.length)} y={height - 7} fill={colors.textSecondary} fontSize={9} fontFamily={fontFamily.medium} textAnchor="middle">{point.label}</Text> : null; })}
      {selected && active ? <Line x1={x(selected.point, valid[selected.series].points.length)} x2={x(selected.point, valid[selected.series].points.length)} y1={top} y2={bottom} stroke={colors.primary} strokeDasharray="3 3" /> : null}
      {valid.map((item, seriesIndex) => {
        const path = item.points.map((point, index) => `${index ? 'L' : 'M'}${x(index, item.points.length)},${y(point.value)}`).join(' ');
        const lastX = x(item.points.length - 1, item.points.length);
        return <G key={seriesIndex}>
          {item.kind !== 'bar' && item.kind !== 'dots' && item.points.length > 1 ? <G clipPath={`url(#${uid}reveal)`}><Path d={`${path} L${lastX},${bottom} L${left},${bottom}Z`} fill={`url(#${uid}g${seriesIndex})`} opacity={0.09 * entrance.line} /><Path d={path} fill="none" stroke={`url(#${uid}g${seriesIndex})`} strokeWidth={2.7} strokeLinejoin="round" /></G> : null}
          {item.points.map((point, index) => { const px = x(index, item.points.length), py = y(point.value), isSelected = selected?.series === seriesIndex && selected.point === index; const barWidth = Math.min(42, (right - left) / Math.max(1, item.points.length) * 0.6); const reveal = entrance.point(index, item.points.length); if (!reveal.visible) return null; return <G key={index} opacity={reveal.opacity} transform={`translate(${px} ${py}) scale(${reveal.scale}) translate(${-px} ${-py})`}>
            {item.kind === 'bar' ? <Rect x={px - barWidth / 2} y={py} width={barWidth} height={Math.max(0, bottom - py)} rx={5} fill={`url(#${uid}g${seriesIndex})`} onPress={() => setSelected({ series: seriesIndex, point: index })} /> : <Circle cx={px} cy={py} r={isSelected ? 6 : item.kind === 'dots' ? 2.5 : item.points.length > 12 ? 0 : 4.5} fill={item.kind === 'dots' ? colors.textMuted : item.color} stroke={item.kind === 'dots' ? 'none' : colors.white} strokeWidth={1.5} opacity={item.kind === 'dots' ? 0.5 : 1} />}
            {showValues ? <Text x={px} y={py - 12} textAnchor="middle" fill={colors.text} fontFamily={fontFamily.semiBold} fontSize={10}>{format(point.value)}{unit ? ` ${unit}` : ''}</Text> : null}
            <Circle cx={px} cy={py} r={12} fill="transparent" onPress={() => { feedback(); setSelected({ series: seriesIndex, point: index }); }} />
          </G>; })}
        </G>;
      })}
    </Svg> : <View style={{ height }} />}
    {valid.length > 1 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>{valid.map((item, index) => <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} /><Label style={{ fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 10 }}>{item.label}</Label></View>)}</View> : null}
  </View>;
}
function ViewGrid({ left, right, y, text }: { left: number; right: number; y: number; text: string }) { return <G><Line x1={left} x2={right} y1={y} y2={y} stroke={colors.border} strokeDasharray="3 3" />{text ? <Text x={left - 8} y={y + 3} textAnchor="end" fontSize={9} fontFamily={fontFamily.medium} fill={colors.textMuted}>{text}</Text> : null}</G>; }
