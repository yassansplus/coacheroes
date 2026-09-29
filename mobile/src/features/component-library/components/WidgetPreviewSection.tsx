import { useState } from 'react';
import { View } from 'react-native';
import { HomeWidgetPreview } from '@/components/HomeWidgetPreview';
import { PillSelector } from '@/components/PillSelector';
import { Text } from '@/components/LocalizedText';
import { widgetSnapshot } from '@/services/widgets/model';
import { useLanguage } from '@/i18n/useLanguage';
import { t } from '@/i18n/core';
import { fontFamily } from '@/theme/typography';
import { colors } from '@/theme/colors';

export function WidgetPreviewSection() {
  const language = useLanguage();
  const [size, setSize] = useState<'medium' | 'large'>('medium');
  const [state, setState] = useState<'day' | 'done' | 'empty'>('day');
  const snapshot = widgetSnapshot({ language, now: new Date(), ...(state === 'empty' ? {} : { userId: 'preview', calories: 1450, calorieGoal: 2200, completed: state === 'done' }) });
  if (state !== 'empty') {
    if (state === 'day') { snapshot.workout = t('Haut du corps'); snapshot.workoutDetail = '45 min'; }
    snapshot.news = [t('{name} a terminé une séance', { name: 'Alex' }), t('{name} a terminé une séance', { name: 'Emma' })];
  }
  return <View style={{ gap: 14 }}>
    <Text style={{ color: colors.text, fontFamily: fontFamily.bold, fontSize: 18 }}>Widget iPhone</Text>
    <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 12 }}>Un coup d’œil sur ta journée</Text>
    <PillSelector value={size} onChange={value => setSize(value === 'large' ? 'large' : 'medium')} items={[{ value: 'medium', label: 'Moyen' }, { value: 'large', label: 'Grand' }]} />
    <PillSelector value={state} onChange={value => setState(value === 'done' || value === 'empty' ? value : 'day')} items={[{ value: 'day', label: 'Aujourd’hui' }, { value: 'done', label: 'Séance terminée' }, { value: 'empty', label: 'Déconnecté' }]} />
    <HomeWidgetPreview snapshot={snapshot} large={size === 'large'} />
    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 10 }}>Aperçu avec des données d’exemple</Text>
  </View>;
}
