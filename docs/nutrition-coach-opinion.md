# Avis du coach sur un repas

Depuis le détail d'un repas enregistré, « Demander l’avis au coach » appelle `POST /api/nutrition/meals/:id/opinion`. Le backend prend les aliments, quantités, macros calculées et objectifs actifs, puis demande un avis bref au modèle `OPENAI_NUTRITION_COACH_MODEL` (Terra, raisonnement medium par défaut). La réponse suit un schéma JSON strict et la voix courte du coach. Un même repas et une même révision ne déclenchent qu'un avis sauvegardé ; une correction permet un nouvel avis.

Deux outils sont obligatoires avant la réponse :

- `get_seven_day_journal` renvoie un tableau de sept objets `{ date, training, meals }` jusqu'à la date du repas. Chaque séance contient le sport, les exercices, séries réalisées, métriques et bilan ; chaque repas contient aliments, quantités et macros. Une journée vide signifie seulement qu'aucune donnée n'a été saisie.
- `get_coach_memory` renvoie, par pages de 50 éléments maximum, les anciens avis nutritionnels et les réponses du coach enregistrées dans le chat de revue du programme, du plus récent au plus ancien. Le modèle peut demander les pages suivantes grâce à `nextOffset`.

Ces outils ne transmettent ni identifiant de compte, ni prénom, ni email, ni liste d'allergies. Les valeurs textuelles sont anonymisées et les termes d'allergies déclarées sont masqués dans les anciens messages avant envoi. Les messages du chat onboarding et le prototype de chat quotidien ne font pas partie de cette mémoire : le premier peut contenir des informations sensibles hors du périmètre de l'avis, et le second n'est pas encore persisté côté backend.

`nutrition_coach_opinions` conserve chaque avis et sa révision de repas en append-only. La correction modifie la ligne `nutrition_meals`, efface seulement l'avis courant dans son snapshot et laisse les anciens avis disponibles à l'outil mémoire. La transaction ajoute aussi une entrée `journal_entries`. La requête OpenAI utilise `store: false` ; les tests simulent les réponses et n'engagent aucun appel payant.
