# NOVA_COLLAB_SPEC.md — Launchpad Collaboratif Temps Réel
**Auteur :** Nova (CPO) — 2026-02-27  
**Status :** 📐 Spécifié — En attente review Orion avant implémentation Forge

---

## 1. Architecture données — Nouvelles tables Supabase

### 1.1 `canvas_agents`
Chaque agent placé sur le canvas par un utilisateur.

```sql
CREATE TABLE canvas_agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,              -- username (ex: 'romain')
  agent_name   TEXT NOT NULL,              -- 'Nova' | 'Aria' | 'Forge' | 'Rex' | custom
  tailor_url   TEXT,                       -- config URL depuis the-tailor.surge.sh
  pos_x        FLOAT NOT NULL DEFAULT 100,
  pos_y        FLOAT NOT NULL DEFAULT 100,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS: lecture publique, écriture par owner uniquement
ALTER TABLE canvas_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON canvas_agents FOR SELECT USING (true);
CREATE POLICY "Owner write" ON canvas_agents FOR ALL USING (true); -- simplif: anon key
```

### 1.2 `agent_maintenance`
État "travail en cours" d'un agent sur un projet.

```sql
CREATE TABLE agent_maintenance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID REFERENCES canvas_agents(id) ON DELETE CASCADE,
  project_id   TEXT NOT NULL,             -- id du projet (ProjectCard)
  user_id      TEXT NOT NULL,
  started_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id)                       -- un agent sur un seul projet à la fois
);

ALTER TABLE agent_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read/write" ON agent_maintenance FOR ALL USING (true);
```

### 1.3 `agent_chat_messages`
Messages échangés entre user et ses agents.

```sql
CREATE TABLE agent_chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  agent_name   TEXT NOT NULL,
  direction    TEXT NOT NULL CHECK (direction IN ('user→agent', 'agent→user')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON agent_chat_messages (user_id, agent_name, created_at);
ALTER TABLE agent_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read/write" ON agent_chat_messages FOR ALL USING (true);
```

> **Note :** `board_settings` (existante) et `launchpad_messages`/`launchpad_comments` (existantes) ne sont pas modifiées.

---

## 2. Nouveaux types TypeScript

Ajouter dans `src/types.ts` :

```typescript
// --- Feature 1 & 3 ---

export interface CanvasAgent {
  id: string                    // UUID Supabase
  userId: string                // propriétaire (username)
  agentName: AgentName
  tailorUrl?: string            // config the-tailor.surge.sh (query params)
  position: { x: number; y: number }
  maintenanceProjectId?: string // si en maintenance sur un projet
}

export type AgentName = 'Nova' | 'Aria' | 'Forge' | 'Rex' | string

// --- Feature 2 ---

export interface UserPresence {
  userId: string
  username: string
  color: string               // couleur avatar générée (hash du username)
  onlineSince: number         // timestamp
  canvasOffset?: { x: number; y: number; scale: number }
}

// --- Feature 3 ---

export interface MaintenanceState {
  agentId: string
  projectId: string
  userId: string
  startedAt: number
}

// --- Feature 4 ---

export interface AgentChatMessage {
  id: string
  direction: 'user→agent' | 'agent→user'
  content: string
  createdAt: string
}

export type AgentTelegramToken = {
  Nova:  '8619391852:AAFaZG0UKbJ3r7GvwrPuhtE-2W1fAekCTBo'
  Aria:  string   // à compléter
  Forge: string
  Rex:   string
}
```

---

## 3. Store changes — Zustand + Supabase Realtime

### 3.1 Nouvelles clés dans `LaunchpadStore`

```typescript
// Ajouter dans l'interface LaunchpadStore
canvasAgents: CanvasAgent[]
presences: UserPresence[]
maintenances: MaintenanceState[]

// Actions agents canvas
addCanvasAgent: (agentName: AgentName, tailorUrl?: string) => Promise<void>
removeCanvasAgent: (agentId: string) => Promise<void>
moveCanvasAgent: (agentId: string, x: number, y: number) => Promise<void>
setAgentMaintenance: (agentId: string, projectId: string | null) => Promise<void>
subscribeToAgents: () => () => void   // retourne unsubscribe

// Actions présence
subscribeToPresence: (username: string) => () => void

// Chat
openChatAgent: string | null           // agentId ouvert
setOpenChatAgent: (id: string | null) => void
chatMessages: Record<string, AgentChatMessage[]>  // keyed by agentId
sendChatMessage: (agentId: string, content: string) => Promise<void>
subscribeToChatMessages: (agentId: string) => () => void
```

