# Séances réalisées et cycle du programme

## Données

`workout_sessions` contient une ligne par séance réalisée : utilisateur, version du programme validé, révision, statut, début/fin, snapshot validé et bilan calculé. Le snapshot contient les exercices (identifiant catalogue et prescription au moment de la séance), chaque série avec UUID stable, poids en kg, répétitions, ressenti, échauffement et dates, les douleurs latéralisées et le bilan énergie/difficulté/commentaire. Une correction remplace le même objet identifié dans la même ligne ; elle n'ajoute pas une seconde séance ou série réalisée.

`journal_entries` conserve avant/après dans la même transaction. `workout_write_receipts` assure la déduplication même si une entrée du journal est supprimée. Une ancienne révision ne peut pas écraser une sauvegarde plus récente ; HTTP 409 conserve le brouillon local et demande une résolution. Les observations client sont déclaratives ; les heures serveur d'enregistrement restent distinctes. Les séries réalisées ne sont pas effacées lors d'un remplacement d'exercice.

`program_blocks` archive le programme et son contexte lors de sa validation, indépendamment des futures propositions. Les séances réalisées gardent cette référence. Les programmes déjà validés sont repris par la migration. Une semaine correspond à une fenêtre de sept jours depuis la validation ; les occurrences utilisent des dates UTC. Le champ `timezone` de la séance conserve le fuseau client.

## Mobile

La mise en page et les composants sont conservés. Les tableaux, graphiques et compteurs existants consomment les performances enregistrées. Les libellés de démonstration sont remplacés par l'état réel ; le bilan de bloc réutilise le dialogue existant.

Deux fichiers privés alternés par compte dans le dossier de documents conservent les snapshots et la file d'attente. Une écriture interrompue permet de relire le dernier fichier complet. Sur le web, le même mécanisme utilise localStorage. Les écritures sont sérialisées ; les requêtes réseau ne bloquent pas les écritures locales. Les UUID/revisions sont conservés lors d'un retry. La synchronisation reprend périodiquement et au retour au premier plan. Les fichiers restent isolés par compte lors d'une déconnexion.

Au retour, la séance en cours est reprise depuis le brouillon local ou l'API. Fermer l'app ne la termine pas. L'action explicite d'arrêt conserve la séance en `abandoned`. Le bouton de fin conserve le bilan en `completed`, y compris hors ligne avant synchronisation. L'analyse serveur nécessite d'abord la synchronisation complète. L'interface avertit si une sauvegarde ne peut pas être synchronisée.

## Historique, progression et autres sports

L'historique des exercices utilise les vraies dates, charges et répétitions. Les records sont calculés sur les séances terminées, hors échauffement. Les dernières charges sont reprises sans inventer de performances pour un exercice inconnu.

L'analyse des séances utilise Sol/high avec un schéma strict adapté aux cartes existantes : une réponse courte et une recommandation par exercice (charge, répétitions, justification). Le serveur vérifie les identifiants et la plage prescrite. Toute hausse exige deux séances récentes faciles en haut de fourchette sans douleur et reste bornée à 5 %. L'utilisateur applique explicitement les recommandations. Une correction invalide l'analyse précédente. Une réponse invalide ou incomplète ne modifie pas la séance. Les requêtes simultanées sont regroupées dans le processus et le résultat est mis en cache avec la révision analysée. Aucun appel réseau ne garde une transaction PostgreSQL ouverte.

Les sports libres conservent leurs blocs prescrits, leur durée réellement chronométrée et le bilan. La distance et les rounds restent null si inconnus. Le commentaire final existant peut fournir une mesure explicite unique (`Distance : 5,2 km ; 6 rounds`) ; l'API accepte également des mesures structurées. Ni le temps d'un bloc prescrit ni la difficulté globale ne sont présentés comme une mesure de son exécution. Un suivi bloc par bloc ou des capteurs nécessiteraient des contrôles supplémentaires, exclus de la demande de préserver le front.

## Fin de bloc

Le suivi distingue les occurrences prévues, réalisées, en cours, interrompues et manquées. Le bilan expose nombre de séances, durée, volume et douleurs. Une faible réalisation suggère de prolonger ; des douleurs suggèrent de revoir les restrictions ; sinon le renouvellement est proposé. Le dialogue existant permet de prolonger deux semaines ou de générer une nouvelle proposition, soumise à validation comme la première.

L'utilisateur a explicitement autorisé le 22 septembre 2026 la transmission à OpenAI des données utiles des séances, douleurs et bilans pour ces analyses et les prochains programmes. `ai-context.ts` projette ces champs sans identifiants de compte, nom, email, photos ou tokens. Les emails et le prénom connu sont aussi retirés des textes transmis. La génération reçoit les 30 dernières séances terminées ; l'analyse reçoit jusqu'à 30 séances antérieures à celle analysée. Le contexte transmis par les outils du générateur est également anonymisé. `store:false` est utilisé. L'application garde les versions brutes en base pour l'historique autorisé ; elle ne prétend pas détecter toute identité tierce écrite dans un commentaire libre.

## API authentifiée

- `PUT /workouts/:id` : sauvegarde `{requestId, revision, snapshot}`.
- `GET /workouts?offset=0` : 50 séances par page ; `GET /workouts/active` : reprises en cours.
- `GET /workouts/:id` : snapshot et bilan.
- `GET /workouts/history/:exerciseId` : 50 dernières réalisations et record.
- `POST /workouts/:id/analysis` : analyse structurée des données enregistrées.
- `POST /workouts/:id/apply-analysis` : application explicite avec `{revision}`.
- `GET /workouts/blocks/:id` : suivi et bilan de bloc.
- `POST /workouts/blocks/:id/extend` : prolongation de deux semaines une fois le bloc terminé.
- `POST /program/generate` avec `{renew:true}` : prochain programme lorsque le bloc est terminé.

Les identifiants utilisateur viennent exclusivement de la session authentifiée.
