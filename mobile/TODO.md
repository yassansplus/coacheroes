# TODO — Connexions des parcours et backend

État au 21 septembre 2026. Les écrans de gamification sont accessibles et les
interactions de démonstration fonctionnent en mémoire. Les points ci-dessous
restent à réaliser ; ils ne dépendent pas tous du backend.

## Backend et synchronisation des données

- [ ] Persister les missions, leur progression, les abandons et les récompenses récupérées par utilisateur et par période.
- [ ] Relier les séances terminées aux missions, aux XP, aux records et aux contributions Squad.
- [ ] Relier les repas enregistrés aux objectifs nutritionnels et aux missions quotidiennes et hebdomadaires.
- [ ] Relier les check-ins aux missions, au sommeil et aux séries de régularité.
- [ ] Définir les règles de validation d’une journée, de maintien des séries et de prise en compte des repos planifiés.
- [ ] Définir les barèmes d’XP, les seuils de niveau et les conditions de déblocage des badges et récompenses.
- [ ] Calculer et attribuer les récompenses côté serveur sans double crédit, y compris après une reconnexion ou une nouvelle tentative.
- [ ] Déclencher le passage de niveau après les gains issus des parcours concernés ; conserver le surplus d’XP et éviter de rejouer une célébration déjà vue.
- [ ] Persister les éléments équipés et les synchroniser sur les surfaces concernées.
- [ ] Alimenter les historiques, périodes précédentes et dates avec les données réelles.
- [ ] Harmoniser les totaux entre Accueil, Profil, gamification et Squad ; distinguer XP total, XP hebdomadaire et XP de classement.
- [ ] Définir si les XP de records personnels participent au classement Squad basé sur la régularité.
- [ ] Remplacer les valeurs mockées et prévoir les états chargement, vide, erreur et nouvelle tentative.

## Frontend — navigation précise et complétude des parcours

- [ ] Ouvrir la séance concernée depuis une mission, plutôt que l’accueil générique du Programme.
- [ ] Ouvrir directement l’exercice ou le test concerné depuis un record, plutôt que l’accueil de Progression.
- [ ] Ouvrir le journal nutritionnel à la date sélectionnée depuis les jours validés d’une mission.
- [ ] Préserver le contexte et le retour vers la mission ou le record après ces navigations ciblées.
- [ ] Remplacer les panneaux textuels de détails et d’historiques par les vues complètes une fois leur contenu et leur design définis.
- [ ] Étendre le choix de période aux historiques réellement disponibles.
- [ ] Définir puis appliquer la portée des éléments équipés : cadre, titre et thème (Profil uniquement ou application entière).
- [ ] Vérifier les parcours de bout en bout et le rendu sur téléphone, y compris petits écrans et textes longs, lorsque la validation sur appareil sera autorisée.

## Fonctions volontairement reportées — écrans et services à définir

- [ ] Squad : inviter et rejoindre un groupe.
- [ ] Squad : paramètres et gestion du groupe, rôles et permissions.
- [ ] Squad : historique du challenge, détails des records et événements partagés.
- [ ] Squad : paramètres de confidentialité et contrôle des données partagées.
- [ ] Profil : modification des objectifs calories et macros.
- [ ] Apple Santé et suivi des pas : connexion, autorisations et synchronisation.
- [ ] Notifications : centre de notifications et préférences.
- [ ] Confidentialité et données : parcours de gestion et actions associées.
- [ ] Export des données : génération et téléchargement ou partage.

Ces éléments nécessitent selon le cas du frontend, du backend ou une intégration
native. Ne pas considérer l’ajout du backend comme suffisant pour fermer toute
cette liste.
