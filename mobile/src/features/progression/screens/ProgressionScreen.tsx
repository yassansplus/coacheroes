import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '@/components/AppModal';
import { AppNavbar } from '@/components/AppNavbar';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { IconButton } from '@/components/IconButton';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';
import { useSession } from '@/providers/SessionProvider';
import { loadProgression, removeProgressPhoto, saveBoxingTest, saveProgressMeasurements, saveProgressPhotos, saveProgressWeight } from '@/services/progression';
import { Dashboard } from '../components/Dashboard';
import { MeasurementsProgress, WeightProgress } from '../components/BodyProgress';
import { angleItems, ComparePhotos, PhotoGallery } from '../components/Photos';
import { Attendance, BoxingProgress, StrengthProgress } from '../components/SportsProgress';
import { Row } from '../components/UI';
import { s } from '../components/styles';
import { dateLabel, dayKey, measureLabels, number } from '../data';
import type { Angle, BoxingTest, MeasureKey, ProgressData, ProgressPage, Session } from '../types';

const emptyData = (): ProgressData => ({ startDate: null, block: null, weights: [], measures: [], photos: [], tests: [], sessions: [], exercises: [], sleep: [] });
type Sheet = 'weight' | 'measurements' | 'photo' | 'test' | 'history' | 'period' | 'exercise' | 'before' | 'after' | null;
const titles: Record<ProgressPage, string> = { home: 'Progression', weight: 'Poids', measurements: 'Mensurations', photos: 'Photos', compare: 'Comparer', strength: 'Progression en force', boxing: 'Boxe', attendance: 'Assiduité' };
const sorted = <T extends { date: string }>(items: T[]) => items.slice().sort((a, b) => a.date.localeCompare(b.date));
const numeric = (value: string) => Number(value.trim().replace(',', '.'));

