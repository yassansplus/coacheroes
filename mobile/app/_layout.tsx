import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { imageAssets, preloadAppImages } from '@/config/preloadAssets';
import { ImageWarmup } from '@/components/ImageWarmup';
import { AppProviders } from '@/providers/AppProviders';
import { colors } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imagesDecoded, setImagesDecoded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    let mounted = true;

    void preloadAppImages().finally(() => {
      if (mounted) {
        setImagesLoaded(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && imagesLoaded && imagesDecoded) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded, imagesLoaded, imagesDecoded]);

  if ((!fontsLoaded && !fontError) || !imagesLoaded || !imagesDecoded) {
    return imagesDecoded ? null : <ImageWarmup sources={imageAssets} onReady={() => setImagesDecoded(true)} />;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }} />
    </AppProviders>
  );
}
