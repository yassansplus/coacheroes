import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel, getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppNavbar, type AppNavTab } from '@/components/AppNavbar';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PillSelector } from '@/components/PillSelector';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol, type SymbolName } from '@/components/Symbol';
import { useGameProgress } from '@/store/gameProgress';
import { useProfileSummary } from '../hooks/useProfileSummary';
import { useSession } from '@/providers/SessionProvider';
import { equippedTitle } from '@/config/gameRewards';
import { Banner } from '@/components/Banner';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { feedback } from '@/utils/feedback';
import { loadSquad } from '@/services/squad';
import { useProfileAvatar } from '@/hooks/useProfileAvatar';
import { avatarArtStyles, avatarGenres, avatarPlatforms, defaultAvatarPreferences, type AvatarPreferences } from '@/services/profileAvatar/options';
import { languages, type Language } from '@/i18n/core';
import { saveLanguage } from '@/storage/language';
import { apiRequest } from '@/services/http';
import { RadioButton } from '@/components/RadioButton';

type Props = { onTab: (tab: AppNavTab) => void; onEdit: (step: number) => void; onLibrary: () => void; onSquad: () => void; onLevel: () => void; onNutrition: () => void };
function Avatar({ size, uri }: { size: number; uri: string | null }) {
  useLanguage();
  const game = useGameProgress();
  return <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: game.equipment.frame === 'cobalt' ? colors.squadPurple : game.equipment.frame === 'azur' ? colors.primary : colors.border }]}>
    {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Illustration name="coach" size={size} />}</View>;
}
function RoundIcon({ illustration, symbol, color, background, size = 32 }: {
  illustration?: IllustrationName; symbol?: SymbolName; color: string; background: string; size?: number;
}) {
  useLanguage();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}>
    {illustration ? <Illustration name={illustration} size={size * 0.67} /> : <Symbol name={symbol ?? 'target'} color={color} size={size * 0.57} />}
  </View>;
}
function SettingsRow({ label, icon, value, last, onPress }: { label: string; icon: ReactNode; value?: string; last?: boolean; onPress?: () => void }) {
  useLanguage();
  const content = <>{icon}<View style={[s.rowBody, !last && s.divider]}><Text style={s.label}>{label}</Text>{value ? <Text style={s.value}>{value}</Text> : null}<Symbol name="chevron" color="textSecondary" size={18} /></View></>;
  return onPress ? <Pressable accessibilityRole="button" onPress={() => { feedback('selection'); onPress(); }} style={({ pressed }) => [s.settingRow, pressed && { opacity: 0.7 }]}>{content}</Pressable> : <View style={s.settingRow}>{content}</View>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  useLanguage();
  return <View style={{ gap: 7 }}><Text style={s.sectionTitle}>{title}</Text><Card style={s.list}>{children}</Card></View>;
}