### 3.2 Implémentation des hooks Realtime

```typescript
// src/hooks/useRealtimeAgents.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'

export function useRealtimeAgents() {
  const { subscribeToAgents, subscribeToPresence, currentUser } = useLaunchpadStore()

  useEffect(() => {
    const unsub1 = subscribeToAgents()
    const unsub2 = currentUser ? subscribeToPresence(currentUser.username) : () => {}
    return () => { unsub1(); unsub2() }
  }, [currentUser?.username])
}

// Implémentation subscribeToAgents dans store.ts :
subscribeToAgents: () => {
  // 1. Charger initial
  supabase.from('canvas_agents').select('*').then(({ data }) => {
    if (data) set({ canvasAgents: data.map(dbToCanvasAgent) })
  })
  supabase.from('agent_maintenance').select('*').then(({ data }) => {
    if (data) set({ maintenances: data.map(dbToMaintenance) })
  })

  // 2. Realtime changes
  const agentChannel = supabase
    .channel('canvas-agents')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_agents' },
      () => { /* re-fetch */ })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_maintenance' },
      () => { /* re-fetch maintenances */ })
    .subscribe()

  return () => supabase.removeChannel(agentChannel)
},

// Implémentation subscribeToPresence dans store.ts :
subscribeToPresence: (username: string) => {
  const channel = supabase.channel('launchpad-presence', {
    config: { presence: { key: username } }
  })
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<UserPresence>()
      const presences = Object.values(state).flat()
      set({ presences })
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: username,
          username,
          color: hashToColor(username),
          onlineSince: Date.now(),
        })
      }
    })

  return () => supabase.removeChannel(channel)
},
```

---

## 4. Plan de migration P1 → P4

### P1 — Feature 5 (anti-overlap) + Feature 6 (delete liste) ⚡ CRITIQUE
**Durée estimée : 30 min**  
**Risque : faible** (changes chirurgicaux, pas de nouvelle table)

- Fix anti-overlap (voir Section 5 ci-dessous)
- Validation Feature 6 (voir Section 6)
- Deploy immédiat

### P2 — Feature 2 (Présence users) + tables Supabase
**Durée estimée : 2h**  
**Prérequis : P1 déployé**

1. Créer les 3 tables Supabase via SQL Editor
2. Ajouter types dans `types.ts`
3. Implémenter `subscribeToPresence` dans store
4. Créer composant `PresenceBadge` (top-right, avatars initiales colorés)
5. Monter le hook dans `App.tsx`
6. Deploy + QA Rex

### P3 — Feature 1 (Agents canvas) + Feature 3 (Maintenance)
**Durée estimée : 4h**  
**Prérequis : P2 déployé (tables ready)**

1. Implémenter `subscribeToAgents`, `addCanvasAgent`, `moveCanvasAgent`
2. Composant `CanvasAgentAvatar` (wrapper OrionAvatar3D + drag + owner badge)
   - Draggable via Framer Motion `drag` prop
   - Au `onDragEnd` → `moveCanvasAgent()` → update Supabase
   - Seul le owner peut dragger son agent
3. Bouton "Ajouter agent" dans la Toolbar
4. Feature 3 : `setAgentMaintenance(agentId, projectId)`
   - Animation : `CanvasAgentAvatar` se déplace en spring vers le centre de la `ProjectCard`
   - `ProjectCard` : si `maintenances.find(m => m.projectId === id)` → overlay gris 40% + badge "En maintenance 🔧"
5. Deploy + QA Rex

### P4 — Feature 4 (Chat agents)
**Durée estimée : 3h**  
**Prérequis : P3 déployé**

1. Table `agent_chat_messages` déjà créée en P2
2. Composant `AgentChatPanel` (slide-in depuis droite, z-[70])
   - Ouvert via click sur un agent qui m'appartient
   - Agents des autres users : `cursor-default`, pas de panel
3. Store : `sendChatMessage` → insert Supabase + POST Telegram Bot API
4. `subscribeToChatMessages` → Realtime INSERT → push dans `chatMessages[agentId]`
5. Telegram relay : POST `https://api.telegram.org/bot{TOKEN}/sendMessage`
   - Token mappé par `agentName` (Nova/Aria/Forge/Rex)
