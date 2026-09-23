# Choix du modèle de coaching — 22 septembre 2026

Comparatif documentaire, pas un benchmark mesuré sur des générations réelles. Aucun appel OpenAI payant effectué pour ce travail. Les tests du backend utilisent des réponses simulées : ils vérifient le flux et les contraintes, pas la qualité sportive du modèle.

## Configuration constatée

Répartition intégrée après validation utilisateur : génération et ajustements avec `gpt-5.6-sol` / `high`, discussion sur le programme avec `gpt-5.6-terra` / `medium`, extraction onboarding avec `gpt-5.6-luna` / `low`. Astra est exclu. Le profil normalisé inclut déjà le niveau, les objectifs, les sports, les jours, le matériel et les restrictions. Le manque de consignes explicites de simplicité était un problème de prompt ; il ne permet pas, à lui seul, de conclure à une incapacité du modèle.

## Comparaison et recommandation

| Modèle | Entrée / sortie, dollars par million de tokens | Réglage à évaluer | Usage proposé |
| --- | --- | --- | --- |
| GPT-5.6 Luna | 0,20 / 1,20 | low pour extraction ; high comme ancienne référence | Tâches ciblées économiques |
| GPT-5.6 Terra | 2 / 12 | medium | Chat et clarification du profil |
| GPT-5.6 Sol | 4 / 20 | high | Recommandation de compromis pour générer et ajuster le programme |
| GPT-6 Astra | 10 / 50 | high | Comparaison documentaire uniquement ; exclu par décision utilisateur |

Les usages et niveaux de reasoning proposés sont des hypothèses d'ingénierie à vérifier sur nos profils, pas des scores publiés de coaching. OpenAI positionne [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) pour les volumes économiques, [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) pour le compromis intelligence/coût, [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) pour les tâches complexes, et [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) comme son modèle le plus capable.

Tarifs Standard hors cache et contexte long, vérifiés dans la [tarification officielle](https://developers.openai.com/api/docs/pricing). Le tarif promotionnel de Sol est annoncé au moins jusqu'au 21 novembre 2026.

Exemple purement arithmétique : avec 20 000 tokens d'entrée et 5 000 de sortie cumulés sur tous les appels d'une génération, coût estimé respectivement de 0,010 $, 0,100 $, 0,180 $ et 0,450 $. Ce ne sont ni des consommations observées ni des plafonds. Les tokens de reasoning consomment aussi le budget de sortie ; les allers-retours des outils réexpédient du contexte. Voir [le contrôle des coûts des modèles de reasoning](https://developers.openai.com/api/docs/guides/reasoning#controlling-costs).

Conseil produit : Sol/high pour construire un programme complet, Terra/medium pour discuter. Ne pas activer max partout : il faut mesurer le gain par rapport au coût et au temps d'attente. Cette séparation est implémentée dans `api/src/config/ai-models.ts`. Les trois variables par contexte remplacent `OPENAI_MODEL`, désormais ignorée. Les efforts sont fixés par contexte. Seuls Luna, Terra et Sol sont autorisés ; une valeur invalide bloque le démarrage. Les traces de génération et de chat conservent modèle et effort réellement employés.

## Protocole de benchmark à exécuter ensuite

Comparer Luna/high, Terra/medium et Sol/high sur les mêmes snapshots de catalogue, avec le même prompt, les mêmes outils, schémas et limites. Utiliser huit profils synthétiques, trois répétitions chacun : 72 générations. Ajouter un jeu distinct de révisions via chat si l'on souhaite mesurer ce parcours. Ne pas utiliser de vrais profils personnels.

Profils : débutant en salle, débutant à domicile, niveau inconnu, intermédiaire, sportif avancé dont la musculation est nouvelle, boxe + musculation sur quatre jours, cours fixes + créneaux libres, restriction nécessitant une clarification ou une adaptation explicite.

Mesurer le taux de JSON valide et de conformité au validateur, les identifiants inventés, la conformité matériel/jours/durée/sports, les erreurs de restrictions, les réparations, les réponses incomplètes, le coût total (usage de chaque réponse), la latence médiane et p95, et le taux de générations utiles. Une réponse sans programme n'est pas un succès si le profil permet d'en créer un.

Un coach qualifié évalue les sorties anonymisées : simplicité technique selon l'expérience réelle, pertinence des polyarticulaires et exceptions, équilibre multisport, récupération, progression conditionnelle et concision du ton. La priorité polyarticulaire est une préférence produit, pas une obligation supérieure aux restrictions ou à la maîtrise technique. Les erreurs critiques sont éliminatoires ; une moyenne ne doit pas les masquer.

Mesurer le classificateur de difficulté séparément n'est pas nécessaire : l'utilisateur a choisi que le coach fasse directement cette sélection. Aucune difficulté certifiée wger n'est ajoutée et aucune classification IA séparée n'est déployée.

## Consignes livrées

`api/src/program/exercise-policy.ts` centralise les consignes partagées par la génération, son référentiel transmis au modèle et le chat de révision. Priorités : restrictions, maîtrise technique, matériel, objectifs, puis polyarticulaires. Variantes stables pour débutants ou niveau inconnu, machines autorisées, pas de complexité gratuite, isolation utile acceptée, mouvements de base stables durant le bloc. Wger reste consommé via son endpoint public sans médias.

La simplicité est contrôlée par le coach dans son choix, pas par un filtre de difficulté certifié. Le validateur serveur continue de vérifier les contraintes objectivement disponibles. Les programmes déjà enregistrés ne sont pas régénérés automatiquement.
