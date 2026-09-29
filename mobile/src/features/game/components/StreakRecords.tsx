import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/providers/SessionProvider';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { loadPerformanceHistory } from '@/services/progression';
import { dailyDate } from '@/services/daily';
import { buildGameRecords, type GameRecord } from '../records';
import { recordDate, recordDetail, recordTitle } from '../recordLabels';
import { View } from 'react-native';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { colors } from '@/theme/colors';

import { Action, Crest, Heading, Icon, Info, Panel, Pill, Row, s } from './UI';

export function Streak({ onDay, onHistory }: { onDay: (day: Date) => void; onHistory: () => void }) {
  useLanguage();
  return <><Panel><View style={s.row}><Icon name="flame" size={104} round /><View style={[s.grow, { gap: 7 }]}><Text style={[s.big, { fontSize: 36 }]}>17 jours</Text><Text style={s.muted}>30 août – 15 septembre</Text><Pill green>● Active</Pill></View></View></Panel>
    <Panel><Calendar showAdjacentDays initialMonth={new Date(2026, 8, 1)} onSelectDate={onDay} renderDay={date => {
      const active = date >= new Date(2026, 7, 30) && date <= new Date(2026, 8, 15), rest = active && date.getMonth() === 8 && [3, 11].includes(date.getDate());
      return <View style={{ width: '100%', height: '100%', borderRadius: 11, borderWidth: active ? 0 : 1, borderColor: colors.primarySurface, backgroundColor: rest ? colors.accentSurface : active ? colors.energySurface : colors.surface, alignItems: 'center', justifyContent: 'center', gap: 3 }}><Text style={s.small}>{date.getDate()}</Text>{active ? rest ? <Icon name="moon" size={20} /> : <View style={{ backgroundColor: colors.energy, borderRadius: 12, padding: 3 }}><Symbol name="check" color="white" size={13} /></View> : null}</View>;
    }} /><View style={[s.row, { justifyContent: 'space-between', gap: 3 }]}><Text style={[s.small, { fontSize: 9 }]}>✓ Journée réalisée</Text><Text style={[s.small, { fontSize: 9 }]}>Repos planifié</Text><Text style={[s.small, { fontSize: 9 }]}>À venir</Text></View></Panel>
    <View style={[s.row, { gap: 8 }]}>{[{ label: 'Meilleure série', value: '23 jours', icon: 'trophy' as const }, { label: 'Jours respectés', value: '41 / 45', icon: 'calendar' as const }].map(item => <Card key={item.label} style={[s.row, { flex: 1, padding: 12, gap: 7 }]}><Icon name={item.icon} size={34} round /><View style={s.grow}><Text style={s.small}>{item.label}</Text><Text style={[s.title, { marginTop: 4 }]}>{item.value}</Text></View></Card>)}</View><Info>Une journée de repos prévue maintient la série.</Info><Action text="Voir le détail des journées" outline onPress={onHistory} /></>;
}
export function Records({ onRecord, onHistory }: { onRecord: (record: GameRecord) => void; onHistory: (history: GameRecord[]) => void }) {
  useLanguage();
  const { user } = useSession();
  const [filter, setFilter] = useState('all');
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<(ReturnType<typeof buildGameRecords> & { owner: string }) | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    setData(null); setError('');
    if (user) void loadPerformanceHistory(user.id).then(result => {
      if (active) setData({ ...buildGameRecords(result, dailyDate()), owner: user.id });
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Impossible de charger tes records.');
    });
    return () => { active = false; };
  }, [user?.id, attempt]));
  if (error) return <ErrorState description={error} onRetry={() => setAttempt(current => current + 1)} />;
  if (!data || data.owner !== user?.id) return <LoadingState />;
  if (!data.history.length) return <EmptyState title="Aucun record enregistré" description="Tes records apparaîtront après une séance ou un test enregistré." />;
  const list = data.records.filter(record => filter === 'all' || record.category === filter);
  const latest = data.history[0];
  const month = dailyDate().slice(0, 7);
  return <><Panel><View style={s.row}><Crest icon="trophy" gold size={78} /><View style={[s.grow, { gap: 7 }]}><Text style={s.small}>Dernier record</Text><Text translate={false} style={s.title}>{recordTitle(latest)} · {recordDetail(latest)}</Text><Text translate={false} style={s.small}>{recordDate(latest)}</Text></View></View></Panel>
    <TabSelector value={filter} onChange={setFilter} items={[{ value: 'all', label: 'Tous' }, { value: 'strength', label: 'Musculation' }, { value: 'boxing', label: 'Boxe' }]} />
    <Heading>Records personnels</Heading><Panel><View>{list.map((record, i) => <Row key={record.id} last={i === list.length - 1} onPress={() => onRecord(record)}><Icon name={record.icon} size={44} /><View style={s.grow}><Text translate={false} style={s.title}>{recordTitle(record)}</Text><Text translate={false} style={[s.small, { marginTop: 4 }]}>{recordDetail(record)}</Text></View><Symbol name="chevron" color="textMuted" size={17} /></Row>)}{!list.length ? <EmptyState title="Aucun record dans cette catégorie" /> : null}</View></Panel>
    <Heading>Statistiques</Heading><Panel><View style={s.row}><Icon name="star" size={50} /><View style={s.grow}><Text style={s.small}>Records débloqués</Text><Text style={s.big}>{data.history.length}</Text></View><Icon name="calendar" size={50} /><View style={s.grow}><Text style={s.small}>Ce mois-ci</Text><Text style={s.big}>{data.history.filter(record => record.date.startsWith(month)).length}</Text></View></View></Panel><Action text="Historique des records" outline onPress={() => onHistory(data.history)} /></>;
}
