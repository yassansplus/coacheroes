import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { Motion } from '@/components/Motion';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';

export type DropdownMenuItem = { label: string; onPress: () => void; destructive?: boolean };
/** Anchored below a screen header, using the same surface as the programme menu. */
export function DropdownMenu({ visible, onClose, items }: { visible: boolean; onClose: () => void; items: DropdownMenuItem[] }) {
  useEffect(() => { if (!visible) return; const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; }); return () => subscription.remove(); }, [visible, onClose]);
  if (!visible) return null;
  return <View style={StyleSheet.absoluteFill} accessibilityViewIsModal onAccessibilityEscape={onClose}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Fermer les options" onPress={onClose} />
    <Motion style={styles.menu}><Card style={{ padding: 0, gap: 10 }}>{items.map(item => <Button key={item.label} variant="secondary" text={item.label} textColor={item.destructive ? colors.energy : colors.text} onPress={() => { onClose(); item.onPress(); }} />)}</Card></Motion>
  </View>;
}
const styles = StyleSheet.create({ menu: { position: 'absolute', top: 58, right: 0, left: 40, padding: 14, gap: 10, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, elevation: 8, shadowColor: colors.text, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 5 } } });
