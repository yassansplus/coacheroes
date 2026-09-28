# Déploiement de l'API Coac Heroes

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
