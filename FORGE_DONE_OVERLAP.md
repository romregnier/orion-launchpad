# FORGE_DONE_OVERLAP.md — Anti-Overlap v2 : Cascade + Swap

**Date :** 2026-02-27
**Agent :** Forge
**Build :** ✅ tsc -b + npm run build → 0 erreurs

---

## Résumé des implémentations

### 1. Interface `CanvasObject` + `getAllCanvasObjects()`
Ajouté dans `src/store.ts` :
- `export interface CanvasObject { id, type, x, y, width, height }`
- `getAllCanvasObjectsFromState()` (helper interne)
- `getAllCanvasObjects()` méthode store
- Dimensions : ProjectCard 280×180, ListWidget 260×200, IdeaWidget 240×160

### 2. `pushOverlapping` — BFS cascade
- Remplace l'ancien algo naïf
- Détection overlap avec padding 16px
- Direction vecteur centre-à-centre, axe de moindre résistance
- Propagation BFS : MAX_ITERATIONS=20
- Clamp canvas [8px, 8px, canvasW-8, canvasH-8]

### 3. Swap élastique
- Seuil 40% distance inter-centres
- `swapTarget: string | null` dans le store
- Indicateur visuel : border glow `0 0 0 2px #E11F7B` + shadow rose sur la card cible
- Priorité swap > push (swap target exclu du BFS)

### 4. Application à tous les widgets
- `ProjectCard.tsx` ✅ (branché, spring détection push level)
- `ListWidgetCard.tsx` ✅ (branché avec RAF, même pattern)
- `IdeaWidget.tsx` ✅ (branché avec RAF, id 'idea-widget')

### 5. Animations (specs Aria)
- Push direct (niveau 1) : spring `{stiffness:300, damping:30}`
- Propagation (niveau 2+) : spring `{stiffness:240, damping:32}` + délai 30ms×level
- Swap target : spring `{stiffness:260, damping:24}`
- Card draggée : scale 1.04 + shadow profonde
- Positions via Framer Motion `animate={{ x, y }}` avec spring

---

## Vérifications grep

```
grep -rn "CanvasObject|getAllCanvasObjects" src/
→ store.ts:6,15,16,96,321,435 ✅

grep -rn "swapTarget|swap" src/
→ store.ts, ProjectCard, ListWidgetCard, IdeaWidget ✅

grep -rn "pushOverlapping" src/components/ListWidgetCard.tsx
→ lignes 21, 55, 65, 82, 91 ✅

grep -rn "pushOverlapping" src/components/IdeaWidget.tsx
→ lignes 18, 67, 77, 95, 104 ✅

grep -rn "stiffness: 240|stiffness: 260" src/
→ ProjectCard.tsx, ListWidgetCard.tsx, IdeaWidget.tsx ✅

tsc -b → 0 erreurs ✅
npm run build → succès ✅
```

---

## Fichiers modifiés
- `src/store.ts` — CanvasObject, swapTarget, pushLevels, BFS pushOverlapping
- `src/components/ProjectCard.tsx` — motion.div positioning, swap glow, push animations
- `src/components/ListWidgetCard.tsx` — RAF mousemove, pushOverlapping, swap glow
- `src/components/IdeaWidget.tsx` — RAF mousemove, pushOverlapping, swap glow
