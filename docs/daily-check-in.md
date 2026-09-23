# Bilan quotidien

Le parcours `/today` conserve ses écrans : aperçu, poids, récupération et ajustement facultatif. Les valeurs de démonstration ont été remplacées par les données du compte. L’accueil expose une **icône calendrier avec halo animé**, sans texte visible, tant que le bilan du jour n’est pas terminé. Elle reste disponible après une séance terminée. L’animation respecte la réduction des mouvements.

## Horaires et états

- Une journée est une date civile dans le fuseau IANA du téléphone, enregistré auprès du backend à chaque chargement. Les heures ne sont pas fixées en UTC ; le changement d’heure est pris en compte.
- À partir de 7 h, au premier passage dans l’app, une ouverture est réclamée atomiquement au backend. Le drapeau local persistant évite une seconde ouverture sur cet appareil hors ligne. Les appareils connectés partagent le drapeau serveur.
- Le parcours ne coupe pas une séance en cours : l’ouverture attend le retour sur un écran de navigation habituel. À 7 h, une app déjà au premier plan est vérifiée par le cycle de rafraîchissement (une minute au maximum).
- « Plus tard » et la fermeture ne terminent pas le bilan. L’icône et le rappel restent actifs ; le parcours demeure accessible manuellement.
- Une validation réussie termine le bilan. Une erreur réseau garde les réponses sur l’appareil et demande de réessayer ; elle ne prétend pas que le serveur a reçu le bilan. Un brouillon hors ligne ne peut donc pas annuler un rappel serveur.
- L’enregistrement est protégé par révision et identifiant de requête. Un changement de jour impose de recharger le bilan ; le brouillon précédent reste conservé localement. Un conflit entre appareils conserve le brouillon sans écraser silencieusement la version serveur.

## Données et poids

`daily_check_ins` contient une ligne par `(user_id, date)` : fuseau, ouverture, validation, révision, poids ou pesée ignorée, sommeil en minutes, qualité 1–5, énergie 1–5, courbatures et douleurs latéralisées. Les corrections modifient cette ligne et ajoutent avant/après à `journal_entries` dans la même transaction. `daily_write_receipts` rend les retries idempotents, même après suppression explicite du journal.

La référence de poids est la dernière pesée **strictement antérieure au jour du bilan** : celle de la veille lorsqu’elle existe, sinon la dernière disponible, sinon le poids d’inscription. Le poids suggéré n’est jamais enregistré automatiquement. Le graphe affiche uniquement les mesures réelles des sept jours civils ; moyenne calculée sur les mesures présentes, comparaison aux sept jours précédents si disponibles. Une pesée ignorée ne crée pas de mesure fictive.

Les brouillons et ouvertures locales sont séparés par compte et date, dans deux fichiers alternés privés (`src/storage/daily.ts`). Les données distantes passent par `DailyProvider`, pas par un nouveau store global dupliqué.

## Ajustement du jour

Le backend prépare une proposition déterministe conservatrice, à partir de la séance réellement prévue et des réponses, **sans appel IA** : sommeil inférieur à 6 h, énergie ≤ 2, fortes courbatures ou zones sensibles déclenchent une réduction des séries (25 %, arrondi inférieur, au moins une série), au moins 3 répétitions en réserve, ou des blocs sportifs plus courts et faciles. Sinon, il propose de conserver la séance. Les messages liés aux douleurs ne constituent pas une autorisation de reprise.

La proposition est liée par empreinte aux réponses, au programme, à la séance et à la date. Le backend la recalcule avant acceptation. Un bloc expiré ou une séance déjà commencée n’est pas modifié. Le mobile applique l’ajustement accepté seulement à cette occurrence, avant démarrage ; il ne touche ni aux séries réalisées ni au programme de base ni aux semaines suivantes. Le refus et l’acceptation sont enregistrés.

## Rappel de 9 h

`DailyReminder` vérifie toutes les 30 secondes les utilisateurs éligibles. Il envoie à 9 h locales (fenêtre de reprise jusqu’à 9 h 04) au dernier appareil enregistré dont la session est encore valide. Il ne rattrape pas les rappels de la veille ni ceux après cette fenêtre. Une ligne `daily_reminders` unique par utilisateur/date évite les envois doubles usuels et les doublons entre instances. La validation et la décision d’envoi prennent le même verrou utilisateur.

Le message ne contient aucune mesure : « Ton bilan du matin — Comment tu te sens aujourd’hui ? Fais le point en 1 minute. ». Son ouverture mène au bilan du jour. Le serveur vérifie les tickets Expo puis les reçus après 15 minutes ; un appareil `DeviceNotRegistered` est désinscrit. Un envoi au résultat incertain n’est pas automatiquement relancé. La réception sur le téléphone dépend d’APNs/FCM et du réseau ; aucune garantie de livraison à la seconde ou exactement une fois n’est annoncée. Un rappel déjà confié au transport ne peut pas être retiré par une validation ultérieure ; l’app masque un rappel reçu au premier plan si son bilan est déjà terminé.

## Mise en service

1. Appliquer les migrations : `cd api && npm run migration:run`.
2. Garder l’API en fonctionnement à 9 h. `DISABLE_DAILY_WORKER=true` désactive le worker pour les tests. `EXPO_ACCESS_TOKEN` est facultatif, nécessaire si la sécurité d’accès au service push est activée dans le projet Expo ; ne jamais l’exposer côté mobile.
3. `expo-notifications` a été ajouté avec son plugin. Un **nouveau development build natif** est nécessaire : `cd mobile && npx eas-cli build --profile development --platform ios`. Installer ce build, puis lancer `npx expo start --dev-client --tunnel` si le réseau local pose problème.
4. Vérifier les identifiants push APNs du projet EAS et accepter les notifications sur l’appareil. Android exige ses identifiants FCM. Ni Expo Go ni le web ne sont utilisés pour valider ce rappel push.
5. Vérifier sur appareil : ouverture après 7 h, fermeture sans réouverture, reprise manuelle par l’icône, saisie/validation, absence du rappel à 9 h après validation, réception après « Plus tard », retour depuis la notification.

Références Expo : [configuration](https://docs.expo.dev/push-notifications/push-notifications-setup/), [envoi et reçus](https://docs.expo.dev/push-notifications/sending-notifications/).

## Endpoints authentifiés

- `GET /daily?timezone=Europe/Paris` : bilan courant, référence et historique des pesées (90 mesures maximum).
- `POST /daily/opened` : réclamer l’ouverture automatique, `{timezone}`.
- `PUT /daily` : `{date, timezone, revision, requestId, data, adjustment, proposalId}`.
- `POST /daily/proposal` : `{timezone, data}` ; aucune mutation de séance.
- `PUT /daily/device` : `{timezone, token}` ; `null` désinscrit les appareils liés à cette session.

Les identifiants de compte et de session sont toujours extraits de l’authentification, jamais du formulaire. Les appels push sont simulés dans les tests automatisés.