6. Deploy + QA Rex

---

## 5. Feature 5 — Fix anti-overlap drag (< 20 lignes)

### Diagnostic
Le `pushOverlapping()` est appelé à chaque frame pendant le drag (dans `onDrag`), déclenchant des re-renders Zustand massifs sur tous les objets. Solution : **appeler `pushOverlapping` uniquement sur `onDragEnd`**.

### Changement dans ProjectCard, ListWidgetCard, IdeaWidget

**Avant (pattern actuel) :**
```tsx
// Dans chaque composant
onDrag={(_, info) => {
  const x = baseX + info.offset.x
  const y = baseY + info.offset.y
  pushOverlapping(id, x, y)   // ← appelé à chaque frame 🐌
}}
onDragEnd={(_, info) => {
  const x = baseX + info.offset.x
  const y = baseY + info.offset.y
  updatePosition(id, x, y)
}}
```

**Après (fix) :**
```tsx
// Supprimer pushOverlapping du onDrag, le garder uniquement sur onDragEnd
onDrag={undefined}  // ou supprimer le handler
onDragEnd={(_, info) => {
  const x = baseX + info.offset.x
  const y = baseY + info.offset.y
  pushOverlapping(id, x, y)   // ← une seule fois au drop ✅
  updatePosition(id, x, y)
}}
```

**Changement exact à appliquer dans les 3 fichiers :**

`ProjectCard.tsx` : retirer `pushOverlapping(...)` du handler `onDrag`, le passer en `onDragEnd` avant `updatePosition`.

`ListWidgetCard.tsx` : idem, retirer `pushOverlapping(...)` du `onDrag`.

`IdeaWidget.tsx` : idem.

**Résultat attendu :** drag fluide 60fps, anti-overlap toujours fonctionnel au drop. Aucun changement de logique, juste déplacement du call.

> **Bénéfice supplémentaire :** Réduire les resets de `swapTarget` intempestifs pendant le drag.

---

## 6. Feature 6 — Suppression items de liste

### Diagnostic

✅ **Store :** `removeListItem(listId, itemId)` est correctement implémenté dans `store.ts` :
```typescript
removeListItem: (listId, itemId) => set((state) => ({
  lists: state.lists.map(l => l.id !== listId ? l : {
    ...l, items: l.items.filter(i => i.id !== itemId),
  }),
})),
```

✅ **UI :** `ListWidgetCard.tsx` ligne 272 appelle `removeListItem(list.id, item.id)` sur le bouton `<X>` (visible au hover avec `opacity: 0 → 1`).

### Verdict
**Aucun fix nécessaire.** La feature est fonctionnelle. Si un bug est observé en prod, le problème probable serait une hydratation Zustand `persist` qui écraserait l'état (listes vides à cause d'un schéma périmé dans `localStorage`). Solution : vider le localStorage et recharger.

### Recommandation UX (optionnel pour Forge)
Rendre le bouton delete visible en permanence sur mobile (pas uniquement au hover), via une classe `sm:opacity-0` plutôt que opacity 0 inline.

---

## Notes d'implémentation pour Forge

### Helpers à ajouter dans `supabase.ts`
```typescript
// Mapping agent → Telegram token
export const AGENT_TELEGRAM_TOKENS: Record<string, string> = {
  Nova:  '8619391852:AAFaZG0UKbJ3r7GvwrPuhtE-2W1fAekCTBo',
  // Aria, Forge, Rex: à compléter par Romain
}

export const ROMAIN_CHAT_ID = '7893397797'

export async function sendTelegramMessage(agentName: string, text: string): Promise<void> {
  const token = AGENT_TELEGRAM_TOKENS[agentName]
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: ROMAIN_CHAT_ID, text }),
  })
}
```

### Couleur avatar par username (Presence)
```typescript
function hashToColor(username: string): string {
  let hash = 0
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 55%)`
}
```

### Z-index reference
- Header : `z-30`
- Agent canvas : `z-20` (sous le header, au-dessus des cards)
- Panel chat : `z-[70]`
- Modals : `z-[80]`

### Spring standard
- Agent drag : `{ stiffness: 350, damping: 28 }`
- Agent → maintenance (move to project) : `{ stiffness: 200, damping: 30 }` (plus doux pour l'animation)

---

*Spec rédigée par Nova — prête pour review Orion puis implémentation Forge.*