export function ProfileScreen({ onTab, onEdit, onLibrary, onSquad, onLevel, onNutrition }: Props) {
  const language = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageBusy, setLanguageBusy] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const changeLanguage = async (next: Language) => {
    if (languageBusy || next === language) return;
    setLanguageBusy(true); setLanguageError(null);
    try {
      await apiRequest('/auth/language', { method: 'POST', body: { language: next } });
      await saveLanguage(next);
      setLanguageOpen(false);
    } catch { setLanguageError('Impossible de changer la langue. Réessaie.'); }
    finally { setLanguageBusy(false); }
  };
  const profile = useProfileSummary();
  const session = useSession();
  const game = useGameProgress();
  const avatar = useProfileAvatar();
  const [avatarOptions, setAvatarOptions] = useState(false);
  const [avatarPreferences, setAvatarPreferences] = useState<AvatarPreferences>(defaultAvatarPreferences);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [squadCounts, setSquadCounts] = useState({ groups: 0, friends: 0 });
  const openAvatarOptions = () => {
    if (avatar.avatar) setAvatarPreferences({ platform: avatar.avatar.platform, genre: avatar.avatar.genre, artStyle: avatar.avatar.artStyle });
    setPickerError(null);
    setAvatarOptions(true);
  };
  const pickAvatar = async () => {
    setPickerError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.78 });
      if (!result.canceled && result.assets[0]?.uri) { setAvatarOptions(false); await avatar.upload(result.assets[0].uri, avatarPreferences); }
    } catch { setPickerError('Impossible d’ouvrir les photos. Réessaie.'); }
  };
  useFocusEffect(useCallback(() => {
    let active = true;
    if (session.user?.id) void loadSquad().then(data => { if (active) setSquadCounts({ groups: data.groups.length, friends: data.friends.length }); }).catch(() => undefined);
    return () => { active = false; };
  }, [session.user?.id]));
  return <SafeAreaView style={[s.screen, game.equipment.theme === 'violet' && { backgroundColor: colors.accentSurface }]}><View style={s.frame}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.brandRow}>
        <Illustration name="logo" size={34} />
        <View style={s.grow}><Text style={s.brand}>Fit<Text style={{ color: colors.googleBlue }}>Buddy</Text></Text><Text style={s.tagline}>Plus forts, ensemble</Text></View>
        <View style={s.bell}><Symbol name="bell" size={23} /><View style={s.dot} /></View>
        <Avatar size={44} uri={avatar.uri} />
      </View>
      {profile.error ? <ErrorState description={profile.error} onRetry={profile.retry} /> : null}
      {profile.loading ? <LoadingState label="Chargement du profil…" /> : <Card style={[s.card, s.identity]}>
        <Pressable accessibilityRole="button" accessibilityLabel={localizeLabel("Changer ma photo de profil")} onPress={openAvatarOptions} style={s.avatarAction}>
          <Avatar size={70} uri={avatar.uri} /><View style={s.photoEditBadge}><Symbol name="edit" size={15} color="white" /></View>
        </Pressable>
        <View style={[s.grow, { gap: 4 }]}>
          <View style={s.nameRow}><Text style={s.name}>Mon compte</Text><IconButton variant="ghost" size={32} accessibilityLabel={localizeLabel("Modifier mon profil")} icon={<Symbol name="edit" size={19} color="textSecondary" />} onPress={() => onEdit(3)} /></View>
          {equippedTitle(game.equipment.title) ? <Text style={[s.membership, { color: colors.squadPurple }]}>{equippedTitle(game.equipment.title)}</Text> : null}<Text style={s.subtitle}>{profile.age} ans · {profile.height} cm</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={localizeLabel("Objectifs")} hitSlop={8}
            onPress={() => { feedback('selection'); onEdit(2); }} style={({ pressed }) => [s.goalBadge, pressed && { opacity: 0.7 }]}>
            <Symbol name="target" color="success" size={16} /><Text style={s.goalBadgeText}>{profile.goals.split(' · ').map(value => t(value)).join(' · ')}</Text><Symbol name="edit" color="successText" size={12} />
          </Pressable>
          <Text style={s.membership}>{session.user?.createdAt ? t("Membre depuis le {p0}", { p0: new Date(session.user.createdAt).toLocaleDateString(getLocale()) }) : ''}</Text>
          {avatar.uploading ? <Text style={s.avatarHint}>Photo en cours d’enregistrement…</Text> : avatar.avatar?.status === 'pending' || avatar.avatar?.status === 'processing' ? <Text style={s.avatarHint}>Ton avatar de jeu vidéo se prépare…</Text> : null}
        </View>
      </Card>}
      {avatar.error ? <Banner variant="error" message={avatar.error} /> : null}
      {avatar.avatar?.status === 'failed' ? <Card style={{ gap: 8 }}><Text style={s.avatarHint}>La création a échoué. Ta photo reste visible.</Text><Button text="Réessayer" variant="outline" onPress={() => void avatar.retry()} /></Card> : null}
      <Section title="Mon entraînement">
        <SettingsRow label="Disponibilités" icon={<RoundIcon illustration="calendar" color={colors.primary} background={colors.primarySurface} />} onPress={() => onEdit(7)} />
        <SettingsRow label="Préférences d’entraînement" icon={<RoundIcon illustration="dumbbell" color={colors.accent} background={colors.accentSurface} />} onPress={() => onEdit(6)} last />
      </Section>
      <Section title="Mon alimentation">
        <SettingsRow label="Préférences alimentaires" icon={<RoundIcon illustration="cutlery" color={colors.success} background={colors.successSurface} />} onPress={() => onEdit(12)} />
        <SettingsRow label="Objectifs calories et macros" icon={<RoundIcon illustration="flame" color={colors.energy} background={colors.energySurface} />} onPress={onNutrition} last />
      </Section>
      <Section title="Communauté">
        <SettingsRow label="Niveau et XP" value={t("Niveau {p0}", { p0: game.level })} onPress={onLevel} icon={<RoundIcon illustration="trophy" color={colors.warning} background={colors.warningSurface} />} />
        <SettingsRow label="Squad" value={t("{p0} groupes · {p1} amis", { p0: squadCounts.groups, p1: squadCounts.friends })} icon={<RoundIcon symbol="users" color={colors.primary} background={colors.primarySurface} />} onPress={onSquad} last />
      </Section>
      <Section title="Données et application">
        <SettingsRow label="Langue" value={languages.find(item => item.value === language)?.label}
          icon={<RoundIcon symbol="settings" color={colors.primary} background={colors.primarySurface} />}
          onPress={() => { setLanguageError(null); setLanguageOpen(true); }} />
        <SettingsRow label="Apple Santé" icon={<RoundIcon symbol="heart" color={colors.energyVeryLow} background={colors.energySurface} />} />
        <SettingsRow label="Notifications" icon={<RoundIcon symbol="bell" color={colors.primary} background={colors.primarySurface} />} />
        <SettingsRow label="Confidentialité et données" icon={<RoundIcon symbol="shield" color={colors.successText} background={colors.successSurface} />} />
        <SettingsRow label="Exporter mes données" icon={<RoundIcon symbol="download" color={colors.accent} background={colors.accentSurface} />} last />
      </Section>
      {session.error ? <Banner variant="error" message={session.error} /> : null}
      <Button text={session.busy ? 'Déconnexion…' : 'Se déconnecter'} variant="outline" disabled={session.busy} onPress={() => void session.signOut()} />
      <Pressable accessibilityRole="link" onPress={onLibrary} hitSlop={8} style={s.library}><Text style={s.libraryText}>Bibliothèque de composants</Text></Pressable>
    </ScrollView>
    <AppNavbar includeCoach value="profile" onChange={onTab} style={{ marginHorizontal: 14, marginBottom: 5 }} />
    <BottomSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title="Langue">
      <View style={{ gap: 18 }}>
        {languages.map(item => <RadioButton key={item.value} label={item.label} selected={item.value === language}
          disabled={languageBusy} onSelect={() => void changeLanguage(item.value)} />)}
        {languageBusy ? <LoadingState label="Enregistrement…" /> : null}
        {languageError ? <Banner variant="error" message={languageError} /> : null}
      </View>
    </BottomSheet>
    <BottomSheet visible={avatarOptions} onClose={() => setAvatarOptions(false)} title="Mon personnage" style={{ maxHeight: '85%' }}
      footer={<View style={{ gap: 8 }}><Button text="Choisir ma photo" onPress={() => void pickAvatar()} />
        {pickerError ? <Text style={{ color: colors.energy, fontFamily: fontFamily.medium, fontSize: 12 }}>{pickerError}</Text> : null}</View>}>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 18, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <Text style={s.subtitle}>Choisis l’univers de ton avatar. Ta photo reste visible pendant sa création.</Text>
        <View style={s.avatarChoiceGroup}><Text style={s.avatarChoiceTitle}>Console</Text>
          <PillSelector items={[...avatarPlatforms]} value={avatarPreferences.platform} onChange={value => setAvatarPreferences(current => ({ ...current, platform: value as AvatarPreferences['platform'] }))} /></View>
        <View style={s.avatarChoiceGroup}><Text style={s.avatarChoiceTitle}>Genre et univers</Text>
          <PillSelector items={[...avatarGenres]} value={avatarPreferences.genre} onChange={value => setAvatarPreferences(current => ({ ...current, genre: value as AvatarPreferences['genre'] }))} /></View>
        <View style={s.avatarChoiceGroup}><Text style={s.avatarChoiceTitle}>Style graphique</Text>
          <PillSelector items={[...avatarArtStyles]} value={avatarPreferences.artStyle} onChange={value => setAvatarPreferences(current => ({ ...current, artStyle: value as AvatarPreferences['artStyle'] }))} /></View>
      </ScrollView>
    </BottomSheet>
  </View></SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 20 },
  grow: { flex: 1, minWidth: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  brand: { fontFamily: fontFamily.extraBold, fontSize: 24, color: colors.text },
  tagline: { fontFamily: fontFamily.medium, fontSize: 9, color: colors.textSecondary },
  avatar: { overflow: 'hidden', backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarAction: { position: 'relative' },
  photoEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  avatarHint: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.primary },
  avatarChoiceGroup: { gap: 9 },
  avatarChoiceTitle: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.text },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.onboardingBackground, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 3, right: 3, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.energy, borderWidth: 1, borderColor: colors.white },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { padding: 12, borderWidth: 1, borderColor: colors.primarySurface, borderRadius: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fontFamily.bold, fontSize: 17, color: colors.text },
  subtitle: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary },
  membership: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textSecondary },
  goalBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 20, backgroundColor: colors.successSurface, paddingHorizontal: 8, paddingVertical: 4 },
  goalBadgeText: { fontFamily: fontFamily.semiBold, fontSize: 10, color: colors.successText, flexShrink: 1 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.text },
  list: { paddingHorizontal: 13, paddingVertical: 0, borderWidth: 1, borderColor: colors.primarySurface, borderRadius: 13 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 39, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { flex: 1, fontFamily: fontFamily.medium, fontSize: 12, color: colors.text },
  value: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary },
  library: { alignSelf: 'center', paddingVertical: 8 },
  libraryText: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, textDecorationLine: 'underline' },
});
