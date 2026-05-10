#!/usr/bin/env bash
# =====================================================================
# Déploie CHADIA Projects en production sur le serveur Hetzner.
#
# Étapes :
#   1. Pull les derniers commits depuis main
#   2. Build les images Docker des 4 services Node
#   3. Démarre / redémarre la stack via docker-compose.prod.yml
#   4. Lance le seed (idempotent grâce au upsert)
#   5. Affiche le statut
#
# Pré-requis :
#   - Docker + Docker Compose v2
#   - Fichier .env.prod présent à la racine du repo
#   - Variable d'env DOCKER_HOST pointant vers le socket système
#
# Usage : bash scripts/deploy.sh
# =====================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

# Si le socket Docker rootless ne fonctionne pas, basculer sur le socket
# système (cas du serveur Hetzner actuel).
export DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"

if [ ! -f .env.prod ]; then
  echo "❌ .env.prod manquant."
  echo "   Lance d'abord : bash scripts/generate-prod-secrets.sh"
  exit 1
fi

echo "==> 1. Pull du code"
git pull origin main

echo ""
echo "==> 2. Build + (re)démarrage de la stack prod"
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

echo ""
echo "==> 3. Attente que Postgres soit prêt"
until docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres pg_isready -U chadia >/dev/null 2>&1; do
  sleep 2
done
echo "    Postgres prêt"

echo ""
echo "==> 4. Seed admin user (idempotent)"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T auth-service npm run db:seed || \
  echo "    (seed déjà exécuté ou erreur non bloquante)"

echo ""
echo "==> 5. Statut de la stack"
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

echo ""
echo "✅ Déploiement terminé."
echo "   URL publique : $(grep ^PUBLIC_URL .env.prod | cut -d= -f2)"
