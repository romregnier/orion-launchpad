# FORGE_DONE_OVERLAP_FIX.md

Date: 2026-02-27
Agent: Forge

## Fixes appliqués (chirurgicaux)

### Bug 1 — Swap supprimé
- Supprimé `SWAP_THRESHOLD`, `swapTargetId`, toute logique swap dans `pushOverlapping`
- `swapTarget` toujours mis à `null`

### Bug 2 — BFS limité niveau 1
- Supprimé le BFS multi-niveaux (MAX_ITERATIONS=20)
- Remplacé par une boucle simple sur les voisins directs du card draggé uniquement

### Bug 3 — pushLevels supprimé
- Supprimé `pushLevels: Record<string, number>` du store (interface + état initial + set())
- Supprimé `pushLevel`/`pushSpring` dans ProjectCard, ListWidgetCard, IdeaWidget
- Spring unique `{stiffness: 300, damping: 30}` pour tous les cards poussés

### Bug 4 — Dead zone 12px
- Push déclenché seulement si overlap > 12px sur les DEUX axes (`rawOverlapX > 12 && rawOverlapY > 12`)

## Vérifications grep

```
grep -rn "pushLevels" src/          → 0 résultat ✅
grep -rn "swapTargetId|SWAP_THRESHOLD" src/store.ts  → 0 résultat ✅
grep -rn "pushOverlapping" src/components/ListWidgetCard.tsx  → ≥1 résultat ✅
grep -rn "pushOverlapping" src/components/IdeaWidget.tsx      → ≥1 résultat ✅
tsc -b && npm run build  → 0 erreurs ✅
```

## Fichiers modifiés
- `src/store.ts`
- `src/components/ProjectCard.tsx`
- `src/components/ListWidgetCard.tsx`
- `src/components/IdeaWidget.tsx`
