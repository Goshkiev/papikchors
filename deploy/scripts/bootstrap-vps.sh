#!/bin/bash
# Первичная настройка papikchors на VPS (Docker на :8082, снаружи — host nginx из poker-booking).
# Запуск: bash bootstrap-vps.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Goshkiev/papikchors.git}"
APP_DIR="${APP_DIR:-/opt/papikchors}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите от root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git ca-certificates curl

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull
fi

cd "$APP_DIR/deploy"

if [ ! -f env/prod.env ]; then
  cp env/prod.env.example env/prod.env
  echo "Отредактируйте deploy/env/prod.env (VITE_BOOKING_* URLs)"
fi

echo "==> Сборка и запуск prod (localhost:8082)"
docker compose -f docker-compose.yml --env-file env/prod.env --profile prod up -d --build

echo ""
echo "Готово. Nginx на :80 — один раз на VPS:"
echo "  sudo bash /opt/poker-booking/deploy/scripts/install-host-nginx.sh"
echo ""
echo "Проверка:"
echo "  curl -sI http://127.0.0.1:8082/"
echo "  curl -sI http://127.0.0.1/ -H 'Host: papikchors.ru'"
