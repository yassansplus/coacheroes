import { HStack, VStack, Text, Image, Link, Spacer, ProgressView } from '@expo/ui/swift-ui';
import { background, containerBackground, cornerRadius, font, foregroundStyle, frame, lineLimit, minimumScaleFactor, padding, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { HomeWidgetSnapshot } from './model';

function TodayWidget(props: HomeWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  // This function is serialized into WidgetKit. All theme and translated copy arrives in props.
  // WidgetKit can request a placeholder with empty props when presenting its gallery.
  if (!props.palette) return <VStack modifiers={[font({ family: 'Montserrat-Bold', size: 18 }), containerBackground({ type: 'material', material: 'thin' }, 'widget')]}><Image systemName="bolt.fill" size={28} /><Text>COAC HEROES</Text></VStack>;
  const c = props.palette;
  const large = environment.widgetFamily === 'systemLarge';
  const gradient = { type: 'linearGradient' as const, colors: [c.primary, c.accent], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  const bold = (size: number) => font({ family: 'Montserrat-Bold', size });
  const regular = (size: number) => font({ family: 'Montserrat-Medium', size });
  return (
    <VStack alignment="leading" spacing={large ? 16 : 7} modifiers={[
      padding({ all: large ? 16 : 12 }), frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      containerBackground(c.surface, 'widget'), widgetURL('coac-heroes:///'),
    ]}>
      <HStack spacing={7}>
        <Image systemName="bolt.fill" size={13} color={c.white} modifiers={[padding({ all: large ? 6 : 4 }), background(gradient), cornerRadius(9)]} />
        <Text modifiers={[bold(11), foregroundStyle(c.text)]}>COAC HEROES</Text>
        <Spacer />
        <Text modifiers={[regular(9), foregroundStyle(c.primary), lineLimit(1), padding({ horizontal: 7, vertical: 4 }), background(c.primarySurface), cornerRadius(8)]}>{props.heading}</Text>
      </HStack>
      <HStack alignment="top" spacing={12}>
        <Link destination="coac-heroes:///nutrition" modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <VStack alignment="leading" spacing={large ? 8 : 3}>
            <HStack spacing={4}>
              <Image systemName="flame.fill" size={11} color={c.energy} />
              <Text modifiers={[regular(10), foregroundStyle(c.textSecondary)]}>{props.caloriesLabel}</Text>
            </HStack>
            <Text modifiers={[bold(large ? 40 : 28), foregroundStyle(c.text), lineLimit(1), minimumScaleFactor(0.65)]}>{props.calories}</Text>
            <Text modifiers={[regular(9), foregroundStyle(c.textSecondary), lineLimit(1), minimumScaleFactor(0.7)]}>{props.goal}</Text>
            <ProgressView value={props.progress} modifiers={[tint(c.energy), padding({ top: 3 })]} />
            {large ? <Text modifiers={[regular(10), foregroundStyle(c.energy), lineLimit(2)]}>{props.remaining}</Text> : null}
          </VStack>
        </Link>
        <Link destination="coac-heroes:///program" modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <VStack alignment="leading" spacing={large ? 12 : 5} modifiers={[padding({ all: large ? 14 : 8 }), frame({ maxWidth: Infinity, alignment: 'leading' }), background(gradient), cornerRadius(16)]}>
            <HStack spacing={5}>
              <Image systemName={props.workoutDone ? 'checkmark.seal.fill' : 'dumbbell.fill'} size={13} color={c.white} />
              <Text modifiers={[regular(9), foregroundStyle(c.white), lineLimit(1), minimumScaleFactor(0.7)]}>{props.workoutLabel}</Text>
            </HStack>
            <Text modifiers={[bold(large ? 16 : 12), foregroundStyle(c.white), lineLimit(2), minimumScaleFactor(0.7)]}>{props.workout}</Text>
            <Text modifiers={[regular(9), foregroundStyle(c.white), lineLimit(1), minimumScaleFactor(0.65)]}>{props.workoutDetail}</Text>
          </VStack>
        </Link>
      </HStack>
      {large ? <Spacer /> : null}
      <Link destination={props.signedIn ? 'coac-heroes:///squad' : 'coac-heroes:///'}>
        <VStack alignment="leading" spacing={8} modifiers={[padding({ horizontal: 10, vertical: large ? 12 : 7 }), frame({ maxWidth: Infinity, alignment: 'leading' }), background(c.accentSurface), cornerRadius(12)]}>
          <HStack spacing={6}>
            <Image systemName="person.2.fill" size={11} color={c.squadPurple} />
            <Text modifiers={[large ? bold(11) : regular(9), foregroundStyle(c.text), lineLimit(1), minimumScaleFactor(0.75)]}>{large ? props.squadLabel : props.news[0] || props.emptyNews}</Text>
            <Spacer minLength={0} />
            <Image systemName="chevron.right" size={8} color={c.squadPurple} />
          </HStack>
          {large ? (props.news.length ? props.news : [props.emptyNews]).map((news, i) => <Text key={i} modifiers={[regular(11), foregroundStyle(c.textSecondary), lineLimit(2)]}>{news}</Text>) : null}
        </VStack>
      </Link>
      {large && props.updated ? <Text modifiers={[regular(8), foregroundStyle(c.textMuted)]}>{props.updated}</Text> : null}
    </VStack>
  );
}

export default createWidget('CoacHeroesToday', TodayWidget);
