import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { illustrations, type IllustrationName } from '@/config/illustrations';

type IllustrationProps = {
  name: IllustrationName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

export function Illustration({ name, size = 48, style, accessibilityLabel }: IllustrationProps) {
  return <Image accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel}
    source={illustrations[name]} resizeMode="contain" style={[{ width: size, height: size }, style]} />;
}
