import { useState, type ComponentProps } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppModal } from '@/components/AppModal';
import { Badge } from '@/components/Badge';
import { Banner } from '@/components/Banner';
import {
  BodyPainSelector,
  type BodyPainSelection,
  type BodyPainSide,
} from '@/components/BodyPainSelector';
import { BottomSheet } from '@/components/BottomSheet';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { CardHighlight } from '@/components/CardHighlight';
import { Checkbox } from '@/components/Checkbox';
import { DailyQuests, type DailyQuest } from '@/components/DailyQuests';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LevelProgressCard } from '@/components/LevelProgressCard';
import { LoadingState } from '@/components/LoadingState';
import { PillSelector } from '@/components/PillSelector';
import { ProgressCard, ProgressCardRow } from '@/components/ProgressCard';
import { RadioButton } from '@/components/RadioButton';
import { SelectableCard } from '@/components/SelectableCard';
import { Skeleton } from '@/components/Skeleton';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { Toast } from '@/components/Toast';
import { WeightSelectorV1 } from '@/components/WeightSelectorV1';
import { WeightSelectorV2 } from '@/components/WeightSelectorV2';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

import { OnboardingComponentsPreview } from '../components/OnboardingComponentsPreview';

type ProgressCardPreviewProps = Omit<ComponentProps<typeof ProgressCard>, 'icon'> & {
  imageSource: ImageSourcePropType;
};

type ProgressCardExample = Omit<ProgressCardPreviewProps, 'style'> & {
  id: string;
};

const dailyQuestIconStyle = {
  height: 42,
  width: 42,
} as const;

const tabSelectorItems = [
  { label: 'Jour', value: 'jour' },
  { label: 'Semaine', value: 'semaine' },
  { label: 'Mois', value: 'mois' },
];

const pillSelectorItems = [
  { label: 'Prise de masse', value: 'masse' },
  { label: 'Maintien', value: 'maintien' },
  { label: 'Sèche', value: 'seche' },
];

const progressCardExamples: ProgressCardExample[] = [
  {
    id: 'calories',
    imageSource: require('../../../../10_Assets_3D/21_Flamme.png'),
    label: 'Calories',
    progress: 65,
    target: '/ 2 200 kcal',
    value: '1 420',
  },
  {
    id: 'proteines',
    imageSource: require('../../../../10_Assets_3D/10_Couverts.png'),
    iconBackgroundColor: '#e6fbf2',
    label: 'Protéines',
    labelColor: '#139d78',
    progress: 65,
    progressColor: '#0fc68c',
    progressTrackColor: '#e6fbf2',
    target: '/ 150 g',
    value: '98',
  },
  {
    id: 'sommeil',
    imageSource: require('../../../../10_Assets_3D/17_Lune.png'),
    iconBackgroundColor: 'lilac',
    label: 'Sommeil',
    labelColor: 'accent',
    progress: 78,
    progressColor: 'accent',
    progressTrackColor: 'lavender',
    target: '/ 8 h',
    value: '6 h 20',
    animatedValue: 380,
    formatAnimatedValue: (minutes) => {
      const roundedMinutes = Math.round(minutes);
      const hours = Math.floor(roundedMinutes / 60);
      const remainingMinutes = roundedMinutes % 60;

      return `${hours} h ${String(remainingMinutes).padStart(2, '0')}`;
    },
  },
  {
    id: 'pas',
    imageSource: require('../../../../10_Assets_3D/07_Chaussure.png'),
    iconBackgroundColor: 'lavender',
    label: 'Pas',
    labelColor: 'accent',
    progress: 84,
    progressColor: 'accent',
    progressTrackColor: 'lilac',
    target: '/ 10 000',
    value: '8 432',
  },
];

const dailyQuestExamples: DailyQuest[] = [
  {
    currentValue: 3,
    icon: (
      <Image
        resizeMode="contain"
        source={require('../../../../10_Assets_3D/14_Halteres.png')}
        style={dailyQuestIconStyle}
      />
    ),
    iconBackgroundColor: '#edf5ff',
    id: 'seances',
    progressGradientColors: ['#3199ff', '#5b77fd'],
    reward: '+200 XP',
    targetValue: 4,
    title: 'Séances',
  },
  {
    currentValue: 4,
    icon: (
      <Image
        resizeMode="contain"
        source={require('../../../../10_Assets_3D/11_Pomme.png')}
        style={dailyQuestIconStyle}
      />
    ),
    iconBackgroundColor: '#e8fbf1',
    id: 'proteines',
    progressGradientColors: ['#15d6a2', '#13c98f'],
    reward: '+150 XP',
    targetValue: 5,
    title: 'Protéines',
  },
  {
    currentValue: 2,
    icon: (
      <Image
        resizeMode="contain"
        source={require('../../../../10_Assets_3D/17_Lune.png')}
        style={dailyQuestIconStyle}
      />
    ),
    iconBackgroundColor: 'lilac',
    id: 'sommeil',
    progressGradientColors: ['#7f49f4', '#a54ffa'],
    reward: '+100 XP',
    targetValue: 4,
    title: 'Sommeil',
  },
];

