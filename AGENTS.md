# Architecture mobile

Ces règles s'appliquent à `mobile/`. L'application utilise Expo Router et une
organisation **feature-first** : le code métier est regroupé par domaine, pas
par type de fichier à l'échelle de toute l'application.

## Structure

```text
mobile/
├── app/                         # Routes et layouts Expo Router uniquement
│   ├── _layout.tsx               # Layout racine
│   ├── index.tsx                 # Route qui délègue à la feature Onboarding
│   ├── components.tsx            # Bibliothèque de composants
│   ├── (auth)/                   # Routes d'authentification à venir
│   └── (app)/                    # Routes connectées à venir
└── src/
    ├── components/               # Composants génériques partagés
    ├── config/                   # Configuration et variables d'environnement
    ├── features/                 # Domaines métier isolés
    ├── hooks/                    # Hooks partagés uniquement
    ├── providers/                # Providers applicatifs à la racine
    ├── services/                 # Infrastructure transverse : HTTP, analytics…
    ├── storage/                  # Accès au stockage et clés centralisées
    ├── store/                    # État global transverse uniquement
    ├── theme/                    # Design tokens et thème
    ├── types/                    # Types réellement globaux
    └── utils/                    # Fonctions pures et génériques
```

`app/` est volontairement mince. Un fichier de route compose la navigation et
importe un écran depuis `src/features/`; il ne contient ni appel API ni logique
métier. Le layout Expo Router est toujours nommé `_layout.tsx`.

## Runtime et navigation

- Le point d'entrée est `expo-router/entry`; ne pas recréer `App.tsx`.
- `app/_layout.tsx` charge Montserrat, garde le splash screen visible jusqu'au
  chargement des polices et des assets image, puis applique `colors.background`
  à toutes les routes. La liste centralisée dans `src/config/preloadAssets.ts`
  précharge les PNG 3D avec `Image.prefetch` afin d'éviter leur apparition
  progressive au premier affichage.
- `AppProviders` accueille les providers applicatifs partagés; il contient
  actuellement `SafeAreaProvider`.
- Les groupes `(auth)` et `(app)` sont réservés aux routes publiques et
  connectées. Les créer au moment où leurs premières routes existent.

## Features

Chaque domaine possède sa propre structure, créée uniquement selon ses besoins.

```text
src/features/<feature>/
├── api/                          # Requêtes et types propres au domaine
├── components/                   # Composants non réutilisables hors feature
├── hooks/                        # Hooks propres au domaine
├── screens/                      # Écrans et containers métier
├── store/                        # État local au domaine, si nécessaire
├── schemas.ts                    # Validation éventuelle
├── types.ts
└── utils.ts
```

Ne pas créer tous ces dossiers par défaut : une feature simple peut ne contenir
qu'un écran. `component-library` conserve le catalogue visuel; `onboarding`
porte les 16 étapes du parcours public, son état local et ses validations.

## Règles de dépendance

1. Une route sous `app/` délègue à une feature ou à un provider ; elle ne porte
   pas de logique métier.
2. Une feature peut importer depuis `src/` partagé, mais pas depuis les
   fichiers internes d'une autre feature.
3. Ce qui est nécessaire à plusieurs features est déplacé vers le dossier
   partagé pertinent (`components`, `hooks`, `services`, etc.).
4. `src/store` est réservé à l'état client global (session, préférences,
   interface globale). Les données distantes ne doivent pas y être dupliquées.
5. `src/storage` centralise les clés et les accès au stockage ; les secrets et
   tokens ne doivent jamais être écrits directement depuis une feature.
6. Utiliser l'alias `@/` pour importer depuis `src/`, par exemple
   `@/features/home/screens/HomeScreen`.

## Composants partagés

Un composant réutilisable appartient à `src/components/<Nom>/`. Il exporte son
API publique depuis un `index.ts` et ne dépend d'aucune feature.

`Button` est le composant de référence. Il possède les variantes `primary`,
`secondary` et `outline`; accepte `text`, `onPress`, `backgroundColor`,
`textColor`, `style` et `textStyle`; et propose un retour haptique optionnel
avec `hapticFeedback` (`true`, `light`, `medium`, `heavy` ou `selection`). Il
anime son échelle à la pression et ignore sans erreur l'haptique indisponible
(web ou simulateur). Son prop `radius` accepte `16`, `24` (défaut), `30` ou
`"100%"` pour une forme pilule. Le libellé utilise Montserrat SemiBold en 14
pt. La variante `primary` utilise le dégradé primaire, sauf quand
`backgroundColor` le surcharge. À la pression, ce dégradé s'inverse avec une
transition de 180 ms, puis retrouve son sens initial au relâchement; l'échelle
et l'haptique restent actifs. Réutiliser ce composant plutôt que créer des
`Pressable` locaux pour les boutons standards.

