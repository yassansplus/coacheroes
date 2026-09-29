import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { Text } from '@/components/LocalizedText';
import { useAppStarting } from '@/providers/AppStartupContext';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { localizeLabel } from '@/i18n/core';

export function SplashPreviewScreen({ onClose }: { onClose: () => void }) {
  const starting = useAppStarting();
  const [run, setRun] = useState(1);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!visible || starting) return;
    const timer = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(timer);
  }, [run, starting, visible]);
  return <View style={styles.root}>
    <SafeAreaView style={styles.safe} accessibilityElementsHidden={visible} importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>
      <AppHeader title="Splash animé" leading={<IconButton accessibilityLabel={localizeLabel('Retour')} icon={<Symbol name="back" />} onPress={onClose} />} />
      <View style={styles.content}>
        <Text style={styles.description}>Le monogramme, les couleurs et les reflets reprennent l’icône de Coac Heroes.</Text>
        <Button text="Rejouer le splash" onPress={() => { setReady(false); setVisible(true); setRun(current => current + 1); }} />
        <Button text="Revenir à la bibliothèque" variant="outline" onPress={onClose} />
      </View>
    </SafeAreaView>
    {visible && !starting ? <AnimatedSplash key={run} ready={ready} onFinish={() => setVisible(false)} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  content: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  description: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 22 },
});
