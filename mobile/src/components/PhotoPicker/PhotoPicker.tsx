import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type PhotoPickerProps = { label: string; value?: string; onChange: (uri: string | undefined) => void; disabled?: boolean; variant?: 'tile' | 'frame' };

/** The parent owns the URI; this component never uploads or persists a photo. */
export function PhotoPicker({ label, value, onChange, disabled = false, variant = 'tile' }: PhotoPickerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function pick(camera: boolean) {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setError('Autorise l’accès à l’appareil photo dans les réglages, ou choisis une photo.'); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]?.uri) { onChange(result.assets[0].uri); setOpen(false); }
    } catch { setError('Impossible d’ouvrir les photos. Tu peux réessayer ou passer cette étape.'); }
    finally { setBusy(false); }
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${value ? 'Modifier' : 'Ajouter'} la photo : ${label}`}
      disabled={disabled} style={[styles.tile, variant === 'frame' && styles.frame]} onPress={() => { setError(''); setOpen(true); }}>
      {value ? <Image source={{ uri: value }} fadeDuration={0} style={[styles.photo, variant === 'frame' && { bottom: 0 }]} resizeMode="cover" /> :
        <View style={styles.camera}><Symbol name="camera" size={30} color="textSecondary" /><View style={styles.plus}><Symbol name="plus" size={12} color="white" /></View></View>}
      {variant === 'frame' ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>{[0, 1, 2, 3].map(corner => <View key={corner} style={[styles.corner, corner < 2 ? { top: 20, borderTopWidth: 4 } : { bottom: 20, borderBottomWidth: 4 }, corner % 2 ? { right: 20, borderRightWidth: 4 } : { left: 20, borderLeftWidth: 4 }]} />)}</View> : null}
      <Text style={[styles.label, variant === 'frame' && styles.frameLabel]}>{label}</Text>
    </Pressable>
    <BottomSheet visible={open} onClose={() => { if (!busy) setOpen(false); }} title={`Photo · ${label}`}>
      <View style={styles.actions}>
        <Button disabled={busy} text="Choisir une photo" onPress={() => void pick(false)} />
        {Platform.OS !== 'web' ? <Button disabled={busy} variant="outline" text="Prendre une photo" onPress={() => void pick(true)} /> : null}
        {value ? <Button disabled={busy} variant="secondary" text="Retirer la photo" onPress={() => { onChange(undefined); setOpen(false); }} /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Text style={styles.help}>Cette photo reste sur ton appareil pendant cette session.</Text>
      </View>
    </BottomSheet>
  </>;
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, aspectRatio: 0.68, backgroundColor: colors.primarySurface, borderWidth: 1,
    borderColor: colors.border, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  camera: { padding: 15, backgroundColor: colors.primaryTint, borderRadius: 60 },
  plus: { position: 'absolute', bottom: 10, right: 10, backgroundColor: colors.textSecondary, borderRadius: 8, padding: 2 },
  photo: { ...StyleSheet.absoluteFill, bottom: 34 },
  label: { position: 'absolute', bottom: 12, fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.text },
  actions: { gap: 12 }, error: { color: colors.energy, fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 18 },
  help: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
  frame: { flex: 0, flexBasis: 'auto', flexShrink: 0, width: '100%', aspectRatio: 0.83, borderRadius: 24, borderWidth: 0 },
  corner: { position: 'absolute', width: 35, height: 35, borderColor: colors.white, borderRadius: 8 },
  frameLabel: { bottom: 26, backgroundColor: colors.textSecondary, color: colors.white, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, overflow: 'hidden' },
});
