# REX QA — Launchpad Bugs — Iter 1

Date: 2026-02-27

## Checklist

- ✅ `tsc -b` → 0 erreurs
- ✅ `npm run build` → succès (vite build OK, exit 0)
- ✅ `grep removeListItem src/components/ListWidgetCard.tsx` → trouvé (ligne 21 + 272)
- ✅ `grep stiffness.*350 src/components/AddProjectModal.tsx` → trouvé (ligne 101)
- ✅ `grep pushLevels|swapTargetId src/store.ts` → 0 résultat ✓
- ✅ `updateProject:` spreads `...updates` correctement (groupId passé)

## Verdict : ✅ PASS — Déploiement autorisé
