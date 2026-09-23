import { useEffect, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button } from '@/components/Button';
import { Illustration } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export function WelcomeStep({ onStart, onLogin, onOpenLibrary, busy = false }: {
  busy?: boolean; onStart: () => void; onLogin: () => void; onOpenLibrary: () => void;
}) {
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(value => { if (active) setAppleAvailable(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const { height, width } = useWindowDimensions();
  return <View style={styles.container}>
    <View style={[styles.brand, { paddingTop: Math.max(26, Math.min(74, height * 0.07)) }]}>
      <View style={styles.logo}><Illustration name="logo" size={54} /></View>
      <Text style={styles.name}>FitBuddy</Text>
      <Text style={styles.tagline}>Ton programme, basé sur tes données.</Text>
    </View>
    <Illustration name="welcome" style={[styles.hero, { height: Math.min(360, Math.max(215, Math.min(width * 0.76, height * 0.34))) }]} />
    <View style={styles.actions}>
      {appleAvailable ? <View pointerEvents={busy ? 'none' : 'auto'} style={{ opacity: busy ? 0.5 : 1 }}>
        <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={23}
          onPress={onStart} style={{ width: '100%', height: 56 }} />
      </View> : <Button disabled={busy} text="Continuer avec Apple" backgroundColor={colors.text}
        leading={<Symbol name="apple" size={26} color="white" />} onPress={onStart} style={styles.button} textStyle={styles.buttonText} />}
      <View style={styles.loginRow}><View style={styles.line} />
        <Button disabled={busy} text="J’ai déjà un compte" variant="secondary" backgroundColor="transparent" textColor={colors.primary}
          onPress={onLogin} textStyle={styles.loginText} style={styles.login} />
        <View style={styles.line} />
      </View>
    </View>
    <View style={styles.privacy}><Symbol name="lock" size={15} color="textMuted" /><Text style={styles.privacyText}>Tes données restent privées.</Text></View>
    <Button text="Bibliothèque de composants" variant="secondary" backgroundColor="transparent" textColor={colors.textMuted}
      onPress={onOpenLibrary} textStyle={styles.libraryText} style={styles.library} />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 10, justifyContent: 'space-between' },
  brand: { alignItems: 'center', gap: 12 }, logo: { borderRadius: 23, backgroundColor: colors.surface, padding: 12 },
  name: { color: colors.text, fontSize: 42, fontFamily: fontFamily.extraBold, letterSpacing: -1.5 },
  tagline: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  hero: { width: '112%', marginLeft: '-6%', alignSelf: 'center' },
  actions: { gap: 10, paddingHorizontal: 6 }, button: { minHeight: 56, borderRadius: 23 }, buttonText: { fontSize: 15 },
  loginRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  line: { height: 1, backgroundColor: colors.border, flex: 1 }, login: { paddingHorizontal: 8 }, loginText: { fontSize: 12 },
  privacy: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  privacyText: { color: colors.textMuted, fontSize: 11, fontFamily: fontFamily.medium },
  library: { minHeight: 35 }, libraryText: { fontSize: 10 },
});
