import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Motion } from '@/components/Motion';
import { feedback } from '@/utils/feedback';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DropdownMenu } from '@/components/DropdownMenu';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { PhotoComparison } from '@/components/PhotoComparison';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { colors } from '@/theme/colors';
import type { Angle, ProgressPhoto } from '../types';
import { dateLabel, daysBetween, number, startDate } from '../data';
import { Metric, TileIcon } from './UI';
import { s } from './styles';

export const angleItems = [{ value: 'face', label: 'Face' }, { value: 'profile', label: 'Profil' }, { value: 'back', label: 'Dos' }];
export const initialPhotos: ProgressPhoto[] = [
  { id: 'example-before', date: startDate, example: true, weight: 80.3, waist: 90, images: { face: require('../../../../assets/progression/example-before.jpg') } },
  { id: 'example-current', date: '2026-09-15', example: true, weight: 77.5, waist: 84, images: { face: require('../../../../assets/progression/example-current.jpg') } },
];
function PhotoPreview({ source, thumbnail = false }: { source: ImageSourcePropType; thumbnail?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <View style={{ width: '100%', aspectRatio: thumbnail ? 0.95 : 1.2, borderRadius: thumbnail ? 10 : 16, overflow: 'hidden', backgroundColor: colors.primarySurface }}>
    <Image source={source} fadeDuration={0} style={StyleSheet.absoluteFill} resizeMode="contain" onError={() => setFailed(true)} />
    {failed ? <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 8 }]}><Symbol name="image" color="textMuted" /><Text style={[s.small, { textAlign: 'center' }]}>Photo indisponible{thumbnail ? '' : ' · importe-la à nouveau.'}</Text></View> : null}
  </View>;
}
export function PhotoGallery({ photos, angle, selected, onSelect, onAngle, onAdd, onCompare, onDelete }: { photos: ProgressPhoto[]; angle: Angle; selected?: string; onSelect: (id: string) => void; onAngle: (angle: Angle) => void; onAdd: () => void; onCompare: (id?: string) => void; onDelete: (id: string) => void }) {
  const [menu, setMenu] = useState(false);
  const visible = photos.filter(item => item.images[angle]).sort((a, b) => a.date.localeCompare(b.date));
  const photo = visible.find(item => item.id === selected) ?? visible[visible.length - 1];
  return <><TabSelector value={angle} items={angleItems} onChange={value => onAngle(value as Angle)} />
    {photo ? <Card style={s.card}><View style={s.row}><View style={s.grow}><Text style={s.heading}>{dateLabel(photo.date)} · Jour {Math.max(0, daysBetween(startDate, photo.date))}</Text>{photo.example ? <Text style={s.small}>Photo d’exemple</Text> : null}</View><IconButton accessibilityLabel="Options de la photo" size={32} icon={<Symbol name="more" />} onPress={() => setMenu(value => !value)} /></View><Motion trigger={`${photo.id}-${angle}`} style={{ width: '100%' }}><PhotoPreview key={`${photo.id}-${angle}-${JSON.stringify(photo.images[angle])}`} source={photo.images[angle]!} /></Motion><DropdownMenu visible={menu} onClose={() => setMenu(false)} items={[{ label: 'Comparer', onPress: () => onCompare(photo.id) }, { label: 'Ajouter des photos', onPress: onAdd }, { label: 'Retirer cette prise de vue', destructive: true, onPress: () => onDelete(photo.id) }]} /></Card> : <EmptyState title={`Ta première photo · ${angleItems.find(item => item.value === angle)?.label}`} description="Ajoute une prise de vue pour suivre ton évolution sous cet angle." />}
    <View style={s.wrap}>{visible.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Photo du ${dateLabel(item.date)}`} onPress={() => { feedback(); onSelect(item.id); }} accessibilityState={{ selected: item.id === photo?.id }} style={{ width: '31%', flexGrow: 0, minWidth: 0 }}><Card style={{ padding: 6, gap: 6, borderWidth: 2, borderColor: item.id === photo?.id ? colors.primary : colors.surface }}><Text style={s.label}>{dateLabel(item.date, true)}</Text><PhotoPreview key={`${item.id}-${angle}-${JSON.stringify(item.images[angle])}`} source={item.images[angle]!} thumbnail /></Card></Pressable>)}</View>
    <Card style={s.card}><View style={s.row}><TileIcon glyph="lock" /><View style={s.grow}><Text style={s.label}>Photos privées</Text><Text style={s.body}>Tes ajouts restent sur cet appareil pendant la session.</Text></View></View></Card>
    <View style={s.actions}><Button text="Ajouter des photos" leading={<Symbol name="image" color="white" />} onPress={onAdd} /><Button text="Comparer" variant="outline" disabled={new Set(visible.map(item => item.date)).size < 2} onPress={() => onCompare(photo?.id)} /></View>
  </>;
}
export function ComparePhotos({ photos, angle, onAngle, beforeId, afterId, onChoose, onClose }: { photos: ProgressPhoto[]; angle: Angle; onAngle: (angle: Angle) => void; beforeId: string; afterId: string; onChoose: (side: 'before' | 'after') => void; onClose: () => void }) {
  const before = photos.find(item => item.id === beforeId);
  const after = photos.find(item => item.id === afterId);
  const beforeSource = before?.images[angle], afterSource = after?.images[angle];
  return <><TabSelector value={angle} items={angleItems} onChange={value => onAngle(value as Angle)} />
    {beforeSource && afterSource ? <Motion trigger={`${angle}-${beforeId}-${afterId}`} style={{ width: '100%' }}><PhotoComparison key={`${angle}-${beforeId}-${afterId}`} before={beforeSource} after={afterSource} beforeLabel={before ? dateLabel(before.date, true) : undefined} afterLabel={after ? dateLabel(after.date, true) : undefined} /></Motion> : <EmptyState title="Deux photos du même angle" description="Choisis deux dates avec une photo disponible pour cet angle." />}
    <View style={s.row}>{(['before', 'after'] as const).map(side => <View style={s.grow} key={side}><Button text={`${side === 'before' ? 'Avant' : 'Après'}\n${(side === 'before' ? before : after) ? dateLabel((side === 'before' ? before : after)!.date) : 'Choisir'} ⌄`} leading={<Symbol name="calendar" color={side === 'before' ? 'primary' : 'accent'} />} backgroundColor={colors.surface} textColor={colors.text} style={{ minHeight: 72, paddingHorizontal: 10 }} onPress={() => onChoose(side)} /></View>)}</View>
    {beforeSource && afterSource && before && after ? <View style={s.row}><Metric title="Poids" value={before.weight != null && after.weight != null ? `${number(after.weight - before.weight)} kg` : '—'} icon={<TileIcon name="scale" tone="green" />} /><Metric title="Taille" value={before.waist != null && after.waist != null ? `${number(after.waist - before.waist)} cm` : '—'} icon={<TileIcon name="tape" tone="purple" />} /></View> : null}
    <View style={[s.actions, { marginTop: 28 }]}><Button text="Changer les photos" variant="outline" leading={<Symbol name="image" color="primary" />} onPress={() => onChoose('before')} /><Button text="Fermer" variant="secondary" onPress={onClose} /></View>
  </>;
}
