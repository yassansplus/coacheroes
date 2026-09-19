import { Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { BodyPainSelector } from '@/components/BodyPainSelector';
import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { NumberStepper } from '@/components/NumberStepper';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { colors } from '@/theme/colors';

import { activities } from '../data';
import type { StepProps } from '../types';
import { formatMinutes } from '../utils';
import { SectionHeading, StepHeading, stepStyles as s } from './StepContent';

export function PainStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Blessures et douleurs" subtitle="Indique ce qui peut limiter tes mouvements." />
    <BodyPainSelector value={profile.pains} onChange={pains => update({ pains })} side={profile.painSide}
      onSideChange={painSide => update({ painSide })} disabled={profile.noPain} />
    <TextField label="Préciser si nécessaire" value={profile.painNotes} onChangeText={painNotes => update({ painNotes })}
      editable={!profile.noPain} maxLength={200} multiline placeholder="Ex. : douleur au genou droit lors de la course…" />
    <Text style={[s.caption, { textAlign: 'right', marginTop: -14 }]}>{profile.painNotes.length} / 200</Text>
    <Card style={s.section}><Toggle label="Aucune douleur actuellement" value={profile.noPain}
      onValueChange={noPain => update({ noPain, ...(noPain ? { pains: [], painNotes: '' } : {}) })} /></Card>
    <Banner variant="info" message="L’app ne remplace pas un avis médical." />
  </>;
}

export function DailyLifeStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Ton quotidien" subtitle="Ces informations nous aident à personnaliser ton programme." />
    <Card style={s.section}>
      <SectionHeading title="Sommeil moyen" subtitle="Combien d’heures de sommeil par nuit en moyenne ?" icon="moon" />
      <NumberStepper label="le sommeil moyen" value={profile.sleep} onChange={sleep => update({ sleep })}
        minimum={180} maximum={720} step={15} size="large" formatValue={formatMinutes} />
    </Card>
    <Card style={[s.section, { gap: 8 }]}>
      <SectionHeading title="Activité quotidienne" subtitle="Quel est ton niveau d’activité au quotidien ?" icon="walking" />
      <View style={{ gap: 7 }}>{activities.map(activity => <ChoiceCard key={activity.value} title={activity.title}
        description={activity.description} role="radio" layout="row" indicatorPosition="leading"
        selected={profile.activity === activity.value} onPress={() => update({ activity: activity.value })}
        contentStyle={{ padding: 8, borderColor: profile.activity === activity.value ? colors.primary : colors.border }}
        titleStyle={{ fontSize: 12, lineHeight: 17 }} descriptionStyle={{ fontSize: 7, lineHeight: 12, marginTop: 2 }} />)}</View>
      <View style={s.divider} />
      <SectionHeading title="Pas par jour" subtitle="Quel est ton objectif quotidien ?" icon="shoe" />
      <NumberStepper label="l’objectif de pas" value={profile.steps} onChange={steps => update({ steps })}
        minimum={1000} maximum={30000} step={500} size="large" formatValue={value => value.toLocaleString('fr-FR')} />
    </Card>
  </>;
}
