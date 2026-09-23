import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '@/components/AppModal';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Motion } from '@/components/Motion';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { Toast } from '@/components/Toast';
import { abandonGameMission, claimGameReward, useGameProgress } from '@/store/gameProgress';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { feedback } from '@/utils/feedback';
import { badges, missions, records, type Destination, type GamePage } from '../data';
import { Badges, LevelUp, Rewards } from '../components/Collections';
import { Level } from '../components/Level';
import { MissionDetail, MissionList } from '../components/Missions';
import { Records, Streak } from '../components/StreakRecords';
import { Row, s } from '../components/UI';

const titles = { level: 'Niveau et XP', daily: 'Missions du jour', weekly: 'Missions de la semaine', mission: 'Détail de la mission', streak: 'Série', records: 'Records', badges: 'Badges', rewards: 'Récompenses', levelup: '' };
type Sheet = { title: string; lines: string[]; action?: () => void; actionLabel?: string };
export function GameScreen({ initialPage = 'level', onClose, onDestination }: { initialPage?: 'level' | 'daily'; onClose: () => void; onDestination: (destination: Destination) => void }) {
  const [stack, setStack] = useState<GamePage[]>([{ kind: initialPage }]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [week, setWeek] = useState(0);
  const game = useGameProgress();
  const page = stack[stack.length - 1];
  const mission = page.kind === 'mission' ? missions.find(item => item.id === page.id) : undefined;
  const scroll = useRef<ScrollView>(null);
  const open = (next: GamePage) => setStack(current => [...current, next]);
  const back = () => { if (sheet) setSheet(null); else if (confirm) setConfirm(false); else if (stack.length > 1) setStack(current => current.slice(0, -1)); else onClose(); };
  const info = (title: string, lines: string[], action?: () => void, actionLabel?: string) => setSheet({ title, lines, action, actionLabel });
  const showDay = (date: Date) => {
    const active = date >= new Date(2026, 7, 30) && date <= new Date(2026, 8, 15);
    const rest = active && date.getMonth() === 8 && [3, 11].includes(date.getDate());
    info(date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), [rest ? 'Repos planifié · série maintenue.' : active ? 'Journée réalisée · objectifs respectés.' : date > new Date(2026, 8, 15) ? 'Journée à venir.' : 'Aucune donnée dans cet aperçu.']);
  };
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page.kind, stack.length]);
  useEffect(() => { const handler = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => handler.remove(); });
  const claim = () => { if (!mission || mission.value < mission.target) return; const leveled = claimGameReward(mission.id, mission.xp); feedback('success'); if (leveled) open({ kind: 'levelup' }); else setMessage(`+${mission.xp} XP obtenus !`); };
  return <View style={styles.root}><ScreenBackdrop /><SafeAreaView style={styles.safe}><View style={styles.frame}>
    {page.kind !== 'levelup' ? <View style={styles.header}><IconButton accessibilityLabel="Retour" size={37} icon={<Symbol name={['daily', 'weekly', 'badges'].includes(page.kind) ? 'close' : 'back'} />} onPress={back} /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>{titles[page.kind]}</Text>{page.kind === 'daily' || page.kind === 'weekly' ? <Text style={[s.muted, { textAlign: 'center', marginTop: 4 }]}>{page.kind === 'daily' ? 'Mardi 15 septembre' : week === 0 ? '15 – 21 septembre' : '8 – 14 septembre'}</Text> : null}</View>{page.kind === 'weekly' ? <IconButton accessibilityLabel="Choisir une semaine" icon={<Symbol name="calendar" color="primary" />} size={37} onPress={() => info('Choisir une semaine', ['Semaine du 15 au 21 septembre', 'Semaine du 8 au 14 septembre'], () => { setWeek(current => current === 0 ? -1 : 0); setSheet(null); }, week === 0 ? 'Voir la semaine précédente' : 'Revenir à cette semaine')} /> : <View style={{ width: 37 }} />}</View> : null}
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><Motion key={page.kind + (page.kind === 'mission' ? page.id : '')} style={s.stack}>
      {page.kind === 'level' ? <Level open={open} rules={() => info('Les règles d’XP', ['Les séances, la nutrition, les check-ins et les missions participent à ta progression.', 'Les montants et seuils affichés sont des données de démonstration. Les règles définitives seront fixées avec le backend.', 'Une récompense déjà récupérée ne peut pas être créditée deux fois.'])} /> : null}
      {page.kind === 'daily' || page.kind === 'weekly' ? page.kind === 'weekly' && week < 0 ? <View style={s.panel}><Text style={s.title}>Aucun historique disponible</Text><Text style={s.muted}>Les semaines précédentes seront disponibles avec le backend.</Text><Button text="Revenir à cette semaine" onPress={() => setWeek(0)} /></View> : <MissionList weekly={page.kind === 'weekly'} onMission={id => open({ kind: 'mission', id })} onWeekly={() => open({ kind: 'weekly' })} onHistory={() => info('Historique des missions', [...missions.filter(item => item.value >= item.target).map(item => `${item.title} · +${item.xp} XP`), ...game.abandoned.map(id => `${missions.find(item => item.id === id)?.title} · Abandonnée`)])} /> : null}
      {mission ? <MissionDetail mission={mission} onAbandon={() => setConfirm(true)} onClaim={claim} onAction={() => mission.destination ? onDestination(mission.destination) : info('Suivi des pas', ['8 432 / 10 000 pas', 'La connexion au suivi de santé n’est pas encore disponible.'])} onDay={index => info(['Lundi', 'Mardi', 'Mercredi'][index] ?? 'Jour validé', [mission.id === 'protein-week' ? `${[156, 151, 162][index]} g de protéines · objectif atteint` : mission.id === 'sleep' ? '6 h 30 de sommeil · objectif atteint' : 'Séance terminée'], mission.destination ? () => { setSheet(null); onDestination(mission.destination!); } : undefined, mission.cta)} /> : null}
      {page.kind === 'streak' ? <Streak onDay={showDay} onHistory={() => info('Détail des journées', Array.from({ length: 17 }, (_, i) => { const date = new Date(2026, 7, 30 + i); return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${date.getMonth() === 8 && [3, 11].includes(date.getDate()) ? 'Repos planifié' : 'Journée réalisée'}`; }))} /> : null}
      {page.kind === 'records' ? <Records onRecord={id => { const record = records.find(item => item.id === id)!; info(record.title, [record.detail, 'Record personnel · données de démonstration'], () => { setSheet(null); onDestination('progression'); }, 'Voir ma progression'); }} onHistory={() => info('Historique des records', ['15 septembre · Développé couché · 70 kg × 8 · +200 XP', ...records.map(record => `${record.title} · ${record.detail}`)])} /> : null}
      {page.kind === 'badges' ? <Badges onBadge={id => { const badge = badges.find(item => item.id === id)!; info(badge.title, [badge.subtitle, badge.date ? `Débloqué le ${badge.date}` : `Progression : ${badge.current} / ${badge.target}`]); }} onAll={() => info('Tous les accomplissements', badges.map(badge => `${badge.title} · ${badge.date || badge.subtitle}`))} /> : null}
      {page.kind === 'rewards' ? <Rewards onEquipped={() => setMessage('Éléments équipés sur ton profil.')} /> : null}
      {page.kind === 'levelup' ? <LevelUp onContinue={back} onReward={() => setStack(current => [...current.slice(0, -1), { kind: 'rewards' }])} /> : null}
    </Motion></ScrollView>
    <Toast visible={!!message} message={message} onHide={() => setMessage('')} style={{ position: 'absolute', bottom: 10, left: 18, right: 18 }} />
  </View></SafeAreaView>
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet?.title}><ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>{sheet?.lines.map((line, i) => <Row key={i} last={i === sheet.lines.length - 1}><Text style={s.body}>{line}</Text></Row>)}</ScrollView>{sheet?.action ? <Button text={sheet.actionLabel ?? 'Continuer'} onPress={sheet.action} /> : null}</BottomSheet>
    <AppModal visible={confirm} onClose={() => setConfirm(false)} title="Abandonner la mission ?" actions={<View style={s.stack}><Button text="Garder ma mission" onPress={() => setConfirm(false)} /><Button text="Abandonner" variant="outline" onPress={() => { if (mission) abandonGameMission(mission.id); setConfirm(false); setMessage('Mission abandonnée.'); }} /></View>}><Text style={s.body}>Cette mission ne sera plus active pour la période en cours. Aucun XP ne sera attribué.</Text></AppModal>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.onboardingBackground }, safe: { flex: 1 }, frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12 }, title: { fontFamily: fontFamily.bold, fontSize: 18, color: colors.text, textAlign: 'center' }, content: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 28 } });
