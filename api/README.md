# Backend : identité et onboarding

NestJS, PostgreSQL et **TypeORM**. Les schémas sont créés par migrations ; garder
`DATABASE_SYNCHRONIZE=false`. Aucun appel OpenAI dans ce premier lot.

## Démarrage

Utiliser Node 22.21+ (branche 22 LTS) ou une version LTS compatible avec Expo.

```sh
cd api
npm ci
cp .env.example .env.local
# Renseigner les paramètres de la base PostgreSQL et APPLE_CLIENT_ID.
npm run migration:run
npm run start:dev
```

La base doit déjà exister. La migration ajoute uniquement les tables de ce lot.
`DATABASE_MIGRATIONS_RUN=true` permet aussi l’application des migrations au
lancement ; elles sont alors chargées par le module TypeORM. La commande CLI
lit `.env.local` puis `.env`, comme l’application. Le rollback destructif de
cette migration est volontairement refusé : elle contient un historique utilisateur.

Dans `mobile/.env.local`, renseigner `EXPO_PUBLIC_API_URL`, avec le suffixe `/api`.
Depuis un iPhone, utiliser une adresse réseau accessible, pas `localhost`.
HTTPS est obligatoire hors développement. Les fichiers `.env` sont ignorés par Git.

## Apple et session

Le bundle actuel est `com.yassansplus.coacheroes` ; `APPLE_CLIENT_ID` doit correspondre
exactement. `usesAppleSignIn` et les plugins AppleAuthentication/SecureStore sont
configurés côté Expo. Activer Sign in with Apple pour cet identifiant dans le
compte Apple Developer et reconstruire l’application iOS après ajout des modules natifs.
Cette intégration est native iOS ; Android/web affichent un message d’indisponibilité,
sans compte de démonstration ni contournement de l’authentification.

Le serveur délivre un nonce valable cinq minutes, vérifie le JWT Apple (signature
RS256 et clés Apple, issuer, audience, expiration, âge du jeton et nonce), puis
consomme le nonce une seule fois dans la transaction de connexion. Le compte est
identifié par le `sub` Apple unique, jamais par l’adresse email. L’email n’est accepté
que s’il est vérifié par Apple. Les jetons Apple ne sont ni journalisés ni persistés.

La session applicative est un secret aléatoire de 256 bits, conservé uniquement
sous forme SHA-256 côté base, et dans SecureStore sur iOS. Elle expire après sept
jours, sans renouvellement silencieux : une reconnexion Apple est alors nécessaire.
La déconnexion révoque la session ; elle ne supprime pas le compte ou son historique.
Cette première version ne traite pas encore les notifications serveur de révocation
Apple ni les refresh tokens Apple. La limitation HTTP est en mémoire par instance ;
prévoir un stockage partagé si l’API est déployée sur plusieurs instances.

## Modèle de données

| Table | Rôle |
| --- | --- |
| `users` | Identité, identifiant Apple unique, email vérifié, date de création |
| `sessions` | Empreinte du jeton, utilisateur, expiration et révocation |
| `auth_challenges` | Nonce à usage unique, expiration et date de consommation |
| `onboardings` | **Une seule ligne par utilisateur**, réponses courantes, étape, révision et date de finalisation |
| `journal_entries` | Historique séparé des connexions, sauvegardes et corrections |
| `onboarding_photos` | Fichiers privés immuables, dédupliqués par utilisateur et empreinte |

Les réponses d’onboarding sont un document JSONB strictement validé par Zod. Ce
choix garde ensemble le questionnaire initial, y compris les tableaux et champs
facultatifs. Ce document n’est pas destiné à accumuler les futurs repas, séances
ou mesures quotidiennes : ces événements auront leurs propres entités métier.
Les nombres saisis par le formulaire gardent pour l’instant leur représentation
textuelle, y compris les décimales françaises ; la future préparation du contexte
IA devra les convertir explicitement et tenir compte de `skippedSteps`.