`Card` est la surface de contenu standard : fond `colors.surface`, rayon de 24
et espacement interne de 24. Employer son prop `style` pour adapter localement
une carte plutôt que reproduire ces styles dans une feature.

`CardHighlight` est un encart compact à insérer dans une `Card`. Il reçoit une
`icon` (`ReactNode`) et peut recevoir `title` et `value` en option. Sans texte,
il s'affiche en version icône seule. Sa prop `backgroundColor` accepte un nom
de la palette (`coral`, `lavender`, `lilac`) ou un code hexadécimal. L'icône est
affichée sans fond circulaire. Son rayon reste fixé à 24, avec un padding de 12
horizontal et 10 vertical, pour conserver la cohérence avec `Card`. Utiliser
`color` pour le texte lorsque `title` ou `value` est présent.

`ProgressBar` est la primitive de progression commune. Elle reçoit `progress`
(borné entre 0 et 100), une piste, une hauteur et des couleurs de dégradé
surchargeables. Son dégradé par défaut est `gradients.emphasizedPrimary`, une
version plus contrastée du bleu-violet principal, et sa progression est animée
à l'affichage de gauche à droite. `LevelProgressCard` compose cette barre dans une `Card` avec une
icône, un titre de section, un titre et une valeur tous optionnels. L'icône ne
porte pas de pastille : un fondu chaud vers le blanc est appliqué au fond de la
carte. Utiliser `ProgressBar` seule partout où les contenus de niveau ne sont
pas nécessaires.

`DailyQuests` compose une liste de `Card` de quête et la `ProgressBar` commune.
Chaque objet `DailyQuest` reçoit un `id`, un `title`, `currentValue`,
`targetValue`, et peut définir une `icon`, ses couleurs de fond et de
progression, un libellé de progression et une récompense XP. Le titre de liste
est optionnel. Utiliser ce composant pour les objectifs quotidiens plutôt que
recomposer manuellement des lignes de quête dans une feature. À l'affichage,
les barres démarrent à zéro, le compteur de progression monte jusqu'à sa valeur
et la récompense XP entre avec un rebond. `animated={false}` désactive ces
effets; `animationDuration` ajuste la durée commune.

`TabSelector` est le contrôle segmenté à onglets. Il est contrôlé par `value`
et `onChange`, et déplace avec un léger rebond un indicateur en dégradé bleu-violet
à transition progressive. Un retour haptique de sélection se déclenche à
l'arrivée de l'indicateur sur le nouvel onglet. `PillSelector` suit la même API pour sélectionner un
élément : l'état inactif utilise `colors.surface`, tandis que l'état actif
affiche une bordure bleu-violet, un fond très léger et un texte bleu.
Un haptique de sélection est déclenché lorsqu'une pill change d'état.

`WeightSelectorV1` est le premier sélecteur de poids : `value` et `onChange`
sont obligatoires; `minimum`, `maximum`, `step`, `unit` et `label` sont
configurables. Le remplacer plus tard par une V2 plutôt que modifier son
comportement. `Toggle` enveloppe le `Switch` natif avec le bleu principal à
l'état actif et le gris système défini à l'état inactif; son `label` est
optionnel.

`WeightSelectorV2` est la molette horizontale de poids et ne remplace pas V1.
Elle est contrôlée par `value` et `onChange`, avec des bornes, un pas et une
unité configurables. Par défaut, elle avance de `0,1 kg`. La règle glisse sous
un curseur bleu-violet fixe, projette légèrement l'inertie au relâchement puis
s'aimante sur le cran le plus proche. Les boutons `−` et `+` modifient la même
valeur; un retour haptique est émis à chaque cran franchi. Le geste est capturé
dès le toucher de la règle pour ne pas déclencher le défilement parent.

`SelectableCard` est une carte de sélection contrôlée, adaptée notamment aux
récompenses. Elle reçoit `selected` et `onPress`, avec une `icon`, un `title` et
une `description` optionnels. Sa sémantique est celle d'une checkbox : plusieurs
cartes peuvent donc être sélectionnées. À l'état actif, elle emploie par défaut
le fond vert clair `successSurface`, sans indicateur de coche visuel. `disabled`
permet d'afficher une carte verrouillée sans interaction. Son titre et sa
description sont volontairement compacts (13 et 10 pt).

