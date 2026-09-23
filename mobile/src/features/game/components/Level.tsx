import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Symbol } from '@/components/Symbol';
import { useGameProgress } from '@/store/gameProgress';
import type { GamePage } from '../data';
import { Action, Heading, Icon, LevelHero, Panel, Pill, Row, s } from './UI';

export function Level({ open, rules }: { open: (page: GamePage) => void; rules: () => void }) {
  const game = useGameProgress();
  return <><LevelHero /><View style={[s.row, { gap: 7 }]}>{[
    { label: 'XP total', value: game.total.toLocaleString('fr-FR'), icon: 'star' as const },
    { label: 'Cette semaine', value: `+${game.weekly}`, icon: 'calendar' as const },
    { label: 'Série', value: '7 jours', icon: 'flame' as const },
  ].map(item => <Pressable key={item.label} style={s.grow} accessibilityRole="button" onPress={() => item.label === 'Série' ? open({ kind: 'streak' }) : rules()}><Card style={[s.row, { padding: 10, borderRadius: 17, gap: 6 }]}><Icon name={item.icon} size={30} round /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { fontSize: 9 }]}>{item.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.title, { marginTop: 6 }]}>{item.value}</Text></View></Card></Pressable>)}</View>
    <Heading>XP cette semaine</Heading><Panel><View>{[
      { label: 'Séances terminées', xp: 300, icon: 'dumbbell' as const }, { label: 'Objectifs nutrition', xp: 180, icon: 'apple' as const },
      { label: 'Check-ins', xp: 80, icon: 'calendar' as const }, { label: 'Missions', xp: 180, icon: 'trophy' as const },
    ].map((item, i) => <Row key={item.label} last={i === 3} onPress={i === 3 ? () => open({ kind: 'daily' }) : undefined}><Icon name={item.icon} size={35} /><Text style={[s.label, s.grow]}>{item.label}</Text><Pill green>+{item.xp} XP</Pill></Row>)}</View></Panel>
    <Heading>Derniers gains</Heading><Panel><View>{[
      { day: 'Aujourd’hui', text: 'Séance de boxe terminée', xp: 120, icon: 'dumbbell' as const },
      { day: 'Hier', text: 'Objectif nutrition atteint', xp: 60, icon: 'apple' as const },
      { day: '12 sept.', text: 'Mission quotidienne terminée', xp: 80, icon: 'trophy' as const },
    ].map((item, i) => <Row key={item.day} last={i === 2}><Icon name={item.icon} size={35} /><View style={s.grow}><Text style={s.label}>{item.day}</Text><Text style={[s.small, { marginTop: 3 }]}>{item.text}</Text></View><Pill green>+{item.xp} XP</Pill></Row>)}</View></Panel><Action text="Voir les règles d’XP" outline onPress={rules} />
    <Panel><View>{([{ kind: 'daily', label: 'Mes missions' }, { kind: 'records', label: 'Mes records' }, { kind: 'badges', label: 'Mes badges' }, { kind: 'rewards', label: 'Mes récompenses' }] as const).map((item, i) => <Row key={item.kind} last={i === 3} onPress={() => open({ kind: item.kind })}><Text style={[s.label, s.grow]}>{item.label}</Text><Symbol name="chevron" color="textMuted" size={17} /></Row>)}</View></Panel>
  </>;
}
