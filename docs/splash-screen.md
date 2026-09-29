# Splash animé

Le splash reprend directement `mobile/assets/app-icon/icon.png` : monogramme CH doré et blanc, fond bleu-violet et reflets diagonaux. Aucun nouvel asset ni dépendance native n'est nécessaire.

`AppBootstrap` charge Montserrat, restaure la langue, précharge les images et conserve leur décodage via `ImageWarmup`. Le splash natif reste visible pendant cette phase. Lorsque les ressources sont prêtes, `AppProviders` et la navigation montent sous `AnimatedSplash`. Le splash natif n'est retiré qu'après le layout du splash animé et le chargement de son logo, pour éviter une image vide entre les deux.

L'entrée dure environ 820 ms : léger rebond, apparition du fond et de la signature, reflet traversant l'icône. Un halo et trois points pulsent pendant la restauration de session. Le fondu de sortie dure 340 ms et attend à la fois la fin de l'entrée et la restauration du compte. Un échec réseau laisse ensuite apparaître l'état d'erreur habituel de `SessionGate`. Le splash n'attend ni la génération du programme ni les requêtes secondaires, et ne se rejoue pas au retour au premier plan ou à la déconnexion.

`AppStartupContext` retarde uniquement l'ouverture automatique du bilan et les célébrations XP/badges jusqu'à la fin du splash ; leurs chargements et files d'attente restent actifs. L'interface masquée n'est ni interactive ni exposée au lecteur d'écran. « Réduire les animations » supprime rebond, reflet, pulsation et fondu, tout en conservant l'attente des ressources et de la session. Les animations sont arrêtées au démontage.

La référence iPhone 14 Pro Max est 430 × 932 points / 1290 × 2796 pixels. Le fond couvre la taille réelle de la fenêtre ; le logo et la signature s'adaptent aux petits écrans. La taille nominale du logo et le fond natif sont synchronisés avec la configuration `expo-splash-screen` dans `app.json`.

La bibliothèque `/components` propose « Voir le splash animé » ; `/components?preview=splash` permet de rejouer exactement le même composant. La pause de 2,2 secondes appartient uniquement à cet aperçu, sans requête ni écriture métier.

## Vérification

- `cd mobile && ./node_modules/.bin/tsc --noEmit`
- `cd mobile && node --test tests/splash.test.cjs`
- Vérifier démarrage à froid avec et sans compte, connexion lente/injoignable, petits écrans, texte agrandi et option « Réduire les animations ».

Les captures du composant réel dans l'export web sont disponibles pour [iPhone 14 Pro Max](previews/splash-iphone-14-pro-max.png), [petit écran](previews/splash-small-screen.png) et [animations réduites](previews/splash-reduced-motion.png). Le contrôle navigateur vérifie la couverture de la fenêtre, l'absence de débordement horizontal, la sortie du splash et l'absence d'erreur JavaScript ; il ne remplace pas la vérification du lancement natif sur iPhone.

Une nouvelle development build est nécessaire pour le nouveau logo/fond **natif**, car le plugin `expo-splash-screen` change dans `app.json`. Les ajustements de l'animation React Native restent disponibles via Metro. Tester le passage complet sur une build de production : Expo Go et la development build ne reproduisent pas entièrement le splash natif ([documentation Expo](https://docs.expo.dev/versions/latest/sdk/splash-screen/)).
