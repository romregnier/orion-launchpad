#!/usr/bin/env bash
# quality-gates.sh — Rex Quality Gates
# Usage: bash scripts/quality-gates.sh [REPO_DIR]
# Output: JSON sur stdout + exit 0 si PASS, exit 1 si FAIL
# Version: 1.0 — Nova 2026-03-01 — Implémenté par Forge 2026-03-01

set -uo pipefail
REPO_DIR="${1:-$(pwd)}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

GATE1=0; GATE2=0; GATE3=0; GATE4=0; GATE5=0; GATE6=0
GATE1_MSG=""; GATE2_MSG=""; GATE3_MSG=""
GATE4_MSG=""; GATE5_MSG=""; GATE6_MSG=""

# ── Gate 1 : TypeScript Strict ──────────────────────────────────────────────
echo "=== Gate 1: TypeScript Strict ===" >&2
TSC_OUTPUT=$(cd "$REPO_DIR" && npx tsc -b --noEmit 2>&1)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep 'error TS' | wc -l | tr -d ' ')
ANY_COUNT=$(grep -rn ': any\|as any' "$REPO_DIR/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v '\.d\.ts' | wc -l | tr -d ' ')
if [ "${TSC_ERRORS:-0}" -eq 0 ] && [ "${ANY_COUNT:-0}" -eq 0 ]; then
  GATE1=1; GATE1_MSG="PASS: 0 erreurs TS, 0 any"
  echo "  $GATE1_MSG" >&2
else
  GATE1=0; GATE1_MSG="FAIL: ${TSC_ERRORS} erreurs TS, ${ANY_COUNT} any"
  echo "  $GATE1_MSG" >&2
fi

# ── Gate 2 : Bundle Size ─────────────────────────────────────────────────────
echo "=== Gate 2: Bundle Size ===" >&2
if [ ! -d "$REPO_DIR/dist/assets" ]; then
  echo "  Building..." >&2
  cd "$REPO_DIR" && npm run build > /dev/null 2>&1
fi
BIGGEST_CHUNK=0
for f in "$REPO_DIR/dist/assets/"*.js; do
  [ -f "$f" ] || continue
  SIZE=$(gzip -c "$f" | wc -c)
  [ "$SIZE" -gt "$BIGGEST_CHUNK" ] && BIGGEST_CHUNK=$SIZE
done
if [ "$BIGGEST_CHUNK" -le 600000 ]; then
  GATE2=1; GATE2_MSG="PASS: $(( BIGGEST_CHUNK / 1024 ))kb gzippé (seuil: 600kb)"
else
  GATE2=0; GATE2_MSG="FAIL: $(( BIGGEST_CHUNK / 1024 ))kb gzippé (max 600kb)"
fi
echo "  $GATE2_MSG" >&2

# ── Gate 3 : Secrets Scan ────────────────────────────────────────────────────
echo "=== Gate 3: Secrets Scan ===" >&2
SECRETS_FOUND=0
C1=$(grep -rn 'ghp_[A-Za-z0-9]\{36\}' "$REPO_DIR/src/" 2>/dev/null | wc -l | tr -d ' ')
C2=$(grep -rn '[0-9]\{8,10\}:AAF[A-Za-z0-9_-]\{35\}' "$REPO_DIR/src/" 2>/dev/null | wc -l | tr -d ' ')
C3=$(grep -rn 'VITE_SUPABASE_URL' "$REPO_DIR/src/" 2>/dev/null | wc -l | tr -d ' ')
C4=$(grep -rn 'BEGIN PRIVATE KEY\|BEGIN RSA PRIVATE' "$REPO_DIR/src/" 2>/dev/null | wc -l | tr -d ' ')
SECRETS_FOUND=$(( ${C1:-0} + ${C2:-0} + ${C3:-0} + ${C4:-0} ))
if [ "$SECRETS_FOUND" -eq 0 ]; then
  GATE3=1; GATE3_MSG="PASS: 0 secret détecté"
else
  GATE3=0; GATE3_MSG="FAIL: $SECRETS_FOUND secret(s) hardcodé(s)"
fi
echo "  $GATE3_MSG" >&2

# ── Gate 4 : Accessibility ───────────────────────────────────────────────────
echo "=== Gate 4: Accessibility Basique ===" >&2
B=$(grep -rn '<button' "$REPO_DIR/src/" --include="*.tsx" 2>/dev/null | grep -v 'aria-label\|title=\|data-testid' | wc -l | tr -d ' ')
L=$(grep -rn '<a ' "$REPO_DIR/src/" --include="*.tsx" 2>/dev/null | grep 'href' | grep -v 'aria-label\|title=\|data-testid' | wc -l | tr -d ' ')
TOTAL=$(( ${B:-0} + ${L:-0} ))
if [ "$TOTAL" -le 3 ]; then
  GATE4=1; GATE4_MSG="PASS/WARN: $TOTAL violation(s) a11y (seuil: ≤3)"
else
  GATE4=0; GATE4_MSG="FAIL: $TOTAL violations a11y (max 3)"
fi
echo "  $GATE4_MSG" >&2

# ── Gate 5 : Env Vars dans Bundle ────────────────────────────────────────────
echo "=== Gate 5: Env Vars dans Bundle ===" >&2
if [ -d "$REPO_DIR/dist/assets" ]; then
  FOUND=$(grep -rl "supabase\.co" "$REPO_DIR/dist/assets/"*.js 2>/dev/null | wc -l | tr -d ' ')
  if [ "${FOUND:-0}" -gt 0 ]; then
    GATE5=1; GATE5_MSG="PASS: VITE_SUPABASE_URL injecté ($FOUND fichier(s))"
  else
    GATE5=0; GATE5_MSG="FAIL: supabase.co absent du bundle"
  fi
else
  GATE5=0; GATE5_MSG="FAIL: dist/assets absent — lancer npm run build"
fi
echo "  $GATE5_MSG" >&2

# ── Gate 6 : Dead Imports ────────────────────────────────────────────────────
echo "=== Gate 6: Dead Imports ===" >&2
DEAD_OUTPUT=$(cd "$REPO_DIR" && npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1)
DEAD=$(echo "$DEAD_OUTPUT" | grep "never read\|never used" | wc -l | tr -d ' ')
if [ "${DEAD:-0}" -le 5 ]; then
  GATE6=1; GATE6_MSG="PASS/WARN: ${DEAD} import(s) mort(s) (seuil: ≤5)"
else
  GATE6=0; GATE6_MSG="FAIL: ${DEAD} imports morts (max 5)"
fi
echo "  $GATE6_MSG" >&2

# ── Score & Décision ─────────────────────────────────────────────────────────
SCORE=$(( GATE1 + GATE2 + GATE3 + GATE4 + GATE5 + GATE6 ))
HARD_PASS=$(( GATE1 + GATE2 + GATE3 + GATE5 ))
DEPLOY_OK=false
[ "$SCORE" -ge 5 ] && [ "$HARD_PASS" -eq 4 ] && DEPLOY_OK=true

echo "" >&2
echo "=== RÉSULTAT: $SCORE/6 | Deploy: $DEPLOY_OK ===" >&2

# ── Output JSON ──────────────────────────────────────────────────────────────
cat << EOF
{
  "timestamp": "$TIMESTAMP",
  "repo": "$REPO_DIR",
  "score": $SCORE,
  "score_max": 6,
  "deploy_allowed": $DEPLOY_OK,
  "gates": {
    "gate1_typescript_strict": { "pass": $GATE1, "type": "HARD", "message": "$GATE1_MSG" },
    "gate2_bundle_size":       { "pass": $GATE2, "type": "HARD", "message": "$GATE2_MSG" },
    "gate3_secrets_scan":      { "pass": $GATE3, "type": "HARD", "message": "$GATE3_MSG" },
    "gate4_accessibility":     { "pass": $GATE4, "type": "SOFT", "message": "$GATE4_MSG" },
    "gate5_env_vars":          { "pass": $GATE5, "type": "HARD", "message": "$GATE5_MSG" },
    "gate6_dead_imports":      { "pass": $GATE6, "type": "SOFT", "message": "$GATE6_MSG" }
  }
}
EOF

# Exit code
$DEPLOY_OK && exit 0 || exit 1
