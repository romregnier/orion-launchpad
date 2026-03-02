#!/bin/bash
# deploy.sh — Script de déploiement sécurisé pour orion-launchpad.surge.sh
# Vérifie les variables d'env AVANT de builder pour éviter les écrans blancs

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

# ── Vérification des variables d'env ─────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "❌ ERREUR : .env manquant dans $REPO_DIR"
  echo "   Crée le fichier avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY"
  exit 1
fi

if ! grep -q "VITE_SUPABASE_URL" .env || ! grep -q "VITE_SUPABASE_ANON_KEY" .env; then
  echo "❌ ERREUR : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants dans .env"
  exit 1
fi

echo "✅ Variables d'env présentes"

# ── Build ─────────────────────────────────────────────────────────────────────
echo "🔨 Build en cours..."
npm run build

# ── Vérification post-build ───────────────────────────────────────────────────
if ! grep -q "dkctapjhtyjmieolyfqk" dist/assets/index-*.js 2>/dev/null; then
  echo "❌ ERREUR : Supabase URL absente du bundle — build corrompu, déploiement annulé"
  exit 1
fi

echo "✅ Bundle vérifié (Supabase URL présente)"

# ── Préparation ───────────────────────────────────────────────────────────────
cp dist/index.html dist/200.html
cp projects.json dist/projects.json 2>/dev/null || true

# ── Déploiement ───────────────────────────────────────────────────────────────
echo "🚀 Déploiement sur orion-launchpad.surge.sh..."
SURGE_TOKEN=ff76844a18a0a46b59bad88b5d5d1060 ~/.local/node_modules/.bin/surge dist --domain orion-launchpad.surge.sh

echo "✅ Déployé sur https://orion-launchpad.surge.sh"
