import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { Motion } from '@/components/Motion';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { memberById, type Page } from '../data';
import { Activity } from '../components/Activity';
import { Challenge } from '../components/Challenge';
import { Comparison } from '../components/Comparison';
import { MemberProfile } from '../components/MemberProfile';
import { Ranking } from '../components/Ranking';
import { SquadHome } from '../components/SquadHome';

const titles = { home: 'Squad', challenge: 'Challenge collectif', ranking: 'Classement', member: 'Profil sportif', compare: 'Comparer l’assiduité', activity: 'Activité du groupe' };
export function SquadScreen({ onClose, onProgram }: { onClose: () => void; onProgram: () => void }) {
  const [stack, setStack] = useState<Page[]>([{ kind: 'home' }]);
  const [week, setWeek] = useState(0);
  const [filter, setFilter] = useState('all');
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<number[]>([0]);
  const page = stack[stack.length - 1];
  const open = (next: Page) => { if (next.kind === 'activity') setFilter('all'); positions.current[stack.length] = 0; setStack(current => [...current, next]); };
  const back = () => { if (stack.length > 1) setStack(current => current.slice(0, -1)); else onClose(); };
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => handler.remove();
  });
  useEffect(() => { const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: positions.current[stack.length - 1] ?? 0, animated: false })); return () => cancelAnimationFrame(frame); }, [stack.length]);
  return <View style={styles.root}><ScreenBackdrop /><SafeAreaView style={styles.safe}><View style={styles.frame}>
    <View style={styles.header}><IconButton accessibilityLabel="Retour" size={37} backgroundColor={colors.primarySurface} icon={<Symbol name="back" size={23} />} onPress={back} /><Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>{titles[page.kind]}</Text>{page.kind === 'home' || page.kind === 'member' ? <View accessibilityLabel={page.kind === 'home' ? 'Paramètres du groupe, bientôt disponibles' : 'Options du membre, bientôt disponibles'} style={styles.inactiveAction}><Symbol name={page.kind === 'home' ? 'settings' : 'more'} size={23} /></View> : <View style={{ width: 37 }} />}</View>
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} scrollEventThrottle={100} onScroll={event => { positions.current[stack.length - 1] = event.nativeEvent.contentOffset.y; }} contentContainerStyle={styles.content}>
      <Motion key={stack.length + page.kind} style={styles.pages}>
        {page.kind === 'home' ? <SquadHome open={open} /> : null}
        {page.kind === 'challenge' ? <Challenge onProgram={onProgram} onMember={member => open({ kind: 'member', member })} /> : null}
        {page.kind === 'ranking' ? <Ranking week={week} onWeek={setWeek} onMember={member => open({ kind: 'member', member })} /> : null}
        {page.kind === 'member' ? <MemberProfile member={memberById(page.member)} onCompare={() => open({ kind: 'compare', member: page.member === 'yassine' ? 'sofiane' : page.member })} onActivity={() => open({ kind: 'activity', member: page.member })} /> : null}
        {page.kind === 'compare' ? <Comparison member={memberById(page.member)} onMember={member => setStack(current => [...current.slice(0, -1), { kind: 'compare', member }])} /> : null}
        {page.kind === 'activity' ? <Activity member={page.member} filter={filter} onFilter={setFilter} onChallenge={() => open({ kind: 'challenge' })} /> : null}
      </Motion>
    </ScrollView>
  </View></SafeAreaView></View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.onboardingBackground }, safe: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { paddingHorizontal: 19, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, textAlign: 'center', fontFamily: fontFamily.bold, fontSize: 19, color: colors.text },
  inactiveAction: { width: 37, height: 37, borderRadius: 19, backgroundColor: colors.accentSurface, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 19, paddingBottom: 30, paddingTop: 3 }, pages: { gap: 14 },
});
