# Nutrition — prototype frontend

Entrée `/nutrition`, bouton « Jouer la nutrition » du catalogue. Les repas sont
en mémoire pendant la session, avec une journée d’exemple à la date locale.
Aucun appel réseau métier ni persistance. `expo-camera` utilise la version
compatible avec le SDK Expo installé, sans mise à jour du SDK.

Parcours : tableau de bord → texte/photo → validation → éditeur d’aliment →
journal. Le détail permet édition, duplication (à confirmer) et suppression.
Le menu en haut donne accès à l’ajout, à l’historique et aux calories restantes.
L’historique propose jour/semaine/mois, sélection de date et partage natif.

Les maquettes 4 et 4 bis sont fusionnées : quantités, portions et unités sont
configurées par aliment. Le changement d’unité conserve la quantité de base.
Les cuisses indiquent un poids comestible sans os; la sauce se règle séparément.
Les valeurs nutritionnelles et conversions sont des fixtures illustratives.

L’analyse texte/photo est explicitement simulée avec un exemple fixe après
confirmation. Le chemin manuel permet de composer un repas depuis le catalogue.
La caméra utilise le composant partagé CameraCapture : aperçu intégré au cadre,
déclencheur, flash arrière et retournement. L’import galerie reste disponible,
même sans permission caméra. L’aperçu s’arrête en arrière-plan, après capture
ou en quittant l’onglet Photo. Le PhotoPicker d’onboarding reste inchangé.

Tous les totaux dérivent des aliments; une correction n’écrase jamais le journal
avant validation. Les modifications d’un aliment restent locales jusqu’à son
enregistrement puis la validation du repas. Le retour système Android est géré.

Vérification : `node --experimental-strip-types tests/nutrition.test.cjs`,
`./node_modules/.bin/tsc --noEmit`.