Une correction fait un **UPDATE** de `onboardings`, puis un **INSERT** dans
`journal_entries`, au sein de la même transaction TypeORM. Le journal garde les
champs modifiés avec leurs valeurs avant/après, la version du format, la révision,
l’étape, l’heure déclarée par le client, son fuseau et l’heure de réception serveur.
`recorded_at` est la référence serveur ; `occurred_at` est déclaratif.
Un trigger refuse UPDATE sur le journal. La migration AllowJournalDeletion autorise les DELETE explicites sur `journal_entries`, sans supprimer de données lors de son application. Les messages de chat restent protégés contre UPDATE et DELETE. Retirer une référence photo
n’efface ni le fichier précédent ni la trace de la correction.

Un verrou de ligne sérialise les modifications d’un utilisateur ; la révision
empêche un deuxième appareil d’écraser une version plus récente (HTTP 409).
`requestId` identifie une sauvegarde : rejouer la même requête après une réponse
perdue n’ajoute pas une nouvelle correction. Un identifiant réutilisé avec un autre
contenu est refusé. Une sauvegarde sans changement n’ajoute aucune ligne.

La finalisation valide toutes les réponses obligatoires et marque `completed_at`
une seule fois. Modifier le profil ensuite conserve cette date. Aucune finalisation
ne signifie qu’un programme IA a été produit.

Les photos (8 Mo maximum, 100 fichiers par utilisateur pour ce lot) sont stockées
en `bytea`, dans une table séparée : aucun fichier public, aucune URI locale en BDD.
Les téléchargements vérifient la session et le propriétaire. Les anciennes photos
restent disponibles pour l’historique. Pour monter en volume, remplacer ce stockage
par un stockage objet privé tout en gardant les identifiants et contrôles d’accès.

## Routes

Toutes sous `/api`. Toutes sauf challenge/connexion/health exigent `Authorization: Bearer ...`.

| Méthode | Route | Résultat |
| --- | --- | --- |
| POST | `/auth/apple/challenge` | Nonce de connexion |
| POST | `/auth/apple` | Validation Apple, compte et session |
| GET | `/auth/me` | Identité et statut d’onboarding |
| POST | `/auth/logout` | Révocation de la session courante |
| GET | `/onboarding` | Reprise des réponses et de l’étape |
| PUT | `/onboarding` | Mise à jour transactionnelle avec journal |
| POST | `/onboarding/complete` | Validation finale et sauvegarde |
| POST | `/onboarding/photos` | Upload binaire privé, `application/octet-stream` |
| GET | `/onboarding/photos/:id` | Lecture d’une photo appartenant au compte |

## Vérifications

```sh
cd api
npm test
cd ../mobile
./node_modules/.bin/tsc --noEmit
npm run test:onboarding
```

Les tests démarrent les contrôleurs NestJS, appliquent la vraie migration, exécutent
les vraies requêtes TypeORM contre PostgreSQL embarqué (PGlite) et utilisent des
JWT signés avec une clé RSA de test. Ils ne contactent ni Apple ni la base configurée.
Ils couvrent les identités invalides, rejeux, sauvegardes, corrections, conflits,
finalisation, photos privées, expiration et révocation. L’adaptateur de test utilise
une seule connexion ; une validation multi-instance reste à faire sur PostgreSQL réel.

Vérification iOS manuelle : connexion Apple, fermeture/réouverture après une étape
validée, correction depuis le récapitulatif et le profil, retour arrière, étapes
passées, photo, interruption réseau lors d’une sauvegarde, déconnexion/reconnexion.
Tester aussi deux appareils modifiant le même profil : le second doit recevoir un
conflit et pouvoir recharger les réponses enregistrées.

## Programme IA et catalogue wger public

