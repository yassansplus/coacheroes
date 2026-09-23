import { Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { PhotoPicker } from '@/components/PhotoPicker';
import { TextField } from '@/components/TextField';

import type { StepProps } from '../types';
import { normalizeNumber } from '../utils';
import { SectionHeading, StepHeading, stepStyles as s } from './StepContent';

export function MeasurementsStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Ton point de départ" subtitle="Ces informations nous aident à suivre tes progrès au fil du temps." centered />
    <Card style={s.section}>
      <SectionHeading title="Photos facultatives" subtitle="Ajoute jusqu’à 3 photos pour suivre ton évolution." />
      <View style={s.row}>{([['front', 'Face'], ['side', 'Profil'], ['back', 'Dos']] as const).map(([key, label]) =>
        <PhotoPicker key={key} privacyText="Cette photo sera enregistrée dans ton compte à la validation de l’étape." label={label} value={profile.photos[key]} onChange={uri => update({ photos: { ...profile.photos, [key]: uri } })} />)}</View>
      <View style={s.row}><Illustration name="lock" size={25} /><Text style={[s.body, s.grow]}>Enregistrées dans ton compte à la validation de cette étape.</Text></View>
    </Card>
    <Card style={s.section}>
      <SectionHeading title="Mensurations" subtitle="Renseigne tes principales mensurations actuelles." />
      <View style={s.grid}>{([
        ['waist', 'Tour de taille', '86'], ['chest', 'Poitrine', '101'], ['arms', 'Bras', '34'], ['thighs', 'Cuisses', '57'],
      ] as const).map(([key, label, placeholder]) => <TextField key={key} containerStyle={[s.half, { marginTop: 9 }]} label={label}
        value={profile.measurements[key]} onChangeText={value => update({ measurements: { ...profile.measurements, [key]: value } })}
        formatValue={normalizeNumber} keyboardType="decimal-pad" maxLength={5} placeholder={placeholder}
        rightAccessory={<Text style={s.body}>cm</Text>} />)}</View>
    </Card>
  </>;
}
