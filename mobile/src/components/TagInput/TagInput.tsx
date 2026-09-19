import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { TextField } from '@/components/TextField';
import { resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

import { mergeTags, parseTagInput } from './utils';

type TagInputProps = {
  value: string[];
  inputValue: string;
  onChange: (value: string[], inputValue: string) => void;
  label: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  tagColor?: AppColor;
  tagBackgroundColor?: AppColor;
  style?: StyleProp<ViewStyle>;
  tagStyle?: StyleProp<ViewStyle>;
  tagTextStyle?: StyleProp<TextStyle>;
};

/** Both tags and draft are controlled so forms can retain the last unsubmitted item. */
export function TagInput({ value, inputValue, onChange, label, placeholder,
  helperText = 'Sépare les éléments par des virgules, ou appuie sur + pour les ajouter.',
  disabled = false, tagColor = 'primary', tagBackgroundColor = 'primarySurface',
  style, tagStyle, tagTextStyle }: TagInputProps) {
  function change(text: string, commitLast = false) {
    const parsed = parseTagInput(text, commitLast);
    onChange(mergeTags(value, parsed.tags), parsed.inputValue);
  }
  function commit() { if (inputValue.trim()) change(inputValue, true); }
  return <View style={[styles.container, style]}>
    <TextField label={label} value={inputValue} onChangeText={text => change(text)} placeholder={placeholder}
      helperText={helperText} editable={!disabled} autoCapitalize="none" returnKeyType="done"
      onSubmitEditing={commit} onBlur={commit}
      rightAccessory={<IconButton accessibilityLabel={`Ajouter : ${label}`} variant="ghost" size={36}
        disabled={disabled || !inputValue.trim()} icon={<Symbol name="plus" size={20} color={tagColor} />} onPress={commit} />} />
    {value.length ? <View style={styles.tags}>{value.map(tag => <View key={tag}
      style={[styles.tag, { backgroundColor: resolveColor(tagBackgroundColor) }, tagStyle]}>
      <Text style={[styles.tagText, { color: resolveColor(tagColor) }, tagTextStyle]}>{tag}</Text>
      <IconButton accessibilityLabel={`Retirer ${tag} · ${label}`} variant="ghost" size={32} disabled={disabled}
        icon={<Symbol name="close" size={14} color={tagColor} />} onPress={() => onChange(value.filter(item => item !== tag), inputValue)} />
    </View>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 10 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%', paddingLeft: 12, paddingRight: 3, paddingVertical: 4, borderRadius: 16 },
  tagText: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 17, flexShrink: 1 },
});
