# Déploiement de l'API Coac Heroes

## Redéploiement automatique

Depuis la racine du projet dans PowerShell :

```powershell
.\deploy-api.ps1
```

Ou dans Bash/WSL : `bash scripts/deploy-api.sh`. SSH demande le mot de passe de
`login@192.168.1.37` ; aucun mot de passe n'est stocké dans le script. Les options
`-Check` (PowerShell) / `--check` (Bash) vérifient le build local, l'accès au
serveur et la possibilité de sauvegarder la base **sans déployer**. Les options
`-Tests` / `--tests` ajoutent toute la suite de tests API avant le transfert.

La commande normale déploie l'état local enregistré sur disque, y compris les
modifications non commitées. Elle compile le backend, transfère une archive contenant seulement
ses sources et fichiers de build, puis sauvegarde ses sources actuelles et un dump
complet de la seule base `coac_heroes`. Le dump comprend les photos, stockées en
`bytea` dans PostgreSQL. Les sauvegardes restent dans
`/home/login/coacheroes/backups/<version>/`, avec des permissions privées et
sans purge automatique. Le script remplace seulement le répertoire source de
l'API, reconstruit `api`, puis utilise `docker-compose up -d --no-deps api`.
Il n'arrête ni ne recrée `naow-db`, Nginx ou les autres conteneurs et ne supprime
aucun volume. Les `.env` et `docker-compose.yml` du serveur restent en place.
Ces sauvegardes sont sur le même serveur : elles protègent le déploiement, mais
ne remplacent pas une sauvegarde hors serveur en cas de panne du disque.

Si le build ou le contrôle de santé échoue, le script restaure les anciens
fichiers API et, si nécessaire, reconstruit et relance son ancien conteneur.
Il ne restaure **jamais** automatiquement PostgreSQL : une migration déjà
appliquée ou une écriture concurrente demande une décision manuelle avant tout
retour arrière de la base. Le dump vérifié reste disponible à cet effet. Le
contrôle HTTPS public signale un avertissement si le proxy ne répond pas, mais
la réussite requiert que le conteneur soit `healthy` et que l'API LAN réponde.

L'API est déployée dans `/home/login/coacheroes/api` sur `192.168.1.37` avec
`docker-compose` (version 1). Le service `coacheroes-api` utilise deux réseaux
Docker externes existants : `naow-app_naow-internal` pour joindre `naow-db` et
`docker_proxy` pour être accessible à Nginx Proxy Manager. La base
`coac_heroes` et son rôle applicatif sont dédiés à ce service dans le PostgreSQL
15 déjà en place.

Le conteneur charge `.env`, `.env.local`, puis `.env.production` ; le dernier
fichier contient les valeurs de production et les identifiants de la base.
Ces fichiers restent uniquement sur le serveur avec des permissions `600` et
sont exclus de l'image Docker. Ne pas afficher les variables d'environnement
avec `docker-compose config` ni les inclure dans une archive de code.

L'API répond actuellement en développement sur le LAN à
`http://192.168.1.37:3004/api/health`. Le port Docker est lié seulement à
`192.168.1.37`. `mobile/.env.local` utilise
`EXPO_PUBLIC_API_URL=http://192.168.1.37:3004/api` pour la development build ;
redémarrer Metro après un changement de variable `EXPO_PUBLIC_*`.

## Mise en service du sous-domaine

Le Proxy Host `coacheroes.naow.app` existe dans Nginx Proxy Manager (ID 11)
et transmet à `coacheroes-api:3000`. Les deux conteneurs partagent
`docker_proxy`. L'enregistrement DNS A pointe vers `82.66.250.135`, le
certificat Let's Encrypt est associé au proxy et **Force SSL** est activé.
L'accès HTTPS à `/api/health` répond `200` avec un certificat valide ; HTTP
redirige vers HTTPS avec `301`. Certains résolveurs peuvent conserver l'ancienne
adresse `217.160.0.189` le temps que leur cache DNS expire.

Pour connecter la development build au domaine public :

1. Passer le `EXPO_PUBLIC_API_URL` local à
   `https://coacheroes.naow.app/api` et redémarrer Metro pour la development
   build. La variable EAS `production` utilise déjà cette URL ; lancer une
   nouvelle build pour l'intégrer dans une version distribuée.

## Exploitation

Depuis `/home/login/coacheroes/api` :

```sh
docker-compose build api
docker-compose up -d --no-deps api
docker ps --filter name=coacheroes-api
curl --fail http://192.168.1.37:3004/api/health
```

Après une modification d'un fichier `.env`, recréer uniquement le conteneur
de l'API pour charger les nouvelles variables ; `docker restart` conserve les
anciennes valeurs :

```sh
docker-compose up -d --no-deps --force-recreate api
```

Le backend accepte `gpt-6-sol` dans les variables de modèle OpenAI. Sa présence
dans la configuration ne garantit pas à elle seule l'accès de la clé à ce modèle.

`DATABASE_MIGRATIONS_RUN=true` applique les nouvelles migrations au démarrage.
`DATABASE_SYNCHRONIZE=false` empêche la synchronisation automatique du schéma.
Le service ne gère ni le cycle de vie de `naow-db` ni celui du proxy existant.
