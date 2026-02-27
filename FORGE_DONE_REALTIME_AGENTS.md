# FORGE_DONE_REALTIME_AGENTS.md — Rapport Forge

**Date :** 2026-02-27
**Agent :** Forge

---

## FEATURE 1 — Agent flottant sur un projet ("working on")

### 1a — types.ts ✅
```
src/types.ts:55:  working_on_project?: string | null
```

### 1b — store.ts ✅
```
src/store.ts:110:  setAgentWorkingOn: (agentId: string, projectId: string | null) => Promise<void>
src/store.ts:356:  type AgentRow = { ... working_on_project?: string | null }
src/store.ts:364:  working_on_project: row.working_on_project ?? null,
src/store.ts:389:  setAgentWorkingOn: async (agentId, projectId) => {
src/store.ts:395:  await supabase.from('canvas_agents').update({ working_on_project: projectId }).eq('id', agentId)
```

### 1c — CanvasAgentAvatar.tsx ✅
```
src/components/CanvasAgentAvatar.tsx:28: const targetProject = agent.working_on_project
src/components/CanvasAgentAvatar.tsx:32: const effectivePos = targetProject
src/components/CanvasAgentAvatar.tsx:36: const isWorking = !!targetProject
src/components/CanvasAgentAvatar.tsx:91: animate={{ x: effectivePos.x, y: effectivePos.y }}
```
- motion.div avec spring (stiffness: 120, damping: 20)
- Avatar non-draggable quand isWorking
- Badge "⚡ en cours" sous le nom
- Effet pulsation drop-shadow rose

### 1d — BotModal.tsx ✅
- Select "TRAVAILLE SUR" ajouté (visible uniquement en mode édition)
- state `workingOn` initialisé depuis `editAgent.working_on_project`
- `setAgentWorkingOn` appelé dans `handleSave`

### ProjectCard.tsx ✅
- `workingAgents` filtrés depuis `canvasAgents`
- Bandeau `⚡ {agentNames} en cours` affiché au-dessus du contenu si agents actifs

---

## FEATURE 2 — WorkProgressBar ✅

### WorkProgressBar.tsx
- Position: fixed, top: 52px, zIndex: 34
- Subscription Supabase Realtime sur `build_tasks`
- Barre de progression #E11F7B, height: 3px
- Animation entrée/sortie Framer Motion (y: -36 → 0)
- Badge "N tâches actives" si plusieurs running
- Invisible si aucune tâche active

### App.tsx ✅
```
src/App.tsx:19: import { WorkProgressBar } from './components/WorkProgressBar'
src/App.tsx:266: <WorkProgressBar />
```

---

## Vérifications build

- `npx tsc --noEmit` → **0 erreurs** ✅
- `npm run build` → **succès (6.05s)** ✅
