# FORGE_DONE_PREVIEW_AVATAR.md

**Date :** 2026-02-27  
**Agent :** Forge  
**Statut :** ✅ Build réussi — 0 erreurs TypeScript

---

## Features livrées

### FEATURE 1 — ProjectPreviewModal (iframe + CommentsPanel côte à côte)

- ✅ **`src/components/ProjectPreviewModal.tsx`** — nouveau composant
  - Layout 60% iframe | 40% CommentsPanel sur desktop
  - Sur mobile (<768px) : tabs Aperçu / Commentaires
  - Détection iframe bloqué via `onError` → message + bouton "Ouvrir dans un onglet"
  - Rendu via `createPortal`
- ✅ **`src/components/CommentsPanel.tsx`** — prop `inline?: boolean` ajoutée
  - En mode inline : rendu direct sans portal ni `position:fixed`
  - Rétrocompatible (le mode portal par défaut est inchangé)
- ✅ **`src/components/ProjectCard.tsx`** — intégration
  - Bouton "👁 Aperçu" (icône Eye) ajouté dans les actions hover
  - State `showPreview` + `<ProjectPreviewModal>` en bas du render

### FEATURE 2 — Avatars aléatoires pour les nouveaux agents

- ✅ **`src/utils/randomAvatar.ts`** — utilitaire `randomAvatarConfig()`
  - Couleurs HSL aléatoires vibrantes (h: 0-360, s: 60-90%, l: 50-70%)
  - 10 dimensions randomisées : bodyShape, eyes, eyeColor, blush, mouth, headgear, earPiece, animation, skinPattern, ambiance
- ✅ **`src/types.ts`** — interface `AvatarConfig` ajoutée + `tailor_config?: AvatarConfig | null` sur `CanvasAgent`
- ✅ **`src/store.ts`** — mis à jour :
  - `addCanvasAgent` : génère `randomAvatarConfig()` et l'insère en DB
  - `rowToAgent` (dans `subscribeToAgents`) : mappe `tailor_config` depuis la DB
- ✅ **`src/components/OrionAvatar3D.tsx`** — prop `avatarConfig?: Record<string, unknown> | null` ajoutée
  - Si définie, initialise le state config avec la config passée (merge sur DEFAULT_CONFIG)
- ✅ **`src/components/CanvasAgentAvatar.tsx`** — passe `agent.tailor_config` à `OrionAvatar3D`

### FEATURE 3 — Audit classNames + JSDoc

- ✅ **`ProjectCard.tsx`** : JSDoc + classNames `project-card`, `project-card__header`, `project-card__actions`, `project-card__tags`, `project-card__body`
- ✅ **`WorkProgressBar.tsx`** : JSDoc + classNames `work-progress-bar`, `work-progress-bar__track`, `work-progress-bar__fill`
- ✅ **`PresenceBar.tsx`** : JSDoc + className `presence-bar__avatar`
- ✅ **`Toolbar.tsx`** : JSDoc + classNames `launchpad-toolbar`, `launchpad-toolbar__btn`
- ✅ **`CommentsPanel.tsx`** : JSDoc ajouté

---

## Vérifications

```
tsc --noEmit → 0 erreurs ✅
npm run build → ✅ built in 6.24s
ProjectPreviewModal.tsx créé et importé ✅
randomAvatarConfig dans utils/randomAvatar.ts ✅
tailor_config dans store.ts (rowToAgent + addCanvasAgent) ✅
AvatarConfig dans types.ts ✅
className project-card dans ProjectCard.tsx ✅
```

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/ProjectPreviewModal.tsx` | CRÉÉ |
| `src/components/CommentsPanel.tsx` | MODIFIÉ (prop inline) |
| `src/components/ProjectCard.tsx` | MODIFIÉ (btn Aperçu, modal, classNames, JSDoc) |
| `src/utils/randomAvatar.ts` | CRÉÉ |
| `src/types.ts` | MODIFIÉ (AvatarConfig, tailor_config) |
| `src/store.ts` | MODIFIÉ (addCanvasAgent, rowToAgent) |
| `src/components/OrionAvatar3D.tsx` | MODIFIÉ (prop avatarConfig) |
| `src/components/CanvasAgentAvatar.tsx` | MODIFIÉ (passe tailor_config) |
| `src/components/WorkProgressBar.tsx` | MODIFIÉ (JSDoc, classNames) |
| `src/components/PresenceBar.tsx` | MODIFIÉ (JSDoc, className) |
| `src/components/Toolbar.tsx` | MODIFIÉ (JSDoc, classNames) |
