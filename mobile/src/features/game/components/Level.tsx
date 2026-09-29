import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { Pressable, View } from 'react-native';
import { Card } from '@/components/Card';
import { Symbol } from '@/components/Symbol';
import { useGameProgress } from '@/store/gameProgress';
import type { GamePage } from '../data';
import { Action, Heading, Icon, LevelHero, Panel, Pill, Row, s } from './UI';

export function Level({ open, rules }: { open: (page: GamePage) => void; rules: () => void }) {
  useLanguage();
  const game = useGameProgress();
  return <><LevelHero /><View style={[s.row, { gap: 7 }]}>{[
    { label: 'XP total', value: game.total.toLocaleString(getLocale()), icon: 'star' as const },
    { label: 'Cette semaine', value: `+${game.weekly}`, icon: 'calendar' as const },
    { label: 'Bilans', value: t("{p0} jours", { p0: game.missions.weekly.checkins.completed }), icon: 'flame' as const },
  ].map(item => <Pressable key={item.label} style={s.grow} accessibilityRole="button" onPress={rules}><Card style={[s.row, { padding: 10, borderRadius: 17, gap: 6 }]}><Icon name={item.icon} size={30} round /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { fontSize: 9 }]}>{item.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.title, { marginTop: 6 }]}>{item.value}</Text></View></Card></Pressable>)}</View>
    <Heading>XP cette semaine</Heading><Panel><View>{[
      { label: 'Séances terminées', xp: game.breakdown.training ?? 0, icon: 'dumbbell' as const }, { label: 'Nutrition', xp: game.breakdown.nutrition ?? 0, icon: 'apple' as const },
      { label: 'Bilans', xp: game.breakdown.daily ?? 0, icon: 'calendar' as const }, { label: 'Autres gains', xp: (game.breakdown.mission ?? 0) + (game.breakdown.micro ?? 0) + (game.breakdown.profile ?? 0) + (game.breakdown.program ?? 0), icon: 'trophy' as const },
    ].map((item, i) => <Row key={item.label} last={i === 3} onPress={i === 3 ? () => open({ kind: 'daily' }) : undefined}><Icon name={item.icon} size={35} /><Text style={[s.label, s.grow]}>{item.label}</Text><Pill green>+{item.xp} XP</Pill></Row>)}</View></Panel>
    <Heading>Derniers gains</Heading><Panel><View>{game.recent.length ? game.recent.slice(0, 5).map((item, i) => <Row key={item.id} last={i === Math.min(game.recent.length, 5) - 1}><Icon name={item.category === 'training' ? 'dumbbell' : item.category === 'nutrition' ? 'apple' : 'trophy'} size={35} /><View style={s.grow}><Text style={s.label}>{new Date(item.occurredAt).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}</Text><Text style={[s.small, { marginTop: 3 }]}>{item.title}</Text></View><Pill green>+{item.xp} XP</Pill></Row>) : <Text style={s.muted}>Tes premiers gains apparaîtront ici.</Text>}</View></Panel><Action text="Voir les règles d’XP" outline onPress={rules} />
    <Panel><View>{([{ kind: 'daily', label: 'Mes missions' }, { kind: 'records', label: 'Mes records' }, { kind: 'badges', label: 'Mes badges' }, { kind: 'rewards', label: 'Mes récompenses' }] as const).map((item, i) => <Row key={item.kind} last={i === 3} onPress={() => open({ kind: item.kind })}><Text style={[s.label, s.grow]}>{item.label}</Text><Symbol name="chevron" color="textMuted" size={17} /></Row>)}</View></Panel>
  </>;
}