export function ProgressionScreen({ onHome, onToday, onProgram, onCoach, onProfile, onExit }: { onHome: () => void; onToday: () => void; onProgram: () => void; onCoach: () => void; onProfile: () => void; onExit?: () => void }) {
  const { user } = useSession();
  const [data, setData] = useState<ProgressData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<ProgressPage>('home');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [period, setPeriod] = useState(365);
  const [angle, setAngle] = useState<Angle>('face');
  const [selectedPhoto, setSelectedPhoto] = useState<string>();
  const [exercise, setExercise] = useState('bench');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [deleting, setDeleting] = useState<{ id: string; angle: Angle }>();
  const [history, setHistory] = useState({ title: '', lines: [] as string[] });
  const [date, setDate] = useState(dayKey(new Date()));
  const [calendar, setCalendar] = useState(false);
  const [value, setValue] = useState('');
  const [draftMeasures, setDraftMeasures] = useState<Record<MeasureKey, string>>({ waist: '', chest: '', arm: '', thigh: '' });
  const [draftPhotos, setDraftPhotos] = useState<Partial<Record<Angle, string>>>({});
  const [kind, setKind] = useState<BoxingTest['kind']>('Sac');
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const refresh = useCallback(async () => {
    if (!user?.id) return null;
    try { const next = await loadProgression(user.id); setData(next); setLoadError(null); return next; }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Impossible de charger ta progression.'); return null; }
    finally { setLoading(false); }
  }, [user?.id]);
  useFocusEffect(useCallback(() => { setLoading(true); void refresh(); }, [refresh]));
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page]);
  function back() { if (sheet) setSheet(null); else if (page === 'home') (onExit ?? onHome)(); else setPage(page === 'compare' ? 'photos' : 'home'); }
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => subscription.remove(); }, [page, sheet, onHome]);
  function showHistory(title: string, lines: string[]) { setHistory({ title, lines }); setSheet('history'); }
  function showSessions(title: string, items: Session[]) { showHistory(title, items.map(item => `${dateLabel(item.date)} · ${item.sport === 'rest' ? 'Repos planifié' : item.sport === 'boxing' ? 'Boxe' : item.sport === 'strength' ? 'Musculation' : item.sport} · ${item.status === 'completed' ? `${item.minutes ?? '—'} min${item.rounds !== null ? ` · ${item.rounds} rounds` : ''}` : { missed: 'Manquée', abandoned: 'Interrompue', in_progress: 'En cours', planned: 'Prévue', rest: 'Récupération' }[item.status]}`)); }
  function measureHistory() { showHistory('Historique des mensurations', data.measures.slice().reverse().map(item => `${dateLabel(item.date)}\n${Object.entries(measureLabels).map(([key, label]) => `${label} : ${item[key as MeasureKey] === null ? '—' : `${number(item[key as MeasureKey]!)} cm`}`).join(' · ')}`)); }
  function openForm(next: Sheet) {
    setDate(dayKey(new Date())); setCalendar(false); setError(''); setValue(next === 'weight' ? String(data.weights.at(-1)?.value ?? '') : '');
    const last = data.measures.at(-1);
    setDraftMeasures({ waist: String(last?.waist ?? ''), chest: String(last?.chest ?? ''), arm: String(last?.arm ?? ''), thigh: String(last?.thigh ?? '') });
    setDraftPhotos({}); setSheet(next);
  }
  function comparisonPair(nextAngle: Angle, selectedId?: string) {
    const available = sorted(data.photos.filter(item => item.images[nextAngle]));
    const last = available.find(item => item.id === selectedId) ?? available[available.length - 1];
    const first = available.find(item => item.date !== last?.date);
    return first && last ? sorted([first, last]) : null;
  }
  function compare(selectedId?: string) {
    const pair = comparisonPair(angle, selectedId);
    if (!pair) { showHistory('Comparer deux photos', ['Ajoute deux photos du même angle à des dates différentes.']); return; }
    setBefore(pair[0].id); setAfter(pair[1].id); setPage('compare');
  }
  function changeComparisonAngle(nextAngle: Angle) {
    setAngle(nextAngle); setError('');
    const currentPair = data.photos.filter(item => (item.id === before || item.id === after) && item.images[nextAngle]);
    if (currentPair.length === 2) return;
    const pair = comparisonPair(nextAngle);
    setBefore(pair?.[0].id ?? ''); setAfter(pair?.[1].id ?? '');
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
    if (sheet === 'weight') {
      const amount = numeric(value);
      if (!Number.isFinite(amount) || amount < 30 || amount > 350) throw new Error('Saisis un poids entre 30 et 350 kg.');
      await saveProgressWeight(date, amount, data.weights.find(item => item.date === date)?.revision ?? 0);
    } else if (sheet === 'measurements') {
      const values = Object.fromEntries((Object.keys(measureLabels) as MeasureKey[]).map(key => [key, draftMeasures[key].trim() ? numeric(draftMeasures[key]) : null])) as Record<MeasureKey, number | null>;
      if (Object.values(values).every(value => value === null) || Object.values(values).some(value => value !== null && (!Number.isFinite(value) || value < 10 || value > 300))) throw new Error('Renseigne une mesure entre 10 et 300 cm.');
      await saveProgressMeasurements(date, values, data.measures.find(item => item.date === date)?.revision ?? 0);
    } else if (sheet === 'photo') {
      if (!Object.values(draftPhotos).some(Boolean)) throw new Error('Ajoute au moins une photo.');
      await saveProgressPhotos(date, draftPhotos, data.photos.find(item => item.date === date)?.revision ?? 0);
    } else if (sheet === 'test') {
      const amount = numeric(value);
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) throw new Error('Saisis un nombre entier positif.');
      await saveBoxingTest(date, kind, amount, data.tests.find(item => item.date === date && item.kind === kind)?.revision ?? 0);
    }
    const next = await refresh();
    if (!next) { setSheet(null); return; }
    if (sheet === 'photo') { setSelectedPhoto(next.photos.find(item => item.date === date)?.id); setAngle((['face', 'profile', 'back'] as const).find(key => draftPhotos[key])!); setPage('photos'); }
    setSheet(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible. Réessaie.'); }
    finally { setBusy(false); }
  }
  const form = sheet === 'weight' || sheet === 'measurements' || sheet === 'photo' || sheet === 'test';
  const sheetTitle = sheet === 'history' ? history.title : sheet === 'weight' ? 'Ajouter une pesée' : sheet === 'measurements' ? 'Ajouter des mesures' : sheet === 'photo' ? 'Ajouter des photos' : sheet === 'test' ? 'Ajouter un test' : sheet === 'period' ? 'Période affichée' : sheet === 'exercise' ? 'Choisir un exercice' : `Photo ${sheet === 'before' ? 'avant' : 'après'}`;
  return <View style={s.screen}><ScreenBackdrop /><SafeAreaView style={{ flex: 1 }}><View style={[s.frame, { flex: 1 }]}>
    {page === 'home' && onExit ? <View style={s.header}><IconButton accessibilityLabel="Retour aux records" icon={<Symbol name="back" />} onPress={onExit} /><Text style={s.heading}>Progression</Text></View> : null}
      {page !== 'home' ? <View style={s.header}><IconButton accessibilityLabel="Retour" icon={<Symbol name={page === 'compare' ? 'close' : 'back'} />} onPress={back} /><Text style={[s.heading, s.grow, { textAlign: 'center' }]}>{titles[page]}</Text>{page === 'measurements' ? <IconButton accessibilityLabel="Historique des mesures" icon={<Symbol name="history" />} onPress={measureHistory} /> : page === 'photos' ? <IconButton accessibilityLabel="Confidentialité des photos" icon={<Symbol name="lock" />} onPress={() => showHistory('Photos privées', ['Tes photos sont enregistrées dans ton compte. Elles ne sont pas envoyées à l’IA et restent accessibles à toi seul.'])} /> : <View style={{ width: 40 }} />}</View> : null}
    <ScrollView ref={scroll} contentContainerStyle={[s.content, page === 'home' && { paddingTop: 18 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {loading ? <LoadingState label="Chargement de ta progression…" /> : null}
      {loadError ? <ErrorState description={loadError} onRetry={() => void refresh()} /> : null}
      {!loading && page === 'home' ? <Dashboard data={data} onPage={setPage} onStrength={id => { setExercise(id); setPage('strength'); }} period={period} onPeriod={() => setSheet('period')} onSleep={() => showHistory('Sommeil moyen', data.sleep.slice().reverse().map(item => `${dateLabel(item.date)} · ${Math.floor(item.minutes / 60)} h ${String(item.minutes % 60).padStart(2, '0')} · qualité ${item.quality}/5`))} /> : null}
      {page === 'weight' ? <WeightProgress entries={data.weights} onAdd={() => openForm('weight')} onHistory={() => showHistory('Historique des pesées', data.weights.slice().reverse().map(item => `${dateLabel(item.date)} · ${number(item.value)} kg`))} /> : null}
      {page === 'measurements' ? <MeasurementsProgress entries={data.measures} onAdd={() => openForm('measurements')} onHistory={measureHistory} /> : null}
      {page === 'photos' ? <PhotoGallery photos={data.photos} angle={angle} selected={selectedPhoto} onSelect={setSelectedPhoto} onAngle={setAngle} onAdd={() => openForm('photo')} onCompare={compare} onDelete={id => { setError(''); setDeleting({ id, angle }); }} startDate={data.startDate} /> : null}
      {page === 'compare' ? <ComparePhotos photos={data.photos} angle={angle} onAngle={changeComparisonAngle} beforeId={before} afterId={after} onChoose={side => { setError(''); setSheet(side); }} onClose={() => setPage('photos')} /> : null}
      {page === 'strength' ? <StrengthProgress exerciseId={exercise} exercises={data.exercises} onExercise={() => setSheet('exercise')} onHistory={showHistory} /> : null}
      {page === 'boxing' ? <BoxingProgress sessions={data.sessions} tests={data.tests} onAdd={() => openForm('test')} onSessions={() => showSessions('Séances de boxe', data.sessions.filter(item => item.sport === 'boxing').reverse())} onHistory={showHistory} /> : null}
      {page === 'attendance' ? <Attendance sessions={data.sessions} onSessions={showSessions} /> : null}
      {page === 'home' ? <Text style={[s.small, { textAlign: 'center' }]}>Données de tes bilans et de tes séances enregistrées</Text> : null}
      {page === 'home' ? <Button text="Retour à l’accueil" variant="secondary" onPress={onHome} /> : null}
    </ScrollView>
    {page === 'home' ? <AppNavbar includeCoach value="progress" onChange={tab => { if (tab === 'today') onToday(); else if (tab === 'program') onProgram(); else if (tab === 'coach') onCoach(); else if (tab === 'profile') onProfile(); }} /> : null}
  </View></SafeAreaView>
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheetTitle} style={{ maxHeight: '90%' }} footer={form ? <Button text={busy ? 'Enregistrement…' : 'Enregistrer'} disabled={busy} onPress={() => void save()} hapticFeedback /> : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
        {form ? <><Button text={`${dateLabel(date)} ⌄`} variant="outline" onPress={() => setCalendar(!calendar)} />{calendar ? <Calendar selectedDate={new Date(`${date}T12:00:00`)} initialMonth={new Date(`${date}T12:00:00`)} maximumDate={new Date()} onSelectDate={day => { const key = dayKey(day); setDate(key); setCalendar(false); if (sheet === 'weight') setValue(String(data.weights.find(item => item.date === key)?.value ?? '')); if (sheet === 'measurements') { const item = data.measures.find(item => item.date === key); setDraftMeasures({ waist: String(item?.waist ?? ''), chest: String(item?.chest ?? ''), arm: String(item?.arm ?? ''), thigh: String(item?.thigh ?? '') }); } if (sheet === 'test') setValue(String(data.tests.find(item => item.date === key && item.kind === kind)?.value ?? '')); }} /> : null}</> : null}
        {sheet === 'weight' ? <TextField label="Poids (kg)" value={value} onChangeText={setValue} keyboardType="decimal-pad" /> : null}
        {sheet === 'measurements' ? (Object.keys(measureLabels) as MeasureKey[]).map(key => <TextField key={key} label={`${measureLabels[key]} (cm)`} value={draftMeasures[key]} onChangeText={text => setDraftMeasures(current => ({ ...current, [key]: text }))} keyboardType="decimal-pad" />) : null}
        {sheet === 'photo' ? <><Text style={s.body}>Ajoute un ou plusieurs angles. Pour faciliter la comparaison, conserve la même posture et le même éclairage.</Text><View style={{ gap: 16 }}>{angleItems.map(item => <PhotoPicker inlineActions key={item.value} label={item.label} value={draftPhotos[item.value as Angle]} onChange={uri => setDraftPhotos(current => ({ ...current, [item.value]: uri }))} />)}</View></> : null}
        {sheet === 'test' ? <><TabSelector items={['Sac', 'Corde', 'Sparring'].map(item => ({ value: item, label: item }))} value={kind} onChange={next => { setKind(next as BoxingTest['kind']); setValue(''); }} /><TextField label={kind === 'Sac' ? 'Nombre de frappes en 3 min' : kind === 'Corde' ? 'Durée sans interruption (secondes)' : 'Nombre de rounds'} value={value} onChangeText={setValue} keyboardType="number-pad" /></> : null}
        {form && error ? <Text accessibilityRole="alert" style={[s.body, { color: colors.energy }]}>{error}</Text> : null}
        {sheet === 'history' ? history.lines.length ? history.lines.map((line, index) => <View key={index} style={s.tinted}><Text style={s.body}>{line}</Text></View>) : <EmptyState title="Aucune donnée sur cette période" /> : null}
        {sheet === 'period' ? [30, 90, 365].map(item => <Row key={item} title={item === 365 ? 'Depuis le début' : `${item} derniers jours`} onPress={() => { setPeriod(item); setSheet(null); }} />) : null}
        {sheet === 'exercise' ? data.exercises.map(item => <Row key={item.id} title={item.title} onPress={() => { setExercise(item.id); setSheet(null); }} />) : null}
        {sheet === 'before' || sheet === 'after' ? sorted(data.photos.filter(item => item.images[angle])).map(item => <Row key={item.id} title={dateLabel(item.date)} onPress={() => {
          const other = data.photos.find(photo => photo.id === (sheet === 'before' ? after : before));
          if (!other) { if (sheet === 'before') setBefore(item.id); else setAfter(item.id); setSheet(null); }
          else if (other.id !== item.id && other.date !== item.date) { const pair = sorted([item, other]); setBefore(pair[0].id); setAfter(pair[1].id); setSheet(null); }
          else setError('Choisis une date différente de l’autre photo.');
        }} />) : null}
        {(sheet === 'before' || sheet === 'after') && error ? <Text style={s.body}>{error}</Text> : null}
      </ScrollView>
    </BottomSheet>
    <AppModal visible={!!deleting} onClose={() => setDeleting(undefined)} title="Retirer cette vue ?" actions={<View style={{ gap: 10 }}><Button text="Conserver" onPress={() => setDeleting(undefined)} /><Button text={busy ? 'Retrait…' : 'Retirer'} disabled={busy} variant="outline" onPress={() => { const item = data.photos.find(photo => photo.id === deleting?.id); if (!item || !deleting) return; setBusy(true); void removeProgressPhoto(item.date, deleting.angle, item.revision).then(() => refresh()).then(() => setDeleting(undefined)).catch(cause => setError(cause instanceof Error ? cause.message : 'Impossible de retirer la photo.')).finally(() => setBusy(false)); }} /></View>}><Text style={s.body}>Seule la vue sélectionnée sera retirée de cet aperçu. Les autres angles seront conservés. Le fichier original sur ton appareil ne sera pas supprimé.</Text>{error ? <Text style={[s.body, { color: colors.energy }]}>{error}</Text> : null}</AppModal>
  </View>;
}
