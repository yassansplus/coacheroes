import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type TextFieldProps = Omit<TextInputProps, 'onChangeText' | 'style' | 'value'> & {
  containerStyle?: StyleProp<ViewStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
  /** Changes to this value request focus for the input. */
  focusRequest?: number;
  labelStyle?: StyleProp<TextStyle>;
  error?: string;
  formatValue?: (value: string) => string;
  helperText?: string;
  inputStyle?: StyleProp<TextStyle>;
  label?: string;
  leftAccessory?: ReactNode;
  onChangeText: (value: string) => void;
  required?: boolean;
  rightAccessory?: ReactNode;
  value: string;
};

export function TextField({
  containerStyle,
  fieldStyle,
  focusRequest,
  labelStyle,
  error,
  formatValue,
  helperText,
  inputStyle,
  label,
  leftAccessory,
  onBlur,
  onChangeText,
  onFocus,
  required = false,
  rightAccessory,
  value,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  const hasError = Boolean(error);
  useEffect(() => {
    if (focusRequest) input.current?.focus();
  }, [focusRequest]);

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View style={[styles.field, fieldStyle, focused && !hasError && styles.focused, hasError && styles.errorField]}>
        {leftAccessory ? <View style={styles.accessory}>{leftAccessory}</View> : null}
        <TextInput
          {...inputProps}
          ref={input}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChangeText={(nextValue) => onChangeText(formatValue?.(nextValue) ?? nextValue)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor="#91a0be"
          style={[styles.input, inputProps.multiline && styles.multilineInput, inputStyle]}
          value={value}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#141b41',
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    marginBottom: 7,
  },
  required: {
    color: colors.energy,
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#dce4f2',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  focused: {
    borderColor: colors.primary,
  },
  errorField: {
    borderColor: colors.energy,
  },
  input: {
    color: '#141b41',
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  accessory: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    color: '#6073a4',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    marginTop: 6,
  },
  errorText: {
    color: colors.energy,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    marginTop: 6,
  },
});
