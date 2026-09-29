import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { View, useWindowDimensions } from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Symbol } from '@/components/Symbol';
import { useHomeSummary } from '@/store/homeSummary';
import { useTrainingProgramState } from '@/providers/TrainingProgramProvider';
import { questionGroups } from '../data';
import { CoachIcon, CoachRow } from './CoachUI';
import { s } from './styles';

export function QuickQuestions({ onAsk, onHistory, count }: { onAsk: (text: string) => void; onHistory: () => void; count: number }) {
  useLanguage();
  const compact = useWindowDimensions().width < 350;
  const summary = useHomeSummary();
  const { program } = useTrainingProgramState();
  const remaining = summary.calorieGoal === null ? null : Math.max(0, Math.round(summary.calorieGoal - summary.calories));
  return <>
    <Card style={s.card}><Text style={s.label}>Aujourd’hui</Text><View style={[s.row, { gap: 6, alignItems: 'stretch' }]}>
      {[{ icon: 'moon' as const, tone: 'purple' as const, label: 'Sommeil', value: summary.checkedIn && summary.sleepMinutes !== null ? t("{p0} h {p1}", { p0: Math.floor(summary.sleepMinutes / 60), p1: String(summary.sleepMinutes % 60).padStart(2, '0') }) : 'À renseigner' }, { icon: 'dumbbell' as const, tone: 'green' as const, label: 'Programme', value: program?.acceptedAt ? 'en cours' : 'à valider' }, { icon: 'flame' as const, tone: 'red' as const, label: 'Calories', value: remaining === null ? 'À définir' : t("{p0} restantes", { p0: remaining }) }].map(item => <View key={item.label} style={[s.grow, { gap: 5, alignItems: 'center', flexDirection: compact ? 'column' : 'row' }]}><CoachIcon icon={item.icon} tone={item.tone} size={32} /><View style={{ flex: compact ? undefined : 1 }}><Text style={[s.caption, { fontSize: 9 }, compact && s.center]}>{item.label}</Text><Text style={[s.label, { fontSize: 11 }, compact && s.center]}>{item.value}</Text></View></View>)}
    </View></Card>
    {questionGroups.map(group => <Card key={group.title} style={{ paddingHorizontal: 16, paddingVertical: 12 }}><Text style={[s.heading, { paddingBottom: 10 }]}>{group.title}</Text>{group.questions.map((question, index) => <CoachRow key={question.text} divider={index > 0} title={question.text} icon={<CoachIcon icon={question.icon} tone={question.tone} />} onPress={() => onAsk(t(question.text))} />)}</Card>)}
    <Button text={count ? t("Reprendre une conversation ({p0})", { p0: count }) : 'Mes conversations'} leading={<Symbol name="history" color="primary" />} variant="outline" onPress={onHistory} />
  </>;
}
