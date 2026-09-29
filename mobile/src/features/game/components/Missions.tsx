import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { View } from 'react-native';
import { DailyQuests } from '@/components/DailyQuests';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { Symbol } from '@/components/Symbol';
import { useGameProgress } from '@/store/gameProgress';
import { colors } from '@/theme/colors';
import type { Mission } from '../data';
import { gameMissions } from '../missionData';
import { Action, Crest, Heading, Icon, Info, Panel, Pill, Row, s } from './UI';

export function MissionList({ weekly = false, onMission, onWeekly, onHistory }: { weekly?: boolean; onMission: (id: string) => void; onWeekly: () => void; onHistory: () => void }) {
  useLanguage();
  const game = useGameProgress();
  const list = gameMissions(game).filter(mission => Boolean(mission.weekly) === weekly);
  const completed = list.filter(mission => mission.value >= mission.target && (mission.id !== 'weekly-plan' || game.missions.weekly.plan.awarded)).length;
  const available = list.reduce((sum, mission) => sum + mission.xp, 0);
  const obtained = list.reduce((sum, mission) => sum + (mission.id === 'meals' ? mission.value * 10 : mission.value >= mission.target && (mission.id !== 'weekly-plan' || game.missions.weekly.plan.awarded) ? mission.xp : 0), 0);
  return <>
    <Panel>{weekly ? <><View style={s.row}><Crest size={64} /><View><Text style={s.muted}>Progression</Text><Text style={[s.big, { fontSize: 42 }]}>{Math.round(completed / list.length * 100)} %</Text></View></View><ProgressBar progress={completed / list.length * 100} height={13} /><View style={[s.row, { justifyContent: 'space-between' }]}><View style={s.row}><Icon name="star" round /><View><Text style={s.title}>{available} XP</Text><Text style={s.muted}>disponibles</Text></View></View><View style={s.row}><Icon name="star" round /><View><Text style={s.title}>{obtained} XP</Text><Text style={s.muted}>obtenus</Text></View></View></View></> : <><View style={s.row}><Icon name="trophy" round size={48} /><Text style={[s.title, s.grow, { fontSize: 22 }]}>{completed} / {list.length} terminées</Text><View><Pill>{obtained} XP</Pill><Text style={[s.small, { textAlign: 'center' }]}>obtenus</Text></View></View><ProgressBar progress={completed / list.length * 100} height={13} /></>}</Panel>
    <DailyQuests title="" style={{ gap: 0 }} quests={list.map(mission => ({ id: mission.id, title: mission.title, expanded: true, currentValue: mission.value, targetValue: mission.target, icon: <Icon name={mission.icon} size={50} round={!weekly} />, progressLabel: mission.label, reward: t("+{p0} XP", { p0: mission.xp }), rewardBackgroundColor: mission.value >= mission.target ? colors.successSurface : colors.accentSurface, rewardColor: mission.value >= mission.target ? colors.successText : colors.squadPurple, hideProgress: !weekly && (mission.id === 'checkin' || mission.id === 'workout'), status: mission.value >= mission.target ? 'Récompense obtenue' : 'À faire', onPress: () => onMission(mission.id) }))} />
    {weekly ? <><Heading>Derniers gains</Heading><Panel>{game.recent.filter(event => event.category === 'mission').slice(0, 3).map((event, i, rows) => <Row key={event.id} last={i === rows.length - 1}><Icon name="trophy" /><View style={s.grow}><Text style={s.title}>{event.title}</Text><Text style={s.muted}>{new Date(event.occurredAt).toLocaleDateString(getLocale(), { day: 'numeric', month: 'long' })}</Text></View><Pill green>+{event.xp} XP</Pill></Row>)}{!game.recent.some(event => event.category === 'mission') ? <Text style={s.muted}>Pas encore de mission terminée.</Text> : null}</Panel><Action text="Historique des missions" outline onPress={onHistory} /></> : <><Info>Les XP sont ajoutés automatiquement après chaque action terminée.</Info><Action text="Voir les missions hebdomadaires" outline onPress={onWeekly} /></>}
  </>;
}

export function MissionDetail({ mission, onAction }: { mission: Mission; onAction: () => void }) {
  useLanguage();
  const game = useGameProgress();
  const complete = mission.value >= mission.target && (mission.id !== 'weekly-plan' || game.missions.weekly.plan.awarded);
  const period = mission.weekly ? 'Cette semaine' : "Aujourd’hui";
  return <>
    <Panel><View style={s.row}><Icon name={mission.icon} size={58} /><View style={s.grow}><Text style={s.title}>{mission.title}</Text><Text style={[s.muted, { marginTop: 5 }]}>{period}</Text></View><Pill>+{mission.xp} XP</Pill></View><View style={[s.row, { borderTopWidth: 0.5, borderColor: colors.border, paddingTop: 12 }]}><ProgressRing progress={mission.value / mission.target * 100} size={100} strokeWidth={10}><View style={{ width: 64, alignItems: 'center' }}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.title, { width: '100%', textAlign: 'center', fontSize: 22 }]}>{mission.value} / {mission.target}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { width: '100%', textAlign: 'center' }]}>{mission.unit}</Text></View></ProgressRing><ProgressBar style={s.grow} height={13} progress={mission.value / mission.target * 100} /><Text style={s.small}>{Math.round(mission.value / mission.target * 100)} %</Text></View></Panel>
    <Panel><Text style={s.title}>Critère</Text><Info>{mission.criterion}</Info></Panel>
    <Panel><View style={s.row}><Symbol name="clock" color="energy" /><Text style={s.body}>Expire {mission.weekly ? 'dimanche' : 'aujourd’hui'} à 23:59</Text></View></Panel>
    {complete ? <Pill green>XP attribués automatiquement</Pill> : null}
    <Action text={mission.cta} onPress={onAction} />
  </>;
}