`RadioButton` est un choix exclusif contrôlé : utiliser `selected` et `onSelect`
dans un même groupe d'options. `Checkbox` est un choix indépendant contrôlé :
utiliser `checked` et `onChange`. Les deux acceptent un `label`, `disabled`, une
couleur active personnalisable et exposent les rôles d'accessibilité natifs.

`BodyPainSelector` est le sélecteur de localisation de douleur. Il affiche les
silhouettes neutres face et dos, avec des zones tactiles et des choix multiples
pour `shoulder`, `elbow`, `wrist`, `back`, `hip`, `knee`, `ankle`, `heel` et
`other`. Chaque ajout est obligatoirement latéralisé : le parent contrôle le
côté courant avec `side` (`left` ou `right`) et `onSideChange`. Il est contrôlé
par `value` (tableau de `BodyPainSelection`) et `onChange`; chaque valeur est
prête à persister, par exemple `left_wrist` ou `right_heel`. Le composant ne
persiste jamais lui-même les données. Les zones sélectionnées reçoivent un
marqueur bleu et les chips correspondantes passent au dégradé primaire; les
autres zones tactiles du côté actif restent visibles en gris pour indiquer où
appuyer. Le parent peut le désactiver avec `disabled`, par exemple quand
l'utilisateur indique ne ressentir aucune douleur. Les notes, le consentement
médical, les actions de navigation et l'enregistrement appartiennent à l'écran
ou à la feature qui le compose.

`TextField` est le champ de formulaire standard. Il est contrôlé via `value` et
`onChangeText`, et peut afficher `label`, `helperText`, `error`, accessoires
gauche/droite et `required`. Il transmet les props utiles de `TextInput`, dont
`keyboardType`; `formatValue` permet de normaliser une saisie numérique ou autre
avant de la remonter. Ne pas reconstruire les bordures, états focus et erreurs
dans une feature.

`IconButton` sert aux actions compactes (retour, fermer, ajouter, options). Il
reçoit une `icon`, `onPress` et un `accessibilityLabel` obligatoire, avec les
variantes `primary`, `surface`, `outline` et `ghost`, une taille et une couleur
de fond personnalisables. `Badge` affiche une information courte (XP, niveau,
statut) avec les variantes `primary`, `success`, `energy` et `neutral`; ses deux
couleurs restent surchargeables.

`Banner` est un message contextuel dans le flux de l'écran; il peut porter une
icône et une action. `Toast` est une notification temporaire contrôlée par
`visible`; `onHide` est appelé après sa durée (3 s par défaut). Les deux offrent
les variantes `info`, `success` et `error`. Employer un `Banner` pour une
information persistante, un `Toast` pour la confirmation ponctuelle d'une
action.

`BottomSheet` et `AppModal` sont les surfaces d'overlay partagées, toutes deux
contrôlées par `visible` et `onClose`. `BottomSheet` s'ouvre depuis le bas pour
les actions contextuelles; `AppModal` est le dialogue centré pour une décision
ou une confirmation. Elles acceptent du contenu libre, un titre et un footer ou
des actions optionnels. Ne pas employer directement le `Modal` natif dans une
feature pour ces cas.

`LoadingState`, `EmptyState` et `ErrorState` représentent respectivement les
états de chargement, sans contenu et d'échec d'un écran ou d'une section.
`EmptyState` et `ErrorState` peuvent recevoir une icône, un texte explicatif et
une action; `ErrorState` expose `onRetry`. `Skeleton` est le bloc neutre animé
pour une attente de contenu, configurable par largeur, hauteur et rayon. Prévoir
l'état approprié avant de connecter une vue aux données distantes.

`AppHeader` est l'entête de navigation générique : titre obligatoire, sous-titre
et slots `leading` / `trailing` optionnels, généralement composés avec
`IconButton`. `BottomTabBar` est une barre d'onglets contrôlée via `value` et
`onChange`, alimentée par une liste d'éléments `{ value, label, icon }`. Elle est
visuelle uniquement : une route Expo Router conserve la responsabilité de la
navigation réelle.

`Calendar` est le sélecteur de date partagé. Il est contrôlé par `selectedDate`
et `onSelectDate`, affiche le mois courant avec navigation, et gère locale,
bornes `minimumDate` / `maximumDate`, jours désactivés et callback de changement
de mois. Il ne dépend d'aucune feature et évite l'ajout d'une bibliothèque de
calendrier tant que les besoins d'interactions restent simples.

