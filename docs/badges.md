# Badges et célébrations

`GET /api/game` renvoie huit badges calculés à partir des données enregistrées. Les nouveaux PNG transparents au style jeu vidéo remplacent les anciens visuels QuiverAI dans `mobile/src/config/illustrations.ts`. `badgeStyles` dans `src/config/badges.ts` décrit les dix rangs visuels : leur chiffre est un rang artistique, pas l'objectif à réaliser ni le niveau XP du compte.

Les huit accomplissements utilisent des visuels distincts : bois pour le premier bilan, pierre pour la première séance, bronze pour le sommeil, acier pour le premier mois, émeraude pour la boxe, saphir pour les protéines, améthyste pour les tractions et obsidienne pour les 100 séances. Argent et or sont également disponibles dans l'aperçu des dix styles ; aucun nouveau critère de déblocage n'est inventé.

Les originaux restent dans `mobile/assets/badges/niveaux/`. `node mobile/scripts/prepare-badge-assets.cjs` génère les versions 768 × 768 RGBA dans `niveaux/runtime/`, seules versions embarquées via les `require` statiques du registre. Le préchargement commun (`Image.prefetch` puis `ImageWarmup` natif sous le splash) inclut automatiquement les dix images avant l'affichage des routes. `Illustration` désactive le fondu des images. Le mécanisme commun conserve son délai de secours de 15 secondes en cas de problème de chargement.

La collection utilise des illustrations de 128 pt maximum, réduites à la largeur disponible des cartes. La célébration affiche jusqu'à 271 pt de badge dans un halo de 288 pt, réduit selon la largeur et la hauteur de l'écran.

| Badge | Condition |
| --- | --- |
| Premier bilan | Un bilan quotidien terminé |
| Première séance | Une séance terminée |
| Premier mois | 30 bilans quotidiens terminés, sans obligation de jours consécutifs |
| 100 entraînements | 100 séances terminées |
| 10 tractions | Une série enregistrée de 10 tractions, hors échauffement et assistance |
| Retour du boxeur | 20 séances de boxe terminées |
| Sommeil régulier | 30 bilans terminés avec au moins 360 minutes de sommeil renseignées |
| Protéines | 50 dates où les repas non supprimés atteignent la cible protéines du programme accepté correspondant à cette date |

Les séances abandonnées ou en cours ne comptent pas. Les occurrences de séances prévues sont dédupliquées par programme, semaine et index. Les nuits inconnues et les journées sans cible nutritionnelle connue ne comptent pas. L'identification des tractions s'appuie sur le nom enregistré de l'exercice et exclut les variantes assistées, négatives et horizontales ; elle ne constitue pas une validation de la technique. Les dates futures sont exclues.

`api/src/game/game.badges.ts` projette ces mesures sous le verrou du compte utilisé par le service des XP. La clé `(user_id, badge_id)` de `game_badges` empêche les doubles déblocages. Une correction ou suppression ultérieure ne retire pas un badge acquis. `unlocked_at` est la date de constat du déblocage par le serveur, y compris pour des activités anciennes lors du premier chargement.

`BadgeCelebrations` affiche les badges débloqués dont `celebratedAt` est nul, un par un. Le dialogue partagé `AchievementCelebration` compose `AppModal`, `AchievementBadge`, `Motion`, `RewardBurst`, `IconButton` et `Button`. Le badge apparaît au centre avec halo et particules, et reste affiché jusqu'à sa fermeture. La réduction des animations suit les primitives partagées. L'option `aboveAll` d'`AppModal` permet de couvrir aussi un drawer déjà ouvert sur iOS. Une notification XP en cours et le passage de l'application en arrière-plan suspendent l'affichage.

La fermeture mémorise localement le badge par compte et appelle `POST /api/game/badges/celebrated`. Cet accusé de réception est idempotent et ne peut créer aucun déblocage. En cas d'échec réseau, le mobile conserve la fermeture et retente lors du prochain rafraîchissement. Un badge encore ouvert réapparaît après un redémarrage ; un badge déjà fermé ne rejoue pas son animation. Deux appareils ouverts simultanément peuvent présenter un même déblocage avant de recevoir l'accusé de réception de l'autre. Les séances hors ligne ne débloquent les badges qu'après synchronisation serveur.

Le catalogue `/components` présente « Badges et déblocages » juste sous son introduction. « Voir la page des badges » ouvre `/components?preview=badges`, avec les huit badges, leurs filtres et des progressions de démonstration. Chaque carte permet de rejouer sa célébration, y compris lorsqu'elle est verrouillée dans l'aperçu. Le bouton « Jouer trois déblocages à la suite » permet de tester leur enchaînement. « Jouer l’animation de déblocage » lance aussi directement une célébration depuis le catalogue. Aucun de ces aperçus ne modifie les accomplissements du compte.

`AchievementCollection` est la collection visuelle partagée entre l'écran réel et cet aperçu : elle reçoit ses éléments et callbacks sans charger ni persister de données.

La section « Les 10 styles de badges » de `/components?preview=badges` expose toute la série, du bois à l'obsidienne. Chaque modèle ouvre la même animation que les accomplissements réels.

## Mise en service et vérification

Appliquer la migration additive `1791700000000-GameBadges` via `cd api && npm run migration:run`, avec la migration XP précédente. Aucune nouvelle dépendance native n'est nécessaire.

Vérifications : `cd mobile && ./node_modules/.bin/tsc --noEmit && node --test tests/badge-storage.test.cjs`, puis `cd api && npm run build && node --test --test-concurrency=1 tests/game-badges.test.cjs tests/game.test.cjs`.

Sur la development build : terminer un premier bilan, attendre la fin de la notification XP, fermer le badge, puis rouvrir l'app pour vérifier qu'il ne revient pas. Tester également deux déblocages simultanés, le retour d'arrière-plan, un drawer ouvert et la réduction des animations iOS.
