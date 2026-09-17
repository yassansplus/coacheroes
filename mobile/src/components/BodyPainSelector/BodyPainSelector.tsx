import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Card } from '@/components/Card';
import { TabSelector } from '@/components/TabSelector';
import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export const bodyPainAreas = [
  'shoulder',
  'elbow',
  'wrist',
  'back',
  'hip',
  'knee',
  'ankle',
  'heel',
  'other',
] as const;

export type BodyPainArea = (typeof bodyPainAreas)[number];
export type BodyPainSide = 'left' | 'right';
export type BodyPainSelection = `${BodyPainSide}_${BodyPainArea}`;

type BodyView = 'front' | 'back';

export type BodyPainAreaDefinition = {
  area: BodyPainArea;
  label: string;
  side?: BodyPainSide;
  view: BodyView;
  x: number;
  y: number;
};

type BodyPainSelectorProps = {
  backImage?: ImageSourcePropType;
  disabled?: boolean;
  frontImage?: ImageSourcePropType;
  onChange: (value: BodyPainSelection[]) => void;
  onSideChange: (side: BodyPainSide) => void;
  side: BodyPainSide;
  style?: StyleProp<ViewStyle>;
  value: readonly BodyPainSelection[];
};

const areaLabels: Record<BodyPainArea, string> = {
  shoulder: 'Épaule',
  elbow: 'Coude',
  wrist: 'Poignet',
  back: 'Dos',
  hip: 'Hanche',
  knee: 'Genou',
  ankle: 'Cheville',
  heel: 'Talon',
  other: 'Autre',
};

const defaultAreas: readonly BodyPainAreaDefinition[] = [
  { area: 'shoulder', label: 'Épaule', side: 'left', view: 'front', x: 29, y: 24 },
  { area: 'shoulder', label: 'Épaule', side: 'right', view: 'front', x: 71, y: 24 },
  { area: 'elbow', label: 'Coude', side: 'left', view: 'front', x: 23, y: 40 },
  { area: 'elbow', label: 'Coude', side: 'right', view: 'front', x: 77, y: 40 },
  { area: 'wrist', label: 'Poignet', side: 'left', view: 'front', x: 19, y: 52 },
  { area: 'wrist', label: 'Poignet', side: 'right', view: 'front', x: 81, y: 52 },
  { area: 'back', label: 'Dos', side: 'left', view: 'back', x: 42, y: 38 },
  { area: 'back', label: 'Dos', side: 'right', view: 'back', x: 58, y: 38 },
  { area: 'hip', label: 'Hanche', side: 'left', view: 'front', x: 43, y: 53 },
  { area: 'hip', label: 'Hanche', side: 'right', view: 'front', x: 57, y: 53 },
  { area: 'knee', label: 'Genou', side: 'left', view: 'front', x: 43, y: 69 },
  { area: 'knee', label: 'Genou', side: 'right', view: 'front', x: 57, y: 69 },
  { area: 'ankle', label: 'Cheville', side: 'left', view: 'front', x: 42, y: 88 },
  { area: 'ankle', label: 'Cheville', side: 'right', view: 'front', x: 58, y: 88 },
  { area: 'heel', label: 'Talon', side: 'left', view: 'back', x: 42, y: 94 },
  { area: 'heel', label: 'Talon', side: 'right', view: 'back', x: 58, y: 94 },
];

const defaultFrontImage = require('../../../10_Assets_3D/22_Corps_face.png');
const defaultBackImage = require('../../../10_Assets_3D/23_Corps_dos.png');

function makeSelection(area: BodyPainArea, side: BodyPainSide): BodyPainSelection {
  return `${side}_${area}`;
}

function toggleArea(value: readonly BodyPainSelection[], selection: BodyPainSelection) {
  return value.includes(selection)
    ? value.filter((item) => item !== selection)
    : [...value, selection];
}

type BodyFigureProps = {
  definitions: readonly BodyPainAreaDefinition[];
  disabled: boolean;
  image: ImageSourcePropType;
  onToggle: (selection: BodyPainSelection) => void;
  selectedAreas: readonly BodyPainSelection[];
  selectedSide: BodyPainSide;
  view: BodyView;
};

