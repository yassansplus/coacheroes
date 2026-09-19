import { Image, type ImageSourcePropType } from 'react-native';

import { illustrations } from './illustrations';

/**
 * Assets affichés par le design system. Ils sont préchargés au lancement pour
 * éviter un affichage progressif des illustrations sur le premier écran.
 */
const imageAssets: readonly ImageSourcePropType[] = Object.values(illustrations);

export async function preloadAppImages() {
  await Promise.all(
    imageAssets.map((asset) => {
      // React Native Web receives URI objects/strings and does not expose
      // resolveAssetSource. Native platforms resolve Metro's numeric asset IDs.
      const source = typeof Image.resolveAssetSource === 'function'
        ? Image.resolveAssetSource(asset)
        : typeof asset === 'string' ? { uri: asset }
          : typeof asset === 'object' && !Array.isArray(asset) ? asset : undefined;

      if (!source?.uri) {
        return Promise.resolve();
      }

      return Image.prefetch(source.uri).catch(() => undefined);
    }),
  );
}
