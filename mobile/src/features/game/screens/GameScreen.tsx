import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel, getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Motion } from '@/components/Motion';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { Toast } from '@/components/Toast';
import { useGameProgress } from '@/store/gameProgress';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { type Destination, type GamePage } from '../data';
import { recordDate, recordDetail, recordTitle } from '../recordLabels';
import { gameBadges } from '../badgeData';
import { gameMissions } from '../missionData';
import { Badges, LevelUp, Rewards } from '../components/Collections';
import { Level } from '../components/Level';
import { MissionDetail, MissionList } from '../components/Missions';
import { Records, Streak } from '../components/StreakRecords';
import { Row, s } from '../components/UI';

const titles = { level: 'Niveau et XP', daily: 'Missions du jour', weekly: 'Missions de la semaine', mission: 'Détail de la mission', streak: 'Série', records: 'Records', badges: 'Badges', rewards: 'Récompenses', levelup: '' };
type Sheet = { title: string; lines: string[]; action?: () => void; actionLabel?: string };
export function GameScreen({ initialPage = 'level', onClose, onDestination }: { initialPage?: 'level' | 'daily'; onClose: () => void; onDestination: (destination: Destination) => void }) {
  useLanguage();
  const [stack, setStack] = useState<GamePage[]>([{ kind: initialPage }]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [message, setMessage] = useState('');
  const [week, setWeek] = useState(0);
  const game = useGameProgress();
  const badges = gameBadges(game.badges);
  const page = stack[stack.length - 1];
  const mission = page.kind === 'mission' ? gameMissions(game).find(item => item.id === page.id) : undefined;
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7 + week * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const period = week === 0 ? 'Cette semaine' : `${monday.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}`;
  const scroll = useRef<ScrollView>(null);
  const open = (next: GamePage) => setStack(current => [...current, next]);
  const back = () => { if (sheet) setSheet(null); else if (stack.length > 1) setStack(current => current.slice(0, -1)); else onClose(); };
  const info = (title: string, lines: string[], action?: () => void, actionLabel?: string) => setSheet({ title, lines, action, actionLabel });
  const showDay = (date: Date) => {
    const active = date >= new Date(2026, 7, 30) && date <= new Date(2026, 8, 15);
    const rest = active && date.getMonth() === 8 && [3, 11].includes(date.getDate());
    info(date.toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' }), [rest ? 'Repos planifié · série maintenue.' : active ? 'Journée réalisée · objectifs respectés.' : date > new Date(2026, 8, 15) ? 'Journée à venir.' : 'Aucune donnée dans cet aperçu.']);
  };
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page.kind, stack.length]);
  useEffect(() => { const handler = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => handler.remove(); });
  return <View style={styles.root}><ScreenBackdrop /><SafeAreaView style={styles.safe}><View style={styles.frame}>
    {page.kind !== 'levelup' ? <View style={styles.header}><IconButton accessibilityLabel={localizeLabel("Retour")} size={37} icon={<Symbol name={['daily', 'weekly', 'badges'].includes(page.kind) ? 'close' : 'back'} />} onPress={back} /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>{titles[page.kind]}</Text>{page.kind === 'daily' || page.kind === 'weekly' ? <Text style={[s.muted, { textAlign: 'center', marginTop: 4 }]}>{page.kind === 'daily' ? today.toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) : period}</Text> : null}</View>{page.kind === 'weekly' ? <IconButton accessibilityLabel={localizeLabel("Choisir une semaine")} icon={<Symbol name="calendar" color="primary" />} size={37} onPress={() => info('Choisir une semaine', ['Cette semaine', 'Semaine précédente'], () => { setWeek(current => current === 0 ? -1 : 0); setSheet(null); }, week === 0 ? 'Voir la semaine précédente' : 'Revenir à cette semaine')} /> : <View style={{ width: 37 }} />}</View> : null}
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><Motion key={page.kind + (page.kind === 'mission' ? page.id : '')} style={s.stack}>
      {page.kind === 'level' ? <Level open={open} rules={() => info('Les règles d’XP', ['Séance prévue : 100 XP. Séance libre : 60 XP, deux fois par semaine.', 'Bilan quotidien : 20 XP. Repas : 10 XP, deux fois par jour.', 'Suivre 80 % des séances de la semaine : 80 XP. Faire quatre bilans : 40 XP.', 'Les autres actions rapportent de 5 à 50 XP. Les gains sont ajoutés automatiquement.'])} /> : null}
      {page.kind === 'daily' || page.kind === 'weekly' ? page.kind === 'weekly' && week < 0 ? <View style={s.panel}><Text style={s.title}>Aucun historique disponible</Text><Button text="Revenir à cette semaine" onPress={() => setWeek(0)} /></View> : <MissionList weekly={page.kind === 'weekly'} onMission={id => open({ kind: 'mission', id })} onWeekly={() => open({ kind: 'weekly' })} onHistory={() => info('Historique des missions', game.recent.filter(item => item.category === 'mission').map(item => t("{p0} · +{p1} XP", { p0: item.title, p1: item.xp })))} /> : null}
      {mission ? <MissionDetail mission={mission} onAction={() => { if (mission.destination) onDestination(mission.destination); }} /> : null}
      {page.kind === 'streak' ? <Streak onDay={showDay} onHistory={() => info('Détail des journées', Array.from({ length: 17 }, (_, i) => { const date = new Date(2026, 7, 30 + i); return `${date.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })} · ${date.getMonth() === 8 && [3, 11].includes(date.getDate()) ? 'Repos planifié' : 'Journée réalisée'}`; }))} /> : null}
      {page.kind === 'records' ? <Records onRecord={record => info(recordTitle(record), [recordDetail(record), recordDate(record)], () => { setSheet(null); onDestination('progression'); }, 'Voir ma progression')} onHistory={history => info('Historique des records', history.map(record => `${recordDate(record)} · ${recordTitle(record)} · ${recordDetail(record)}`))} /> : null}
      {page.kind === 'badges' ? <Badges onBadge={id => { const badge = badges.find(item => item.id === id)!; info(badge.title, [badge.description, badge.date ? t("Débloqué le {p0}", { p0: badge.date }) : t("Progression : {p0} / {p1}", { p0: badge.current, p1: badge.target })]); }} onAll={() => info('Tous les accomplissements', badges.map(badge => `${badge.title} · ${badge.date || `${badge.current} / ${badge.target}`}`))} /> : null}
      {page.kind === 'rewards' ? <Rewards onEquipped={() => setMessage('Éléments équipés sur ton profil.')} /> : null}
      {page.kind === 'levelup' ? <LevelUp onContinue={back} onReward={() => setStack(current => [...current.slice(0, -1), { kind: 'rewards' }])} /> : null}
    </Motion></ScrollView>
    <Toast visible={!!message} message={message} onHide={() => setMessage('')} style={{ position: 'absolute', bottom: 10, left: 18, right: 18 }} />
  </View></SafeAreaView>
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet?.title}><ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>{sheet?.lines.map((line, i) => <Row key={i} last={i === sheet.lines.length - 1}><Text style={s.body}>{line}</Text></Row>)}</ScrollView>{sheet?.action ? <Button text={sheet.actionLabel ?? 'Continuer'} onPress={sheet.action} /> : null}</BottomSheet>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.onboardingBackground }, safe: { flex: 1 }, frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12 }, title: { fontFamily: fontFamily.bold, fontSize: 18, color: colors.text, textAlign: 'center' }, content: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 28 } });
