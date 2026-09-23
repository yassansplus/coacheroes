# Nutrition

La route `/nutrition` garde le parcours et les composants existants : tableau de
bord, description ou photo, validation, édition des quantités, journal et
historique. Les repas viennent désormais de `GET /api/nutrition` ; les anciennes
fixtures restent dans `data.ts` pour les tests visuels, mais ne sont plus chargées
comme repas du compte. Les objectifs fixes ne sont jamais présentés comme
personnalisés : les anneaux et calories restantes apparaissent seulement après
la génération de l'objectif lié au programme validé.

Le texte et la photo sont analysés sur le serveur. La photo est téléversée en
privé, et les aliments et macros estimés par l'IA sont proposés sur l'écran de
validation sans correspondance forcée avec le catalogue. Une marque identifiable
peut être recherchée sur le web ; sa source est consultable dans l'éditeur.
La recherche manuelle interroge l'API, accepte un nom ou un code
EAN/UPC, et le lecteur de code-barres utilise `expo-camera` déjà installé. Le
serveur reste responsable des valeurs par 100 g/ml et des calculs. Les corrections
de repas sont enregistrées dans la même ligne métier avec une révision et un
journal séparé. Le client n'enregistre plus ses repas en mémoire seule.

Voir [docs/nutrition.md](../../../../docs/nutrition.md) pour les sources, les
limites des estimations et les endpoints.
