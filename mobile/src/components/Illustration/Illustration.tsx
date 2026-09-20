import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { illustrations, isSvgIllustration, type IllustrationName } from '@/config/illustrations';

type IllustrationProps = {
  name: IllustrationName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

export function Illustration({ name, size = 48, style, accessibilityLabel }: IllustrationProps) {
  const source = illustrations[name];
  if (isSvgIllustration(source)) {
    const asset = source.source as ImageSourcePropType | string;
    const uri = typeof asset === 'string' ? asset : typeof asset === 'object' && !Array.isArray(asset)
      ? asset.uri : typeof Image.resolveAssetSource === 'function' ? Image.resolveAssetSource(asset)?.uri : undefined;
    return <SvgUri accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel}
      uri={uri ?? null} width={size} height={size}
      style={style as StyleProp<ViewStyle>} />;
  }
  return <Image accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel}
    source={source} fadeDuration={0} resizeMode="contain" style={[{ width: size, height: size }, style]} />;
}
