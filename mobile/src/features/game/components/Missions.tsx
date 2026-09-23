import { Text, View } from 'react-native';
import { DailyQuests } from '@/components/DailyQuests';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { Symbol } from '@/components/Symbol';
import { useGameProgress } from '@/store/gameProgress';
import { colors } from '@/theme/colors';
import { missions, type Mission } from '../data';
import { Action, Crest, Heading, Icon, Info, Panel, Pill, Row, s } from './UI';

export function MissionList({ weekly = false, onMission, onWeekly, onHistory }: { weekly?: boolean; onMission: (id: string) => void; onWeekly: () => void; onHistory: () => void }) {
  const game = useGameProgress();
  const list = missions.filter(mission => Boolean(mission.weekly) === weekly && mission.id !== 'boxing' && !game.abandoned.includes(mission.id));
  return <>
    <Panel>{weekly ? <><View style={s.row}><Crest size={64} /><View><Text style={s.muted}>Progression</Text><Text style={[s.big, { fontSize: 42 }]}>55 %</Text></View></View><ProgressBar progress={55} height={13} /><View style={[s.row, { justifyContent: 'space-between' }]}><View style={s.row}><Icon name="star" round /><View><Text style={s.title}>850 XP</Text><Text style={s.muted}>disponibles</Text></View></View><View style={s.row}><Icon name="star" round /><View><Text style={s.title}>300 XP</Text><Text style={s.muted}>obtenus</Text></View></View></View></> : <><View style={s.row}><Icon name="trophy" round size={48} /><Text style={[s.title, s.grow, { fontSize: 22 }]}>2 / 4 terminées</Text><View><Pill>100 XP</Pill><Text style={[s.small, { textAlign: 'center' }]}>obtenus</Text></View></View><ProgressBar progress={50} height={13} /></>}</Panel>
    <DailyQuests title="" style={{ gap: 0 }} quests={list.map(mission => ({ id: mission.id, title: mission.title, expanded: true, currentValue: mission.value, targetValue: mission.target, icon: <Icon name={mission.icon} size={50} round={!weekly} />, progressLabel: mission.label, reward: `+${mission.xp} XP`, rewardBackgroundColor: weekly || mission.value >= mission.target ? colors.successSurface : colors.accentSurface, rewardColor: weekly || mission.value >= mission.target ? colors.successText : colors.squadPurple, hideProgress: !weekly && (mission.id === 'checkin' || mission.id === 'workout'), status: game.claimed.includes(mission.id) ? 'Récompense obtenue' : mission.id === 'workout' ? 'À faire' : undefined, onPress: () => onMission(mission.id) }))} />
    {weekly ? <><Heading>Terminée récemment</Heading><Panel><Row last onPress={() => onMission('boxing')}><Icon name="boxing" /><View style={s.grow}><Text style={s.title}>2 séances de boxe</Text><Text style={s.muted}>18 septembre</Text></View><Pill green>+250 XP</Pill><Symbol name="chevron" size={16} color="textMuted" /></Row></Panel><Action text="Historique des missions" outline onPress={onHistory} /></> : <><Info>Les jours de repos planifiés comptent comme réalisés.</Info><Action text="Voir les missions hebdomadaires" outline onPress={onWeekly} /></>}
  </>;
}
export function MissionDetail({ mission, onAction, onAbandon, onClaim, onDay }: { mission: Mission; onAction: () => void; onAbandon: () => void; onClaim: () => void; onDay: (index: number) => void }) {
  const game = useGameProgress();
  const abandoned = game.abandoned.includes(mission.id), claimed = game.claimed.includes(mission.id), complete = mission.value >= mission.target;
  return <>
    <Panel><View style={s.row}><Icon name={mission.icon} size={58} /><View style={s.grow}><Text style={s.title}>{mission.title}</Text><Text style={[s.muted, { marginTop: 5 }]}>{mission.weekly ? '15–21 septembre' : 'Mardi 15 septembre'}</Text></View><Pill>+{mission.xp} XP</Pill></View><View style={[s.row, { borderTopWidth: 0.5, borderColor: colors.border, paddingTop: 12 }]}><ProgressRing progress={mission.value / mission.target * 100} size={100} strokeWidth={10}><View style={{ width: 64, alignItems: 'center' }}>
        {mission.target >= 1000 ? <>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[s.title, { width: '100%', textAlign: 'center', fontSize: 20 }]}>{mission.value.toLocaleString('fr-FR')}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { width: '100%', textAlign: 'center', fontSize: 11 }]}>/ {mission.target.toLocaleString('fr-FR')}</Text>
        </> : <Text numberOfLines={1} adjustsFontSizeToFit style={[s.title, { width: '100%', textAlign: 'center', fontSize: mission.target > 100 ? 15 : 22 }]}>{mission.value} / {mission.target}</Text>}
        <Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { width: '100%', textAlign: 'center' }]}>{mission.unit}</Text>
      </View></ProgressRing><ProgressBar style={s.grow} height={13} progress={mission.value / mission.target * 100} /><Text style={s.small}>{Math.round(mission.value / mission.target * 100)} %</Text></View></Panel>
    <Panel><Text style={s.title}>Critère</Text><Info>{mission.criterion}</Info></Panel>
    {mission.weekly ? <><Panel><Text style={s.title}>Suivi de la semaine</Text><View style={[s.row, { gap: 4 }]}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => <View key={i} style={{ flex: 1, alignItems: 'center', gap: 9, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.onboardingBackground }}><Text style={s.small}>{day}</Text><Symbol name={i < mission.value ? 'check' : i < 5 ? 'more' : 'clock'} color={i < mission.value ? 'success' : 'textMuted'} size={20} /><Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { fontSize: 8 }]}>{i < mission.value ? 'Fait' : i < 5 ? 'À faire' : 'À venir'}</Text></View>)}</View></Panel><Panel><Text style={s.title}>Jours validés</Text><View>{Array.from({ length: Math.min(mission.value, 7) }, (_, i) => <Row key={i} last={i === mission.value - 1} onPress={() => onDay(i)}><Symbol name="check" color="success" /><Text style={[s.body, s.grow]}>{['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][i]} · {mission.id === 'protein-week' ? `${[156, 151, 162][i]} g` : mission.id === 'sleep' ? '6 h 30' : 'Séance terminée'}</Text><Symbol name="chevron" color="textMuted" size={17} /></Row>)}</View></Panel></> : null}
    <Panel><View style={s.row}><Symbol name="clock" color="energy" /><Text style={s.body}>Expire {mission.weekly ? 'dimanche' : 'aujourd’hui'} à 23:59</Text></View></Panel>
    {abandoned ? <Info>Mission abandonnée pour cette période.</Info> : <>
      {complete && !claimed ? <Action text={`Récupérer les ${mission.xp} XP`} onPress={onClaim} /> : null}
      {claimed ? <Pill green>Récompense obtenue</Pill> : null}
      <Action text={mission.cta} onPress={onAction} />{!complete ? <Action text="Abandonner la mission" outline onPress={onAbandon} /> : null}
    </>}
  </>;
}
