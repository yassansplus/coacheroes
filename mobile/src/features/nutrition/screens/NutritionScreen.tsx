import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { AppModal } from '@/components/AppModal';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DropdownMenu } from '@/components/DropdownMenu';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Illustration } from '@/components/Illustration';
import { NumberStepper } from '@/components/NumberStepper';
import { CameraCapture } from '@/components/CameraCapture';
import { ProgressRing } from '@/components/ProgressRing';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { Toast } from '@/components/Toast';
import { MotionEnabled } from '@/hooks/useMetricMotion';
import { feedback } from '@/utils/feedback';
import { AnimatedMetricText } from '@/components/Motion';
import { colors } from '@/theme/colors';
import { randomUUID } from 'expo-crypto';
import { analyzeNutritionMeal, deleteNutritionMeal, loadNutrition, requestNutritionMealOpinion, retryNutritionPlan, saveNutritionMeal, searchNutritionFoods, uploadNutritionPhoto, type NutritionPlan } from '@/services/nutrition';
import { LoadingState } from '@/components/LoadingState';
import { updateHomeSummary } from '@/store/homeSummary';
import { FoodEditor } from '../components/FoodEditor';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { NutritionHistory } from '../components/NutritionHistory';
import { CalorieCard, FoodIcon, FoodList, Heading, MacroCards, MealList, NutritionRow, RemainingMacros, macros, number, s } from '../components/NutritionUI';
import { addNutritionFoods, foodById, goals, momentIcons, moments, setNutritionGoals } from '../data';
import type { Ingredient, Meal, MealMoment, Nutrients } from '../types';
import { dateFromKey, localDate, remaining, saveMeal, totals } from '../utils';

type Page = 'home' | 'compose' | 'validate' | 'detail' | 'food' | 'remaining' | 'history';
const titles: Record<Page, string> = { home: 'Nutrition', compose: 'Ajouter un repas', validate: 'Valider le repas', detail: 'Détail du repas', food: 'Modifier l’aliment', remaining: 'Restant aujourd’hui', history: 'Historique alimentaire' };
const uniqueId = () => randomUUID();
const cloneMeal = (meal: Meal): Meal => ({ ...meal, items: meal.items.map(item => ({ ...item })) });

