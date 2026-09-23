import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '@/components/AppModal';
import { AppNavbar } from '@/components/AppNavbar';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';
import { Dashboard } from '../components/Dashboard';
import { MeasurementsProgress, WeightProgress } from '../components/BodyProgress';
import { angleItems, ComparePhotos, initialPhotos, PhotoGallery } from '../components/Photos';
import { Attendance, BoxingProgress, StrengthProgress } from '../components/SportsProgress';
import { Row } from '../components/UI';
import { s } from '../components/styles';
import { boxingTests, dateLabel, dayKey, exercises, measureLabels, measurements, number, referenceDate, sessions, weights } from '../data';
import type { Angle, BoxingTest, Measurement, MeasureKey, ProgressPage, ProgressPhoto, Session } from '../types';

// Demo state survives route changes, but never leaves this app session.
let snapshot = { weights, measures: measurements, photos: initialPhotos, tests: boxingTests };
type Sheet = 'weight' | 'measurements' | 'photo' | 'test' | 'history' | 'period' | 'exercise' | 'before' | 'after' | null;
const titles: Record<ProgressPage, string> = { home: 'Progression', weight: 'Poids', measurements: 'Mensurations', photos: 'Photos', compare: 'Comparer', strength: 'Progression en force', boxing: 'Boxe', attendance: 'Assiduité' };
const sorted = <T extends { date: string }>(items: T[]) => items.slice().sort((a, b) => a.date.localeCompare(b.date));
const numeric = (value: string) => Number(value.trim().replace(',', '.'));

