import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { AppState, Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type CameraCaptureProps = {
  value?: string;
  onChange: (uri: string | undefined) => void;
  label?: string;
};

/** Inline camera; the parent owns the photo URI. No upload or persistence. */
export function CameraCapture({ value, onChange, label = 'Place le repas dans le cadre' }: CameraCaptureProps) {
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  const generation = useRef(0);
  const requested = useRef(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cameraFailed, setCameraFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state === 'active') void refreshPermission().catch(() => undefined);
      if (state !== 'active') { generation.current++; setReady(false); }
    });
    return () => { mounted.current = false; generation.current++; listener.remove(); };
  }, [refreshPermission]);

  async function authorize() {
    try { await requestPermission(); }
    catch { if (mounted.current) setError('Impossible d’accéder à la caméra. Tu peux importer une photo.'); }
  }
  useEffect(() => {
    if (!value && permission?.status === 'undetermined' && !requested.current) {
      requested.current = true;
      void authorize();
    }
  }, [permission?.status, value]);

  async function capture() {
    if (locked.current || !ready || !camera.current) return;
    locked.current = true; setBusy(true); setError('');
    const currentGeneration = generation.current;
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.85 });
      if (mounted.current && currentGeneration === generation.current && photo?.uri) {
        setReady(false); onChange(photo.uri);
      }
    } catch { if (mounted.current) setError('La photo n’a pas pu être prise. Réessaie ou utilise la galerie.'); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  async function importPhoto() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
      if (mounted.current && !result.canceled && result.assets[0]?.uri) { setReady(false); onChange(result.assets[0].uri); }
    } catch { if (mounted.current) setError('Impossible d’ouvrir la galerie. Réessaie.'); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  const live = !value && permission?.granted && foreground && !cameraFailed;
  return <View style={styles.container}>
    <View style={styles.frame} accessibilityLabel="Cadre de prise de photo">
      {value ? <Image source={{ uri: value }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} accessibilityLabel="Photo sélectionnée" /> : live ?
        <CameraView key={`${facing}-${attempt}`} ref={camera} style={StyleSheet.absoluteFill} facing={facing} mode="picture" flash={flash && facing === 'back' ? 'on' : 'off'} onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setCameraFailed(true); setError('Caméra indisponible. Tu peux réessayer ou importer une photo.'); }} /> :
        <View style={styles.permission}><Symbol name="camera" size={38} color="primary" />
          <Text style={styles.help}>{cameraFailed ? 'Caméra indisponible' : !foreground ? 'Caméra en pause' : permission?.granted ? 'Préparation de la caméra…' : 'Autorise la caméra pour photographier ton repas ici.'}</Text>
          {!permission?.granted && permission ? <Button text={permission.canAskAgain ? 'Activer la caméra' : 'Ouvrir les réglages'} onPress={() => { if (permission.canAskAgain) void authorize(); else void Linking.openSettings().catch(() => setError('Autorise la caméra dans les réglages de ton appareil ou du navigateur.')); }} /> : null}
          {cameraFailed ? <Button text="Réessayer" variant="outline" onPress={() => { setError(''); setCameraFailed(false); setAttempt(current => current + 1); }} /> : null}
        </View>}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>{[0, 1, 2, 3].map(corner => <View key={corner} style={[styles.corner, corner < 2 ? { top: 20, borderTopWidth: 4 } : { bottom: 20, borderBottomWidth: 4 }, corner % 2 ? { right: 20, borderRightWidth: 4 } : { left: 20, borderLeftWidth: 4 }]} />)}</View>
      <Text pointerEvents="none" style={styles.caption}>{value ? 'Photo prête à être utilisée' : label}</Text>
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.controls}>
      <Button text={flash ? 'Flash activé' : 'Flash'} leading={<Symbol name="flash" color={flash ? 'primary' : 'text'} />} variant="secondary" disabled={!live || busy || facing !== 'back' || Platform.OS === 'web'} containerStyle={styles.control} style={styles.controlButton} textStyle={styles.controlLabel} onPress={() => setFlash(!flash)} />
      <Button text="Galerie" leading={<Symbol name="image" />} variant="secondary" disabled={busy} containerStyle={styles.control} style={styles.controlButton} textStyle={styles.controlLabel} onPress={() => void importPhoto()} />
      <Button text={value ? 'Reprendre' : 'Retourner'} leading={<Symbol name="flip" />} variant="secondary" disabled={busy || (!value && !live)} containerStyle={styles.control} style={styles.controlButton} textStyle={styles.controlLabel} onPress={() => { setReady(false); if (value) onChange(undefined); else setFacing(current => current === 'back' ? 'front' : 'back'); }} />
    </View>
    {!value ? <View style={styles.shutter}><IconButton size={70} variant="outline" accessibilityLabel="Prendre la photo" disabled={!live || !ready || busy} icon={<Symbol name="camera" size={28} color="primary" />} onPress={() => void capture()} /></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  frame: { width: '100%', aspectRatio: 0.83, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.primarySurface },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 34, gap: 16 },
  help: { fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  corner: { position: 'absolute', width: 35, height: 35, borderColor: colors.white, borderRadius: 8 },
  caption: { position: 'absolute', bottom: 26, alignSelf: 'center', maxWidth: '85%', textAlign: 'center', backgroundColor: colors.textSecondary, color: colors.white, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, overflow: 'hidden', fontFamily: fontFamily.semiBold, fontSize: 12 },
  controls: { flexDirection: 'row', gap: 8 }, control: { flex: 1, minWidth: 0 },
  controlButton: { backgroundColor: colors.primarySurface, flexDirection: 'column', paddingHorizontal: 3, paddingVertical: 10, gap: 8 },
  controlLabel: { fontSize: 11 }, shutter: { alignSelf: 'center' },
  error: { color: colors.energy, fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 18 },
});
