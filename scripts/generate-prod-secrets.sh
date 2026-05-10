#!/usr/bin/env bash
# =====================================================================
# Génère un fichier .env.prod avec des secrets aléatoires sûrs.
# À exécuter UNE SEULE FOIS au premier déploiement.
#
# Usage : bash scripts/generate-prod-secrets.sh
# =====================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.prod ]; then
  echo "⚠️  .env.prod existe déjà. Refus de l'écraser."
  echo "    Si tu veux régénérer les secrets, supprime-le d'abord."
  exit 1
fi

# Génère un secret aléatoire en hex (64 chars = 256 bits d'entropie).
gen() { openssl rand -hex 32; }

POSTGRES_PASSWORD=$(gen)
JWT_SECRET=$(gen)
NEXTAUTH_SECRET=$(gen)
INTERNAL_SERVICE_TOKEN=$(gen)
SUPER_ADMIN_PASSWORD=$(openssl rand -base64 18)

cat > .env.prod <<EOF
# =====================================================================
# Secrets de PRODUCTION — généré le $(date -u +%Y-%m-%dT%H:%M:%SZ)
# NE JAMAIS COMMIT CE FICHIER.
# =====================================================================

POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
INTERNAL_SERVICE_TOKEN=$INTERNAL_SERVICE_TOKEN

SUPER_ADMIN_EMAIL=admin@ong-chadia.org
SUPER_ADMIN_PASSWORD=$SUPER_ADMIN_PASSWORD

PUBLIC_URL=http://188.245.42.63

# À remplir manuellement quand tu auras le compte Resend.
RESEND_API_KEY=

# Optionnel · Google OAuth.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF

chmod 600 .env.prod

echo "✅ .env.prod créé avec des secrets aléatoires."
echo ""
echo "🔐 Mot de passe super-admin (à noter quelque part de sûr) :"
echo "   email :    admin@ong-chadia.org"
echo "   password : $SUPER_ADMIN_PASSWORD"
echo ""
echo "Prochaines étapes :"
echo "  1. Édite .env.prod pour ajouter RESEND_API_KEY si tu en as une"
echo "  2. Lance : bash scripts/deploy.sh"
