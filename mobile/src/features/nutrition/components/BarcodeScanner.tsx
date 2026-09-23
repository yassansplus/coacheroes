import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { s } from './NutritionUI';

export function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [permission, request] = useCameraPermissions();
  const scanned = useRef(false);
  useEffect(() => { if (permission?.status === 'undetermined') void request(); }, [permission?.status, request]);
  if (!permission?.granted) return <View style={{ gap: 14 }}><Text style={s.muted}>Autorise la caméra pour scanner le code-barres.</Text><Button text="Activer la caméra" onPress={() => void request()} /><Button text="Retour à la recherche" variant="outline" onPress={onClose} /></View>;
  return <View style={{ gap: 14 }}><CameraView style={{ height: 260, borderRadius: 24, overflow: 'hidden' }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean8', 'ean13', 'upc_a', 'upc_e'] }} onBarcodeScanned={event => { if (scanned.current) return; scanned.current = true; onScan(event.data); }} /><Text style={s.muted}>Place le code-barres dans le cadre.</Text><Button text="Retour à la recherche" variant="outline" onPress={onClose} /></View>;
}
