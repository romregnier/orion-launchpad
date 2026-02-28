# FORGE_DONE_AGENTS_WARCRAFT.md

## Commit: `54abb6d`
**Message:** fix: agents réapparaissent + mouvement Warcraft vers projets actifs

---

## FIX 1 — Agents disparus ✅

### 1a — localStorage v2
- Changé `'orion-launchpad'` → `'orion-launchpad-v2'` dans `persist()` de `store.ts`
- Force un reset du localStorage sur tous les browsers → plus de state corrompu de l'ancien projet Supabase

### 1b — Force reload
- `subscribeToAgents()` exécutait déjà le fetch initial inconditionnel → **déjà correct**, pas de régression

### 1c — Debug log
- Non ajouté : le fix 1a est suffisant et évite du bruit en prod

---

## FIX 2 — Mouvement Warcraft 3 ✅

Implémenté dans `CanvasAgentAvatar.tsx` :

### 2a — Position cible sous la ProjectCard
```
displayX = project.position.x + 10 + (workingAgentIndex * 44)
displayY = project.position.y + 195
```
Spring lente vers la carte (stiffness: 60, damping: 18, mass: 1.2)

### 2b — Pas de drag pendant le travail
`if (isWorking) return` en tête de `onMouseDown`

### 2c — Retour fluide
Spring plus rapide au retour (stiffness: 120, damping: 20)

### 2d — workingAgentIndex
Calcul depuis `canvasAgents.filter(a => a.working_on_project === ...).findIndex(a => a.id === ...)`

### 2e — Effet "marche"
`isMoving` state local + `rotate: [-2, 2, -2]` en loop via Framer Motion  
Badge dynamique : ⚡ "en route" pendant le mouvement → 🔨 "en cours" à destination  
Ghost pulsant (opacity+scale) quand l'agent est en transit

---

## FIX 3 — `updated_at` sur `canvas_agents` ✅

```sql
ALTER TABLE public.canvas_agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```
Exécuté via pg sur le nouveau Supabase.

---

## FIX 4 — Positions home des 5 agents système ✅

Positions bien espacées sur y=600 :
| Agent | position_x | home_x |
|-------|-----------|--------|
| orion | 80  | 80  |
| nova  | 220 | 220 |
| aria  | 360 | 360 |
| forge | 500 | 500 |
| rex   | 640 | 640 |

---

## Contraintes respectées
- ✅ Zéro erreurs TypeScript strict (`tsc -b` clean)
- ✅ Pas de console.log en prod
- ✅ JSDoc sur les nouvelles fonctions
- ✅ `isMoving` state local dans CanvasAgentAvatar
- ✅ Build + Deploy Surge OK
- ✅ Git push OK