function BodyFigure({
  definitions,
  disabled,
  image,
  onToggle,
  selectedAreas,
  selectedSide,
  view,
}: BodyFigureProps) {
  const viewLabel = view === 'front' ? 'Vue de face' : 'Vue de dos';

  return (
    <View style={styles.figureColumn}>
      <View style={styles.figure}>
        <Image accessibilityLabel={viewLabel} resizeMode="contain" source={image} style={styles.bodyImage} />
        {definitions
          .filter((definition) => definition.view === view && definition.side)
          .map((definition) => {
            const selection = makeSelection(definition.area, definition.side as BodyPainSide);
            const selected = selectedAreas.includes(selection);
            const sideLabel = definition.side === 'left' ? 'gauche' : 'droite';

            if (!selected && definition.side !== selectedSide) {
              return null;
            }

            return (
              <Pressable
                key={selection}
                accessibilityLabel={`${definition.label} ${sideLabel}${selected ? ', sélectionné' : ''}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                hitSlop={6}
                onPress={() => onToggle(selection)}
                style={({ pressed }) => [
                  styles.zoneHitArea,
                  { left: `${definition.x}%`, top: `${definition.y}%` },
                  pressed && !disabled && styles.zonePressed,
                ]}
              >
                <View style={[styles.zoneMarker, !selected && styles.inactiveZoneMarker]} />
              </Pressable>
            );
          })}
      </View>
      <Text style={styles.viewLabel}>{viewLabel}</Text>
    </View>
  );
}

/**
 * Sélecteur de zones de douleur à partir de deux silhouettes, sans persistance.
 * Le parent conserve et enregistre les identifiants sélectionnés.
 */
export function BodyPainSelector({
  backImage = defaultBackImage,
  disabled = false,
  frontImage = defaultFrontImage,
  onChange,
  onSideChange,
  side,
  style,
  value,
}: BodyPainSelectorProps) {
  const handleToggle = (selection: BodyPainSelection) => {
    onChange(toggleArea(value, selection));
  };

  return (
    <View style={[styles.container, disabled && styles.disabled, style]}>
      <TabSelector
        items={[
          { label: 'Gauche', value: 'left' },
          { label: 'Droite', value: 'right' },
        ]}
        onChange={(nextSide) => onSideChange(nextSide as BodyPainSide)}
        value={side}
      />

      <Card style={styles.bodyCard}>
        <View style={styles.figures}>
          <BodyFigure
            definitions={defaultAreas}
            disabled={disabled}
            image={frontImage}
            onToggle={handleToggle}
            selectedAreas={value}
            selectedSide={side}
            view="front"
          />
          <BodyFigure
            definitions={defaultAreas}
            disabled={disabled}
            image={backImage}
            onToggle={handleToggle}
            selectedAreas={value}
            selectedSide={side}
            view="back"
          />
        </View>
      </Card>

      <View style={styles.areaList}>
        {bodyPainAreas.map((area) => {
          const selection = makeSelection(area, side);
          const selected = value.includes(selection);

          return (
            <Pressable
              key={area}
              accessibilityLabel={`${areaLabels[area]} ${side === 'left' ? 'gauche' : 'droite'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => handleToggle(selection)}
              style={({ pressed }) => [styles.areaButton, pressed && !disabled && styles.areaPressed]}
            >
              {selected ? (
                <LinearGradient
                  colors={gradients.primary}
                  end={{ x: 1, y: 0 }}
                  start={{ x: 0, y: 0 }}
                  style={styles.selectedAreaBackground}
                />
              ) : null}
              {selected ? <Text style={styles.areaCheck}>✓</Text> : null}
              <Text style={[styles.areaLabel, selected && styles.selectedAreaLabel]}>{areaLabels[area]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  bodyCard: {
    padding: 10,
  },
  figures: {
    flexDirection: 'row',
    gap: 4,
  },
  figureColumn: {
    flex: 1,
  },
  figure: {
    aspectRatio: 2 / 3,
    position: 'relative',
  },
  bodyImage: {
    height: '100%',
    width: '100%',
  },
  viewLabel: {
    color: '#6073a4',
    fontFamily: fontFamily.medium,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  zoneHitArea: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: -20,
    marginTop: -20,
    position: 'absolute',
    width: 40,
  },
  zonePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.9 }],
  },
  zoneMarker: {
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 4,
    height: 20,
    shadowColor: colors.primary,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 5,
    width: 20,
  },
  inactiveZoneMarker: {
    backgroundColor: '#cdd7e8',
    shadowColor: 'transparent',
    shadowOpacity: 0,
  },
  areaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#dce6f5',
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: '20%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  selectedAreaBackground: {
    ...StyleSheet.absoluteFill,
  },
  areaPressed: {
    opacity: 0.74,
  },
  areaCheck: {
    color: colors.surface,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    zIndex: 1,
  },
  areaLabel: {
    color: '#27375d',
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    zIndex: 1,
  },
  selectedAreaLabel: {
    color: colors.surface,
  },
});
