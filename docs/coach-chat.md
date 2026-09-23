# Chat quotidien du coach

`api/src/coach` stocke une ligne par conversation, des messages immuables et des
propositions à valider. La migration `1790900000000-CoachConversations` ajoute
les trois tables. Les messages, les décisions, les corrections du programme et
des repas ainsi que chaque révision de mémoire sont journalisés.

`POST /api/coach/messages` accepte `conversationId` (null pour commencer), un
`requestId` UUID, `text` et la date locale `localDate`. Le titre est produit avec
la première réponse. `GET /api/coach/conversations` liste tout l’historique ;
`GET /api/coach/conversations/:id` recharge ses messages et propositions.
`POST /api/coach/conversations/:id/proposals/:proposalId/decision` accepte
`applied` ou `declined`.

Le modèle par défaut est `gpt-6-luna`, configurable avec
`OPENAI_COACH_CHAT_MODEL`. Le backend utilise la Responses API sans stockage
chez OpenAI (`store: false`). Il transmet la conversation récente, le profil
utile de l’onboarding (sans photos ni email), les titres/synthèses récents et uniquement les résultats des outils que
le modèle appelle. `search_memory` explore toutes les synthèses du compte et
`read_conversation` relit au plus 40 messages d’une discussion choisie. Les
anciens avis repas et revues du programme sont disponibles via un autre outil.
Les bilans quotidiens terminés peuvent aussi être consultés pour le sommeil,
l’énergie et la récupération.
Après cinq messages utilisateur supplémentaires, le résumé de la conversation
est réécrit ; l’ancienne version est conservée dans `journal_entries`.

Les outils d’action ne font **aucune écriture**. Une proposition validée par le
serveur garde l’identifiant et la version du programme ou du repas. L’utilisateur
voit les valeurs avant/après, puis accepte ou refuse. L’acceptation vérifie que
la cible n’a pas changé, applique la correction dans la ligne métier et écrit
l’avant/après dans le journal. Les propositions sont limitées pour ce lot à
`program_exercise` (séries et RIR) et `meal_portion` (quantité et totaux).