export function NutritionScreen({ onHome, initialAdd = false }: { onHome: () => void; initialAdd?: boolean }) {
  const today = localDate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [searchResults, setSearchResults] = useState<import('../types').Food[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [page, setPage] = useState<Page>(initialAdd ? 'compose' : 'home'); const [detailOrigin, setDetailOrigin] = useState<'home' | 'history'>('home');
  const openedFromHome = useRef(initialAdd);
  useEffect(() => { if (page === 'home') openedFromHome.current = false; }, [page]);
  const [draft, setDraft] = useState<Meal | null>(() => initialAdd ? { id: uniqueId(), date: today, moment: 'Midi', time: '13:10', items: [], source: 'manual', description: '' } : null); const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('text'); const [foodIndex, setFoodIndex] = useState(0);
  const [menu, setMenu] = useState(false); const [sheet, setSheet] = useState<'moment' | 'add' | 'replace' | null>(null);
  const [query, setQuery] = useState(''); const [message, setMessage] = useState('');
  const searchRun = useRef(0);
  const scannedCode = useRef<string | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'discard' | null>(null);
  const scroll = useRef<ScrollView>(null); const saved = meals.find(meal => meal.id === selectedId);
  const currentDayMeals = meals.filter(meal => meal.date === today);
  const value = totals(currentDayMeals.flatMap(meal => meal.items), foodById);
  const goalsReady = plan?.status === 'ready' && Boolean(plan.targets);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await loadNutrition();
        if (cancelled) return;
        addNutritionFoods(data.foods);
        setMeals(data.meals);
        setPlan(data.plan);
        if (data.plan?.status === 'ready' && data.plan.targets) setNutritionGoals(data.plan.targets);
      } catch (error) { if (!cancelled) setMessage(error instanceof Error ? error.message : 'Impossible de charger la nutrition.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void refresh();
    const timer = setInterval(() => { if (plan?.status !== 'ready') void refresh(); }, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [plan?.status]);
  useEffect(() => {
    if (sheet !== 'add' && sheet !== 'replace') return;
    const run = ++searchRun.current;
    const remote = scannedCode.current === query;
    scannedCode.current = null;
    setSearchLoading(true);
    const timer = setTimeout(() => { void searchNutritionFoods(query, remote).then(values => {
      if (run !== searchRun.current) return; addNutritionFoods(values); setSearchResults(values);
    }).catch(() => { if (run === searchRun.current) setSearchResults([]); })
      .finally(() => { if (run === searchRun.current) setSearchLoading(false); }); }, 300);
    return () => { searchRun.current++; clearTimeout(timer); };
  }, [sheet, query]);
  const searchRemote = () => {
    if (query.trim().length < 3) return;
    const run = ++searchRun.current;
    setSearchLoading(true);
    Keyboard.dismiss();
    void searchNutritionFoods(query, true).then(values => {
      if (run !== searchRun.current) return;
      addNutritionFoods(values); setSearchResults(values);
    }).catch(error => { if (run === searchRun.current) setMessage(error instanceof Error ? error.message : 'Recherche indisponible.'); })
      .finally(() => { if (run === searchRun.current) setSearchLoading(false); });
  };
  useEffect(() => { updateHomeSummary({ calories: value.calories, protein: value.protein,
    calorieGoal: goalsReady ? goals.calories : null, proteinGoal: goalsReady ? goals.protein : null }); }, [value.calories, value.protein, goalsReady, plan?.programRunId]);
  const closeToast = useCallback(() => setMessage(''), []);
  const discardMeal = () => {
    setDraft(null);
    if (openedFromHome.current) onHome(); else setPage('home');
  };
  const openMeal = (meal: Meal, origin: 'home' | 'history') => { setSelectedId(meal.id); setDetailOrigin(origin); setPage('detail'); };
  const start = (moment: MealMoment = 'Midi') => {
    setDraft({ id: uniqueId(), date: today, moment, time: moment === 'Soir' ? '20:30' : '13:10', items: [], source: 'manual', description: '' }); setTab('text'); setPage('compose');
  };
  const back = () => {
    if (working) return;
    Keyboard.dismiss();
    if (menu) { setMenu(false); return; }
    if (sheet) { setSheet(null); return; }
    if (page === 'home') { onHome(); return; }
    if (page === 'food') { setPage('validate'); return; }
    if (page === 'compose' || page === 'validate') { setConfirm('discard'); return; }
    setPage(page === 'detail' ? detailOrigin : 'home');
  };
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page]);
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => listener.remove(); });
  const updateDraft = (patch: Partial<Meal>) => setDraft(current => current ? { ...current, ...patch } : current);
  function editFood(index: number, meal?: Meal) { if (meal) setDraft(cloneMeal(meal)); setFoodIndex(index); setPage('food'); }
  async function commit() {
    if (!draft?.items.length) return;
    setWorking(true);
    try {
      const saved = await saveNutritionMeal(draft, uniqueId());
      feedback('success'); setMeals(current => saveMeal(current, saved)); setDraft(null); setSelectedId(saved.id); setDetailOrigin('home'); setPage('detail'); setMessage('Repas enregistré dans ton journal.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible d’enregistrer ce repas.'); }
    finally { setWorking(false); }
  }
  async function askCoach(id: string) {
    setWorking(true);
    try {
      const meal = await requestNutritionMealOpinion(id);
      setMeals(current => saveMeal(current, meal));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Le coach est indisponible. Réessaie.'); }
    finally { setWorking(false); }
  }
  function selectFood(foodId: string) {
    if (!draft) return;
    const item: Ingredient = { id: uniqueId(), foodId, amount: foodById[foodId].portion };
    const items = sheet === 'replace' ? draft.items.map((old, index) => index === foodIndex ? { ...item, id: old.id } : old) : [...draft.items, item];
    updateDraft({ items }); setFoodIndex(sheet === 'replace' ? foodIndex : items.length - 1); setSheet(null); setPage('food');
  }
  function openFoodSearch(mode: 'add' | 'replace') { setQuery(''); setSearchResults([]); setSearchLoading(true); setScanning(false); setSheet(mode); }
  async function analyze() {
    if (!draft) return;
    setWorking(true);
    try {
      const source = tab === 'photo' ? 'photo' : 'text';
      const photoId = source === 'photo' && draft.photo ? await uploadNutritionPhoto(draft.photo) : undefined;
      const result = await analyzeNutritionMeal(source, draft.description ?? '', photoId);
      addNutritionFoods(result.foods);
      if (!result.items.length) { setMessage(result.clarificationQuestion ?? 'Aucun aliment fiable trouvé. Essaie une autre description ou ajoute-le manuellement.'); return; }
      updateDraft({ items: result.items, source, photoId }); setPage('validate');
      if (result.unresolved.length) setMessage(`À vérifier ou ajouter : ${result.unresolved.join(', ')}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Analyse indisponible. Réessaie.'); }
    finally { setWorking(false); }
  }
  const hour = Number(draft?.time.split(':')[0] ?? 13); const minute = Number(draft?.time.split(':')[1] ?? 10);
  const momentPicker = draft ? <View style={{ gap: 14 }}><View style={[s.row, { gap: 6 }]}>{moments.map(moment => <Button key={moment} text={moment} variant={draft.moment === moment ? 'primary' : 'secondary'} containerStyle={{ flex: 1, minWidth: 0 }} style={{ paddingHorizontal: 2, minWidth: 0 }} textStyle={{ fontSize: 10 }} onPress={() => updateDraft({ moment })} />)}</View><View style={s.row}><View style={{ flex: 1 }}><Text style={s.muted}>Heures</Text><NumberStepper label="les heures" value={hour} minimum={0} maximum={23} onChange={value => updateDraft({ time: `${String(value).padStart(2, '0')}:${String(minute).padStart(2, '0')}` })} /></View><View style={{ flex: 1 }}><Text style={s.muted}>Minutes</Text><NumberStepper label="les minutes" value={minute} minimum={0} maximum={59} onChange={value => updateDraft({ time: `${String(hour).padStart(2, '0')}:${String(value).padStart(2, '0')}` })} /></View></View></View> : null;

  return <SafeAreaView style={s.screen}><ScreenBackdrop /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[s.header, { flex: 1, paddingHorizontal: 0 }]}>
      <AppHeader style={{ paddingHorizontal: 18 }} title={titles[page]} subtitle={page === 'home' ? `Aujourd’hui · ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : undefined} leading={<IconButton accessibilityLabel="Retour" icon={<Symbol name={page === 'compose' || page === 'food' ? 'close' : 'back'} />} onPress={back} />} trailing={page === 'home' || page === 'detail' ? <IconButton accessibilityLabel="Options Nutrition" icon={<Symbol name="more" />} onPress={() => setMenu(!menu)} /> : undefined} />
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.body}>
        {loading && page === 'home' ? <LoadingState label="Chargement de ta nutrition…" /> : null}
        {!loading && page === 'home' ? <>
          <CalorieCard value={value} target={goalsReady ? goals.calories : undefined}>{goalsReady ? <View style={s.badge}><Text style={[s.muted, { color: colors.energy }]}>{value.calories > goals.calories ? `${number(value.calories - goals.calories)} kcal au-dessus de l’objectif` : `${remaining(value.calories, goals.calories)} kcal restantes`}</Text></View> : null}</CalorieCard>
          {goalsReady ? <><MacroCards value={value} /><Card style={s.card}><View style={s.row}><FoodIcon name="brain" /><Text style={[s.muted, { flex: 1 }]}>{plan.targets?.coachNote}</Text></View></Card></> : <Card style={s.card}><Text style={s.muted}>{plan?.status === 'failed' ? 'Ton objectif nutritionnel n’a pas pu être préparé.' : 'Ton objectif nutritionnel se prépare avec ton programme.'}</Text>{plan?.status === 'failed' ? <Button text="Réessayer" variant="outline" onPress={() => { void retryNutritionPlan().then(() => setPlan(current => current ? { ...current, status: 'queued' } : current)).catch(error => setMessage(error instanceof Error ? error.message : 'Réessaie plus tard.')); }} /> : null}</Card>}<Heading>Repas</Heading>
          {currentDayMeals.length ? <MealList meals={currentDayMeals} onSelect={meal => openMeal(meal, 'home')} /> : <EmptyState title="Ton journal commence ici" description="Ajoute ton premier repas de la journée." />}
          <View style={s.actions}><Button leading={<Symbol name="plus" color="white" />} text="Ajouter un repas" hapticFeedback="light" onPress={() => start()} />{goalsReady ? <Button text="Voir les calories restantes" variant="outline" onPress={() => setPage('remaining')} /> : null}</View>
        </> : null}
        {page === 'compose' && draft ? <>
          <TabSelector value={tab} onChange={setTab} items={[{ label: 'Texte', value: 'text' }, { label: 'Photo', value: 'photo' }]} />
          {tab === 'text' ? <><Text style={s.hero}>Décris ton repas</Text><TextField accessibilityLabel="Description du repas" placeholder="Poulet braisé, environ 250 g de riz, un peu de sauce et un Coca Zéro." value={draft.description ?? ''} onChangeText={description => updateDraft({ description })} multiline fieldStyle={{ borderRadius: 24, borderWidth: 0, padding: 18, alignItems: 'flex-start' }} inputStyle={{ minHeight: 180, fontSize: 17, lineHeight: 26 }} /><Heading>Repas</Heading><View style={[s.row, { gap: 7 }]}>{moments.map(moment => <Button key={moment} variant="outline" text={moment} backgroundColor={draft.moment === moment ? colors.accentSurface : colors.surface} textColor={draft.moment === moment ? colors.primary : colors.text} containerStyle={{ flex: 1, minWidth: 0 }} style={{ paddingHorizontal: 1, minWidth: 0, flexDirection: 'column', gap: 8, borderColor: draft.moment === moment ? colors.accent : colors.surface }} textStyle={{ fontSize: 10 }} leading={<Illustration name={momentIcons[moment]} size={30} />} onPress={() => updateDraft({ moment })} />)}</View><Heading>Heure <Text style={s.muted}>(optionnel)</Text></Heading><Card style={s.list}><NutritionRow last title={draft.time} icon={<Symbol name="clock" color="primary" />} onPress={() => setSheet('moment')} /></Card></> : <><CameraCapture label="Place le repas dans le cadre" value={draft.photo} onChange={photo => updateDraft({ photo })} /><Text style={s.muted}>Prends une photo ou choisis-en une dans ta galerie.</Text></>}
          <View style={[s.actions, { marginTop: 20 }]}><Button text={tab === 'photo' ? 'Utiliser cette photo' : 'Analyser le repas'} disabled={working || (tab === 'photo' ? !draft.photo : !draft.description?.trim())} onPress={() => { Keyboard.dismiss(); void analyze(); }} /><Button text="Ajouter les aliments manuellement" variant="outline" disabled={working} onPress={() => { updateDraft({ source: 'manual' }); setPage('validate'); }} /><Button text="Annuler" variant="outline" onPress={back} /></View>
        </> : null}
        {page === 'validate' && draft ? <>
          <CalorieCard value={totals(draft.items, foodById)} label="Estimation du repas" /><Heading>Composition</Heading>
          <FoodList items={draft.items} onSelect={index => editFood(index)} footer={<Button leading={<Symbol name="plus" color="primary" />} text="Ajouter un aliment" variant="outline" textColor={colors.primary} onPress={() => openFoodSearch('add')} />} />
          <Heading>Moment du repas</Heading><Card style={s.list}><NutritionRow last title={draft.moment} subtitle={draft.time} icon={<FoodIcon name="cutlery" />} onPress={() => setSheet('moment')} /></Card>
          <Button text={meals.some(meal => meal.id === draft.id) ? 'Enregistrer les modifications' : 'Ajouter au journal'} leading={<Symbol name="plus" color="white" />} disabled={!draft.items.length || working} hapticFeedback="light" onPress={() => void commit()} />
          <Button text="Recalculer" variant="outline" onPress={() => { updateDraft({ items: draft.items.map(item => ({ ...item })) }); setMessage('Totaux recalculés avec tes quantités corrigées.'); }} />
        </> : null}
        {page === 'food' && draft?.items[foodIndex] ? <FoodEditor key={`${draft.items[foodIndex].id}-${draft.items[foodIndex].foodId}`} initial={draft.items[foodIndex]} moment={draft.moment} onSave={item => { updateDraft({ items: draft.items.map((old, index) => index === foodIndex ? item : old) }); setPage('validate'); }} onRemove={() => { updateDraft({ items: draft.items.filter((_, index) => index !== foodIndex) }); setPage('validate'); }} onReplace={() => openFoodSearch('replace')} /> : null}
        {page === 'detail' && saved ? <>
          <View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1 }}><Heading>{saved.moment === 'Midi' ? 'Déjeuner' : saved.moment === 'Soir' ? 'Dîner' : saved.moment}</Heading><Text style={s.muted}>{saved.date === today ? 'Aujourd’hui' : dateFromKey(saved.date).toLocaleDateString('fr-FR')} · {saved.time}</Text></View><IconButton accessibilityLabel="Modifier le repas" icon={<Symbol name="edit" color="primary" size={20} />} variant="outline" size={38} onPress={() => { setDraft(cloneMeal(saved)); setPage('validate'); }} /></View>
          <CalorieCard value={totals(saved.items, foodById)} />
          <Card style={[s.card, { gap: 12 }]}><View style={s.row}><FoodIcon name="brain" /><Text style={[s.muted, { flex: 1 }]}>{saved.coachOpinion?.text ?? 'Un regard rapide sur ce repas et ton objectif.'}</Text></View>{!saved.coachOpinion ? working ? <LoadingState label="Ton coach regarde ton journal…" /> : <Button text="Demander l’avis au coach" variant="secondary" backgroundColor={colors.primarySurface} textColor={colors.primary} onPress={() => void askCoach(saved.id)} /> : null}</Card>
          <Heading>Aliments</Heading><FoodList items={saved.items} onSelect={index => editFood(index, saved)} />
        </> : null}
        {page === 'remaining' && goalsReady ? <>
          <Card style={s.card}><View style={s.row}><ProgressRing size={96} strokeWidth={9} progress={value.calories / goals.calories * 100} color={colors.energy} trackColor={colors.energySurface}><Illustration name="flame" size={42} /></ProgressRing><View style={{ flex: 1 }}><Text style={s.big}><AnimatedMetricText value={remaining(value.calories, goals.calories)} /><Text style={s.calorieUnit}> kcal</Text></Text><Text style={s.heading}>disponibles</Text><Text style={s.small}>{number(value.calories)} / {number(goals.calories)} kcal consommées</Text></View></View></Card>
          <Heading>Macros restantes</Heading><RemainingMacros value={value} />
          <Card style={s.card}><Heading>Bilan</Heading><View style={s.row}><View style={{ flex: 1.7 }} />{['Objectif', 'Consommé', 'Restant'].map(label => <Text key={label} style={[s.small, { flex: 1, textAlign: 'right' }]}>{label}</Text>)}</View>{[{ key: 'calories', label: 'Calories', color: colors.energy, icon: 'flame', background: colors.energySurface }, ...macros].map(metric => { const key = metric.key as keyof Nutrients; return <View key={key} style={[s.row, { gap: 4 }]}><View style={{ flex: 1.7, flexDirection: 'row', alignItems: 'center', gap: 5 }}><FoodIcon name={metric.icon} background={metric.background} size={24} /><Text style={[s.small, { flexShrink: 1 }]}>{metric.label}</Text></View>{[goals[key], value[key], remaining(value[key], goals[key])].map((amount, index) => <Text key={index} style={[s.small, { flex: 1, textAlign: 'right', color: index === 2 ? metric.color : colors.textSecondary }]}>{number(amount)}{key === 'calories' ? '' : ' g'}</Text>)}</View>; })}</Card>
          <Card style={s.list}><NutritionRow last title="Budget pour le dîner" subtitle={`${remaining(value.calories, goals.calories)} kcal`} icon={<FoodIcon name="cutlery" />} onPress={() => start('Soir')} /></Card>
          <Button text="Ajouter le dîner" leading={<Symbol name="plus" color="white" />} onPress={() => start('Soir')} /><Button text="Retour à Nutrition" variant="outline" onPress={() => setPage('home')} />
        </> : null}
        <MotionEnabled.Provider value={page === 'history'}><View style={page === 'history' ? undefined : { display: 'none' }}><NutritionHistory meals={meals} goalReady={goalsReady} notify={setMessage} onSelect={meal => openMeal(meal, 'history')} /></View></MotionEnabled.Provider>
      </ScrollView>
      <DropdownMenu visible={menu} onClose={() => setMenu(false)} items={page === 'detail' && saved ? [
        { label: 'Modifier le repas', onPress: () => { setDraft(cloneMeal(saved)); setPage('validate'); } },
        { label: 'Dupliquer le repas', onPress: () => { setDraft({ ...cloneMeal(saved), id: uniqueId(), revision: 0, date: today }); setPage('validate'); setMessage('Choisis le moment, puis ajoute la copie au journal.'); } },
        { label: 'Supprimer le repas', destructive: true, onPress: () => setConfirm('delete') },
      ] : [{ label: 'Ajouter un repas', onPress: () => start() }, { label: 'Voir l’historique', onPress: () => setPage('history') }, ...(goalsReady ? [{ label: 'Calories restantes', onPress: () => setPage('remaining') }] : [])]} />
      <Toast visible={Boolean(message)} message={message} onHide={closeToast} style={{ position: 'absolute', bottom: 12, left: 18, right: 18 }} />
    </View>
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'moment' ? 'Moment du repas' : sheet === 'replace' ? 'Remplacer l’aliment' : 'Ajouter un aliment'} style={{ maxHeight: '85%' }}>
      {sheet === 'moment' ? <View style={{ gap: 20 }}>{momentPicker}<Button text="Valider" onPress={() => setSheet(null)} /></View> : scanning ? <BarcodeScanner onScan={code => { setScanning(false); if (query === code) { searchRemote(); return; } scannedCode.current = code; setQuery(code); }} onClose={() => setScanning(false)} /> : <>
        <TextField accessibilityLabel="Rechercher un aliment" placeholder="Rechercher un aliment" value={query} onChangeText={setQuery} onSubmitEditing={searchRemote} returnKeyType="search"
          leftAccessory={<IconButton accessibilityLabel="Lancer la recherche d’aliment" icon={<Symbol name="search" size={20} color="primary" />} variant="ghost" size={36} onPress={searchRemote} />}
          rightAccessory={<IconButton accessibilityLabel="Scanner un code-barres" icon={<Symbol name="barcode" size={22} color="primary" />} variant="ghost" size={36} onPress={() => setScanning(true)} />} />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {searchLoading ? <LoadingState label="Recherche des aliments…" /> : <>
            {searchResults.map(food => <NutritionRow key={food.id} title={food.name} subtitle={`${food.portion} ${food.baseUnit}${food.provider === 'open_food_facts' ? ' · Open Food Facts' : food.provider === 'usda' ? ' · USDA FoodData Central' : ''}`} icon={<FoodIcon name={food.icon} />} onPress={() => selectFood(food.id)} />)}
            {!searchResults.length ? <EmptyState title="Aucun aliment trouvé" description="Valide la recherche ou scanne son code-barres." /> : null}
          </>}
        </ScrollView>
      </>}
    </BottomSheet>
    <AppModal visible={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'delete' ? 'Supprimer ce repas ?' : 'Quitter sans enregistrer ?'}>
      <Text style={s.muted}>{confirm === 'delete' ? 'Ce repas sera retiré du journal et les totaux seront mis à jour.' : 'Les modifications de ce repas ne seront pas ajoutées au journal.'}</Text>
      <View style={[s.actions, { marginTop: 18 }]}><Button text={confirm === 'delete' ? 'Supprimer' : 'Quitter'} disabled={working} onPress={() => { if (confirm === 'delete') { setWorking(true); void deleteNutritionMeal(selectedId).then(() => { setMeals(current => current.filter(meal => meal.id !== selectedId)); setPage(detailOrigin); setMessage('Repas supprimé.'); }).catch(error => setMessage(error instanceof Error ? error.message : 'Impossible de supprimer ce repas.')).finally(() => { setWorking(false); setConfirm(null); }); } else { discardMeal(); setConfirm(null); } }} /><Button text="Annuler" variant="outline" onPress={() => setConfirm(null)} /></View>
    </AppModal>
  </KeyboardAvoidingView></SafeAreaView>;
}
