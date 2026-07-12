#!/bin/bash
# Деплой на VPS: git pull + docker compose rebuild.
# Запуск: bash deploy/scripts/deploy.sh [staging|prod|all]
set -euo pipefail

PROFILE="${1:-prod}"
APP_DIR="${APP_DIR:-/opt/papikchors}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.yml"

cd "$APP_DIR"

git_cmd() {
  git -c safe.directory="$APP_DIR" "$@"
}

echo "==> git fetch"
git_cmd fetch origin

BRANCH="${DEPLOY_BRANCH:-master}"
echo "==> checkout ${BRANCH}"
git_cmd checkout "$BRANCH"
git_cmd reset --hard "origin/${BRANCH}"

if [ "${_DEPLOY_REEXEC:-}" != "1" ]; then
  export _DEPLOY_REEXEC=1
  exec bash "$APP_DIR/deploy/scripts/deploy.sh" "$@"
fi

deploy_profile() {
  local p="$1"
  local env_file="${APP_DIR}/deploy/env/${p}.env"
  if [ ! -f "$env_file" ]; then
    if [ -f "${env_file}.example" ]; then
      echo "==> creating ${env_file} from example"
      cp "${env_file}.example" "$env_file"
    else
      echo "Missing ${env_file} — copy from ${env_file}.example" >&2
      exit 1
    fi
  fi

  echo "==> docker compose --profile ${p} build"
  docker compose -f "$COMPOSE_FILE" --env-file "$env_file" --profile "$p" build
  echo "==> docker compose --profile ${p} up -d"
  docker compose -f "$COMPOSE_FILE" --env-file "$env_file" --profile "$p" up -d
  echo "==> health check (${p})"
  local port url
  # shellcheck disable=SC1090
  set -a && source "$env_file" && set +a
  case "$p" in
    staging) port="${STAGING_HTTP_PORT:-8083}" ;;
    prod)    port="${PROD_HTTP_PORT:-8082}" ;;
  esac
  url="http://127.0.0.1:${port}/"
  for i in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null; then
      echo "OK ${url}"
      return 0
    fi
    sleep 2
  done
  echo "health check failed: $url" >&2
  docker compose -f "$COMPOSE_FILE" --env-file "$env_file" --profile "$p" logs --tail 50
  return 1
}

case "$PROFILE" in
  staging) deploy_profile staging ;;
  prod)    deploy_profile prod ;;
  all)
    deploy_profile staging
    deploy_profile prod
    ;;
  *)
    echo "Usage: $0 [staging|prod|all]"
    exit 1
    ;;
esac

echo "==> done (${PROFILE})"