export function ProgressionScreen({ onHome, onToday, onProgram, onCoach, onProfile, onExit }: { onHome: () => void; onToday: () => void; onProgram: () => void; onCoach: () => void; onProfile: () => void; onExit?: () => void }) {
  const [data, setData] = useState(snapshot);
  const [page, setPage] = useState<ProgressPage>('home');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [period, setPeriod] = useState(365);
  const [angle, setAngle] = useState<Angle>('face');
  const [selectedPhoto, setSelectedPhoto] = useState<string>();
  const [exercise, setExercise] = useState('bench');
  const [before, setBefore] = useState(initialPhotos[0].id);
  const [after, setAfter] = useState(initialPhotos[1].id);
  const [deleting, setDeleting] = useState<{ id: string; angle: Angle }>();
  const [history, setHistory] = useState({ title: '', lines: [] as string[] });
  const [date, setDate] = useState(referenceDate);
  const [calendar, setCalendar] = useState(false);
  const [value, setValue] = useState('');
  const [draftMeasures, setDraftMeasures] = useState<Record<MeasureKey, string>>({ waist: '', chest: '', arm: '', thigh: '' });
  const [draftPhotos, setDraftPhotos] = useState<Partial<Record<Angle, string>>>({});
  const [kind, setKind] = useState<BoxingTest['kind']>('Sac');
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { snapshot = data; }, [data]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page]);
  function back() { if (sheet) setSheet(null); else if (page === 'home') (onExit ?? onHome)(); else setPage(page === 'compare' ? 'photos' : 'home'); }
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => subscription.remove(); }, [page, sheet, onHome]);
  function showHistory(title: string, lines: string[]) { setHistory({ title, lines }); setSheet('history'); }
  function showSessions(title: string, items: Session[]) { showHistory(title, items.map(item => `${dateLabel(item.date)} · ${item.sport === 'rest' ? 'Repos planifié' : item.sport === 'boxing' ? 'Boxe' : 'Musculation'} · ${item.missed ? 'Manquée' : item.sport === 'rest' ? 'Récupération' : `${item.minutes} min${item.rounds ? ` · ${item.rounds} rounds` : ''}`}`)); }
  function measureHistory() { showHistory('Historique des mensurations', data.measures.slice().reverse().map(item => `${dateLabel(item.date)}\n${Object.entries(measureLabels).map(([key, label]) => `${label} : ${number(item[key as MeasureKey])} cm`).join(' · ')}`)); }
  function openForm(next: Sheet) {
    setDate(dayKey(new Date())); setCalendar(false); setError(''); setValue(next === 'weight' ? String(data.weights[data.weights.length - 1].value) : '');
    const last = data.measures[data.measures.length - 1];
    setDraftMeasures({ waist: String(last.waist), chest: String(last.chest), arm: String(last.arm), thigh: String(last.thigh) });
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
  function save() {
    if (sheet === 'weight') {
      const amount = numeric(value);
      if (!Number.isFinite(amount) || amount < 20 || amount > 300) { setError('Saisis un poids entre 20 et 300 kg.'); return; }
      setData(current => ({ ...current, weights: sorted([...current.weights.filter(item => item.date !== date), { date, value: amount }]) }));
    } else if (sheet === 'measurements') {
      const entry: Measurement = { date, waist: numeric(draftMeasures.waist), chest: numeric(draftMeasures.chest), arm: numeric(draftMeasures.arm), thigh: numeric(draftMeasures.thigh) };
      if (Object.keys(measureLabels).some(key => !Number.isFinite(entry[key as MeasureKey]) || entry[key as MeasureKey] <= 0 || entry[key as MeasureKey] > 300)) { setError('Renseigne chaque mesure entre 0 et 300 cm.'); return; }
      setData(current => ({ ...current, measures: sorted([...current.measures.filter(item => item.date !== date), entry]) }));
    } else if (sheet === 'photo') {
      const images: ProgressPhoto['images'] = {};
      for (const key of ['face', 'profile', 'back'] as const) if (draftPhotos[key]) images[key] = { uri: draftPhotos[key] };
      if (!Object.keys(images).length) { setError('Ajoute au moins une photo.'); return; }
      const existingPhoto = data.photos.find(item => item.date === date && !item.example);
      const photoId = existingPhoto?.id ?? `photo-${Date.now()}`;
      const nextAngle = (['face', 'profile', 'back'] as const).find(key => images[key])!;
      setData(current => {
        const existing = current.photos.find(item => item.date === date && !item.example);
        const photo: ProgressPhoto = { id: photoId, date, images: { ...existing?.images, ...images }, weight: current.weights.find(item => item.date === date)?.value ?? existing?.weight, waist: current.measures.find(item => item.date === date)?.waist ?? existing?.waist };
        return { ...current, photos: sorted([...current.photos.filter(item => item.id !== photo.id), photo]) };
      });
      setSelectedPhoto(photoId); setAngle(nextAngle); setPage('photos');
    } else if (sheet === 'test') {
      const amount = numeric(value);
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) { setError('Saisis un nombre entier positif.'); return; }
      setData(current => ({ ...current, tests: sorted([...current.tests, { id: `test-${Date.now()}`, date, kind, value: amount }]) }));
    }
    setSheet(null);
  }
  const form = sheet === 'weight' || sheet === 'measurements' || sheet === 'photo' || sheet === 'test';
  const sheetTitle = sheet === 'history' ? history.title : sheet === 'weight' ? 'Ajouter une pesée' : sheet === 'measurements' ? 'Ajouter des mesures' : sheet === 'photo' ? 'Ajouter des photos' : sheet === 'test' ? 'Ajouter un test' : sheet === 'period' ? 'Période affichée' : sheet === 'exercise' ? 'Choisir un exercice' : `Photo ${sheet === 'before' ? 'avant' : 'après'}`;
  return <View style={s.screen}><ScreenBackdrop /><SafeAreaView style={{ flex: 1 }}><View style={[s.frame, { flex: 1 }]}>
    {page === 'home' && onExit ? <View style={s.header}><IconButton accessibilityLabel="Retour aux records" icon={<Symbol name="back" />} onPress={onExit} /><Text style={s.heading}>Progression</Text></View> : null}
    {page !== 'home' ? <View style={s.header}><IconButton accessibilityLabel="Retour" icon={<Symbol name={page === 'compare' ? 'close' : 'back'} />} onPress={back} /><Text style={[s.heading, s.grow, { textAlign: 'center' }]}>{titles[page]}</Text>{page === 'measurements' ? <IconButton accessibilityLabel="Historique des mesures" icon={<Symbol name="history" />} onPress={measureHistory} /> : page === 'photos' ? <IconButton accessibilityLabel="Confidentialité des photos" icon={<Symbol name="lock" />} onPress={() => showHistory('Photos privées', ['Aucune photo n’est envoyée à un serveur. Les ajouts sont conservés uniquement en mémoire pendant cette session.'])} /> : <View style={{ width: 40 }} />}</View> : null}
    <ScrollView ref={scroll} contentContainerStyle={[s.content, page === 'home' && { paddingTop: 18 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {page === 'home' ? <Dashboard weights={data.weights} measures={data.measures} sessions={sessions} onPage={setPage} onStrength={id => { setExercise(id); setPage('strength'); }} period={period} onPeriod={() => setSheet('period')} onSleep={() => showHistory('Sommeil moyen', ['6 h 12 par nuit · +38 min sur la période.', 'Données de démonstration. Le suivi quotidien alimentera cette carte lorsque le backend sera connecté.'])} photoCount={data.photos.length} /> : null}
      {page === 'weight' ? <WeightProgress entries={data.weights} onAdd={() => openForm('weight')} onHistory={() => showHistory('Historique des pesées', data.weights.slice().reverse().map(item => `${dateLabel(item.date)} · ${number(item.value)} kg`))} /> : null}
      {page === 'measurements' ? <MeasurementsProgress entries={data.measures} onAdd={() => openForm('measurements')} onHistory={measureHistory} /> : null}
      {page === 'photos' ? <PhotoGallery photos={data.photos} angle={angle} selected={selectedPhoto} onSelect={setSelectedPhoto} onAngle={setAngle} onAdd={() => openForm('photo')} onCompare={compare} onDelete={id => setDeleting({ id, angle })} /> : null}
      {page === 'compare' ? <ComparePhotos photos={data.photos} angle={angle} onAngle={changeComparisonAngle} beforeId={before} afterId={after} onChoose={side => { setError(''); setSheet(side); }} onClose={() => setPage('photos')} /> : null}
      {page === 'strength' ? <StrengthProgress exerciseId={exercise} onExercise={() => setSheet('exercise')} onHistory={showHistory} /> : null}
      {page === 'boxing' ? <BoxingProgress sessions={sessions} tests={data.tests} onAdd={() => openForm('test')} onSessions={() => showSessions('Séances de boxe', sessions.filter(item => item.sport === 'boxing').reverse())} onHistory={showHistory} /> : null}
      {page === 'attendance' ? <Attendance sessions={sessions} onSessions={showSessions} /> : null}
      {page === 'home' ? <Text style={[s.small, { textAlign: 'center' }]}>Aperçu avec données d’exemple · saisies conservées pendant la session</Text> : null}
      {page === 'home' ? <Button text="Retour à l’accueil" variant="secondary" onPress={onHome} /> : null}
    </ScrollView>
    {page === 'home' ? <AppNavbar includeCoach value="progress" onChange={tab => { if (tab === 'today') onToday(); else if (tab === 'program') onProgram(); else if (tab === 'coach') onCoach(); else if (tab === 'profile') onProfile(); }} /> : null}
  </View></SafeAreaView>
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheetTitle} style={{ maxHeight: '90%' }} footer={form ? <Button text="Enregistrer" onPress={save} hapticFeedback /> : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
        {form ? <><Button text={`${dateLabel(date)} ⌄`} variant="outline" onPress={() => setCalendar(!calendar)} />{calendar ? <Calendar selectedDate={new Date(`${date}T12:00:00`)} initialMonth={new Date(`${date}T12:00:00`)} maximumDate={new Date()} onSelectDate={day => { setDate(dayKey(day)); setCalendar(false); }} /> : null}</> : null}
        {sheet === 'weight' ? <TextField label="Poids (kg)" value={value} onChangeText={setValue} keyboardType="decimal-pad" /> : null}
        {sheet === 'measurements' ? (Object.keys(measureLabels) as MeasureKey[]).map(key => <TextField key={key} label={`${measureLabels[key]} (cm)`} value={draftMeasures[key]} onChangeText={text => setDraftMeasures(current => ({ ...current, [key]: text }))} keyboardType="decimal-pad" required />) : null}
        {sheet === 'photo' ? <><Text style={s.body}>Ajoute un ou plusieurs angles. Pour faciliter la comparaison, conserve la même posture et le même éclairage.</Text><View style={{ gap: 16 }}>{angleItems.map(item => <PhotoPicker inlineActions key={item.value} label={item.label} value={draftPhotos[item.value as Angle]} onChange={uri => setDraftPhotos(current => ({ ...current, [item.value]: uri }))} />)}</View></> : null}
        {sheet === 'test' ? <><TabSelector items={['Sac', 'Corde', 'Sparring'].map(item => ({ value: item, label: item }))} value={kind} onChange={next => { setKind(next as BoxingTest['kind']); setValue(''); }} /><TextField label={kind === 'Sac' ? 'Nombre de frappes en 3 min' : kind === 'Corde' ? 'Durée sans interruption (secondes)' : 'Nombre de rounds'} value={value} onChangeText={setValue} keyboardType="number-pad" /></> : null}
        {form && error ? <Text accessibilityRole="alert" style={[s.body, { color: colors.energy }]}>{error}</Text> : null}
        {sheet === 'history' ? history.lines.length ? history.lines.map((line, index) => <View key={index} style={s.tinted}><Text style={s.body}>{line}</Text></View>) : <EmptyState title="Aucune donnée sur cette période" /> : null}
        {sheet === 'period' ? [30, 90, 365].map(item => <Row key={item} title={item === 365 ? 'Depuis le début' : `${item} derniers jours`} onPress={() => { setPeriod(item); setSheet(null); }} />) : null}
        {sheet === 'exercise' ? exercises.map(item => <Row key={item.id} title={item.title} onPress={() => { setExercise(item.id); setSheet(null); }} />) : null}
        {sheet === 'before' || sheet === 'after' ? sorted(data.photos.filter(item => item.images[angle])).map(item => <Row key={item.id} title={dateLabel(item.date)} subtitle={item.example ? 'Photo d’exemple' : undefined} onPress={() => {
          const other = data.photos.find(photo => photo.id === (sheet === 'before' ? after : before));
          if (!other) { if (sheet === 'before') setBefore(item.id); else setAfter(item.id); setSheet(null); }
          else if (other.id !== item.id && other.date !== item.date) { const pair = sorted([item, other]); setBefore(pair[0].id); setAfter(pair[1].id); setSheet(null); }
          else setError('Choisis une date différente de l’autre photo.');
        }} />) : null}
        {(sheet === 'before' || sheet === 'after') && error ? <Text style={s.body}>{error}</Text> : null}
      </ScrollView>
    </BottomSheet>
    <AppModal visible={!!deleting} onClose={() => setDeleting(undefined)} title="Retirer cette vue ?" actions={<View style={{ gap: 10 }}><Button text="Conserver" onPress={() => setDeleting(undefined)} /><Button text="Retirer" variant="outline" onPress={() => { setData(current => ({ ...current, photos: current.photos.flatMap(item => {
        if (item.id !== deleting?.id) return [item];
        const images = { ...item.images }; delete images[deleting.angle];
        return Object.keys(images).length ? [{ ...item, images }] : [];
      }) })); setDeleting(undefined); }} /></View>}><Text style={s.body}>Seule la vue sélectionnée sera retirée de cet aperçu. Les autres angles seront conservés. Le fichier original sur ton appareil ne sera pas supprimé.</Text></AppModal>
  </View>;
}
