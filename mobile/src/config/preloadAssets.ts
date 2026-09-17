import { Image, type ImageSourcePropType } from 'react-native';

/**
 * Assets affichés par le design system. Ils sont préchargés au lancement pour
 * éviter un affichage progressif des illustrations sur le premier écran.
 */
const imageAssets: readonly ImageSourcePropType[] = [
  require('../../10_Assets_3D/01_Camera.png'),
  require('../../10_Assets_3D/02_Logo_eclair.png'),
  require('../../10_Assets_3D/03_Calendrier.png'),
  require('../../10_Assets_3D/04_Gants_de_boxe.png'),
  require('../../10_Assets_3D/05_Coach_IA.png'),
  require('../../10_Assets_3D/06_Sommeil.png'),
  require('../../10_Assets_3D/07_Chaussure.png'),
  require('../../10_Assets_3D/08_Shaker.png'),
  require('../../10_Assets_3D/09_Cadenas.png'),
  require('../../10_Assets_3D/10_Couverts.png'),
  require('../../10_Assets_3D/11_Pomme.png'),
  require('../../10_Assets_3D/12_Cerveau.png'),
  require('../../10_Assets_3D/13_Trophee.png'),
  require('../../10_Assets_3D/14_Halteres.png'),
  require('../../10_Assets_3D/15_Trousse_de_secours.png'),
  require('../../10_Assets_3D/16_Hydratation.png'),
  require('../../10_Assets_3D/17_Lune.png'),
  require('../../10_Assets_3D/18_Metre_ruban.png'),
  require('../../10_Assets_3D/19_Etoile.png'),
  require('../../10_Assets_3D/20_Balance.png'),
  require('../../10_Assets_3D/21_Flamme.png'),
  require('../../10_Assets_3D/22_Corps_face.png'),
  require('../../10_Assets_3D/23_Corps_dos.png'),
];

export async function preloadAppImages() {
  await Promise.all(
    imageAssets.map((asset) => {
      const source = Image.resolveAssetSource(asset);

      if (!source?.uri) {
        return Promise.resolve();
      }

      return Image.prefetch(source.uri).catch(() => undefined);
    }),
  );
}