function ProgressCardPreview({ imageSource, ...progressCardProps }: ProgressCardPreviewProps) {
  return (
    <ProgressCard
      {...progressCardProps}
      icon={<Image resizeMode="contain" source={imageSource} style={styles.progressIcon} />}
    />
  );
}

function renderProgressCardExamples(
  examples: ProgressCardExample[],
  style: StyleProp<ViewStyle>,
) {
  return examples.map(({ id, ...props }) => (
    <ProgressCardPreview key={id} {...props} style={style} />
  ));
}

function WeightSelectorV2Preview() {
  const [wheelWeight, setWheelWeight] = useState(77.5);

  return <WeightSelectorV2 onChange={setWheelWeight} value={wheelWeight} />;
}

function TextFieldPreview() {
  const [calorieGoal, setCalorieGoal] = useState('2200');

  return (
    <TextField
      helperText="Utilisé pour calculer tes objectifs journaliers."
      keyboardType="number-pad"
      label="Objectif calories"
      onChangeText={setCalorieGoal}
      placeholder="Ex. 2 200"
      rightAccessory={<Text style={styles.fieldUnit}>kcal</Text>}
      value={calorieGoal}
    />
  );
}

function OverlayPreview() {
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isToastVisible, setToastVisible] = useState(false);

  return (
    <View style={styles.overlayPreview}>
      <Button onPress={() => setSheetVisible(true)} text="Ouvrir la bottom sheet" variant="secondary" />
      <Button onPress={() => setModalVisible(true)} text="Ouvrir la modal" variant="outline" />
      <Button onPress={() => setToastVisible(true)} text="Afficher le toast" variant="outline" />
      <Toast
        message="Objectif enregistré"
        onHide={() => setToastVisible(false)}
        variant="success"
        visible={isToastVisible}
      />

      <BottomSheet
        footer={<Button onPress={() => setSheetVisible(false)} text="Valider" />}
        onClose={() => setSheetVisible(false)}
        title="Ajuster l'objectif"
        visible={isSheetVisible}
      >
        <Text style={styles.overlayText}>Cette surface convient aux actions rapides et contextuelles.</Text>
      </BottomSheet>

      <AppModal
        actions={<Button onPress={() => setModalVisible(false)} text="Compris" />}
        onClose={() => setModalVisible(false)}
        title="Bravo !"
        visible={isModalVisible}
      >
        <Text style={styles.overlayText}>Ta première séance de la semaine est enregistrée.</Text>
      </AppModal>
    </View>
  );
}

function CalendarPreview() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return <Calendar onSelectDate={setSelectedDate} selectedDate={selectedDate} />;
}

function NavigationPreview() {
  const [selectedTab, setSelectedTab] = useState('home');

  return (
    <View style={styles.navigationPreview}>
      <AppHeader
        leading={
          <IconButton
            accessibilityLabel="Retour"
            icon={<Text style={styles.headerIcon}>‹</Text>}
            onPress={() => Alert.alert('Retour')}
            size={36}
            variant="ghost"
          />
        }
        subtitle="17 septembre"
        title="Aujourd'hui"
        trailing={
          <IconButton
            accessibilityLabel="Plus d'options"
            icon={<Text style={styles.moreIcon}>•••</Text>}
            onPress={() => Alert.alert('Options')}
            size={36}
            variant="ghost"
          />
        }
      />
      <BottomTabBar
        items={[
          {
            icon: <Image source={require('../../../../10_Assets_3D/02_Logo_eclair.png')} style={styles.tabIcon} />,
            label: 'Accueil',
            value: 'home',
          },
          {
            icon: <Image source={require('../../../../10_Assets_3D/03_Calendrier.png')} style={styles.tabIcon} />,
            label: 'Planning',
            value: 'calendar',
          },
          {
            icon: <Image source={require('../../../../10_Assets_3D/13_Trophee.png')} style={styles.tabIcon} />,
            label: 'Progrès',
            value: 'progress',
          },
        ]}
        onChange={setSelectedTab}
        value={selectedTab}
      />
    </View>
  );
}

