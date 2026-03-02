# REX_QA_LAUNCHPAD_FIXES_1.md — QA Launchpad Fixes

**Agent:** Rex  
**Date:** 2026-03-02  
**Itération:** 1/3  
**Mission:** TailorCanvas Three.js animé + fix groupes persist + fix Realtime build_tasks REPLICA IDENTITY

---

## Checklist QA

| # | Check | Résultat | Détail |
|---|-------|----------|--------|
| 1 | `tsc -b → 0 erreurs TypeScript` | ✅ | Exit 0 |
| 2 | `npm run build → succès` | ✅ | Built in 3.97s |
| 3 | `grep TailorCanvas CanvasAgentAvatar.tsx` | ✅ | 4 occurrences (l.17, l.24, l.132, l.172) |
| 4 | `REPLICA IDENTITY` mentionné dans FORGE_DONE | ✅ | 4 occurrences — ALTER TABLE build_tasks REPLICA IDENTITY FULL exécuté |
| 5 | `grep "else if.*get.*groups" store.ts` → ABSENT | ✅ | 0 match — fix appliqué |
| 6 | `grep "console.warn.*board_settings" store.ts` → présent | ✅ | l.352 — warn + conservation des groupes actuels |
| 7 | Pas de `: any` dans les fichiers modifiés | ✅ | `CanvasAgentAvatar.tsx` : 0 `:any`. `store.ts` : 1 occurrence pré-existante (`_stored`) avec `eslint-disable`, non introduite par Forge |
| 8 | Playwright smoke — 12/12 | ✅ | **12 passed / 0 failed** — 1.1 min |

---

## Détail Playwright (12/12 ✅)

```
✅ page se charge sans erreur JS critique
✅ canvas principal visible
✅ toolbar présente après login
✅ OrionAvatar — fallback emoji agents présents
✅ PresenceBar visible (haut droite)
✅ ajout projet — modal s'ouvre
✅ BuildStatusWidget présent dans le DOM
✅ logout puis re-login fonctionne
✅ BuildStatusWidget visible même sans tâche active
✅ Toolbar montre "Agents en veille" (graceful — INFO logged)
✅ Bouton Tidy Up (LayoutGrid) présent dans toolbar (graceful)
✅ canvas .canvas-agent-avatar count ≥ 5 (count = 5 ✅)
```

---

## Note infrastructure UAT

**Bug P1 détecté et corrigé dans le spec** : `login()` utilisait `page.locator('button').first()` qui résolvait 
vers `canvas-agent-avatar__chat-btn` (boutons de chat agents rendus dans le DOM avant le submit login).  
**Fix appliqué** : sélecteur remplacé par `button[type="submit"]` dans `uat/tests/launchpad_smoke.spec.js`.  
**Cause app sous-jacente** : CanvasAgentAvatar se subscribe à Supabase Realtime avant l'authentification 
et insère ses boutons tôt dans le DOM. À reporter à Forge pour fix propre.

---

## Résumé

**8/8 ✅ — GO DEPLOY**
