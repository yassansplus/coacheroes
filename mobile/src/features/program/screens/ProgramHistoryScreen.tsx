import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel, getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { Symbol } from '@/components/Symbol';
import { loadProgramBlock, loadProgramBlocks, type BlockReview } from '@/services/trainingProgram';
import { colors } from '@/theme/colors';
import { BlockSummary } from '../components/BlockSummary';
import { styles as s } from '../components/styles';

type Item = { id: string; title: string; startedAt: string; weeks: number; status?: 'completed' | 'active'; replaced?: boolean };
export function ProgramHistoryScreen({ onBack }: { onBack: () => void }) {
  useLanguage();
  const [items, setItems] = useState<Item[] | null>(null);
  const [selected, setSelected] = useState<BlockReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; void loadProgramBlocks().then(data => { if (alive) setItems(data); }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, []);
  const open = async (id: string) => { setError(null); try { setSelected(await loadProgramBlock(id)); } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger ce bloc.'); } };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><View style={{ flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18 }}>
    <AppHeader title={selected ? 'Mon ancien programme' : 'Mes programmes'} leading={<IconButton accessibilityLabel={localizeLabel("Retour")} icon={<Symbol name="back" />} onPress={() => selected ? setSelected(null) : onBack()} />} />
    <ScrollView contentContainerStyle={{ gap: 14, paddingVertical: 16, paddingBottom: 40 }}>
      {error ? <ErrorState title="Historique indisponible" description={error} onRetry={() => { if (selected) void open(selected.summary.id); else { setItems(null); void loadProgramBlocks().then(setItems).catch(e => setError(e.message)); } }} /> : null}
      {!items && !error ? <LoadingState label="Chargement de tes programmes" /> : null}
      {selected ? <BlockSummary summary={selected.summary} /> : items?.map((item, index) => <Button key={item.id} text={t("{p0} · {p1} semaines · {p2}{p3}", { p0: item.title, p1: item.weeks, p2: new Date(item.startedAt).toLocaleDateString(getLocale()), p3: item.replaced ? ` · ${t('Terminé · remplacé')}` : item.status === 'completed' ? ` · ${t('Terminé')}` : index === 0 ? ' · dernier bloc' : '' })}
        variant="secondary" onPress={() => void open(item.id)} />)}
      {items?.length === 0 ? <Text style={s.body}>Aucun programme archivé pour le moment.</Text> : null}
    </ScrollView>
  </View></SafeAreaView>;
}