function BodyPainSelectorPreview() {
  const [painAreas, setPainAreas] = useState<BodyPainSelection[]>(['left_elbow', 'right_knee']);
  const [painSide, setPainSide] = useState<BodyPainSide>('left');
  const [painNote, setPainNote] = useState('');
  const [noCurrentPain, setNoCurrentPain] = useState(false);

  const handleNoCurrentPain = (enabled: boolean) => {
    setNoCurrentPain(enabled);
    if (enabled) {
      setPainAreas([]);
      setPainNote('');
    }
  };

  return (
    <View style={styles.painPreview}>
      <BodyPainSelector
        disabled={noCurrentPain}
        onChange={setPainAreas}
        onSideChange={setPainSide}
        side={painSide}
        value={painAreas}
      />
      <TextField
        editable={!noCurrentPain}
        label="Préciser si nécessaire"
        maxLength={200}
        multiline
        onChangeText={setPainNote}
        placeholder="Ex. : douleur au genou droit lors de la course…"
        value={painNote}
      />
      <Card style={styles.painToggleCard}>
        <Toggle
          label="Aucune douleur actuellement"
          onValueChange={handleNoCurrentPain}
          value={noCurrentPain}
        />
      </Card>
      <Banner message="L’app ne remplace pas un avis médical." variant="info" />
      <Button onPress={() => Alert.alert('Douleurs enregistrées')} text="Continuer" />
    </View>
  );
}

