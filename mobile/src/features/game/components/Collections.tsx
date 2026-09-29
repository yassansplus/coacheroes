import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AchievementCollection } from '@/components/AchievementCollection';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/Button';
import { Banner } from '@/components/Banner';
import { gameRewards as rewards } from '@/config/gameRewards';
import { saveGameEquipment } from '@/services/game';
import { getSessionToken } from '@/storage/session';
import { Motion, RewardBurst } from '@/components/Motion';
import { SelectableCard } from '@/components/SelectableCard';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { equipGameItems, useGameProgress } from '@/store/gameProgress';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import { colors, gradients } from '@/theme/colors';
import { feedback } from '@/utils/feedback';
import { gameBadges } from '../badgeData';
import { Action, Crest, LevelHero, Panel, Pill, s } from './UI';

export function Badges({ onBadge, onAll }: { onBadge: (id: string) => void; onAll: () => void }) {
  useLanguage();
  const game = useGameProgress();
  if (game.loading) return <LoadingState />;
  return <AchievementCollection items={gameBadges(game.badges)} onBadge={onBadge} onAll={onAll} />;
}
export function RewardArt({ category, id, locked = false, size = 94 }: { category: string; id: string; locked?: boolean; size?: number }) {
  useLanguage();
  return <View style={{ width: size * 1.2, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {category === 'frame' ? <LinearGradient colors={id === 'azur' ? [colors.primaryTint, colors.primary] : [colors.primary, colors.squadPurple]} style={{ width: size * 0.87, height: size * 0.87, borderRadius: 18, padding: 9 }}><View style={{ flex: 1, borderRadius: 11, backgroundColor: colors.onboardingBackground, borderWidth: 3, borderColor: colors.primaryTint }} /></LinearGradient> : category === 'title' ? <LinearGradient colors={locked ? [colors.border, colors.textMuted] : gradients.primary} style={{ width: size * 1.15, height: size * 0.62, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}><View style={{ width: 20, height: 5, borderRadius: 3, backgroundColor: colors.white }} /><Crest size={35} /><View style={{ width: 20, height: 5, borderRadius: 3, backgroundColor: colors.white }} /></LinearGradient> : <LinearGradient colors={id === 'violet' ? [colors.squadPurple, colors.text] : gradients.onboarding} style={{ width: size * 1.15, height: size * 0.8, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: colors.border, gap: 6 }}><View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: colors.primary }} /><View style={{ height: 6, width: '65%', backgroundColor: colors.primaryTint, borderRadius: 4 }} /><View style={{ height: 6, width: '45%', backgroundColor: colors.primaryTint, borderRadius: 4 }} /></LinearGradient>}
    {locked ? <View style={{ position: 'absolute', backgroundColor: colors.primarySurface, padding: 10, borderRadius: 24 }}><Symbol name="lock" color="textSecondary" size={22} /></View> : null}
  </View>;
}
export function Rewards({ onEquipped }: { onEquipped: () => void }) {
  useLanguage();
  const game = useGameProgress();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(game.equipment);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setSelected(game.equipment); }, [game.equipment.frame, game.equipment.title, game.equipment.theme]);
  async function equip() {
    const token = getSessionToken();
    setSaving(true); setError('');
    try {
      const result = await saveGameEquipment(selected);
      if (!alive.current || getSessionToken() !== token) return;
      equipGameItems(result.equipment); feedback('success'); onEquipped();
    } catch (failure) {
      if (alive.current && getSessionToken() === token) setError(failure instanceof Error ? failure.message : t('Impossible d’enregistrer. Réessaie.'));
    } finally { if (alive.current && getSessionToken() === token) setSaving(false); }
  }
  if (game.loading) return <LoadingState />;
  return <><LevelHero rewards /><TabSelector value={filter} onChange={setFilter} items={[{ value: 'all', label: 'Tout' }, { value: 'frame', label: 'Cadres' }, { value: 'title', label: 'Titres' }, { value: 'theme', label: 'Thèmes' }]} />
    <View style={s.grid}>{rewards.filter(reward => filter === 'all' || reward.category === filter).map(reward => {
      const unlocked = game.unlockedRewards.includes(reward.id);
      const active = selected[reward.category] === reward.id;
      return <SelectableCard key={reward.id} selected={active} disabled={!unlocked || saving} selectedBackgroundColor="surface" iconStyle={{ width: '100%', height: 'auto', marginBottom: 0 }} cardStyle={{ minHeight: 190 }} onPress={() => { feedback(); setSelected(current => ({ ...current, [reward.category]: active ? reward.category === 'theme' ? 'light' : 'none' : reward.id })); }} style={{ flexBasis: '47%', flexGrow: 1, borderWidth: 1.5, borderColor: active ? colors.primary : colors.surface, borderRadius: 24 }} icon={<View style={{ alignItems: 'center', gap: 9 }}><RewardArt category={reward.category} id={reward.id} locked={!unlocked} /><Text style={[s.title, { textAlign: 'center', fontSize: 14 }]}>{reward.title}</Text><Pill green={unlocked}>{reward.requirement}</Pill>{active ? <Text style={[s.small, { color: colors.primary }]}>Sélectionné</Text> : null}</View>} />;
    })}</View>{error ? <Banner variant="error" message={error} /> : null}<Button text={saving ? 'Enregistrement…' : 'Équiper mes éléments'} variant="outline" disabled={saving} onPress={() => void equip()} /></>;
}
export function LevelUp({ onContinue, onReward }: { onContinue: () => void; onReward: () => void }) {
  useLanguage();
  const game = useGameProgress();
  const [xp] = useMetricMotion([500], { duration: 2200, haptic: 'rain' });
  useEffect(() => { feedback('success'); }, []);
  return <><View style={{ alignItems: 'center', gap: 12, paddingTop: 20 }}><Pill>Passage de niveau</Pill><View style={{ opacity: 0.35 }}><Crest label={String(game.level - 1)} size={78} /></View><View style={{ padding: 24, borderWidth: 17, borderColor: colors.primarySurface, borderRadius: 180, backgroundColor: colors.accentSurface }}><Motion pop delay={200}><Crest label={String(game.level)} size={155} /></Motion><RewardBurst /></View><Text style={[s.big, { fontSize: 43 }]}>Niveau {game.level}</Text><Pill>{Math.round(xp)} / 500 XP</Pill></View><Panel><View style={s.row}><RewardArt category="frame" id="cobalt" size={88} /><View style={s.grow}><Text style={s.small}>ÉLÉMENT DÉBLOQUÉ</Text><Text style={[s.title, { fontSize: 22, marginTop: 9 }]}>{game.level === 9 ? 'Cadre cobalt' : t("Niveau {p0} atteint", { p0: game.level })}</Text></View></View></Panel><View style={{ marginTop: 12, gap: 10 }}><Action text="Continuer" onPress={onContinue} /><Action text="Voir la récompense" outline onPress={onReward} /></View></>;
}
