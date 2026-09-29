import {
  Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold,
  Montserrat_700Bold, Montserrat_800ExtraBold, useFonts,
} from '@expo-google-fonts/montserrat';
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { ImageWarmup } from '@/components/ImageWarmup';
import { imageAssets, preloadAppImages } from '@/config/preloadAssets';
import { appBrand } from '@/config/brand';
import { restoreLanguage } from '@/storage/language';
import { colors } from '@/theme/colors';
import { AppProviders } from './AppProviders';
import { useSession } from './SessionProvider';
import { AppStartupContext, useAppStarting } from './AppStartupContext';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function LaunchTransition({ children, onFinish }: PropsWithChildren<{ onFinish: () => void }>) {
  const { loading } = useSession();
  const visible = useAppStarting();
  const releaseNativeSplash = useCallback(async () => {
    try { await SplashScreen.hideAsync(); }
    catch { /* Expo Go/web can run the animation without a native splash bridge. */ }
  }, []);
  return <View style={styles.app}>
    <StatusBar style="dark" />
    <View style={styles.app} pointerEvents={visible ? 'none' : 'auto'} accessibilityElementsHidden={visible}
      importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>{children}</View>
    {visible ? <AnimatedSplash ready={!loading} onPresented={releaseNativeSplash} onFinish={onFinish} /> : null}
  </View>;
}

/** Fonts and image decoding remain hidden by the native splash; session restore uses the animated one. */
export function AppBootstrap({ children }: PropsWithChildren) {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imagesDecoded, setImagesDecoded] = useState(false);
  const [starting, setStarting] = useState(true);
  const finish = useCallback(() => setStarting(false), []);
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold,
  });
  useEffect(() => {
    let active = true;
    void Promise.all([preloadAppImages(), restoreLanguage()]).finally(() => { if (active) setImagesLoaded(true); });
    return () => { active = false; };
  }, []);
  const resourcesReady = (fontsLoaded || fontError) && imagesLoaded && imagesDecoded;
  return <View style={styles.root}>
    {!imagesDecoded ? <ImageWarmup sources={imageAssets} onReady={() => setImagesDecoded(true)} /> : null}
    {resourcesReady ? <AppStartupContext.Provider value={starting}><AppProviders>
      <LaunchTransition onFinish={finish}>{children}</LaunchTransition>
    </AppProviders></AppStartupContext.Provider> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appBrand.splashBackground },
  app: { flex: 1, backgroundColor: colors.background },
});
