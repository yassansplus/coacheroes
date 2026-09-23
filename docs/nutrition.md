# Parcours nutrition et contrat de données

## Flux

1. Quand `training_programs` devient `ready`, le worker crée une tâche
   `nutrition_plans` pour ce `run_id`. L'objectif n'est actif que si ce programme
   est ensuite accepté. Un ajustement ou renouvellement crée un autre `run_id`
   et donc un autre objectif, sans supprimer l'ancien.
2. Le serveur calcule un repère énergétique à partir de l'onboarding et des
   minutes des séances. L'agent nutrition utilise `get_nutrition_profile` et
   `get_training_program`, propose kcal et macros via JSON Schema, et le serveur
   vérifie l'énergie des macros et l'écart au repère. Il enregistre le résultat,
   les hypothèses et la trace de modèle. L'estimation est un point de départ ;
   elle ne remplace pas un avis médical.
3. Pour un repas texte ou photo, Luna utilise `get_nutrition_targets` et
   `get_food_preferences`, puis renvoie les aliments, les quantités et une
   estimation des macros par 100 g/ml. Une quantité donnée dans le message
   prime sur l'estimation. Le parcours IA ne rapproche pas ces aliments d'un
   article du catalogue. Si la marque et le produit sont identifiables, le
   modèle peut utiliser l'outil OpenAI `web_search` pour chercher la fiche
   nutritionnelle ; une URL effectivement consultée est conservée avec la
   valeur et accessible dans l'éditeur d'aliment. Sans source confirmée, les
   valeurs restent marquées comme estimées. Les photos et portions sans repère
   restent à confirmer par l'utilisateur.
4. La validation crée ou corrige une ligne `nutrition_meals` avec snapshot des
   fiches et quantités ; le journal conserve chaque changement. Le reçu
   idempotent survit à une suppression du journal. Une suppression de repas est
   logique (`deleted_at`) et historisée.

## Sources alimentaires

Le catalogue est réservé à la recherche manuelle et au scan. Open Food Facts
fournit les produits emballés par code-barres (API v3). La
recherche textuelle utilise son endpoint historique tant que leur API de recherche
plein texte moderne n'est pas disponible. Les données contributives peuvent être
absentes ou erronées. L'application indique la source dans la recherche. Les
requêtes serveur utilisent un `User-Agent` identifié ; le réemploi des données
doit respecter la licence ODbL et l'attribution. La recherche distante part
uniquement à la validation du champ, ou après un scan ; la frappe ne consulte
que le cache local du serveur. Le serveur plafonne ses appels Open Food Facts
par minute et conserve les recherches récentes pour respecter leurs limites.

Si `FOODDATA_CENTRAL_API_KEY` est renseigné côté serveur, USDA FoodData Central
complète la recherche manuelle pour les aliments génériques. Sans cette clé,
cette recherche dépend des résultats Open Food Facts et de ceux déjà référencés.
`POST /nutrition/foods/manual` permet d'enregistrer une fiche personnalisée avec
ses valeurs nutritionnelles par 100 g/ml ; l'écran actuel ne propose pas encore
la saisie de ces valeurs.

## Endpoints

Toutes les routes demandent la session Apple : `GET /nutrition` (plan actif,
repas, fiches), `POST /nutrition/plan/retry`, `GET /nutrition/foods?q=`
(cache) ou `GET /nutrition/foods?q=&remote=1` (recherche distante),
`GET /nutrition/foods/barcode/:code`, `POST /nutrition/foods/manual`,
`POST /nutrition/photos` (JPEG/PNG privé, binaire jusqu'à 8 Mo),
`POST /nutrition/analyze`, `PUT /nutrition/meals`, `DELETE /nutrition/meals/:id`.
Les photos et descriptions ne sont envoyées à OpenAI que pour l'analyse
demandée. Les appels utilisent `store:false` ; les données utiles et traces sont
conservées dans notre journal. Les photos ne sont jamais envoyées à Open Food
Facts ou à USDA.

## Exploitation et validation

Appliquer `npm run migration:run` dans `api` avant le démarrage. Les modèles sont
configurables par `OPENAI_NUTRITION_PLAN_MODEL` (défaut Sol/high) et
`OPENAI_NUTRITION_MEAL_MODEL` (défaut GPT-6 Luna/low). La clé OpenAI reste dans
le `.env` serveur. Les tests simulent le modèle et utilisent PGlite, sans appel
payant. `web_search` est disponible après la lecture des deux outils de
contexte, et le prompt lui réserve la recherche aux produits de marque
identifiables. Valider sur iPhone la reconnaissance photo, le scan, les portions, les
produits absents et la reprise réseau. Les quantités photo restent des
estimations à confirmer par l'utilisateur.
