import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Motion } from '@/components/Motion';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type OnboardingLayoutProps = {
  step: number;
  editing?: boolean;
  children: ReactNode;
  onBack: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onOptions?: () => void;
  nextLabel?: string;
  error?: string | null;
  footer?: ReactNode;
  completed?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function OnboardingLayout({ step, editing = false, children, onBack, onNext, onSkip, onOptions,
  nextLabel = 'Continuer', error, footer, completed = false, contentStyle }: OnboardingLayoutProps) {
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step, completed]);
  return <View style={styles.root}>
    <LinearGradient colors={gradients.onboarding} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={gradients.decoration} style={styles.topShape} />
      <LinearGradient colors={gradients.decoration} style={styles.bottomShape} />
    </View>
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step > 1 && !completed ? <View style={styles.header}>
          <View style={styles.headerRow}>
            {step !== 15 ? <IconButton accessibilityLabel={editing ? 'Retour au profil sans enregistrer' : 'Étape précédente'} variant="ghost" icon={<Symbol name="back" />} onPress={onBack} /> : <View style={styles.headerSpacer} />}
            <Text accessibilityLiveRegion="polite" style={styles.step}>{editing ? 'Modifier mon profil' : `${step} sur 16`}</Text>
            <View style={styles.headerAction}>
              {onSkip ? <Button variant="secondary" backgroundColor="transparent" textColor={colors.primary} text={step === 10 ? 'Ignorer' : 'Passer'} onPress={onSkip} style={styles.skip} textStyle={styles.skipText} /> :
                onOptions ? <IconButton accessibilityLabel="Options de l’étape" variant="surface" icon={<Symbol name="more" />} onPress={onOptions} /> : null}
            </View>
          </View>
          {step !== 15 && !editing ? <ProgressBar progress={step / 16 * 100} height={6} trackColor={colors.border} style={styles.progress} /> : null}
        </View> : null}
        <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <Motion trigger={step} style={[styles.content, step === 1 && styles.welcomeContent, contentStyle]}>{children}</Motion>
        </ScrollView>
        {onNext || footer ? <View style={styles.footer}>
          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
          {footer}
          {onNext ? <Button hapticFeedback text={nextLabel} onPress={onNext} radius={24}
            style={styles.continue} textStyle={styles.continueText} trailing={<Symbol name="arrow" color="white" size={23} />} /> : null}
        </View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' }, safeArea: { flex: 1 },
  topShape: { position: 'absolute', width: 290, height: 290, borderRadius: 180, top: -180, right: -115, opacity: 0.5 },
  bottomShape: { position: 'absolute', width: 360, height: 460, borderRadius: 220, bottom: -290, left: -170, transform: [{ rotate: '-25deg' }], opacity: 0.55 },
  header: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16 },
  headerRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 44 }, step: { color: colors.textSecondary, fontFamily: fontFamily.semiBold, fontSize: 13 },
  headerAction: { width: 66, alignItems: 'flex-end' }, skip: { paddingHorizontal: 0, minHeight: 44 }, skipText: { fontSize: 12 },
  progress: { marginTop: 5 },
  scroll: { flex: 1 }, scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, gap: 18 },
  welcomeContent: { paddingTop: 0, paddingBottom: 8 },
  footer: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 10 },
  continue: { minHeight: 54 }, continueText: { fontSize: 16 },
  error: { fontFamily: fontFamily.medium, color: colors.energy, fontSize: 12, lineHeight: 17 },
});
