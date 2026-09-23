# Onboarding

La route `/onboarding` délègue à `OnboardingScreen`. Le layout racine vérifie la
session : un visiteur ou un compte incomplet rejoint le parcours ; un compte
ayant terminé rejoint `/`. `/components` reste un catalogue public.

Le bouton Apple effectue une vraie connexion iOS. Le backend vérifie l’identité
et crée la session, stockée via `src/storage/session.ts` dans SecureStore.
La configuration et les migrations sont décrites dans `api/README.md`.

`useOnboarding` charge les réponses du compte. Continuer, Passer et Retour
sauvegardent avant la navigation. Une fermeture restaure **la dernière étape
sauvegardée**, pas une saisie encore non validée. Les brouillons alimentaires sont
validés au passage d’étape. Les photos sont téléversées à la sauvegarde, puis
référencées par identifiant ; leurs URI de cache restent locales.

Une sauvegarde en cours bloque les contrôles. Après une erreur réseau dont le
résultat est incertain, Réessayer renvoie la même opération avec le même identifiant.
Un conflit entre révisions propose de recharger les réponses enregistrées avant
une nouvelle correction. Une erreur ne fait pas avancer le parcours.

Modifier depuis le récapitulatif y ramène ; modifier depuis le profil sauvegarde
puis revient au profil. Aucun profil distant n’est conservé dans `src/store`.
La BDD conserve une seule ligne d’onboarding, mise à jour, et un journal séparé des
anciennes valeurs et corrections. Les données d’un compte ne sont pas réutilisées
pour le suivant.

Le récapitulatif final valide et sauvegarde l’onboarding, puis lance la génération
persistante côté backend. `TrainingProgramView` affiche les phases réelles, les
questions éventuelles et le programme sauvegardé. En cas d’erreur ou d’absence de
clé serveur, le profil reste enregistré et un réessai est proposé. `/program`
permet de retrouver le travail après fermeture. Les anciens `GenerationStep` et
`ProgramStep` ne simulent plus le parcours actif.
Voir `docs/program-generation.md` à la racine pour les schémas du flux.

La connexion Apple native n’est pas disponible sur Android/web dans ce lot.
Il faut reconstruire l’app iOS avec les nouveaux modules et activer Sign in with
Apple pour le bundle configuré. Les photos sont privées et limitées à 8 Mo chacune.

```sh
./node_modules/.bin/tsc --noEmit
npm run test:onboarding
```

La préparation peut ouvrir `PreparationChat` pour compléter les informations
manquantes avant génération. Les réponses sont enregistrées côté serveur et
historisées ; recharger le profil avant de revenir au formulaire. Tous les sports
partagent le nombre total de séances. Voir `docs/onboarding-chat.md` à la racine.