`ProgressCard` est une carte de synthèse avec une icône, un anneau de
progression, un libellé, une valeur et un objectif. Ses couleurs de fond,
d'icône, d'anneau, de piste et de texte acceptent les tokens de palette ou un
hexadécimal. `progress` est un nombre entre 0 et 100 (automatiquement borné) et
`progressLabel` permet de surcharger le pourcentage affiché. Ne pas l'utiliser
pour une série de données : les graphiques riches relèvent de Victory Native XL.
L'anneau se dimensionne automatiquement à partir de la largeur réellement
allouée à la carte, entre 32 et 82 px, et son libellé central s'ajuste avec lui.
La carte est carrée par défaut; employer `square={false}` uniquement lorsqu'un
format rectangulaire est réellement nécessaire. `ProgressCardRow` les regroupe
dans une `Card` partagée, sur une unique rangée de quatre colonnes visibles.
Les dimensions, espacements et tailles de texte de chaque tuile se calculent
selon la largeur disponible afin que les quatre objectifs restent affichés.
Sa prop booléenne `scrollable` active une rangée horizontale défilable; laisser
les `ProgressCard` en largeur fixe dans ce cas. Sans cette prop, les tuiles se
partagent la place disponible : le même composant sert donc aussi aux versions
à trois ou quatre blocs.
Par défaut, `ProgressCard` anime à son montage le donut de `0` à `progress` et
la valeur numérique de `0` à `value`, sur 800 ms. La prop `animated={false}`
désactive cet effet et `animationDuration` le règle. Pour une valeur textuelle
non déductible (par exemple `6 h 20`), fournir `animatedValue` et
`formatAnimatedValue` afin de contrôler le compteur et son rendu.
Chaque tuile porte une ombre volontairement légère, compatible iOS et Android,
afin de la détacher avec subtilité de sa carte conteneur.
Les icônes 3D de ce composant doivent conserver une marge visible dans leur
pastille, afin de ne pas masquer la couleur d'icône choisie.

## Couleurs

Les couleurs sont centralisées dans `@/theme/colors`. `colors.background` vaut
`#f4f4f4` (fond général) et `colors.surface` vaut `#fefefe` (cartes).
`colors.primary` vaut `#3199ff` et sert de bleu principal.
`colors.energy` vaut `#ff5a3d` et sert notamment à la progression par défaut
des objectifs de calories.
`colors.success` vaut `#0fc68c` et `colors.successSurface` vaut `#e6fbf2`;
ils servent aux états sélectionnés positifs et aux cases cochées.
`gradients.primary` applique ce bleu vers `#af58fd`, de gauche à droite.
`cardHighlightBackgrounds` contient les fonds d'encarts prédéfinis : `coral`
(`#fdf2ee`), `lavender` (`#e7e8fd`) et `lilac` (`#e6e6fe`).
`colorPalette` rassemble les tokens disponibles et `resolveColor` accepte un
token ou un code hexadécimal pour les composants personnalisables.
Ajouter les futures couleurs et dégradés dans ce fichier avant de les employer
dans un composant.

## Typographie

La police de l'application est Montserrat, chargée dans `app/_layout.tsx` avant
l'affichage de l'interface. Utiliser les familles exposées par
`@/theme/typography` (`regular`, `medium`, `semiBold`, `bold`, `extraBold`) au
lieu de définir une nouvelle police dans une feature. Ne pas associer
`fontWeight` à une police Montserrat chargée : choisir directement la variante
adaptée.

## Maquette et responsive

`src/features/component-library/screens/ComponentLibraryScreen.tsx` est le catalogue
visuel des composants, accessible sur `/components`. Il présente les boutons, cartes,
contrôles de sélection, formulaires, feedback, états d'écran, calendrier et
primitives de navigation, ainsi qu'un exemple complet de saisie de douleurs.

L'accueil `/` présente désormais l'onboarding. Les 16 maquettes de
`FitBuddy_Onboarding_01-16` servent de référence. Les réponses et les URI des
photos restent en mémoire pendant la session : aucune authentification, aucun
upload, aucune génération IA ni persistance n'est effectuée. Le récapitulatif
permet de modifier une étape puis d'y revenir. Le programme final est un aperçu,
avec une semaine dérivée des disponibilités et des sports sélectionnés.

