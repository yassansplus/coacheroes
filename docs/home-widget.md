# Widget iPhone et haptique de l’accueil

## Interface

Le widget **Coac Heroes** propose les formats moyen et grand. Il utilise Montserrat, le fond clair, le bleu `#3199ff`, le violet `#af58fd` et la progression orange des calories. Le format moyen présente calories, séance du jour et dernière activité d’un ami. Le grand ajoute les calories restantes, une seconde activité et l’heure de mise à jour.

La bibliothèque `/components` contient **Widget iPhone**, un aperçu React Native des deux formats avec des données d’exemple. Il fonctionne aussi dans Expo Go et sur web. Cet aperçu ne publie aucune donnée dans le vrai widget.

## Intégration durable

- `mobile/src/services/widgets/TodayWidget.tsx` définit le rendu SwiftUI avec `expo-widgets` et `@expo/ui`. Sa fonction est sérialisée dans un environnement isolé ; les textes et couleurs arrivent dans ses props. Elle gère aussi les props vides de la galerie WidgetKit.
- `mobile/app.json` déclare le widget `CoacHeroesToday`, l’extension `com.yassansplus.coacheroes.widgets` et le groupe `group.com.yassansplus.coacheroes`. Conserver ces identifiants pour les mises à jour.
- `mobile/plugins/with-widget-fonts.cjs` ajoute les polices Montserrat Medium et Bold aux ressources et au plist de l’extension. Il doit être **déclaré avant `expo-widgets`**, car les mods Xcode sont exécutés dans l’ordre inverse.
- Les fichiers natifs générés restent reproductibles par prebuild. Aucun dossier iOS modifié manuellement n’est nécessaire.
- Le bridge iOS vérifie la présence du module natif avant de le charger. Expo Go, web, Android et les anciennes development builds conservent leur fonctionnement, avec uniquement l’aperçu dans le catalogue.

Référence : [Expo Widgets](https://docs.expo.dev/versions/latest/sdk/widgets/).

## Données et limites d’actualisation

`HomeWidgetSync` ne fait que lire les API existantes et le cache des séances. Il n’enregistre ni repas, ni entraînement, ni action du coach. Il synchronise le widget au démarrage connecté, aux changements d’écran, de calories, de programme ou de langue, au retour au premier plan et toutes les 60 secondes tant que l’app est active.

Les inconnues restent affichées « — » ; un zéro n’apparaît que si les données nutritionnelles ont été chargées. Seul un programme accepté, prêt et non périmé alimente la séance. Les séances terminées, blocs à renouveler et jours de repos ont leurs propres libellés. Le cache local des séances prime sur la copie distante pour intégrer une séance terminée hors ligne.

Le flux social provient de `/squad` : uniquement les amis qui partagent leur activité, sur les dernières 24 heures, sans contenu d’un autre groupe ou métriques privées. Le payload du widget ne contient ni jeton, ni ID utilisateur, ni photo. Il est vidé à la déconnexion ou au changement de compte ; une requête d’un ancien compte ne peut pas publier son résultat.

Une entrée programmée au prochain minuit **local** retire les chiffres et actualités de la veille et invite à ouvrir l’app. Les formats et textes suivent français, anglais ou néerlandais. Les noms de personnes et de séances restent tels qu’enregistrés.

Cette version ne fait pas de récupération réseau autonome lorsque l’app est fermée. Les données sont celles de la dernière synchronisation ; WidgetKit décide de l’heure exacte du rafraîchissement. [Actualisation WidgetKit](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date/).

## Tester sur iPhone

Une **nouvelle development build iOS est nécessaire** pour embarquer l’extension et les modules natifs. Expo Go ne permet pas d’ajouter ce widget à l’écran d’accueil.

```bash
cd mobile
npx eas-cli build --platform ios --profile development
```

Installer la nouvelle version par-dessus Coac Heroes, ouvrir l’app une fois et se connecter, puis ajouter **Coac Heroes** depuis la galerie de widgets iOS. Pendant le développement, démarrer Metro avec `npx expo start --dev-client --lan` comme d’habitude. EAS doit autoriser et provisionner l’extension et son App Group sur le compte Apple.

## Haptique

L’accueil active maintenant `haptic: 'rain'` sur son horloge commune `useMetricMotion` de 2,2 secondes. Les impulsions accompagnent les compteurs et les barres sans lancer une vibration indépendante par barre. Les protections existantes restent actives : limitation de fréquence, un seul propriétaire de l’effet, arrêt en arrière-plan, respect de la réduction des animations et absence de vibrations sur web.

## Vérification

- `cd mobile && ./node_modules/.bin/tsc --noEmit`
- `node tests/widgets.test.cjs` : valeurs réelles/inconnues, états de séance, partage social, langues, expiration locale, module natif facultatif et exécution de la fonction sérialisée par Babel.
- `node tests/language.test.cjs`
- Prebuild iOS propre dans une copie temporaire : cible, App Group, identifiants et ressources des polices.
- Aperçus web : moyen, grand, terminé, français et néerlandais à 320 px.
- Restent à vérifier sur iPhone : compilation/signature EAS, rendu WidgetKit, liens, mise à jour après repas/séance, déconnexion et sensation haptique. Aucune build cloud n’a été lancée depuis cet environnement Linux.
