import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type AppModalProps = PropsWithChildren<{
  actions?: ReactNode;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
  title?: string;
  visible: boolean;
}>;

/** Dialogue centré. Son nom évite la collision avec le Modal natif. */
export function AppModal({ actions, children, onClose, style, title, visible }: AppModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.dialog, style]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 25, 55, 0.34)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 420,
    padding: 24,
    width: '100%',
  },
  title: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 18,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
});
