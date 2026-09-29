# XP et niveaux

`GET /api/game` est la source des XP, du niveau, des missions et des gains récents. Les écritures métier restent dans leurs tables actuelles ; le service projette les actions confirmées dans `game_xp_events`. La contrainte `(user_id, rule, source_key)` empêche un retry, une correction ou un second appareil de créditer deux fois la même action. `game_processed_journal` évite de reparcourir les mêmes entrées. Les gains acquis restent conservés même si une entrée du journal est ensuite supprimée.

| Action | XP | Limite |
| --- | ---: | --- |
| Onboarding terminé | 100 | Une fois |
| Programme validé | 20 | Par programme |
| Séance prévue terminée | 100 | Par occurrence du programme, quel que soit le sport |
| Séance libre terminée | 60 | Deux par semaine |
| Bilan quotidien terminé | 20 | Un par date |
| Repas enregistré | 10 | Deux par date |
| Au moins 80 % des séances prévues réalisées | 80 | Par semaine civile du programme |
| Quatre bilans quotidiens | 40 | Par semaine civile |
| Bilan de fin de programme | 50 | Par bloc |
| Amitié confirmée | 10 | Par paire d'amis |
| Premier groupe créé, groupe rejoint, challenge rejoint | 5 chacun | Par source |
| Challenge collectif réussi avec contribution | 20 | Par challenge |
| Proposition du coach acceptée ou refusée | 5 | Par proposition |
| Mesure de progression | 5 | Une fois par mois |
| Première photo de profil ou de progression | 5 | Une fois au total |

Les petites actions sociales, de progression et de décision du coach partagent un plafond de 50 XP par semaine. Les consultations, invitations non acceptées, corrections et suppressions ne donnent pas d'XP. Le seuil du niveau 1 vers le niveau 2 est de 200 XP, puis il augmente de 100 XP par niveau jusqu'à 1 000 XP ; il reste ensuite à 1 000 XP.

Le mobile lit le curseur d'événements par compte. Au premier chargement, il affiche le solde existant sans rejouer les anciennes animations. Ensuite, une mutation, le retour au premier plan et un rafraîchissement périodique récupèrent les nouveaux gains. Les événements d'une même réponse sont regroupés dans une animation globale avec un seul retour haptique ; les réglages de réduction des animations sont respectés. Les séances hors ligne donnent leurs XP après synchronisation et validation par l'API. Le récapitulatif de séance affiche uniquement le gain confirmé par le journal d'XP.

La migration `1791600000000-GameProgress` doit être appliquée sur PostgreSQL avant de démarrer cette version de l'API : depuis `api/`, `npm run migration:run`. Les huit badges et leurs célébrations utilisent aussi la migration `1791700000000-GameBadges` ; voir [badges.md](badges.md) pour leurs critères, illustrations et accusés de réception.

Les récompenses débloquées et les éléments équipés sont également renvoyés par `GET /api/game`. Les cadres azur/cobalt exigent les niveaux 5/9, Confirmé le niveau 8 et le thème violet 5 000 XP acquis. Assidu exige une série réelle de 14 bilans quotidiens terminés sur des dates consécutives : les brouillons et dates futures sont exclus. Une série historique suffit, même si la série actuelle est interrompue. Un nouveau compte commence sans cadre ni titre, avec le thème clair.

`PUT /api/game/equipment` valide chaque choix côté serveur, puis sauvegarde le cadre, le titre et le thème dans `game_equipment`, par compte, avec une entrée de journal transactionnelle. Les sélections sont restaurées après une reconnexion et sur un autre appareil. La migration additive `1792000000000-GameEquipment` doit être appliquée avant cette version de l'API ; elle ne modifie aucune donnée existante.

« Mes records » utilise les performances de `/api/progression`, après synchronisation des séances. Une première performance mesurée établit un record ; une charge supérieure ou davantage de répétitions à charge égale établit le suivant. Les tests Sac/Corde comparent respectivement les frappes et la durée. Les points initiaux de l'onboarding, valeurs inconnues, égalités et dates futures sont exclus. La projection conserve le meilleur résultat par exercice et par date ; les corrections et suppressions sont prises en compte au prochain chargement. Le dernier record, l'historique et les compteurs mensuels viennent de cette projection. Aucun XP supplémentaire n'est annoncé pour un record.
