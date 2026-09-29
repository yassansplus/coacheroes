import { forwardRef, type ReactNode } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { t } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';

/** Translate UI copy at render time, leaving data, component state and callbacks intact. */
export const Text = forwardRef<NativeText, TextProps & { translate?: boolean }>(function LocalizedText(
  { children, translate = true, accessibilityLabel, ...props }, ref,
) {
  useLanguage();
  const translateNode = (node: ReactNode): ReactNode => {
    if (typeof node === 'string') return t(node);
    if (Array.isArray(node)) return node.map(translateNode);
    return node;
  };
  return <NativeText {...props} ref={ref} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined}>
    {translate ? translateNode(children) : children}
  </NativeText>;
});
