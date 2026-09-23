# Programme connecté

`/program` affiche `ProgramProposal` tant que le programme n'est pas validé :
récapitulatif, chat de questions/ajustements et bouton « Valider mon programme ».
Après validation serveur, `GeneratedProgramScreen` affiche l'interface historique
`ProgramScreen` / `ProgramOverview`, alimentée par le programme réel via
`generatedAdapter.ts`. Les cartes et le calendrier utilisent les jours, durées et
nombres d'exercices reçus ; la semaine courante part de la validation.
Les semaines du bloc reprennent le même planning et les prescriptions initiales ;
l'adaptation hebdomadaire automatique n'est pas implémentée.

Les données distantes restent dans les hooks/services partagés, hors `src/store`.
Les séries réalisées restent en mémoire : leur persistance est un prochain lot.
Les remplacements et analyses de démonstration restent masqués pour les séances IA.
Voir `docs/onboarding-chat.md` pour le parcours et les garanties de persistance.

# Programme — prototype frontend

Description historique du prototype, conservé pour le catalogue. La route `/program`
utilise désormais les données serveur et le parcours de validation décrit ci-dessus. Les données
historiques et les propositions du coach sont explicitement des exemples.

## Parcours

- Programme (séances ou calendrier) → détail → préparation → échauffement
  facultatif → exercice.
- Une ligne de série ouvre `SetDrawer` : charge/répétitions → ressenti →
  ajustement facultatif si la charge proposée est inférieure à la charge
  saisie, les répétitions sous la cible et le ressenti difficile/échec.
- La validation déclenche le repos facultatif puis la prochaine série ou le
  prochain exercice. Les échauffements ne consomment pas de série de travail.
- Le menu de l’exercice ouvre le remplacement, le signalement de douleur ou
  l’historique. Remplacer conserve les séries déjà réalisées.
- Toutes les séries terminées → débrief → résumé et récompense XP.
- Un exercice du résumé ouvre son historique. Les CTA ouvrent l’accueil ou
  l’analyse locale du coach. Appliquer met à jour la prochaine séance tant
  que ce parcours reste monté.
- Les séances de boxe sont libres : chronomètre puis débrief manuel.

`useProgram` contrôle les transitions et les minuteurs basés sur une échéance
réelle (résistant à une mise en arrière-plan). `utils.ts` contient les
transformations immuables testables. Les séries restent modifiables avant le
débrief. L’annulation du drawer n’enregistre rien.

`XPRewardCard` est partagé et présenté dans la bibliothèque. Il désactive les
haptics sur le web, respecte la réduction des animations et nettoie ses
minuteurs en arrière-plan ou au démontage. Les XP dépendent des séries de
travail, pas du nombre de fragments d’exercice après remplacement.

## Vérification

Depuis `mobile/` :

```bash
./node_modules/.bin/tsc --noEmit
node --experimental-strip-types --test tests/program.test.cjs
```

Les maquettes ordonnées sont dans `mobile/PROGRAMME/`. L’illustration du banc
est documentée dans `mobile/assets/program/GENERATION.md`.

## Contrôle visuel

Les écrans ont été relus contre les 14 maquettes. `ProgramOverview` porte la
composition de l’écran 01 ; `SessionViews` porte les vues de séance et de bilan.
Les indicateurs de défilement restent masqués sans désactiver le défilement.
`ImageWarmup`, au layout racine, attend le chargement des images natives avant
de retirer le splash (lots de six, délai de secours et erreurs journalisées).
`Illustration` désactive le fondu d’apparition Android.

`scripts/check-program-visuals.mjs` utilise un serveur Expo web sur le port 8092
et Chromium avec son port de debugging local 9223. Il parcourt les 20 séries,
contrôle les erreurs JavaScript et capture les 14 vues ainsi qu’un aperçu à
320 px dans `/tmp/coacheroes-program-review/`. Les captures web ne remplacent
pas une vérification du cache d’images et des haptics sur appareil natif.

La préparation peut ouvrir `PreparationChat` pour compléter les informations
manquantes avant génération. Les réponses sont enregistrées côté serveur et
historisées ; recharger le profil avant de revenir au formulaire. Tous les sports
partagent le nombre total de séances. Voir `docs/onboarding-chat.md` à la racine.
