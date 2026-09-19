# Onboarding

`app/index.tsx` délègue à `OnboardingScreen`. La route `/components` conserve le
catalogue, déplacé dans `features/component-library`. Le bouton de retour du
catalogue retrouve le parcours en cours.

Le parcours reproduit les 16 maquettes fournies : accueil, objectif, profil,
niveau, performances, sports et lieux, disponibilités, équipement, douleurs,
quotidien, habitudes alimentaires, préférences, photos / mensurations,
récapitulatif, animation de génération et aperçu du programme.

L'état appartient à `useOnboarding`; il reste en mémoire, y compris lors des
retours entre étapes. Un rechargement de l'application réinitialise le parcours.
Les modifications depuis le récapitulatif y ramènent directement. Les étapes
facultatives passées sont identifiées et n'utilisent pas silencieusement des
valeurs partiellement modifiées. Les douleurs sont latéralisées.

La musculation est sélectionnée par défaut et reste la base de l’entraînement.
L’étape des sports propose une liste de sports complémentaires facultatifs,
avec sélection multiple. « Musculation uniquement » efface ces compléments;
les décocher un par un ramène également à la musculation seule. Les libellés du
récapitulatif et de l’aperçu utilisent le même registre de sports dans `data.ts`.

Les aliments appréciés et à éviter acceptent aussi une saisie libre avec le
composant partagé `TagInput`. Une virgule, Entrée, le bouton + ou la perte de
focus transforme la saisie en tags supprimables. Les doublons sont ignorés et
les aliments du catalogue conservent leur identifiant. Le brouillon est contrôlé
par la feature et validé aussi au passage à l’étape suivante ou précédente.
Les aliments personnalisés restent visibles dans le détail du programme.

Les boutons Apple / Google ouvrent la démonstration sans authentification.
La génération est une animation locale, annulée au démontage. Les jours, sports,
durées et totaux hebdomadaires de l'aperçu dépendent des choix; ses objectifs
nutritionnels sont les données illustratives de la maquette, pas un calcul
personnalisé. « Commencer » ouvre le programme de démonstration, avec détail des
jours et retour au profil. Aucun backend n'est appelé.

Les photos sont choisies avec `expo-image-picker` et restent des URI locales en
mémoire. Les demandes de permission et les annulations sont gérées. Aucun
secret, token, renseignement médical ou photo n'est persisté ni téléversé.

Validation :

```sh
./node_modules/.bin/tsc --noEmit
npm run test:onboarding
npx expo start --web
```

Utiliser une version Node supportée par Expo 57, par exemple Node 22.21.
Les tests couvrent les validations, les valeurs numériques françaises et la
cohérence des semaines, y compris le passage des disponibilités.
La caméra et les permissions natives doivent aussi être vérifiées sur appareil.
