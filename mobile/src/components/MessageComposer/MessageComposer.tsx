import { Image, StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';

type MessageComposerProps = {
  value: string; onChange: (text: string) => void; onSend: () => void;
  placeholder?: string; disabled?: boolean; image?: string; onRemoveImage?: () => void;
  onAttach?: () => void; onDictate?: () => void; focusRequest?: number;
};
export function MessageComposer({ value, onChange, onSend, placeholder = 'Pose une question', disabled, image, onRemoveImage, onAttach, onDictate, focusRequest }: MessageComposerProps) {
  return <View style={styles.container}>
    {image ? <View style={styles.preview}><Image source={{ uri: image }} style={styles.image} accessibilityLabel="Pièce jointe" /><IconButton accessibilityLabel="Retirer la pièce jointe" icon={<Symbol name="close" size={16} />} size={30} onPress={() => onRemoveImage?.()} /></View> : null}
    <View style={styles.row}>
      {onAttach ? <IconButton accessibilityLabel="Joindre une photo" icon={<Symbol name="attachment" color="textMuted" />} variant="ghost" size={34} onPress={onAttach} disabled={disabled} /> : <Symbol name="clipboard" color="textMuted" size={22} />}
      <TextField accessibilityLabel="Message au coach" placeholder={placeholder} value={value} onChangeText={onChange} focusRequest={focusRequest} multiline maxLength={2000} editable={!disabled} containerStyle={{ flex: 1, minWidth: 0 }} fieldStyle={styles.field} inputStyle={styles.input} />
      {onDictate ? <IconButton accessibilityLabel="Saisie vocale" icon={<Symbol name="microphone" color="textMuted" />} variant="ghost" size={32} onPress={onDictate} disabled={disabled} /> : null}
      <IconButton accessibilityLabel="Envoyer le message" icon={<Symbol name="send" color="white" size={22} />} variant="primary" size={42} disabled={disabled || (!value.trim() && !image)} onPress={onSend} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: 28, padding: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  field: { borderWidth: 0, minHeight: 44, paddingHorizontal: 4, backgroundColor: colors.surface },
  input: { minHeight: 44, maxHeight: 120, fontSize: 13, paddingVertical: 12 },
  preview: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 8 },
  image: { width: 52, height: 52, borderRadius: 10 },
});
