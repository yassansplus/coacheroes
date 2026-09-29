# Langues de l’application

Le profil expose **Données et application → Langue**, avec **Français**, **English** et **Nederlands**.

Au premier démarrage, sans préférence enregistrée, l’app utilise la langue principale de l’appareil : français, anglais ou néerlandais. Les variantes régionales (`nl-BE`, `nl-NL`, `en-US`, `fr-BE`…) rejoignent le même catalogue. Les autres langues se replient sur le français. Un choix déjà enregistré reste prioritaire, même si la langue de l’appareil change ensuite.

## Préférence et démarrage

- `POST /api/auth/language` accepte uniquement `fr`, `en` et `nl`, sous la garde de session. Il modifie uniquement le compte authentifié.
- La migration additive `1791800000000-UserLanguage` ajoute `users.language`, avec défaut `fr` et contrainte SQL. Elle ne modifie aucune donnée sportive.
- `1791900000000-DutchLanguage` étend cette contrainte à `nl` sans modifier les valeurs existantes. Son rollback refuse de retirer le néerlandais tant qu’un compte l’utilise, pour préserver les choix.
- `/auth/me` restitue cette préférence. Le mobile la conserve aussi dans `src/storage/language.ts` (SecureStore sur mobile, localStorage sur web).
- La préférence locale est restaurée sous le splash, en parallèle du chargement des images. Après connexion, la préférence du compte prévaut.
- La détection utilise `Settings.get('AppleLanguages')` sur iOS, puis `Intl.DateTimeFormat().resolvedOptions().locale` en repli et sur Android ; sur web, elle lit d’abord `navigator.languages[0]`. Aucune dépendance native n’est ajoutée. [Hermes fournit Intl sur iOS et Android](https://reactnative.dev/blog/2022/07/08/hermes-as-the-default).
- La connexion Apple transmet la langue courante pour initialiser **uniquement un nouveau compte**. Une reconnexion conserve la langue existante. Les anciens clients qui omettent le champ restent compatibles (français par défaut serveur).
- Dans le profil, le choix est validé côté serveur avant d’être appliqué localement. En cas d’échec, le sélecteur reste ouvert avec un message et permet de réessayer.

## Interface

`src/i18n/core.ts` porte la langue, les abonnements, les formats régionaux (`fr-FR` / `en-GB` / `nl-NL`) et `t`. Les catalogues sont `src/i18n/en.json` et `src/i18n/nl.json` ; le texte français sert de clé et reste la valeur de repli. Aucun service de traduction n’est appelé à l’affichage.

`LocalizedText` traduit les libellés de présentation au rendu, sans ajouter de vue native ni changer les callbacks. `translate={false}` protège notamment les messages de conversation et les noms saisis. Les valeurs et identifiants des sélecteurs, données persistées, états et règles métier restent indépendants des traductions. Les textes interpolés utilisent des paramètres nommés, par exemple `t('Niveau {p0}', { p0: level })`.

Les écrans et contrôles s’abonnent à la langue avec `useLanguage`. Un changement provoque un nouveau rendu, sans recréer les écrans ni effacer les formulaires. Les dates et nombres utilisent `getLocale()`. Les notifications quotidiennes utilisent la préférence du compte à l’envoi.

Pour un nouveau libellé : conserver sa source française, ajouter les équivalents anglais et néerlandais et vérifier le rendu sur petit écran. Pour une chaîne interpolée, traduire la phrase complète et conserver les paramètres utiles. Les suffixes grammaticaux français peuvent être omis lorsqu’ils n’ont pas d’équivalent. Ne jamais traduire les IDs, enums, valeurs de formulaire ni le contenu écrit par l’utilisateur.

## Coach IA

Les prompts métier restent communs. `api/src/ai/language.ts` produit une consigne finale explicite, à partir de la préférence validée, pour tous les textes visibles ; les clés JSON, enums, IDs, outils et mesures sont inchangés. Le chat du coach, la préparation, la revue et la génération de programme, l’analyse des séances et les analyses nutritionnelles reçoivent cette consigne. Les questions déterministes de préparation et les rappels quotidiens existent dans les trois langues.

La génération conserve la langue dans son contexte. La revue d’un programme utilise la langue actuelle du compte. Les programmes et messages déjà enregistrés ne sont pas régénérés lors d’un changement de langue ; les prochains contenus générés utilisent la nouvelle préférence. Les résumés internes de mémoire peuvent rester en français : ils ne dictent pas la langue de réponse.

## Vérifications

- Mobile : `cd mobile && ./node_modules/.bin/tsc --noEmit && node tests/language.test.cjs`.
- Les tests de langue couvrent les variantes régionales, le premier démarrage, le repli français, la priorité du choix enregistré, la relance, le stockage indisponible et la parité des catalogues. Les tests HTTP couvrent aussi la création d’un compte néerlandais et la conservation de son choix à la reconnexion.
- API : `cd api && npm run build && node tests/language.test.cjs` ; tests existants du chat, de la revue, de la génération, de la nutrition et des séances.
- Contrôle visuel web à 390 et 320 px : catalogue, célébration d’un badge, profil. Le parcours néerlandais vérifie le premier lancement `nl-BE`, la priorité d’un choix anglais après rechargement et la sélection néerlandais → français → anglais → néerlandais. Le contrôle du profil utilise un compte fictif et des requêtes simulées, sans compte réel.
- À vérifier sur la development build iOS : relance de l’application avec la préférence enregistrée et annonces VoiceOver. Aucune nouvelle dépendance native.
