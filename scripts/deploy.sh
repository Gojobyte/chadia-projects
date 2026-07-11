#!/usr/bin/env bash
# =====================================================================
# Déploie CHADIA Projects en production sur le serveur Hetzner.
#
# Peut être lancé :
#   - manuellement : bash scripts/deploy.sh
#   - via GitHub Actions (workflow deploy.yml) : SSH puis ce script
#
# Variables d'environnement optionnelles :
#   SERVICE        — service spécifique à redéployer (gateway, tender, ...)
#                    si vide → détecte les services modifiés OU rebuild tout
#   DEPLOY_SHA     — SHA du commit qui déclenche le déploiement (info logs)
#   DEPLOY_ACTOR   — auteur du déploiement (info logs)
#   USE_SUDO       — "1" pour préfixer les commandes docker par sudo
#                    (défaut auto-detect via DOCKER_HOST)
#
# Étapes :
#   1. Pull les derniers commits depuis main
#   2. Détecte les services modifiés (ou tous si fourni)
#   3. Build + restart les images concernées
#   4. Migration Prisma si tender concerné
#   5. Seed admin (idempotent) si premier déploiement / auth concerné
#   6. Cleanup images orphelines
#
# Pré-requis sur le serveur :
#   - Docker + Docker Compose v2
#   - .env.prod à la racine
#   - Si USE_SUDO=1 : sudoers configuré NOPASSWD pour docker compose
# =====================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

# -------------------------------------------------------------------
# Détection sudo : si DOCKER_HOST n'est pas set et qu'on ne peut pas
# parler au socket user, on bascule sur le socket système avec sudo.
# -------------------------------------------------------------------
if [ "${USE_SUDO:-auto}" = "auto" ]; then
  if docker ps >/dev/null 2>&1; then
    USE_SUDO=0
  else
    USE_SUDO=1
  fi
fi
if [ "$USE_SUDO" = "1" ]; then
  DOCKER="sudo docker"
else
  DOCKER="docker"
  export DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"
fi

COMPOSE="$DOCKER compose --env-file .env.prod -f docker-compose.prod.yml"
LOG_PREFIX="[deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)]"

echo "$LOG_PREFIX === Déploiement (actor=${DEPLOY_ACTOR:-?} sha=${DEPLOY_SHA:-?}) ==="

if [ ! -f .env.prod ]; then
  echo "$LOG_PREFIX ❌ .env.prod manquant — lance scripts/generate-prod-secrets.sh"
  exit 1
fi

# -------------------------------------------------------------------
# 1. Pull du code (skip si déjà à jour ET pas de SERVICE forcé)
# -------------------------------------------------------------------
echo "$LOG_PREFIX 1/6 — git fetch + pull"
git fetch origin main
LOCAL_BEFORE=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse origin/main)

if [ "$LOCAL_BEFORE" = "$REMOTE_HEAD" ] && [ -z "${SERVICE:-}" ]; then
  echo "$LOG_PREFIX Déjà à jour ($LOCAL_BEFORE). Rien à faire."
  exit 0
fi

git reset --hard origin/main
LOCAL_AFTER=$(git rev-parse HEAD)
echo "$LOG_PREFIX HEAD → $(git rev-parse --short HEAD)"

# -------------------------------------------------------------------
# 2. Détection des services à rebuilder
# -------------------------------------------------------------------
ALL_SERVICES="gateway tender auth notification"
if [ -n "${SERVICE:-}" ]; then
  SERVICES_TO_BUILD="$SERVICE"
elif [ "$LOCAL_BEFORE" != "$LOCAL_AFTER" ]; then
  # Diff entre l'ancien HEAD local et le nouveau
  CHANGED=$(git diff --name-only "$LOCAL_BEFORE" "$LOCAL_AFTER" 2>/dev/null | \
            awk -F/ '/^services\//{print $2}' | sort -u | tr '\n' ' ' || true)
  if [ -z "$CHANGED" ]; then
    echo "$LOG_PREFIX Pas de changement dans services/, rebuild full par sécurité."
    SERVICES_TO_BUILD="$ALL_SERVICES"
  else
    SERVICES_TO_BUILD="$CHANGED"
  fi
else
  SERVICES_TO_BUILD="$ALL_SERVICES"
fi
echo "$LOG_PREFIX 2/6 — Services à rebuilder : $SERVICES_TO_BUILD"

# La détection produit des noms de dossiers (services/<nom>), mais le
# compose nomme les services auth-service, tender-service, etc.
COMPOSE_TARGETS=""
for s in $SERVICES_TO_BUILD; do
  case "$s" in
    tender|auth|notification) COMPOSE_TARGETS="$COMPOSE_TARGETS ${s}-service" ;;
    *)                        COMPOSE_TARGETS="$COMPOSE_TARGETS $s" ;;
  esac
done

# -------------------------------------------------------------------
# 3. Build + restart
# -------------------------------------------------------------------
echo "$LOG_PREFIX 3/6 — Build des images"
# shellcheck disable=SC2086
$COMPOSE build $COMPOSE_TARGETS

echo "$LOG_PREFIX 4/6 — Up des conteneurs (recreate si image changée)"
# shellcheck disable=SC2086
$COMPOSE up -d $COMPOSE_TARGETS

# -------------------------------------------------------------------
# 5. Migration Prisma si tender concerné
# -------------------------------------------------------------------
if echo " $SERVICES_TO_BUILD " | grep -q " tender "; then
  echo "$LOG_PREFIX 5/6 — Application des migrations Prisma"
  # Attente que postgres soit prêt
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if $COMPOSE exec -T postgres pg_isready -U chadia >/dev/null 2>&1; then
      break
    fi
    echo "$LOG_PREFIX Postgres pas encore prêt (tentative $i/10)..."
    sleep 2
  done
  $COMPOSE exec -T tender-service npx prisma db push --skip-generate \
    || echo "$LOG_PREFIX ⚠ Migration Prisma échouée — à vérifier manuellement"
fi

# Seed admin idempotent si premier déploiement OU auth modifié
if echo " $SERVICES_TO_BUILD " | grep -q " auth "; then
  echo "$LOG_PREFIX 5b — Seed admin (idempotent)"
  $COMPOSE exec -T auth-service npm run db:seed \
    || echo "$LOG_PREFIX (seed déjà exécuté ou non critique)"
fi

# -------------------------------------------------------------------
# 6. Cleanup
# -------------------------------------------------------------------
echo "$LOG_PREFIX 6/6 — Cleanup images orphelines"
$DOCKER image prune -f >/dev/null 2>&1 || true

echo "$LOG_PREFIX === Déploiement terminé ==="
$COMPOSE ps

PUBLIC_URL=$(grep ^PUBLIC_URL .env.prod | cut -d= -f2 || echo "non défini")
echo "$LOG_PREFIX URL publique : $PUBLIC_URL"
