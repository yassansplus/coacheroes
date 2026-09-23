# Coach IA — parcours connecté

La route `/coach` conserve les questions rapides et le chat. Les suggestions
envoient une question libre au backend ; l’historique, les messages et les
propositions viennent désormais de `/api/coach` et persistent après redémarrage.
Le coach dispose du profil d’onboarding, d’outils de lecture des repas,
entraînements, programme et anciens conseils, et d’une mémoire résumée tous les
cinq messages utilisateur. Une proposition n’applique rien avant acceptation.
Les corrections prises en charge dans ce lot sont les séries/RIR d’un exercice
existant et la quantité d’un aliment d’un repas enregistré. Les anciennes
maquettes statiques ci-dessous restent comme archives du prototype, mais ne sont
plus affichées par la route. Le chat ne transmet pas encore de photo.

# Ancien prototype visuel

Entrée `/coach`, depuis « Jouer le coach » dans la bibliothèque.

1. Questions rapides : contexte du jour, suggestions, saisie libre, conversations.
2. Chat : historique, photos locales, raccourcis et proposition éventuelle.
3. Pourquoi cet ajustement : observations, conséquences et règle utilisée.
4. Modification proposée : changements détaillés, éléments conservés, refus.
5. Comparer : actuel/proposé, détail des exercices, retour aux données.
6. Décision : cette semaine ou jusqu’à nouvel ordre, appliquer/refuser/discuter.

Les étapes 3–6 n’apparaissent que lorsqu’une proposition est émise. Ouvrir un
détail ou une comparaison ne modifie jamais le programme. Seule la décision
finale met à jour l’état client partagé dans `src/store/programAdjustment.ts`.
Programme applique la prescription à la prochaine sélection de Muscu B et
permet de la rétablir. Une adaptation hebdomadaire expire le lundi suivant.

Les conversations sont conservées en mémoire lors des changements de route,
pas après le redémarrage de l’application. Le contexte et les réponses sont
des exemples : `evaluateDemoQuestion` remplace le futur appel d’outil IA.
Aucun backend, envoi réseau, secret, transcription ou analyse d’image.
Le bouton vocal guide vers la dictée du clavier natif ; les photos utilisent
le sélecteur existant et restent locales.

Les maquettes ont été vérifiées séparément avant chaque écran. Deux écarts
numériques sont corrigés : 18→14 séries est −22 % (arrondi), et une série de
leg curl est explicitement retirée en plus des trois séries d’épaules pour
que le programme appliqué corresponde au total affiché. La durée est choisie
au dernier écran et reste cohérente dans le programme.

Pas de nouvelle dépendance. Les icônes 3D passent par le registre préchargé.
`MessageComposer` et l’option Coach de `AppNavbar` sont partagés. L’onglet Coach
est activé sur ce parcours ; les barres déjà utilisées ailleurs restent telles quelles.

## Vérifications

- `./node_modules/.bin/tsc --noEmit`
- `node --experimental-strip-types --test tests/*.test.cjs` (34 tests)
- `node scripts/check-coach-visuals.mjs`, avec Expo web sur 8092 et Chromium
  CDP sur 9223 : captures à 390 et 320 px, historique, réponses sans proposition,
  refus, application, séance adaptée et rétablissement. Captures dans
  `/tmp/coacheroes-coach-review`, hors dépôt.

La vérification navigateur ne remplace pas un essai sur téléphone pour le
clavier, la galerie, la dictée native et les retours haptiques.