export function ComponentLibraryScreen({ onOpenOnboarding }: { onOpenOnboarding: () => void }) {
  const [selectedPeriod, setSelectedPeriod] = useState('semaine');
  const [selectedObjective, setSelectedObjective] = useState('maintien');
  const [weight, setWeight] = useState(72.5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [boxerRewardSelected, setBoxerRewardSelected] = useState(true);
  const [selectedFrequency, setSelectedFrequency] = useState('three');
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Card>
            <Text style={styles.legend}>DESIGN SYSTEM · 01</Text>
            <Text style={styles.title}>Composants</Text>
            <Text style={styles.subtitle}>Le socle de Coac Heroes</Text>
            <Text style={styles.description}>
              Des éléments simples, cohérents et réutilisables pour construire chaque écran.
            </Text>
            <Button text="Découvrir l’onboarding" onPress={onOpenOnboarding} style={{ marginTop: 18 }} />
          </Card>

          <OnboardingComponentsPreview />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Boutons</Text>
              <Text style={styles.sectionLegend}>3 variantes</Text>
            </View>

            <View style={styles.examples}>
              <Button
                text="Principal · rayon 24"
                onPress={() => Alert.alert('Bouton principal')}
              />
              <Button
                hapticFeedback
                radius={16}
                text="Secondaire · rayon 16"
                variant="secondary"
                onPress={() => Alert.alert('Retour haptique activé')}
              />
              <Button
                hapticFeedback="medium"
                radius={30}
                text="Contour · rayon 30"
                variant="outline"
                onPress={() => Alert.alert('Rayon 30')}
              />
              <Button
                hapticFeedback="selection"
                radius="100%"
                text="Pilule · rayon 100 %"
                onPress={() => Alert.alert('Rayon 100 %')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Encarts</Text>
              <Text style={styles.sectionLegend}>icône seule</Text>
            </View>

            <Card style={styles.highlightCard}>
              <View style={styles.highlightList}>
                <CardHighlight
                  color="#ff5a3d"
                  icon={
                    <Image
                      source={require('../../../../10_Assets_3D/21_Flamme.png')}
                      style={styles.highlightIcon}
                    />
                  }
                  title="Série"
                  value="7 jours"
                />
                <CardHighlight
                  backgroundColor="lavender"
                  icon={
                    <Image
                      source={require('../../../../10_Assets_3D/03_Calendrier.png')}
                      style={styles.highlightIcon}
                    />
                  }
                />
                <CardHighlight
                  backgroundColor="#e7e8fd"
                  icon={
                    <Image
                      source={require('../../../../10_Assets_3D/13_Trophee.png')}
                      style={styles.highlightIcon}
                    />
                  }
                />
                <CardHighlight
                  backgroundColor="lilac"
                  icon={
                    <Image
                      source={require('../../../../10_Assets_3D/14_Halteres.png')}
                      style={styles.highlightIcon}
                    />
                  }
                />
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Progression</Text>
              <Text style={styles.sectionLegend}>4 exemples</Text>
            </View>

            <ProgressCardRow style={styles.progressRow}>
              {renderProgressCardExamples(progressCardExamples, styles.progressCard)}
            </ProgressCardRow>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Progression</Text>
              <Text style={styles.sectionLegend}>scrollable</Text>
            </View>

            <ProgressCardRow scrollable style={styles.progressRow}>
              {renderProgressCardExamples(progressCardExamples, styles.scrollableProgressCard)}
            </ProgressCardRow>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Progression</Text>
              <Text style={styles.sectionLegend}>3 blocs</Text>
            </View>

            <ProgressCardRow style={styles.progressRow}>
              {renderProgressCardExamples(
                progressCardExamples.slice(0, 3),
                styles.progressCard,
              )}
            </ProgressCardRow>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Barres de progression</Text>
              <Text style={styles.sectionLegend}>niveau</Text>
            </View>

            <LevelProgressCard
              icon={
                <Image
                  resizeMode="contain"
                  source={require('../../../../10_Assets_3D/13_Trophee.png')}
                  style={styles.levelIcon}
                />
              }
              progress={64}
              sectionTitle="Gamification"
              title="Niveau 8"
              value="320 / 500 XP"
              style={styles.levelProgressCard}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quêtes</Text>
              <Text style={styles.sectionLegend}>quotidien</Text>
            </View>

            <DailyQuests quests={dailyQuestExamples} style={styles.dailyQuests} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sélecteurs</Text>
              <Text style={styles.sectionLegend}>5 composants</Text>
            </View>

            <View style={styles.selectorList}>
              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Tabs animés</Text>
                <TabSelector
                  items={tabSelectorItems}
                  onChange={setSelectedPeriod}
                  value={selectedPeriod}
                />
              </View>

              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Pills</Text>
                <PillSelector
                  items={pillSelectorItems}
                  onChange={setSelectedObjective}
                  value={selectedObjective}
                />
              </View>

              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Poids V1</Text>
                <WeightSelectorV1 onChange={setWeight} value={weight} />
              </View>

              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Poids V2 · molette</Text>
                <WeightSelectorV2Preview />
              </View>

              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Toggle</Text>
                <Card style={styles.toggleCard}>
                  <Toggle
                    label="Notifications quotidiennes"
                    onValueChange={setNotificationsEnabled}
                    value={notificationsEnabled}
                  />
                </Card>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sélection</Text>
              <Text style={styles.sectionLegend}>carte · radio · case</Text>
            </View>

            <View style={styles.selectionList}>
              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Récompenses</Text>
                <View style={styles.rewardList}>
                  <SelectableCard
                    description="Première série complétée"
                    icon={
                      <Image
                        resizeMode="contain"
                        source={require('../../../../10_Assets_3D/04_Gants_de_boxe.png')}
                        style={styles.rewardIcon}
                      />
                    }
                    onPress={() => setBoxerRewardSelected((selected) => !selected)}
                    selected={boxerRewardSelected}
                    title="Retour du boxeur"
                  />
                  <SelectableCard
                    description="Encore 180 XP"
                    disabled
                    icon={
                      <Image
                        resizeMode="contain"
                        source={require('../../../../10_Assets_3D/09_Cadenas.png')}
                        style={styles.rewardIcon}
                      />
                    }
                    onPress={() => undefined}
                    selected={false}
                    style={styles.lockedReward}
                    title="Niveau 10"
                  />
                </View>
              </View>

              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Radio button</Text>
                <Card style={styles.selectionControlsCard}>
                  <RadioButton
                    label="3 séances par semaine"
                    onSelect={() => setSelectedFrequency('three')}
                    selected={selectedFrequency === 'three'}
                  />
                  <RadioButton
                    label="5 séances par semaine"
                    onSelect={() => setSelectedFrequency('five')}
                    selected={selectedFrequency === 'five'}
                  />
                </Card>
              </View>

              <View style={styles.selectorExample}>
                <Text style={styles.componentLabel}>Checkbox</Text>
                <Card style={styles.selectionControlsCard}>
                  <Checkbox
                    checked={weeklySummaryEnabled}
                    label="Recevoir mon bilan hebdomadaire"
                    onChange={setWeeklySummaryEnabled}
                  />
                </Card>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Formulaire</Text>
              <Text style={styles.sectionLegend}>champ · badge</Text>
            </View>

            <View style={styles.formList}>
              <TextFieldPreview />
              <View style={styles.badgeList}>
                <Badge label="Niveau 8" />
                <Badge label="Série validée" variant="success" />
                <Badge label="+200 XP" variant="energy" />
                <Badge label="À venir" variant="neutral" />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Douleurs</Text>
              <Text style={styles.sectionLegend}>corps interactif</Text>
            </View>

            <View style={styles.bodyPainExample}>
              <BodyPainSelectorPreview />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Feedback</Text>
              <Text style={styles.sectionLegend}>bannière · toast · overlays</Text>
            </View>

            <View style={styles.feedbackList}>
              <Banner
                actionLabel="Voir"
                message="Tu es à une séance de ta meilleure série."
                onAction={() => Alert.alert('Série')}
                title="Continue comme ça"
                variant="success"
              />
              <OverlayPreview />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>États d'écran</Text>
              <Text style={styles.sectionLegend}>chargement · vide · erreur</Text>
            </View>

            <View style={styles.stateList}>
              <Card style={styles.loadingCard}>
                <LoadingState label="Chargement des séances" />
                <View style={styles.skeletonList}>
                  <Skeleton width="72%" />
                  <Skeleton width="100%" />
                  <Skeleton width="48%" />
                </View>
              </Card>
              <Card>
                <EmptyState
                  description="Ajoute une séance pour commencer à suivre ta progression."
                  icon={
                    <Image
                      resizeMode="contain"
                      source={require('../../../../10_Assets_3D/03_Calendrier.png')}
                      style={styles.stateIcon}
                    />
                  }
                  onAction={() => Alert.alert('Nouvelle séance')}
                  title="Aucune séance"
                  actionLabel="Ajouter une séance"
                />
              </Card>
              <Card>
                <ErrorState
                  icon={
                    <Image
                      resizeMode="contain"
                      source={require('../../../../10_Assets_3D/15_Trousse_de_secours.png')}
                      style={styles.stateIcon}
                    />
                  }
                  onRetry={() => Alert.alert('Nouvel essai')}
                />
              </Card>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Date</Text>
              <Text style={styles.sectionLegend}>calendrier</Text>
            </View>

            <CalendarPreview />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Navigation</Text>
              <Text style={styles.sectionLegend}>header · tabs</Text>
            </View>

            <NavigationPreview />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  container: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  legend: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontFamily: fontFamily.extraBold,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 42,
    marginTop: 16,
  },
  subtitle: {
    color: '#111827',
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    lineHeight: 26,
    marginTop: 4,
  },
  description: {
    color: '#4b5563',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 24,
    marginTop: 16,
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#111827',
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  sectionLegend: {
    color: '#6b7280',
    fontFamily: fontFamily.medium,
    fontSize: 9,
  },
  examples: {
    gap: 12,
    marginTop: 16,
  },
  highlightCard: {
    marginTop: 16,
  },
  highlightList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  highlightIcon: {
    height: 44,
    width: 44,
  },
  progressRow: {
    marginTop: 16,
  },
  progressCard: {
    flex: 1,
    minWidth: 0,
  },
  scrollableProgressCard: {
    width: 160,
  },
  progressIcon: {
    height: '72%',
    width: '72%',
  },
  levelProgressCard: {
    marginTop: 16,
  },
  levelIcon: {
    height: 70,
    width: 70,
  },
  dailyQuests: {
    marginTop: 16,
  },
  selectorList: {
    gap: 20,
    marginTop: 16,
  },
  selectorExample: {
    gap: 8,
  },
  componentLabel: {
    color: '#6073a4',
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
  },
  toggleCard: {
    padding: 12,
  },
  selectionList: {
    gap: 20,
    marginTop: 16,
  },
  rewardList: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardIcon: {
    height: 90,
    width: 90,
  },
  lockedReward: {
    backgroundColor: '#f4f5ff',
  },
  selectionControlsCard: {
    gap: 14,
    padding: 16,
  },
  formList: {
    gap: 16,
    marginTop: 16,
  },
  fieldUnit: {
    color: '#6073a4',
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    marginLeft: 8,
  },
  badgeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedbackList: {
    gap: 12,
    marginTop: 16,
  },
  overlayPreview: {
    gap: 10,
  },
  overlayText: {
    color: '#6073a4',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  stateList: {
    gap: 12,
    marginTop: 16,
  },
  loadingCard: {
    padding: 12,
  },
  skeletonList: {
    gap: 9,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  stateIcon: {
    height: 64,
    width: 64,
  },
  navigationPreview: {
    gap: 12,
    marginTop: 16,
  },
  headerIcon: {
    color: colors.primary,
    fontFamily: fontFamily.regular,
    fontSize: 31,
    lineHeight: 32,
  },
  moreIcon: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 14,
    letterSpacing: 1,
    lineHeight: 16,
  },
  tabIcon: {
    height: 20,
    width: 20,
  },
  bodyPainExample: {
    marginTop: 16,
  },
  painPreview: {
    gap: 14,
  },
  painToggleCard: {
    padding: 14,
  },
});
