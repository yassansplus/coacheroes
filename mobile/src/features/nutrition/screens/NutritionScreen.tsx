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
import { updateHomeSummary } from '@/store/homeSummary';
import { FoodEditor } from '../components/FoodEditor';
import { NutritionHistory } from '../components/NutritionHistory';
import { CalorieCard, FoodIcon, FoodList, Heading, MacroCards, MealList, NutritionRow, RemainingMacros, macros, number, s } from '../components/NutritionUI';
import { exampleItems, foodById, foods, goals, initialMeals, momentIcons, moments } from '../data';
import type { Ingredient, Meal, MealMoment, Nutrients } from '../types';
import { dateFromKey, localDate, remaining, saveMeal, totals } from '../utils';

type Page = 'home' | 'compose' | 'validate' | 'detail' | 'food' | 'remaining' | 'history';
const titles: Record<Page, string> = { home: 'Nutrition', compose: 'Ajouter un repas', validate: 'Valider le repas', detail: 'Détail du repas', food: 'Modifier l’aliment', remaining: 'Restant aujourd’hui', history: 'Historique alimentaire' };
let sequence = 0;
const uniqueId = () => `nutrition-${Date.now()}-${++sequence}`;
const cloneMeal = (meal: Meal): Meal => ({ ...meal, items: meal.items.map(item => ({ ...item })) });
let sessionMeals: Meal[] | undefined;

