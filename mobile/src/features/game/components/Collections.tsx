import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/Card';
import { Motion, RewardBurst } from '@/components/Motion';
import { ProgressBar } from '@/components/ProgressBar';
import { SelectableCard } from '@/components/SelectableCard';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { equipGameItems, useGameProgress } from '@/store/gameProgress';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import { colors, gradients } from '@/theme/colors';
import { feedback } from '@/utils/feedback';
import { badges, rewards } from '../data';
import { Action, Crest, LevelHero, Panel, Pill, s } from './UI';

export function Badges({ onBadge, onAll }: { onBadge: (id: string) => void; onAll: () => void }) {
  const [filter, setFilter] = useState('all');
  return <><Panel><View style={[s.row, { gap: 20 }]}><Crest size={90} /><View><Text style={[s.big, { fontSize: 38 }]}>12 / 30</Text><Text style={s.muted}>débloqués</Text></View></View></Panel>
    <TabSelector value={filter} onChange={setFilter} items={[{ value: 'all', label: 'Tous' }, { value: 'sport', label: 'Sport' }, { value: 'regularity', label: 'Régularité' }, { value: 'nutrition', label: 'Nutrition' }]} />
    <View style={s.grid}>{badges.filter(badge => filter === 'all' || badge.category === filter).map(badge => <Pressable key={badge.id} accessibilityRole="button" accessibilityLabel={badge.title} onPress={() => onBadge(badge.id)} style={{ width: '48.5%', flexGrow: 1 }}><Card style={{ alignItems: 'center', padding: 15, gap: 9, minHeight: 180 }}><Crest icon={badge.icon} size={78} gold={badge.id === 'boxer'} locked={!badge.date} /><Text numberOfLines={1} adjustsFontSizeToFit style={[s.title, { textAlign: 'center', fontSize: 14 }]}>{badge.title}</Text><Text style={s.small}>{badge.subtitle}</Text>{badge.date ? <Pill green>{badge.date}</Pill> : <ProgressBar style={{ width: '100%' }} height={10} progress={badge.current / badge.target * 100} />}</Card></Pressable>)}</View>
    <Action text="Voir tous les accomplissements" outline onPress={onAll} /></>;
}
export function RewardArt({ category, id, locked = false, size = 94 }: { category: string; id: string; locked?: boolean; size?: number }) {
  return <View style={{ width: size * 1.2, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {category === 'frame' ? <LinearGradient colors={id === 'azur' ? [colors.primaryTint, colors.primary] : [colors.primary, colors.squadPurple]} style={{ width: size * 0.87, height: size * 0.87, borderRadius: 18, padding: 9 }}><View style={{ flex: 1, borderRadius: 11, backgroundColor: colors.onboardingBackground, borderWidth: 3, borderColor: colors.primaryTint }} /></LinearGradient> : category === 'title' ? <LinearGradient colors={locked ? [colors.border, colors.textMuted] : gradients.primary} style={{ width: size * 1.15, height: size * 0.62, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}><View style={{ width: 20, height: 5, borderRadius: 3, backgroundColor: colors.white }} /><Crest size={35} /><View style={{ width: 20, height: 5, borderRadius: 3, backgroundColor: colors.white }} /></LinearGradient> : <LinearGradient colors={id === 'violet' ? [colors.squadPurple, colors.text] : gradients.onboarding} style={{ width: size * 1.15, height: size * 0.8, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: colors.border, gap: 6 }}><View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: colors.primary }} /><View style={{ height: 6, width: '65%', backgroundColor: colors.primaryTint, borderRadius: 4 }} /><View style={{ height: 6, width: '45%', backgroundColor: colors.primaryTint, borderRadius: 4 }} /></LinearGradient>}
    {locked ? <View style={{ position: 'absolute', backgroundColor: colors.primarySurface, padding: 10, borderRadius: 24 }}><Symbol name="lock" color="textSecondary" size={22} /></View> : null}
  </View>;
}
export function Rewards({ onEquipped }: { onEquipped: () => void }) {
  const game = useGameProgress();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(game.equipment);
  return <><LevelHero rewards /><TabSelector value={filter} onChange={setFilter} items={[{ value: 'all', label: 'Tout' }, { value: 'frame', label: 'Cadres' }, { value: 'title', label: 'Titres' }, { value: 'theme', label: 'Thèmes' }]} />
    <View style={s.grid}>{rewards.filter(reward => filter === 'all' || reward.category === filter).map(reward => {
      const unlocked = reward.id === 'violet' ? game.total >= 5000 : game.level >= reward.level;
      const active = selected[reward.category] === reward.id;
      return <SelectableCard key={reward.id} selected={active} disabled={!unlocked} selectedBackgroundColor="surface" iconStyle={{ width: '100%', height: 'auto', marginBottom: 0 }} cardStyle={{ minHeight: 190 }} onPress={() => { feedback(); setSelected(current => ({ ...current, [reward.category]: reward.id })); }} style={{ flexBasis: '47%', flexGrow: 1, borderWidth: 1.5, borderColor: active ? colors.primary : colors.surface, borderRadius: 24 }} icon={<View style={{ alignItems: 'center', gap: 9 }}><RewardArt category={reward.category} id={reward.id} locked={!unlocked} /><Text style={[s.title, { textAlign: 'center', fontSize: 14 }]}>{reward.title}</Text><Pill green={unlocked}>{reward.requirement}</Pill>{active ? <Text style={[s.small, { color: colors.primary }]}>Sélectionné</Text> : null}</View>} />;
    })}</View><Action text="Équiper mes éléments" outline onPress={() => { equipGameItems(selected); feedback('success'); onEquipped(); }} /></>;
}
export function LevelUp({ onContinue, onReward }: { onContinue: () => void; onReward: () => void }) {
  const game = useGameProgress();
  const [xp] = useMetricMotion([500], { duration: 2200, haptic: 'rain' });
  useEffect(() => { feedback('success'); }, []);
  return <><View style={{ alignItems: 'center', gap: 12, paddingTop: 20 }}><Pill>Passage de niveau</Pill><View style={{ opacity: 0.35 }}><Crest label={String(game.level - 1)} size={78} /></View><View style={{ padding: 24, borderWidth: 17, borderColor: colors.primarySurface, borderRadius: 180, backgroundColor: colors.accentSurface }}><Motion pop delay={200}><Crest label={String(game.level)} size={155} /></Motion><RewardBurst /></View><Text style={[s.big, { fontSize: 43 }]}>Niveau {game.level}</Text><Pill>{Math.round(xp)} / 500 XP</Pill></View><Panel><View style={s.row}><RewardArt category="frame" id="cobalt" size={88} /><View style={s.grow}><Text style={s.small}>ÉLÉMENT DÉBLOQUÉ</Text><Text style={[s.title, { fontSize: 22, marginTop: 9 }]}>{game.level === 9 ? 'Cadre cobalt' : `Niveau ${game.level} atteint`}</Text></View></View></Panel><View style={{ marginTop: 12, gap: 10 }}><Action text="Continuer" onPress={onContinue} /><Action text="Voir la récompense" outline onPress={onReward} /></View></>;
}
