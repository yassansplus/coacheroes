import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type BottomSheetProps = PropsWithChildren<{
  footer?: ReactNode;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
  title?: string;
  visible: boolean;
}>;

export function BottomSheet({ children, footer, onClose, style, title, visible }: BottomSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.sheet, style]}>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(15, 25, 55, 0.34)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#dce4f2',
    borderRadius: 100,
    height: 4,
    marginBottom: 18,
    width: 42,
  },
  title: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 18,
    marginBottom: 16,
  },
  footer: {
    marginTop: 20,
  },
});