export function NutritionScreen({ onHome, initialAdd = false }: { onHome: () => void; initialAdd?: boolean }) {
  const today = localDate();
  const [meals, setMeals] = useState(() => sessionMeals ?? initialMeals(today));
  const [page, setPage] = useState<Page>(initialAdd ? 'compose' : 'home'); const [detailOrigin, setDetailOrigin] = useState<'home' | 'history'>('home');
  const [draft, setDraft] = useState<Meal | null>(() => initialAdd ? { id: uniqueId(), date: today, moment: 'Midi', time: '13:10', items: [], source: 'manual', description: '' } : null); const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('text'); const [foodIndex, setFoodIndex] = useState(0);
  const [menu, setMenu] = useState(false); const [sheet, setSheet] = useState<'moment' | 'add' | 'replace' | null>(null);
  const [query, setQuery] = useState(''); const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'discard' | 'analysis' | null>(null);
  const scroll = useRef<ScrollView>(null); const saved = meals.find(meal => meal.id === selectedId);
  const currentDayMeals = meals.filter(meal => meal.date === today);
  const value = totals(currentDayMeals.flatMap(meal => meal.items), foodById);
  useEffect(() => { sessionMeals = meals; }, [meals]);
  useEffect(() => { updateHomeSummary({ calories: value.calories, protein: value.protein }); }, [value.calories, value.protein]);
  const closeToast = useCallback(() => setMessage(''), []);
  const openMeal = (meal: Meal, origin: 'home' | 'history') => { setSelectedId(meal.id); setDetailOrigin(origin); setPage('detail'); };
  const start = (moment: MealMoment = 'Midi') => {
    setDraft({ id: uniqueId(), date: today, moment, time: moment === 'Soir' ? '20:30' : '13:10', items: [], source: 'manual', description: '' }); setTab('text'); setPage('compose');
  };
  const back = () => {
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
  function commit() {
    if (!draft?.items.length) return;
    feedback('success');
    setMeals(current => saveMeal(current, draft)); setDraft(null); setPage('home'); setMessage('Repas enregistré dans ton journal.');
  }
  function selectFood(foodId: string) {
    if (!draft) return;
    const item: Ingredient = { id: uniqueId(), foodId, amount: foodById[foodId].portion };
    const items = sheet === 'replace' ? draft.items.map((old, index) => index === foodIndex ? { ...item, id: old.id } : old) : [...draft.items, item];
    updateDraft({ items }); setFoodIndex(sheet === 'replace' ? foodIndex : items.length - 1); setSheet(null); setPage('food');
  }
  function openFoodSearch(mode: 'add' | 'replace') { setQuery(''); setSheet(mode); }
  function simulateAnalysis() {
    if (!draft) return;
    updateDraft({ items: exampleItems(), source: tab === 'photo' ? 'photo' : 'text' }); setConfirm(null); setPage('validate');
  }
  const hour = Number(draft?.time.split(':')[0] ?? 13); const minute = Number(draft?.time.split(':')[1] ?? 10);
  const momentPicker = draft ? <View style={{ gap: 14 }}><View style={[s.row, { gap: 6 }]}>{moments.map(moment => <Button key={moment} text={moment} variant={draft.moment === moment ? 'primary' : 'secondary'} containerStyle={{ flex: 1, minWidth: 0 }} style={{ paddingHorizontal: 2, minWidth: 0 }} textStyle={{ fontSize: 10 }} onPress={() => updateDraft({ moment })} />)}</View><View style={s.row}><View style={{ flex: 1 }}><Text style={s.muted}>Heures</Text><NumberStepper label="les heures" value={hour} minimum={0} maximum={23} onChange={value => updateDraft({ time: `${String(value).padStart(2, '0')}:${String(minute).padStart(2, '0')}` })} /></View><View style={{ flex: 1 }}><Text style={s.muted}>Minutes</Text><NumberStepper label="les minutes" value={minute} minimum={0} maximum={59} onChange={value => updateDraft({ time: `${String(hour).padStart(2, '0')}:${String(value).padStart(2, '0')}` })} /></View></View></View> : null;

  return <SafeAreaView style={s.screen}><ScreenBackdrop /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[s.header, { flex: 1, paddingHorizontal: 0 }]}>
      <AppHeader style={{ paddingHorizontal: 18 }} title={titles[page]} subtitle={page === 'home' ? `Aujourd’hui · ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : undefined} leading={<IconButton accessibilityLabel="Retour" icon={<Symbol name={page === 'compose' || page === 'food' ? 'close' : 'back'} />} onPress={back} />} trailing={page === 'home' || page === 'detail' ? <IconButton accessibilityLabel="Options Nutrition" icon={<Symbol name="more" />} onPress={() => setMenu(!menu)} /> : undefined} />
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.body}>
        {page === 'home' ? <>
          <CalorieCard value={value} target={goals.calories}><View style={s.badge}><Text style={[s.muted, { color: colors.energy }]}>{value.calories > goals.calories ? `${number(value.calories - goals.calories)} kcal au-dessus de l’objectif` : `${remaining(value.calories, goals.calories)} kcal restantes`}</Text></View></CalorieCard>
          <MacroCards value={value} /><Heading>Repas</Heading>
          {currentDayMeals.length ? <MealList meals={currentDayMeals} onSelect={meal => openMeal(meal, 'home')} /> : <EmptyState title="Ton journal commence ici" description="Ajoute ton premier repas de la journée." />}
          <View style={s.actions}><Button leading={<Symbol name="plus" color="white" />} text="Ajouter un repas" hapticFeedback="light" onPress={() => start()} /><Button text="Voir les calories restantes" variant="outline" onPress={() => setPage('remaining')} /></View>
        </> : null}
        {page === 'compose' && draft ? <>
          <TabSelector value={tab} onChange={setTab} items={[{ label: 'Texte', value: 'text' }, { label: 'Photo', value: 'photo' }]} />
          {tab === 'text' ? <><Text style={s.hero}>Décris ton repas</Text><TextField accessibilityLabel="Description du repas" placeholder="Poulet braisé, environ 250 g de riz, un peu de sauce et un Coca Zéro." value={draft.description ?? ''} onChangeText={description => updateDraft({ description })} multiline fieldStyle={{ borderRadius: 24, borderWidth: 0, padding: 18, alignItems: 'flex-start' }} inputStyle={{ minHeight: 180, fontSize: 17, lineHeight: 26 }} /><Heading>Repas</Heading><View style={[s.row, { gap: 7 }]}>{moments.map(moment => <Button key={moment} variant="outline" text={moment} backgroundColor={draft.moment === moment ? colors.accentSurface : colors.surface} textColor={draft.moment === moment ? colors.primary : colors.text} containerStyle={{ flex: 1, minWidth: 0 }} style={{ paddingHorizontal: 1, minWidth: 0, flexDirection: 'column', gap: 8, borderColor: draft.moment === moment ? colors.accent : colors.surface }} textStyle={{ fontSize: 10 }} leading={<Illustration name={momentIcons[moment]} size={30} />} onPress={() => updateDraft({ moment })} />)}</View><Heading>Heure <Text style={s.muted}>(optionnel)</Text></Heading><Card style={s.list}><NutritionRow last title={draft.time} icon={<Symbol name="clock" color="primary" />} onPress={() => setSheet('moment')} /></Card></> : <><CameraCapture label="Place le repas dans le cadre" value={draft.photo} onChange={photo => updateDraft({ photo })} /><Text style={s.muted}>Prends une photo ou choisis-en une dans ta galerie.</Text></>}
          <View style={[s.actions, { marginTop: 20 }]}><Button text={tab === 'photo' ? 'Utiliser cette photo' : 'Analyser le repas'} disabled={tab === 'photo' ? !draft.photo : !draft.description?.trim()} onPress={() => { Keyboard.dismiss(); setConfirm('analysis'); }} /><Button text="Ajouter les aliments manuellement" variant="outline" onPress={() => { updateDraft({ source: 'manual' }); setPage('validate'); }} /><Button text="Annuler" variant="outline" onPress={back} /></View>
        </> : null}
        {page === 'validate' && draft ? <>
          <CalorieCard value={totals(draft.items, foodById)} label="Estimation du repas" /><Heading>Composition</Heading>
          <FoodList items={draft.items} onSelect={index => editFood(index)} footer={<Button leading={<Symbol name="plus" color="primary" />} text="Ajouter un aliment" variant="outline" textColor={colors.primary} onPress={() => openFoodSearch('add')} />} />
          <Heading>Moment du repas</Heading><Card style={s.list}><NutritionRow last title={draft.moment} subtitle={draft.time} icon={<FoodIcon name="cutlery" />} onPress={() => setSheet('moment')} /></Card>
          <Button text={meals.some(meal => meal.id === draft.id) ? 'Enregistrer les modifications' : 'Ajouter au journal'} leading={<Symbol name="plus" color="white" />} disabled={!draft.items.length} hapticFeedback="light" onPress={commit} />
          <Button text="Recalculer" variant="outline" onPress={() => { updateDraft({ items: draft.items.map(item => ({ ...item })) }); setMessage('Totaux recalculés avec tes quantités corrigées.'); }} />
        </> : null}
        {page === 'food' && draft?.items[foodIndex] ? <FoodEditor key={`${draft.items[foodIndex].id}-${draft.items[foodIndex].foodId}`} initial={draft.items[foodIndex]} moment={draft.moment} onSave={item => { updateDraft({ items: draft.items.map((old, index) => index === foodIndex ? item : old) }); setPage('validate'); }} onRemove={() => { updateDraft({ items: draft.items.filter((_, index) => index !== foodIndex) }); setPage('validate'); }} onReplace={() => openFoodSearch('replace')} /> : null}
        {page === 'detail' && saved ? <>
          <View><Heading>{saved.moment === 'Midi' ? 'Déjeuner' : saved.moment === 'Soir' ? 'Dîner' : saved.moment}</Heading><Text style={s.muted}>{saved.date === today ? 'Aujourd’hui' : dateFromKey(saved.date).toLocaleDateString('fr-FR')} · {saved.time}</Text></View>
          <CalorieCard value={totals(saved.items, foodById)} /><Heading>Aliments</Heading><FoodList items={saved.items} onSelect={index => editFood(index, saved)} />
          <Card style={s.card}><View style={s.row}><FoodIcon name="brain" /><Text style={[s.muted, { flex: 1 }]}>{saved.source === 'manual' ? 'Ajouté manuellement' : saved.source === 'example' ? 'Repas d’exemple' : 'Estimation à partir d’un exemple simulé'}</Text></View></Card>
          <Button text="Modifier le repas" leading={<Symbol name="edit" color="white" />} onPress={() => { setDraft(cloneMeal(saved)); setPage('validate'); }} />
          <Button text="Dupliquer" variant="outline" onPress={() => { setDraft({ ...cloneMeal(saved), id: uniqueId(), date: today }); setPage('validate'); setMessage('Choisis le moment, puis ajoute la copie au journal.'); }} />
          <Button text="Supprimer le repas" variant="secondary" textColor={colors.energy} onPress={() => setConfirm('delete')} />
        </> : null}
        {page === 'remaining' ? <>
          <Card style={s.card}><View style={s.row}><ProgressRing size={96} strokeWidth={9} progress={value.calories / goals.calories * 100} color={colors.energy} trackColor={colors.energySurface}><Illustration name="flame" size={42} /></ProgressRing><View style={{ flex: 1 }}><Text style={s.big}><AnimatedMetricText value={remaining(value.calories, goals.calories)} /><Text style={s.calorieUnit}> kcal</Text></Text><Text style={s.heading}>disponibles</Text><Text style={s.small}>{number(value.calories)} / {number(goals.calories)} kcal consommées</Text></View></View></Card>
          <Heading>Macros restantes</Heading><RemainingMacros value={value} />
          <Card style={s.card}><Heading>Bilan</Heading><View style={s.row}><View style={{ flex: 1.7 }} />{['Objectif', 'Consommé', 'Restant'].map(label => <Text key={label} style={[s.small, { flex: 1, textAlign: 'right' }]}>{label}</Text>)}</View>{[{ key: 'calories', label: 'Calories', color: colors.energy, icon: 'flame', background: colors.energySurface }, ...macros].map(metric => { const key = metric.key as keyof Nutrients; return <View key={key} style={[s.row, { gap: 4 }]}><View style={{ flex: 1.7, flexDirection: 'row', alignItems: 'center', gap: 5 }}><FoodIcon name={metric.icon} background={metric.background} size={24} /><Text style={[s.small, { flexShrink: 1 }]}>{metric.label}</Text></View>{[goals[key], value[key], remaining(value[key], goals[key])].map((amount, index) => <Text key={index} style={[s.small, { flex: 1, textAlign: 'right', color: index === 2 ? metric.color : colors.textSecondary }]}>{number(amount)}{key === 'calories' ? '' : ' g'}</Text>)}</View>; })}</Card>
          <Card style={s.list}><NutritionRow last title="Budget pour le dîner" subtitle={`${remaining(value.calories, goals.calories)} kcal`} icon={<FoodIcon name="cutlery" />} onPress={() => start('Soir')} /></Card>
          <Button text="Ajouter le dîner" leading={<Symbol name="plus" color="white" />} onPress={() => start('Soir')} /><Button text="Retour à Nutrition" variant="outline" onPress={() => setPage('home')} />
        </> : null}
        <MotionEnabled.Provider value={page === 'history'}><View style={page === 'history' ? undefined : { display: 'none' }}><NutritionHistory meals={meals} notify={setMessage} onSelect={meal => openMeal(meal, 'history')} /></View></MotionEnabled.Provider>
      </ScrollView>
      <DropdownMenu visible={menu} onClose={() => setMenu(false)} items={[{ label: 'Ajouter un repas', onPress: () => start() }, { label: 'Voir l’historique', onPress: () => setPage('history') }, { label: 'Calories restantes', onPress: () => setPage('remaining') }]} />
      <Toast visible={Boolean(message)} message={message} onHide={closeToast} style={{ position: 'absolute', bottom: 12, left: 18, right: 18 }} />
    </View>
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'moment' ? 'Moment du repas' : sheet === 'replace' ? 'Remplacer l’aliment' : 'Ajouter un aliment'} style={{ maxHeight: '85%' }}>
      {sheet === 'moment' ? <View style={{ gap: 20 }}>{momentPicker}<Button text="Valider" onPress={() => setSheet(null)} /></View> : <><TextField accessibilityLabel="Rechercher un aliment" placeholder="Rechercher un aliment" value={query} onChangeText={setQuery} leftAccessory={<Symbol name="search" />} /><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{foods.filter(food => food.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).map(food => <NutritionRow key={food.id} title={food.name} subtitle={`${food.portion} ${food.baseUnit}`} icon={<FoodIcon name={food.icon} />} onPress={() => selectFood(food.id)} />)}{!foods.some(food => food.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))) ? <EmptyState title="Aucun aliment trouvé" description="Essaie un autre mot dans le catalogue de démonstration." /> : null}</ScrollView></>}
    </BottomSheet>
    <AppModal visible={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'delete' ? 'Supprimer ce repas ?' : confirm === 'discard' ? 'Quitter sans enregistrer ?' : 'Tester l’analyse du repas'}>
      <Text style={s.muted}>{confirm === 'analysis' ? 'L’analyse IA n’est pas encore connectée. Pour tester le parcours, nous afficherons l’exemple poulet, riz, sauce et Coca Zéro, à corriger avant validation. Ta photo et ton texte ne sont pas envoyés.' : confirm === 'delete' ? 'Ce repas sera retiré du journal et les totaux seront mis à jour.' : 'Les modifications de ce repas ne seront pas ajoutées au journal.'}</Text>
      <View style={[s.actions, { marginTop: 18 }]}><Button text={confirm === 'analysis' ? 'Continuer avec l’exemple' : confirm === 'delete' ? 'Supprimer' : 'Quitter'} onPress={() => { if (confirm === 'analysis') { simulateAnalysis(); return; } if (confirm === 'delete') { setMeals(current => current.filter(meal => meal.id !== selectedId)); setPage(detailOrigin); setMessage('Repas supprimé.'); } else { setDraft(null); setPage('home'); } setConfirm(null); }} /><Button text="Annuler" variant="outline" onPress={() => setConfirm(null)} /></View>
    </AppModal>
  </KeyboardAvoidingView></SafeAreaView>;
}