`ChoiceCard` est la carte de choix avec indicateur visible (rôle `radio` ou
`checkbox`), déclinée en tuile, ligne ou chip. Elle complète `SelectableCard`
sans modifier son usage pour les récompenses. `NumberStepper` est un compteur
contrôlé avec bornes, pas, formatage et tailles compact / large.
`TagInput` compose `TextField` et des tags supprimables. Ses tags (`value`) et
son brouillon (`inputValue`) sont contrôlés avec `onChange(value, inputValue)`;
les virgules, Entrée, + et la perte de focus valident les saisies. Les libellés,
couleurs et styles sont personnalisables. Le parent conserve le brouillon et
doit le valider lors d'une navigation qui n'entraîne pas de perte de focus.
`WeekdaySelector` sélectionne plusieurs jours (indices 0 = lundi à 6 = dimanche).
`PhotoPicker` reçoit une URI et un `onChange`; il ouvre le sélecteur natif ou la
caméra avec `expo-image-picker`, sans stocker ni téléverser de données.
`ProgressRing` est une primitive de progression circulaire, avec anneau double
optionnel. `Illustration` utilise le registre `src/config/illustrations.ts`,
également consommé par le préchargement. `Symbol` fournit les petits glyphes
d'interface en SVG; les illustrations métier continuent d'utiliser les PNG 3D.

Les compléments d'illustration sont extraits des maquettes dans
`assets/onboarding/`, avec le script reproductible
`scripts/prepare-onboarding-assets.cjs`. Ils ne contiennent pas de contrôles ni
de textes d'interface. Les nouveaux composants sont présentés dans le catalogue.

- La maquette utilise `SafeAreaView` et `ScrollView`.
- Le contenu a une largeur fluide avec `maxWidth: 680`; aucune hauteur ou
  largeur n'est codée pour un appareil précis. L'iPhone 14 Pro Max est une
  référence visuelle, pas une contrainte de mise en page.
- Les encarts peuvent passer à la ligne grâce à `flexWrap`, afin de rester
  utilisables sur les écrans étroits. La rangée de progression conserve quatre
  colonnes visibles. Le catalogue expose calories, protéines, sommeil et pas,
  avec les icônes flamme, couverts, lune et chaussure.
- La hiérarchie de texte actuelle est volontairement compacte; ne pas modifier
  les tailles sans une demande de design explicite.

## Assets 3D

Les icônes 3D validées sont dans `mobile/10_Assets_3D/`. Elles sont des PNG et
peuvent être utilisées dans un composant avec `Image` et `require`. Exemple
actuel : `21_Flamme.png` dans le premier `CardHighlight`. Les autres exemples
utilisent calendrier, trophée et haltères. Ne pas remplacer ces assets par des
emojis quand l'asset correspondant existe.

Les silhouettes neutres du sélecteur de douleur sont `22_Corps_face.png` et
`23_Corps_dos.png`. Elles sont deux PNG RGBA générés pour le projet et doivent
rester assorties, intégralement visibles et sans marqueur coloré intégré : les
marqueurs interactifs sont toujours rendus par `BodyPainSelector`.

## Dépendances UI actuelles

- `expo-router` : navigation et routes.
- `expo-haptics` : retour haptique optionnel des boutons.
- `expo-image-picker` : choix local de photos et prise de vue facultative.
- `expo-linear-gradient` : dégradé du bouton primaire.
- `react-native-svg` : anneaux et indicateurs de progression personnalisables.
- `@expo-google-fonts/montserrat`, `expo-font`, `expo-splash-screen` : police
  Montserrat et chargement sans flash visuel.
- `victory-native` (Victory Native XL), `@shopify/react-native-skia`,
  `react-native-reanimated`, `react-native-worklets` et
  `react-native-gesture-handler` : fondation des graphiques performants et
  personnalisables.

Avant d'ajouter une bibliothèque d'UI complète, privilégier les composants
maison dans `src/components`, afin de préserver ce système visuel.

## Graphiques

Victory Native XL est la seule bibliothèque de graphiques retenue. Elle ne doit
pas être importée directement depuis une feature. Créer d'abord un wrapper dans
`src/components/charts/` (par exemple `LineChart`, `BarChart`, `DonutChart` ou
`RadarChart`), alimenté par les tokens de `theme/` et une API adaptée aux
besoins métier. Une feature ne consomme que ce wrapper.

Avant de créer un graphique, définir avec le produit : type de données, période,
interactions (sélection, tooltip, zoom), état vide et comportement sur petit
écran. Le rendu doit employer Montserrat et les couleurs centralisées, et ne
jamais figer une largeur à un appareil.

## Ajouter une fonctionnalité

1. Créer `src/features/<nom>/` et n'y ajouter que les sous-dossiers utiles.
2. Créer ou modifier une route sous `app/` qui délègue à l'écran de la feature.
3. Promouvoir dans `src/` uniquement le code réellement partagé.
4. Préserver les frontières ci-dessus plutôt que d'importer directement entre
   features.

## Vérification

Après une modification TypeScript du mobile, exécuter :

```bash
cd mobile && ./node_modules/.bin/tsc --noEmit
```
