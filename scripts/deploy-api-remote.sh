#!/usr/bin/env bash
set -euo pipefail
umask 077

mode=${1:?mode missing}
release_id=${2:?release id missing}
expected_digest=${3:?digest missing}
[[ $mode == deploy || $mode == check ]] || exit 2
[[ $release_id =~ ^[0-9]{8}T[0-9]{6}Z-[0-9]+$ ]] || exit 2
[[ $expected_digest =~ ^[a-f0-9]{64}$ ]] || exit 2

root=/home/login/coacheroes
api_dir=$root/api
archive=$root/coacheroes-api-release-$release_id.tar.gz
release_dir=$root/releases/$release_id
backup_dir=$root/backups/$release_id
promoted=0
image_built=0

for command in docker docker-compose tar sha256sum pg_restore curl flock; do
  command -v "$command" >/dev/null || { printf 'Commande serveur absente : %s\n' "$command" >&2; exit 1; }
done
[[ -d $api_dir/src && -f $api_dir/docker-compose.yml ]] || { echo 'Répertoire API inattendu.' >&2; exit 1; }
[[ $(cd "$api_dir" && docker-compose config --services) == api ]] || { echo 'Compose doit contenir uniquement le service api.' >&2; exit 1; }
[[ -f $api_dir/.env && -f $api_dir/.env.local && -f $api_dir/.env.production ]] || { echo 'Fichiers d’environnement serveur manquants.' >&2; exit 1; }
[[ $(docker inspect --format '{{.Name}}' coacheroes-api) == /coacheroes-api ]] || { echo 'Conteneur API inattendu.' >&2; exit 1; }
docker exec coacheroes-api node -e '
  if (process.env.DATABASE_NAME !== "coac_heroes" ||
      process.env.DATABASE_MIGRATIONS_RUN !== "true" ||
      process.env.DATABASE_SYNCHRONIZE !== "false") process.exit(1)
' || { echo 'Configuration de base de données inattendue.' >&2; exit 1; }
docker exec -u postgres naow-db pg_dump --version >/dev/null

if [[ $mode == check ]]; then
  docker exec -u postgres naow-db pg_dump -Fc -U coac_heroes -d coac_heroes >/dev/null
  printf 'Pré-vérification OK : API cible, base dédiée et sauvegarde disponibles. Rien n’a été modifié.\n'
  exit 0
fi

exec 9>"$root/.api-deploy.lock"
flock -n 9 || { echo 'Un autre déploiement API est en cours.' >&2; exit 1; }

[[ -f $archive && ! -e $backup_dir && ! -e $release_dir ]] || { echo 'Archive absente ou identifiant de version déjà utilisé.' >&2; exit 1; }
read -r actual_digest _ < <(sha256sum "$archive")
[[ $actual_digest == "$expected_digest" ]] || { echo 'Archive transférée incorrecte.' >&2; exit 1; }
tar -tzf "$archive" >/dev/null

rollback() {
  local failure=${1:-$?}
  trap - ERR HUP INT TERM
  set +e
  if (( promoted )); then
    echo 'Échec du déploiement : restauration des sources précédentes de l’API.' >&2
    if [[ -d $backup_dir/src-before ]]; then
      [[ ! -e $api_dir/src ]] || mv "$api_dir/src" "$backup_dir/src-failed"
      mv "$backup_dir/src-before" "$api_dir/src"
    fi
    tar -C "$api_dir" -xzf "$backup_dir/api-source.tar.gz"
    if (( image_built )); then
      if cd "$api_dir" && docker-compose build api && docker-compose up -d --no-deps api; then
        echo 'Ancienne image API relancée. La base n’a pas été restaurée automatiquement.' >&2
      else
        echo 'Retour arrière du conteneur échoué : intervention manuelle nécessaire.' >&2
      fi
    fi
  fi
  printf 'Déploiement interrompu. Sauvegardes éventuelles : %s\n' "$backup_dir" >&2
  exit "$failure"
}
trap rollback ERR
trap 'rollback 129' HUP
trap 'rollback 130' INT
trap 'rollback 143' TERM

mkdir -p -m 700 "$backup_dir" "$release_dir"
printf 'Sauvegarde des sources API…\n'
tar -C "$api_dir" -czf "$backup_dir/api-source.tar.gz" \
  Dockerfile .dockerignore package.json package-lock.json tsconfig.json tsconfig.build.json src
test -s "$backup_dir/api-source.tar.gz"

printf 'Sauvegarde complète de la seule base coac_heroes…\n'
docker exec -u postgres naow-db pg_dump -Fc -U coac_heroes -d coac_heroes \
  >"$backup_dir/coac_heroes.dump.partial"
mv "$backup_dir/coac_heroes.dump.partial" "$backup_dir/coac_heroes.dump"
test -s "$backup_dir/coac_heroes.dump"
pg_restore -l "$backup_dir/coac_heroes.dump" >/dev/null

tar -C "$release_dir" -xzf "$archive"
[[ -d $release_dir/src && -f $release_dir/package-lock.json ]] || { echo 'Archive de sources incomplète.' >&2; false; }

# Le conteneur en cours reste intact pendant le transfert et la sauvegarde.
# L’ancien src est conservé hors du contexte Docker ; aucun autre projet n’est touché.
promoted=1
mv "$api_dir/src" "$backup_dir/src-before"
mv "$release_dir/src" "$api_dir/src"
for file in Dockerfile .dockerignore package.json package-lock.json tsconfig.json tsconfig.build.json; do
  cp "$release_dir/$file" "$api_dir/$file"
done

printf 'Construction et remplacement du seul service api…\n'
cd "$api_dir"
docker-compose build api
image_built=1
docker-compose up -d --no-deps api

healthy=0
for (( attempt=0; attempt<24; attempt++ )); do
  if [[ $(docker inspect --format '{{.State.Health.Status}}' coacheroes-api 2>/dev/null) == healthy ]] &&
      curl --fail --silent --show-error --max-time 5 http://192.168.1.37:3004/api/health >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 5
done
[[ $healthy == 1 ]] || { echo 'L’API n’est pas saine après 120 secondes.' >&2; false; }

trap - ERR HUP INT TERM
printf 'Déploiement réussi : %s\nSauvegardes : %s\n' "$release_id" "$backup_dir"
if ! curl --fail --silent --show-error --max-time 12 https://coacheroes.naow.app/api/health >/dev/null; then
  echo 'Attention : le contrôle HTTPS public a échoué ; le contrôle LAN et la santé Docker sont OK.' >&2
fi
