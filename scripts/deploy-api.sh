#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$script_dir/.." && pwd)
target=login@192.168.1.37
remote_root=/home/login/coacheroes
mode=deploy
run_tests=false

usage() {
  printf 'Usage: %s [--check] [--tests]\n' "$0"
  printf '  --check  Vérifie le build et le serveur sans transfert ni redémarrage.\n'
  printf '  --tests  Lance aussi toute la suite de tests API avant le déploiement.\n'
}

for arg in "$@"; do
  case "$arg" in
    --check) mode=check ;;
    --tests) run_tests=true ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done

for command in ssh scp tar sha256sum npm; do
  command -v "$command" >/dev/null || { printf 'Commande requise absente : %s\n' "$command" >&2; exit 1; }
done

printf 'Compilation locale de l’API…\n'
(cd "$repo_dir/api" && npm run build)
if [[ $run_tests == true ]]; then
  printf 'Tests complets de l’API…\n'
  (cd "$repo_dir/api" && npm test)
fi

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/coacheroes-deploy.XXXXXX")
socket=$work_dir/ssh.sock
archive=$work_dir/api.tar.gz
release_id=$(date -u +%Y%m%dT%H%M%SZ)-$$
cleanup() {
  if [[ -S $socket ]]; then ssh -S "$socket" -O exit "$target" >/dev/null 2>&1 || true; fi
  rm -rf -- "$work_dir"
}
trap cleanup EXIT

# Liste fermée : jamais de .env, de build local, de base ou de fichiers mobiles.
tar -C "$repo_dir/api" -czf "$archive" \
  Dockerfile .dockerignore package.json package-lock.json tsconfig.json tsconfig.build.json src
read -r digest _ < <(sha256sum "$archive")

printf 'Connexion SSH à %s (mot de passe demandé par SSH, jamais enregistré)…\n' "$target"
ssh -M -N -f -S "$socket" -o ConnectTimeout=10 -o ControlPersist=600 "$target"
remote() { ssh -S "$socket" -o BatchMode=yes "$target" "$@"; }

if [[ $mode == deploy ]]; then
  printf 'Transfert de la version %s…\n' "$release_id"
  scp -o "ControlPath=$socket" -o BatchMode=yes "$archive" \
    "$target:$remote_root/coacheroes-api-release-$release_id.tar.gz"
fi

remote bash -s -- "$mode" "$release_id" "$digest" < "$script_dir/deploy-api-remote.sh"