Le flux complet et les schémas se trouvent dans [docs/program-generation.md](../docs/program-generation.md).
`GET /api/program` consulte le résultat du compte ; `POST /api/program/generate`
lance/reprend une génération (corps `{ "retry": true }` pour relancer un échec).
La migration `1790100000000-TrainingPrograms` ajoute une seule ligne métier par
compte, avec historique séparé. Appliquer `npm run migration:run` avant démarrage.

Ajouter `OPENAI_API_KEY` uniquement côté serveur dans `.env` ou `.env.local`, puis
redémarrer. Sans clé, l’API fonctionne mais la génération retourne une erreur
explicite. `OPENAI_PROGRAM_MODEL` vaut par défaut `gpt-5.6-sol`, effort `high`. Le chat sur le programme utilise `OPENAI_REVIEW_MODEL=gpt-5.6-terra` en `medium`, et l’extraction onboarding `OPENAI_ONBOARDING_MODEL=gpt-5.6-luna` en `low`.
Les tests utilisent des réponses OpenAI simulées et ne nécessitent aucune clé.
Les exercices proviennent exclusivement de l’endpoint public wger, sans médias.

## Chat de préparation

`POST /api/chat/onboarding` ouvre ou reprend la conversation ; `GET /api/chat/:id`
consulte les messages ; `POST /api/chat/:id/messages` reçoit `{ requestId, text }`.
Tous ces endpoints exigent la session et vérifient le propriétaire. Migration
`1790200000000-CoachingChat` : prénom Apple, compléments du profil, conversations
et messages immuables. Voir [le flux complet](../docs/onboarding-chat.md).

## Validation du programme

Une génération `ready` reste une proposition tant que `acceptedAt` est nul.
`POST /api/program/accept` valide `{ proposalId }`. Le chat de revue utilise
`POST /api/program-review` et `POST /api/program-review/:id/messages` avec
`{ requestId, proposalId, text }`, puis `GET /api/chat/:id` pour les réponses.
La migration `1790300000000-ProgramAcceptance` doit être appliquée avant redémarrage.
Voir `docs/onboarding-chat.md` pour les révisions historisées et les protections.

La suppression d’une entrée du journal efface également son reçu de déduplication : une ancienne sauvegarde onboarding rejouée peut alors répondre 409 et nécessiter de recharger le profil. La révision protège toujours les données métier contre un écrasement.

## Nutrition

La migration `1790700000000-Nutrition` ajoute les objectifs par version du
programme, le catalogue, les repas privés et les reçus de sauvegarde. Le worker
prépare l'objectif après génération du programme ; il devient actif après sa
validation. Les repas texte/photo sont analysés par `gpt-6-luna`, les objectifs
par Sol/high. Les aliments décrits sont estimés directement par l'IA ; un
produit de marque identifiable peut déclencher `web_search`. Le catalogue reste
pour la recherche manuelle et le code-barres. Les fiches Open Food Facts sont
accessibles sans clé ; `FOODDATA_CENTRAL_API_KEY` enrichit la recherche manuelle. Voir
[docs/nutrition.md](../docs/nutrition.md) pour le flux et les routes.

## Coach IA quotidien

La migration `1790900000000-CoachConversations` ajoute les conversations,
messages immuables et propositions du coach. Appliquer `npm run migration:run`
avant de tester `/api/coach`. Le modèle par défaut est `gpt-6-luna` avec
`OPENAI_COACH_CHAT_MODEL`. Le coach lit le profil d’onboarding, les bilans
quotidiens, repas, séances, programme et anciens conseils selon la question.
Les propositions de correction sont appliquées uniquement après acceptation
explicite. Voir [docs/coach-chat.md](../docs/coach-chat.md) pour les routes,
la mémoire et les deux actions disponibles.
La migration `1791000000000-CoachTablePrivileges` donne au rôle applicatif
(propriétaire de `users`) les droits nécessaires lorsque les migrations sont
lancées avec un rôle PostgreSQL différent.
