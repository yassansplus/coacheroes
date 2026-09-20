import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppHeader } from '@/components/AppHeader';
import { AppNavbar } from '@/components/AppNavbar';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Illustration } from '@/components/Illustration';
import { MessageComposer } from '@/components/MessageComposer';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';
import { useCoach } from '../hooks/useCoach';
import { AdjustmentReasons } from '../components/AdjustmentReasons';
import { CoachChat } from '../components/CoachChat';
import { CoachIcon, CoachRow } from '../components/CoachUI';
import { CompareVersions } from '../components/CompareVersions';
import { ModificationDecision } from '../components/ModificationDecision';
import { ModificationProposal } from '../components/ModificationProposal';
import { QuickQuestions } from '../components/QuickQuestions';
import { s } from '../components/styles';

type CoachScreenProps = { onHome: () => void; onProgram: () => void; onToday: () => void; onNutrition: () => void; onProgress: () => void; onProfile: () => void };
export function CoachScreen({ onHome, onProgram, onToday, onNutrition, onProgress, onProfile }: CoachScreenProps) {
  const c = useCoach();
  const scroll = useRef<ScrollView>(null);
  const attached = useRef(true);
  const attaching = useRef(false);
  const [history, setHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<{ title: string; body: string } | null>(null);
  const [reasonOrigin, setReasonOrigin] = useState<'chat' | 'compare'>('chat');
  const [focusRequest, setFocusRequest] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const chat = c.page === 'chat';
  const entry = c.page === 'questions';
  useEffect(() => { attached.current = true; return () => { attached.current = false; }; }, []);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => chat ? scroll.current?.scrollToEnd({ animated: true }) : scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [c.page, c.conversation?.messages.length, c.conversation?.id]);

  function back() {
    if (history) { setHistory(false); return; }
    if (detail) { setDetail(null); return; }
    if (entry) { onHome(); return; }
    if (chat) { c.newConversation(); return; }
    c.setPage(c.page === 'reasons' ? reasonOrigin : c.page === 'compare' ? 'proposal' : c.page === 'decision' ? 'compare' : 'reasons');
  }
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => listener.remove(); });
  function ask(text?: string) { Keyboard.dismiss(); c.ask(text); }
  function showDetail(title: string, body: string) { setDetail({ title, body }); }
  function showHistory() { Keyboard.dismiss(); setSearch(''); setHistory(true); }
  async function attach() {
    if (attaching.current) return;
    attaching.current = true;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (attached.current && !result.canceled && result.assets[0]?.uri) c.setPhoto(result.assets[0].uri);
    } catch { if (attached.current) showDetail('Photo indisponible', 'La galerie n’a pas pu être ouverte. Tu peux réessayer ou envoyer ton message sans photo.'); }
    finally { attaching.current = false; }
  }
  function openProposal(id: string) { setReasonOrigin('chat'); c.openProposal(id); }
  const recent = c.conversations.filter(item => item.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));

  return <SafeAreaView style={s.screen}><ScreenBackdrop /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={s.frame}>
    {chat ? <View style={[s.row, { paddingVertical: 12, gap: 8 }]}>
      <IconButton accessibilityLabel="Questions rapides" icon={<Symbol name="back" />} variant="ghost" size={30} onPress={back} />
      <Illustration name="coach" size={48} /><View style={s.grow}><Text style={s.title}>Coach IA</Text><View style={[s.row, { gap: 5 }]}><View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: colors.success }} /><Text style={s.caption}>Contexte d’exemple</Text></View></View>
      <IconButton accessibilityLabel="Mes conversations" icon={<Symbol name="history" color="textSecondary" />} onPress={showHistory} />
    </View> : <AppHeader title={entry ? 'Questions rapides' : ''} leading={<IconButton accessibilityLabel="Retour" variant="ghost" icon={<Symbol name={c.page === 'proposal' || c.page === 'decision' ? 'close' : 'back'} />} onPress={c.page === 'proposal' || c.page === 'decision' ? () => c.setPage('chat') : back} />} trailing={entry ? <IconButton accessibilityLabel="Mes conversations" icon={<Symbol name="history" />} onPress={showHistory} /> : undefined} />}
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.content, chat && { flexGrow: 1, justifyContent: 'flex-end', gap: 18 }]}>
      {entry ? <QuickQuestions onAsk={ask} onHistory={showHistory} count={c.conversations.length} /> : null}
      {chat ? <CoachChat conversation={c.conversation} onProposal={openProposal} onKeep={id => c.decide('declined', id)} onProgram={onProgram} /> : null}
      {c.proposal && c.page === 'reasons' ? <><Text style={[s.heading, s.center]}>Pourquoi cet ajustement ?</Text><AdjustmentReasons fromComparison={reasonOrigin === 'compare'} onContinue={() => c.setPage(reasonOrigin === 'compare' ? 'compare' : 'proposal')} onChat={() => c.setPage('chat')} onKeep={() => c.decide('declined')} onRule={() => showDetail('Règle d’adaptation utilisée', 'Le sommeil court, l’énergie basse, les courbatures aux épaules et la performance précédente déclenchent cette proposition d’exemple. Elle réduit les séries de Muscu B et augmente les répétitions en réserve, sans modifier les charges. Tu choisis sa durée avant de l’appliquer.')} /></> : null}
      {c.proposal && c.page === 'proposal' ? <ModificationProposal createdAt={c.proposal.createdAt} onCompare={() => c.setPage('compare')} onRefuse={() => c.decide('declined')} onDetail={showDetail} /> : null}
      {c.proposal && c.page === 'compare' ? <CompareVersions onContinue={() => c.setPage('decision')} onData={() => { setReasonOrigin('compare'); c.setPage('reasons'); }} onDetail={showDetail} /> : null}
      {c.proposal && c.page === 'decision' ? <ModificationDecision scope={c.scope} onScope={c.setScope} onApply={() => c.decide('applied')} onKeep={() => c.decide('declined')} onAdjust={() => { c.setPage('chat'); c.setDraft('Je souhaite ajuster la proposition : '); setFocusRequest(value => value + 1); }} /> : null}
    </ScrollView>
    {entry || chat ? <View style={s.footer}>
      {chat && !keyboard ? <View style={[s.row, { gap: 6, alignItems: 'stretch' }]}>{[
        { text: 'Analyser ma semaine', glyph: 'chart' as const, tone: 'purple' as const, onPress: () => ask('Peux-tu analyser ma semaine et ajuster mon programme ?') },
        { text: 'Modifier un exercice', glyph: 'dumbbell' as const, tone: 'green' as const, onPress: () => ask('Je veux modifier le développé épaules.') },
        { text: 'Calories restantes', glyph: 'flame' as const, tone: 'red' as const, onPress: onNutrition },
      ].map(item => <Button key={item.text} text={item.text} leading={item.glyph === 'flame' ? <CoachIcon icon="apple" tone={item.tone} size={29} /> : <CoachIcon glyph={item.glyph} tone={item.tone} size={29} />} variant="secondary" backgroundColor={colors.surface} containerStyle={{ flex: 1, minWidth: 0 }} style={{ paddingHorizontal: 6, paddingVertical: 9, gap: 5, minHeight: 64, flexDirection: 'column' }} textStyle={{ fontSize: 10 }} onPress={item.onPress} />)}</View> : null}
      <MessageComposer value={c.draft} onChange={c.setDraft} onSend={() => ask()} placeholder={entry ? 'Écrire ma question' : 'Pose une question'} image={c.photo} onRemoveImage={() => c.setPhoto(undefined)} onAttach={chat ? () => void attach() : undefined} focusRequest={focusRequest} onDictate={chat ? () => { setFocusRequest(value => value + 1); showDetail('Dicter ta question', 'Utilise le microphone du clavier de ton téléphone pour dicter ton message, puis appuie sur Envoyer.'); } : undefined} />
      {chat && !keyboard ? <AppNavbar includeCoach value="coach" onChange={value => { if (value === 'today') onToday(); else if (value === 'program') onProgram(); else if (value === 'progress') onProgress(); else if (value === 'profile') onProfile(); }} /> : null}
    </View> : null}
    <BottomSheet visible={history} title="Mes conversations" onClose={() => setHistory(false)} style={{ maxHeight: '85%' }}>
      <View style={{ gap: 12 }}><Button text="Nouvelle conversation" leading={<Symbol name="plus" color="white" />} onPress={() => { c.newConversation(); setHistory(false); }} /><TextField value={search} onChangeText={setSearch} placeholder="Rechercher une conversation" accessibilityLabel="Rechercher une conversation" leftAccessory={<Symbol name="search" color="textMuted" />} /></View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: 12 }}>
        {recent.map(item => <CoachRow key={item.id} title={item.title} description={`${new Date(item.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${item.messages.length} messages`} icon={<CoachIcon glyph="history" />} onPress={() => { c.resume(item); setHistory(false); }} divider />)}
        {!recent.length ? <EmptyState title={search ? 'Aucune conversation trouvée' : 'Ta première conversation commence ici'} description={search ? 'Essaie un autre mot.' : 'Choisis une question ou écris la tienne.'} /> : null}
      </ScrollView>
    </BottomSheet>
    <BottomSheet visible={detail !== null} title={detail?.title} onClose={() => setDetail(null)} footer={<Button text="Compris" onPress={() => setDetail(null)} />}><Text style={s.body}>{detail?.body}</Text></BottomSheet>
  </View></KeyboardAvoidingView></SafeAreaView>;
}
