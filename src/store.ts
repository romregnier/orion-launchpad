import { create } from 'zustand'
import type { Project, ListWidget, ListType, CanvasAgent, BoardMember } from './types'
import { supabase } from './lib/supabase'

// ── Cache versionné — se vide automatiquement à chaque nouveau déploiement ──
declare const __BUILD_VERSION__: string
const STORAGE_KEY = 'orion-launchpad-v4'
const VERSION_KEY = 'orion-launchpad-version'
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev'

// Si la version stockée != version actuelle → vider le cache stale
try {
  const storedVersion = localStorage.getItem(VERSION_KEY)
  if (storedVersion && storedVersion !== BUILD_VERSION) {
    // Nouvelle version déployée : nettoyer les anciennes clés
    ;['orion-launchpad-v3', 'orion-launchpad-v4', 'bsw-canvas-pos'].forEach(k => {
      try { localStorage.removeItem(k) } catch { /* ignore */ }
    })
  }
  localStorage.setItem(VERSION_KEY, BUILD_VERSION)
} catch { /* ignore */ }

// Lecture synchrone du cache local (groupes, boardName — fallback rapide)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stored: { groups?: any[]; boardName?: string; isPrivate?: boolean } = {}
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const parsed = JSON.parse(raw)
    _stored = parsed?.state ?? parsed ?? {}
  }
} catch { /* ignore */ }

export interface CanvasObject {
  id: string
  type: 'project' | 'list' | 'idea' | 'agent'
  x: number
  y: number
  width: number
  height: number
}

/**
 * Trouve une position libre sur le canvas en évitant les objets existants.
 * Parcourt une grille de cellules jusqu'à trouver une position sans chevauchement.
 *
 * @param objects - Liste des objets déjà présents sur le canvas
 * @param width - Largeur de l'objet à placer (défaut 280)
 * @param height - Hauteur de l'objet à placer (défaut 180)
 * @param startX - X de départ pour la recherche (défaut 60)
 * @param startY - Y de départ pour la recherche (défaut 60)
 * @param padding - Marge entre les objets (défaut 20)
 * @returns Position libre { x, y }
 */
export function findFreePosition(
  objects: CanvasObject[],
  width = 280,
  height = 180,
  startX = 60,
  startY = 60,
  padding = 20
): { x: number; y: number } {
  const cellW = width + padding
  const cellH = height + padding
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 20; col++) {
      const x = startX + col * cellW
      const y = startY + row * cellH
      const overlaps = objects.some(
        o =>
          Math.abs(o.x - x) < width + padding &&
          Math.abs(o.y - y) < height + padding
      )
      if (!overlaps) return { x, y }
    }
  }
  return { x: startX + objects.length * 20, y: startY + objects.length * 20 }
}

function getAllCanvasObjectsFromState(state: {
  projects: Project[]
  lists: ListWidget[]
  ideaWidgetPosition: { x: number; y: number }
  canvasAgents?: CanvasAgent[]
}): CanvasObject[] {
  const objects: CanvasObject[] = []
  state.projects.forEach(p => objects.push({ id: p.id, type: 'project', x: p.position.x, y: p.position.y, width: 280, height: 180 }))
  state.lists.forEach(l => objects.push({ id: l.id, type: 'list', x: l.position.x, y: l.position.y, width: 260, height: 200 }))
  objects.push({ id: 'idea-widget', type: 'idea', x: state.ideaWidgetPosition.x, y: state.ideaWidgetPosition.y, width: 240, height: 160 })
  state.canvasAgents?.forEach(a => objects.push({ id: a.id, type: 'agent', x: a.position.x, y: a.position.y, width: 80, height: 100 }))
  return objects
}

export interface Group {
  id: string
  name: string
  color: string
  emoji: string
  order: number
}

export interface Member {
  id: string
  username: string
  passwordHash: string
  role: 'admin' | 'member'
  createdAt: number
}

export interface Idea {
  id: string
  text: string
  author: string
  votes: number
  votedBy: string[]
  createdAt: string
}

/** Tâche build active — dérivée de la table build_tasks */
export interface ActiveBuildTask {
  id: string
  label: string
  status: 'pending' | 'running'
  progress: number
  agent_key?: string | null
  step_label?: string | null
  /** project id ou nom associé à la tâche */
  project?: string | null
}

// ── Row types for DB mapping ─────────────────────────────────────────────────

interface ProjectRow {
  id: string
  url: string
  title: string
  description: string | null
  image: string | null
  favicon: string | null
  added_by: string | null
  added_at: number | null
  position_x: number
  position_y: number
  color: string | null
  github: string | null
  tags: string[] | null
  group_id: string | null
}

/** Convert a DB row to a Project */
function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description ?? undefined,
    image: row.image ?? undefined,
    favicon: row.favicon ?? undefined,
    addedBy: row.added_by ?? undefined,
    addedAt: row.added_at ?? Date.now(),
    position: { x: row.position_x, y: row.position_y },
    color: row.color ?? undefined,
    github: row.github ?? undefined,
    tags: row.tags ?? [],
    groupId: row.group_id ?? undefined,
  }
}

/** Convert a Project to a DB row */
function projectToRow(p: Project): Omit<ProjectRow, 'added_at'> & { added_at: number } {
  return {
    id: p.id,
    url: p.url,
    title: p.title,
    description: p.description ?? null,
    image: p.image ?? null,
    favicon: p.favicon ?? null,
    added_by: p.addedBy ?? 'human',
    added_at: p.addedAt,
    position_x: p.position.x,
    position_y: p.position.y,
    color: p.color ?? null,
    github: p.github ?? null,
    tags: p.tags ?? [],
    group_id: p.groupId ?? null,
  }
}

interface LaunchpadStore {
  projects: Project[]
  deletedProjects: Project[]
  deletedIds: string[]
  remoteLoaded: boolean
  ideas: Idea[]
  ideaWidgetPosition: { x: number; y: number }
  activeFilter: string | null
  groups: Group[]
  activeGroup: string | null
  boardName: string
  isPrivate: boolean
  currentUser: { username: string; role: 'admin' | 'member' | 'viewer' } | null
  showSettings: boolean
  /** Fetch all projects from Supabase and update local state */
  fetchProjects: () => Promise<void>
  fetchPublicSettings: () => Promise<void>
  /** Re-fetch projects and agents without creating new Realtime channels */
  refreshAll: () => Promise<void>
  /** Subscribe to Supabase Realtime for projects — returns unsubscribe fn */
  subscribeToProjects: () => () => void
  addProject: (project: Project) => Promise<void>
  removeProject: (id: string) => Promise<void>
  restoreProject: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  syncPositionToDb: (id: string, x: number, y: number, type?: string) => void
  /** Réorganise tous les projets et agents en grille propre et sauvegarde en DB */
  tidyUp: () => Promise<void>
  subscribeToPositions: () => (() => void)
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  /** Fetch all ideas from Supabase */
  fetchIdeas: () => Promise<void>
  /** Subscribe to ideas realtime — returns unsubscribe fn */
  subscribeToIdeas: () => () => void
  addIdea: (text: string, author: string) => Promise<void>
  deleteIdea: (id: string) => Promise<void>
  voteIdea: (id: string, sessionId: string) => Promise<void>
  setFilter: (tag: string | null) => void
  setIdeaWidgetPosition: (x: number, y: number) => void
  addGroup: (group: Omit<Group, 'id' | 'order'>) => void
  deleteGroup: (id: string) => void
  updateGroup: (id: string, updates: Partial<Omit<Group, 'id'>>) => void
  setProjectGroup: (projectId: string, groupId: string | null) => void
  setGroupFilter: (groupId: string | null) => void
  setBoardName: (name: string) => void
  setPrivate: (v: boolean) => void
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  setShowSettings: (v: boolean) => void
  boardMembers: BoardMember[]
  fetchBoardMembers: () => Promise<void>
  /** Invite a member by email. Inserts into board_members and triggers Supabase Auth signUp. */
  inviteMember: (email: string, role: 'member' | 'viewer') => Promise<{ ok: boolean; error?: string }>
  /** Remove a member from board_members by email. */
  removeMember: (email: string) => Promise<void>
  /** Update a member's role in board_members. */
  updateMemberRole: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<void>
  clearProjects: () => void
  swapTarget: string | null
  setSwapTarget: (id: string | null) => void
  getAllCanvasObjects: () => CanvasObject[]
  pushOverlapping: (draggedId: string, dragX: number, dragY: number) => void
  activeBuildTasks: ActiveBuildTask[]
  subscribeToBuildTasks: () => () => void
  canvasAgents: CanvasAgent[]
  addCanvasAgent: (name: string, tailorUrl?: string, botToken?: string, tailorConfig?: import('./types').AvatarConfig) => Promise<void>
  updateCanvasAgent: (id: string, updates: Partial<Pick<CanvasAgent, 'name' | 'tailorUrl' | 'bot_token' | 'tailor_config'>>) => Promise<void>
  removeCanvasAgent: (id: string) => Promise<void>
  updateAgentPosition: (id: string, x: number, y: number) => Promise<void>
  subscribeToAgents: () => () => void
  setAgentWorkingOn: (agentId: string, projectId: string | null) => Promise<void>
  returnAgentHome: (agentId: string) => Promise<void>
  lists: ListWidget[]
  /** Fetch all lists from Supabase */
  fetchLists: () => Promise<void>
  /** Subscribe to lists realtime — returns unsubscribe fn */
  subscribeToLists: () => () => void
  addList: (title: string, type: ListType) => Promise<void>
  removeList: (id: string) => Promise<void>
  addListItem: (listId: string, text: string, sessionId: string) => Promise<void>
  removeListItem: (listId: string, itemId: string) => Promise<void>
  toggleListItem: (listId: string, itemId: string) => Promise<void>
  voteListItem: (listId: string, itemId: string, sessionId: string) => Promise<void>
  moveListItem: (listId: string, itemId: string, direction: 'up' | 'down') => Promise<void>
  updateListPosition: (id: string, x: number, y: number) => void
  /** Project metadata (screenshots, AI meta) keyed by project_id */
  projectMetadata: Record<string, ProjectMeta>
  /** Fetch all project_metadata rows and store in projectMetadata */
  fetchProjectMetadata: () => Promise<void>
}

interface ProjectMeta {
  project_id: string
  screenshot_url?: string | null
  ai_meta?: {
    summary?: string
    health_score?: number
    tags?: string[]
    suggestions?: string[]
    category?: string
  } | null
  ai_analyzed_at?: string | null
}

const DEFAULT_GROUPS = [
  { id: 'group-prod', name: 'En prod', color: '#22c55e', emoji: '🚀', order: 0 },
  { id: 'group-dev', name: 'En dev', color: '#3b82f6', emoji: '🔧', order: 1 },
  { id: 'group-ideas', name: 'Idées', color: '#f59e0b', emoji: '💡', order: 2 },
  { id: 'group-archived', name: 'Archivé', color: '#6b7280', emoji: '📦', order: 3 },
]

export const useLaunchpadStore = create<LaunchpadStore>()(
  (set, get) => ({
      projects: [],
      deletedProjects: [],
      deletedIds: [],
      remoteLoaded: false,
      swapTarget: null,
      ideaWidgetPosition: { x: -300, y: 60 },
      ideas: [],
      activeFilter: null,
      groups: _stored.groups ?? DEFAULT_GROUPS,
      activeGroup: null, // toujours null au démarrage — évite le canvas vide sur groupe orphelin
      boardName: _stored.boardName ?? 'Mon Launchpad',
      isPrivate: true,  // Toujours true au démarrage — DB est source de vérité
      currentUser: null,
      showSettings: false,
      activeBuildTasks: [],
      canvasAgents: [],
      lists: [],
      boardMembers: [],
      projectMetadata: {},

      /**
       * Fetch all projects from Supabase and hydrate local state.
       * Also loads isPrivate from board_settings.
       */
      fetchProjects: async () => {
        // Guard : un seul fetch à la fois — évite les race conditions
        if ((get() as { _fetching?: boolean })._fetching) return
        ;(get() as { _fetching?: boolean })._fetching = true

        const timeout = setTimeout(() => {
          (get() as { _fetching?: boolean })._fetching = false
          if (!get().remoteLoaded) set({ remoteLoaded: true })
        }, 10000)

        try {
          // Settings en arrière-plan (non bloquant)
          supabase.from('board_settings').select('key,value').then(({ data: s }) => {
            if (!s) return
            const m = Object.fromEntries(s.map(r => [r.key, r.value]))
            if (m.isPrivate !== undefined) set({ isPrivate: m.isPrivate === true || m.isPrivate === 'true' })
            if (m.boardName) set({ boardName: m.boardName as string })
            if (Array.isArray(m.groups)) {
              // Merge : garder les groupes DB + ajouter les defaults manquants (évite la perte au premier chargement)
              const dbGroups = m.groups as Group[]
              const missing = DEFAULT_GROUPS.filter(d => !dbGroups.some(g => g.id === d.id))
              const merged = missing.length > 0 ? [...dbGroups, ...missing] : dbGroups
              set({ groups: merged })
              // Si des groupes manquaient en DB, les sauvegarder
              if (missing.length > 0) supabase.from('board_settings').upsert({ key: 'groups', value: merged }).then(() => {})
            } else {
              // Pas de groupes en DB → conservation des groupes actuels (pas d'écrasement)
              console.warn('[store] board_settings: pas de groupes en DB, conservation des groupes actuels')
            }
          })

          const { data } = await supabase.from('projects').select('*')
          const projects = data ? (data as ProjectRow[]).map(rowToProject) : []

          const alreadyLoaded = get().remoteLoaded
          const existingProjects = get().projects

          if (alreadyLoaded && existingProjects.length > 0) {
            // Rechargement secondaire (Realtime metadata) — conserver les positions locales.
            // Les positions sont la responsabilité de card_positions + syncPositionToDb.
            // On ne les écrase JAMAIS depuis projects table lors d'un reload secondaire.
            const localPosMap = new Map(existingProjects.map(p => [p.id, p.position]))
            set({
              projects: projects.map(p => {
                const localPos = localPosMap.get(p.id)
                return localPos ? { ...p, position: localPos } : p
              }),
              remoteLoaded: true,
            })
          } else {
            // Premier chargement — charger les positions depuis card_positions (source de vérité)
            const { data: positions } = await supabase.from('card_positions').select('*')
            const posMap = new Map((positions ?? []).map((p: { id: string; type: string; position_x: number; position_y: number }) => [p.id, p]))
            set({
              projects: projects.map(p => {
                const pos = posMap.get(p.id)
                return pos ? { ...p, position: { x: pos.position_x, y: pos.position_y } } : p
              }),
              remoteLoaded: true,
            })
          }
        } catch {
          set({ remoteLoaded: true })
        } finally {
          clearTimeout(timeout)
          ;(get() as { _fetching?: boolean })._fetching = false
          if (!get().remoteLoaded) set({ remoteLoaded: true })
        }
      },

      /**
       * Subscribe to Supabase Realtime for the projects table.
       * Performs an initial fetch, then re-fetches on any change.
       * Returns an unsubscribe function.
       */
      /**
       * Charge boardName et isPrivate depuis board_settings sans authentification.
       * Appelé au démarrage pour afficher le bon nom sur la page de login.
       */
      fetchPublicSettings: async () => {
        const { data } = await supabase.from('board_settings').select('key,value').in('key', ['boardName', 'isPrivate'])
        if (!data) return
        const m = Object.fromEntries(data.map(r => [r.key, r.value]))
        if (m.boardName) set({ boardName: m.boardName as string })
        if (m.isPrivate !== undefined) set({ isPrivate: m.isPrivate === true || m.isPrivate === 'true' })
      },

      subscribeToProjects: () => {
        // Pas de fetchProjects() ici — l'auth (onAuthStateChange) est le seul déclencheur.
        // Realtime uniquement pour les mises à jour en cours de session.
        const ch = supabase.channel('projects_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
            ;(get() as { _fetching?: boolean })._fetching = false // reset guard pour permettre le refresh
            get().fetchProjects()
          })
          .subscribe()
        return () => { supabase.removeChannel(ch) }
      },

      /** Re-fetch projects and agents without creating new Realtime channels */
      refreshAll: async () => {
        ;(get() as { _fetching?: boolean })._fetching = false // reset guard pour forcer le refresh
        await get().fetchProjects()
        const { data } = await supabase.from('canvas_agents').select('*')
        if (data) {
          type AgentRow = { id: string; owner: string; name: string; tailor_url: string | null; position_x: number; position_y: number; bot_token?: string; agent_key?: string; is_system?: boolean; working_on_project?: string | null; home_x?: number | null; home_y?: number | null; tailor_config?: import('./types').AvatarConfig | null }
          set({
            canvasAgents: (data as AgentRow[]).map(row => ({
              id: row.id, owner: row.owner, name: row.name,
              tailorUrl: row.tailor_url ?? undefined,
              bot_token: row.bot_token ?? undefined,
              agent_key: row.agent_key ?? undefined,
              is_system: row.is_system ?? false,
              position: { x: row.position_x, y: row.position_y },
              working_on_project: row.working_on_project ?? null,
              home_x: row.home_x ?? null,
              home_y: row.home_y ?? null,
              tailor_config: row.tailor_config ?? null,
            })),
          })
        }
      },

      /** Add a project optimistically and persist to Supabase.
       * Si la position est (0, 0), calcule une position libre pour éviter les chevauchements.
       */
      addProject: async (project) => {
        let finalProject = project
        if (project.position.x === 0 && project.position.y === 0) {
          const allObjects = getAllCanvasObjectsFromState(get())
          const freePos = findFreePosition(allObjects)
          finalProject = { ...project, position: freePos }
        }
        set((state) => ({
          projects: [...state.projects, finalProject],
          deletedIds: state.deletedIds.filter((id) => id !== finalProject.id),
          deletedProjects: state.deletedProjects.filter((p) => p.id !== finalProject.id),
        }))
        await supabase.from('projects').insert(projectToRow(finalProject))
      },

      /** Remove a project optimistically and delete from Supabase */
      removeProject: async (id) => {
        set((state) => {
          const project = state.projects.find((p) => p.id === id)
          return {
            projects: state.projects.filter((p) => p.id !== id),
            deletedIds: [...state.deletedIds, id],
            deletedProjects: project ? [...state.deletedProjects, project] : state.deletedProjects,
          }
        })
        await supabase.from('projects').delete().eq('id', id)
      },

      restoreProject: (id) =>
        set((state) => {
          const project = state.deletedProjects.find((p) => p.id === id)
          if (!project) return {}
          return {
            projects: [...state.projects, project],
            deletedIds: state.deletedIds.filter((did) => did !== id),
            deletedProjects: state.deletedProjects.filter((p) => p.id !== id),
          }
        }),

      updatePosition: (id, x, y) => {
        set((state) => ({
          projects: state.projects.map((p) => p.id === id ? { ...p, position: { x, y } } : p),
        }))
      },

      syncPositionToDb: (id, x, y, type = 'project') => {
        const username = useLaunchpadStore.getState().currentUser?.username ?? 'anon'
        // NOTE: on n'update PAS projects.position_x/y ici pour éviter la race condition.
        // La mise à jour de `projects` déclenche le Realtime → fetchProjects() qui relit
        // card_positions AVANT que l'upsert soit commité → position écrasée.
        // card_positions est la seule source de vérité pour les positions en session.
        supabase.from('card_positions').upsert({ id, type, position_x: x, position_y: y, updated_by: username, updated_at: new Date().toISOString() })
      },

      /** Réorganise tous les projets et agents en grille propre et sauvegarde en DB */
      tidyUp: async () => {
        const { projects, canvasAgents } = get()
        const COLS = 3
        const CARD_W = 320, CARD_H = 200, GAP_X = 48, GAP_Y = 48
        const START_X = 80, START_Y = 100
        const username = useLaunchpadStore.getState().currentUser?.username ?? 'anon'

        // Layout projets en grille
        const updatedProjects = projects.map((proj, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          return { ...proj, position: { x: START_X + col * (CARD_W + GAP_X), y: START_Y + row * (CARD_H + GAP_Y) } }
        })
        set({ projects: updatedProjects })

        // Layout agents en ligne sous les projets
        const agentRows = Math.ceil(projects.length / COLS)
        const agentY = START_Y + agentRows * (CARD_H + GAP_Y) + 60
        const agentSpacing = 160
        const agentStartX = START_X + 20
        const updatedAgents = canvasAgents.map((agent, i) => ({
          ...agent,
          position: { x: agentStartX + i * agentSpacing, y: agentY },
        }))
        set({ canvasAgents: updatedAgents })

        // Persister en DB (batch)
        await Promise.all([
          ...updatedProjects.map(p =>
            supabase.from('card_positions').upsert({ id: p.id, type: 'project', position_x: p.position.x, position_y: p.position.y, updated_by: username, updated_at: new Date().toISOString() })
          ),
          ...updatedAgents.map(a =>
            supabase.from('canvas_agents').update({ position_x: a.position.x, position_y: a.position.y, home_x: a.position.x, home_y: a.position.y }).eq('id', a.id)
          ),
        ])
      },

      /** Update a project optimistically and persist to Supabase */
      updateProject: async (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }))
        // Build partial row from updates
        const rowUpdates: Partial<ProjectRow> = {}
        if (updates.url !== undefined) rowUpdates.url = updates.url
        if (updates.title !== undefined) rowUpdates.title = updates.title
        if (updates.description !== undefined) rowUpdates.description = updates.description ?? null
        if (updates.image !== undefined) rowUpdates.image = updates.image ?? null
        if (updates.favicon !== undefined) rowUpdates.favicon = updates.favicon ?? null
        if (updates.addedBy !== undefined) rowUpdates.added_by = updates.addedBy ?? null
        if (updates.color !== undefined) rowUpdates.color = updates.color ?? null
        if (updates.github !== undefined) rowUpdates.github = updates.github ?? null
        if (updates.tags !== undefined) rowUpdates.tags = updates.tags ?? []
        if (updates.groupId !== undefined) rowUpdates.group_id = updates.groupId ?? null
        if (updates.position !== undefined) {
          rowUpdates.position_x = updates.position.x
          rowUpdates.position_y = updates.position.y
        }
        await supabase.from('projects').update(rowUpdates).eq('id', id)
      },

      /**
       * Fetch all ideas from Supabase and hydrate local state.
       */
      fetchIdeas: async () => {
        const { data } = await supabase.from('ideas').select('*').order('created_at', { ascending: true })
        if (data) {
          set({
            ideas: (data as Array<{ id: string; text: string; author: string; votes: number; voted_by: string[]; created_at: string }>).map(r => ({
              id: r.id, text: r.text, author: r.author, votes: r.votes, votedBy: r.voted_by ?? [], createdAt: r.created_at,
            })),
          })
        }
      },

      /**
       * Subscribe to Supabase Realtime for ideas.
       * Performs an initial fetch, then re-fetches on any change.
       * Returns an unsubscribe function.
       */
      subscribeToIdeas: () => {
        get().fetchIdeas()
        const ch = supabase.channel('ideas_rt')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, () => get().fetchIdeas())
          .subscribe()
        return () => { supabase.removeChannel(ch) }
      },

      /**
       * Add an idea optimistically and persist to Supabase.
       */
      addIdea: async (text, author) => {
        const idea: Idea = {
          id: `idea-${Date.now()}`,
          text, author, votes: 0, votedBy: [],
          createdAt: new Date().toISOString(),
        }
        set(state => ({ ideas: [...state.ideas, idea] }))
        await supabase.from('ideas').insert({ id: idea.id, text, author, votes: 0, voted_by: [] })
      },

      /**
       * Vote on an idea (optimistic + Supabase sync).
       */
      voteIdea: async (id, sessionId) => {
        const idea = get().ideas.find(i => i.id === id)
        if (!idea || idea.votedBy.includes(sessionId)) return
        set(state => ({
          ideas: state.ideas.map(i => i.id === id
            ? { ...i, votes: i.votes + 1, votedBy: [...i.votedBy, sessionId] }
            : i
          ),
        }))
        await supabase.from('ideas').update({ votes: idea.votes + 1, voted_by: [...idea.votedBy, sessionId] }).eq('id', id)
      },

      /**
       * Delete an idea (optimistic + Supabase sync).
       */
      deleteIdea: async (id) => {
        set(state => ({ ideas: state.ideas.filter(i => i.id !== id) }))
        await supabase.from('ideas').delete().eq('id', id)
      },
      setFilter: (tag) => set({ activeFilter: tag }),
      setIdeaWidgetPosition: (x, y) => set({ ideaWidgetPosition: { x, y } }),

      addGroup: (group) => {
        const newGroup = { ...group, id: `group-${Date.now()}`, order: get().groups.length }
        const newGroups = [...get().groups, newGroup]
        set({ groups: newGroups })
        supabase.from('board_settings').upsert({ key: 'groups', value: newGroups }).then(() => {})
      },
      deleteGroup: (id) => {
        const newGroups = get().groups.filter(g => g.id !== id)
        set((state) => ({
          groups: newGroups,
          projects: state.projects.map(p => p.groupId === id ? { ...p, groupId: undefined } : p),
          activeGroup: state.activeGroup === id ? null : state.activeGroup,
        }))
        supabase.from('board_settings').upsert({ key: 'groups', value: newGroups }).then(() => {})
        const affectedIds = get().projects.filter(p => p.groupId === id).map(p => p.id)
        if (affectedIds.length > 0) {
          supabase.from('projects').update({ group_id: null }).in('id', affectedIds).then(() => {})
        }
      },
      updateGroup: (id, updates) => {
        const newGroups = get().groups.map(g => g.id === id ? { ...g, ...updates } : g)
        set({ groups: newGroups })
        supabase.from('board_settings').upsert({ key: 'groups', value: newGroups }).then(() => {})
      },
      setProjectGroup: (projectId, groupId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, groupId: groupId ?? undefined } : p)
      })),
      setGroupFilter: (groupId) => set({ activeGroup: groupId }),

      setBoardName: (name) => {
        set({ boardName: name })
        supabase.from('board_settings').upsert({ key: 'boardName', value: name }).then(() => {})
      },
      setPrivate: (v) => {
        supabase.from('board_settings').upsert({ key: 'isPrivate', value: v }).then(() => {})
        if (v && !get().currentUser) {
          set({ isPrivate: v })
          return
        }
        set({ isPrivate: v })
      },

      /**
       * Login via Supabase Auth (email + password).
       * @param email - Adresse email de l'utilisateur
       * @param password - Mot de passe en clair
       * @returns true si connexion réussie, false sinon
       */
      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.user) return false
        const role = data.user.email === 'romain@rive-studio.com' ? 'admin' : 'member'
        set({ currentUser: { username: data.user.email ?? '', role } })
        return true
      },

      /**
       * Déconnexion via Supabase Auth.
       */
      logout: async () => {
        await supabase.auth.signOut()
        set({ currentUser: null, boardMembers: [] })
      },

      setShowSettings: (v) => set({ showSettings: v }),

      fetchBoardMembers: async () => {
        const { data } = await supabase.from('board_members').select('*').order('invited_at', { ascending: true })
        if (data) {
          const members: BoardMember[] = (data as Array<{
            id: string; email: string; role: string; invited_by: string | null;
            invited_at: string; joined_at: string | null; status: string
          }>).map(row => ({
            id: row.id,
            email: row.email,
            role: row.role as BoardMember['role'],
            invitedBy: row.invited_by ?? undefined,
            invitedAt: row.invited_at,
            joinedAt: row.joined_at ?? undefined,
            status: row.status as BoardMember['status'],
          }))
          set({ boardMembers: members })
        }
      },

      /**
       * Invite a member by email. Attempts Supabase Auth signUp (sends confirmation email),
       * then inserts into board_members with status 'pending'.
       */
      inviteMember: async (email, role) => {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: crypto.randomUUID(),
          options: { emailRedirectTo: 'https://orion-launchpad.surge.sh' },
        })
        if (signUpError && !signUpError.message.includes('already registered') && !signUpError.message.includes('User already registered')) {
          return { ok: false, error: signUpError.message }
        }
        const { error: dbError } = await supabase.from('board_members').insert({
          email,
          role,
          invited_by: get().currentUser?.username ?? 'admin',
          status: 'pending',
        })
        if (dbError) return { ok: false, error: dbError.message }
        await get().fetchBoardMembers()
        return { ok: true }
      },

      /**
       * Remove a member from board_members by email.
       */
      removeMember: async (email) => {
        await supabase.from('board_members').delete().eq('email', email)
        set(state => ({ boardMembers: state.boardMembers.filter(m => m.email !== email) }))
      },

      /**
       * Update a member's role in board_members.
       */
      updateMemberRole: async (email, role) => {
        await supabase.from('board_members').update({ role }).eq('email', email)
        set(state => ({
          boardMembers: state.boardMembers.map(m => m.email === email ? { ...m, role } : m)
        }))
      },

      /**
       * Fetch all project_metadata rows and store in projectMetadata record.
       */
      fetchProjectMetadata: async () => {
        const { data } = await supabase.from('project_metadata').select('*')
        if (data) {
          const meta: Record<string, ProjectMeta> = {}
          for (const row of data as ProjectMeta[]) {
            meta[row.project_id] = row
          }
          set({ projectMetadata: meta })
        }
      },

      clearProjects: () => set({ projects: [], deletedIds: [], deletedProjects: [] }),

      setSwapTarget: (id) => set({ swapTarget: id }),

      getAllCanvasObjects: () => getAllCanvasObjectsFromState(get()),

      addCanvasAgent: async (name, tailorUrl, botToken, tailorConfig) => {
        const { randomAvatarConfig } = await import('./utils/randomAvatar')
        const owner = get().currentUser?.username ?? 'anon'
        // Utiliser la config Tailor capturée si disponible, sinon générer un avatar aléatoire
        if (!tailorConfig) tailorConfig = randomAvatarConfig()
        // FIX 5 — calculer une position libre pour éviter les chevauchements
        const allObjects = getAllCanvasObjectsFromState(get())
        const freePos = findFreePosition(allObjects, 80, 100, 60, 60, 20)
        const { data, error } = await supabase
          .from('canvas_agents')
          .insert({ name, tailor_url: tailorUrl ?? null, bot_token: botToken ?? null, owner, position_x: freePos.x, position_y: freePos.y, tailor_config: tailorConfig })
          .select()
          .single()
        if (error || !data) return
        const row = data as { id: string; owner: string; name: string; tailor_url: string | null; position_x: number; position_y: number; bot_token?: string; tailor_config?: import('./types').AvatarConfig | null }
        const agent: CanvasAgent = {
          id: row.id, owner: row.owner, name: row.name,
          tailorUrl: row.tailor_url ?? undefined,
          bot_token: row.bot_token ?? undefined,
          position: { x: row.position_x, y: row.position_y },
          tailor_config: row.tailor_config ?? null,
        }
        set(state => ({ canvasAgents: [...state.canvasAgents, agent] }))
      },

      updateCanvasAgent: async (id, updates) => {
        const dbUpdates: Record<string, unknown> = {}
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.tailorUrl !== undefined) dbUpdates.tailor_url = updates.tailorUrl ?? null
        if (updates.bot_token !== undefined) dbUpdates.bot_token = updates.bot_token ?? null
        if (updates.tailor_config !== undefined) dbUpdates.tailor_config = updates.tailor_config ?? null
        await supabase.from('canvas_agents').update(dbUpdates).eq('id', id)
        set(state => ({
          canvasAgents: state.canvasAgents.map(a => a.id === id ? { ...a, ...updates } : a)
        }))
      },

      removeCanvasAgent: async (id) => {
        await supabase.from('canvas_agents').delete().eq('id', id)
        set(state => ({ canvasAgents: state.canvasAgents.filter(a => a.id !== id) }))
      },

      updateAgentPosition: async (id, x, y) => {
        set(state => ({
          canvasAgents: state.canvasAgents.map(a => a.id === id ? { ...a, position: { x, y } } : a),
        }))
        // FIX 2 — inclure position_x ET position_y pour déclencher le Realtime sur UPDATE.
        // Note: updated_at n'existe pas encore sur cette table; position_x/y suffisent.
        supabase.from('canvas_agents').update({ position_x: x, position_y: y }).eq('id', id)
      },

      subscribeToBuildTasks: () => {
        const load = () => {
          supabase
            .from('build_tasks')
            .select('id, label, status, progress, agent_key, step_label, project')
            .in('status', ['running', 'pending'])
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              const tasks = (data ?? []) as ActiveBuildTask[]
              set({ activeBuildTasks: tasks })

              // ── Synchroniser working_on_project des agents avec les tâches actives ──
              // Construire une map agent_key → project_id pour les tâches running
              const activeByKey: Record<string, string> = {}
              tasks.forEach(t => { if (t.agent_key && t.project) activeByKey[t.agent_key] = t.project })

              set(state => ({
                canvasAgents: state.canvasAgents.map(agent => {
                  const targetProject = agent.agent_key ? (activeByKey[agent.agent_key] ?? null) : null
                  if (agent.working_on_project === targetProject) return agent
                  // Mettre à jour en DB aussi (fire-and-forget)
                  supabase.from('canvas_agents')
                    .update({ working_on_project: targetProject })
                    .eq('id', agent.id)
                    .then(() => {})
                  return { ...agent, working_on_project: targetProject }
                }),
              }))
            })
        }
        load()
        const ch = supabase
          .channel('store_build_tasks')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, load)
          .subscribe()
        return () => { supabase.removeChannel(ch) }
      },

      subscribeToAgents: () => {
        type AgentRow = { id: string; owner: string; name: string; tailor_url: string | null; position_x: number; position_y: number; bot_token?: string; agent_key?: string; is_system?: boolean; working_on_project?: string | null; home_x?: number | null; home_y?: number | null; tailor_config?: import('./types').AvatarConfig | null }
        const rowToAgent = (row: AgentRow): CanvasAgent => ({
          id: row.id, owner: row.owner, name: row.name,
          tailorUrl: row.tailor_url ?? undefined,
          bot_token: row.bot_token ?? undefined,
          agent_key: row.agent_key ?? undefined,
          is_system: row.is_system ?? false,
          position: { x: row.position_x, y: row.position_y },
          working_on_project: row.working_on_project ?? null,
          home_x: row.home_x ?? null,
          home_y: row.home_y ?? null,
          tailor_config: row.tailor_config ?? null,
        })

        supabase.from('canvas_agents').select('*').then(({ data }) => {
          if (data) set({ canvasAgents: (data as AgentRow[]).map(rowToAgent) })
        })

        const channel = supabase
          .channel('canvas_agents_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_agents' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              const agent = rowToAgent(payload.new as AgentRow)
              set(state => ({ canvasAgents: [...state.canvasAgents.filter(a => a.id !== agent.id), agent] }))
            } else if (payload.eventType === 'UPDATE') {
              // FIX 2 — mettre à jour la position ET working_on_project ET tailor_config en temps réel
              const row = payload.new as AgentRow
              set(state => ({
                canvasAgents: state.canvasAgents.map(a =>
                  a.id === row.id
                    ? {
                        ...a,
                        position: { x: row.position_x, y: row.position_y },
                        working_on_project: row.working_on_project ?? null,
                        tailor_config: row.tailor_config ?? null,
                        tailorUrl: row.tailor_url ?? undefined,
                      }
                    : a
                ),
              }))
            } else if (payload.eventType === 'DELETE') {
              set(state => ({ canvasAgents: state.canvasAgents.filter(a => a.id !== (payload.old as AgentRow).id) }))
            }
          })
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      },

      setAgentWorkingOn: async (agentId, projectId) => {
        const state = get()
        const agent = state.canvasAgents.find(a => a.id === agentId)
        const homeUpdate: Record<string, unknown> = { working_on_project: projectId }
        if (projectId && agent && !agent.home_x) {
          homeUpdate.home_x = agent.position.x
          homeUpdate.home_y = agent.position.y
        }
        set(s => ({
          canvasAgents: s.canvasAgents.map(a =>
            a.id === agentId ? { ...a, working_on_project: projectId } : a
          ),
        }))
        await supabase.from('canvas_agents').update(homeUpdate).eq('id', agentId)
      },

      returnAgentHome: async (agentId) => {
        const agent = get().canvasAgents.find(a => a.id === agentId)
        if (!agent) return
        const homeX = agent.home_x ?? agent.position.x
        const homeY = agent.home_y ?? agent.position.y
        set(s => ({
          canvasAgents: s.canvasAgents.map(a =>
            a.id === agentId ? { ...a, working_on_project: null, position: { x: homeX, y: homeY } } : a
          ),
        }))
        await supabase.from('canvas_agents').update({ working_on_project: null }).eq('id', agentId)
      },

      /**
       * Fetch all lists from Supabase and hydrate local state.
       */
      fetchLists: async () => {
        const { data } = await supabase.from('lists').select('*')
        if (data) {
          set({
            lists: (data as Array<{ id: string; title: string; type: string; created_by: string; created_at: number; position_x: number; position_y: number; items: ListWidget['items'] }>).map(r => ({
              id: r.id,
              title: r.title,
              type: r.type as ListType,
              createdBy: r.created_by,
              createdAt: r.created_at,
              position: { x: r.position_x, y: r.position_y },
              items: r.items ?? [],
            })),
          })
        }
      },

      /**
       * Subscribe to Supabase Realtime for lists.
       * Performs an initial fetch, then re-fetches on any change.
       * Returns an unsubscribe function.
       */
      subscribeToLists: () => {
        get().fetchLists()
        const ch = supabase.channel('lists_rt')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => get().fetchLists())
          .subscribe()
        return () => { supabase.removeChannel(ch) }
      },

      /**
       * Add a list optimistically and persist to Supabase.
       */
      addList: async (title, type) => {
        const SESSION_ID = localStorage.getItem('launchpad_session') ?? 'unknown'
        const allObjects = getAllCanvasObjectsFromState(get())
        const freePos = findFreePosition(allObjects, 280, 220, 60, 400, 16)
        const newList: ListWidget = {
          id: `list-${Date.now()}`,
          title, type,
          createdBy: SESSION_ID,
          createdAt: Date.now(),
          position: freePos,
          items: [],
        }
        set(state => ({ lists: [...state.lists, newList] }))
        await supabase.from('lists').insert({
          id: newList.id, title, type, created_by: newList.createdBy,
          created_at: newList.createdAt, position_x: freePos.x, position_y: freePos.y, items: [],
        })
      },

      /**
       * Remove a list and delete from Supabase.
       */
      removeList: async (id) => {
        set(state => ({ lists: state.lists.filter(l => l.id !== id) }))
        await supabase.from('lists').delete().eq('id', id)
      },

      /**
       * Add an item to a list (optimistic + Supabase sync).
       */
      addListItem: async (listId, text, sessionId) => {
        const updatedLists = get().lists.map(l => l.id !== listId ? l : {
          ...l,
          items: [...l.items, {
            id: `item-${Date.now()}`,
            text, createdBy: sessionId,
            createdAt: Date.now(),
            votes: l.type === 'brainstorm' ? 0 : undefined,
            votedBy: l.type === 'brainstorm' ? [] : undefined,
            checked: l.type === 'checklist' ? false : undefined,
            order: l.type === 'ranking' ? l.items.length : undefined,
          }],
        })
        set({ lists: updatedLists })
        const updated = updatedLists.find(l => l.id === listId)
        if (updated) await supabase.from('lists').update({ items: updated.items }).eq('id', listId)
      },

      /**
       * Remove an item from a list (optimistic + Supabase sync).
       */
      removeListItem: async (listId, itemId) => {
        const updatedLists = get().lists.map(l => l.id !== listId ? l : {
          ...l, items: l.items.filter(i => i.id !== itemId),
        })
        set({ lists: updatedLists })
        const updated = updatedLists.find(l => l.id === listId)
        if (updated) await supabase.from('lists').update({ items: updated.items }).eq('id', listId)
      },

      /**
       * Toggle a checklist item (optimistic + Supabase sync).
       */
      toggleListItem: async (listId, itemId) => {
        const updatedLists = get().lists.map(l => l.id !== listId ? l : {
          ...l, items: l.items.map(i => i.id !== itemId ? i : { ...i, checked: !i.checked }),
        })
        set({ lists: updatedLists })
        const updated = updatedLists.find(l => l.id === listId)
        if (updated) await supabase.from('lists').update({ items: updated.items }).eq('id', listId)
      },

      /**
       * Vote on a brainstorm list item (optimistic + Supabase sync).
       */
      voteListItem: async (listId, itemId, sessionId) => {
        const updatedLists = get().lists.map(l => l.id !== listId ? l : {
          ...l, items: l.items.map(i => {
            if (i.id !== itemId) return i
            const hasVoted = (i.votedBy ?? []).includes(sessionId)
            return {
              ...i,
              votes: hasVoted ? (i.votes ?? 1) - 1 : (i.votes ?? 0) + 1,
              votedBy: hasVoted ? (i.votedBy ?? []).filter(s => s !== sessionId) : [...(i.votedBy ?? []), sessionId],
            }
          }),
        })
        set({ lists: updatedLists })
        const updated = updatedLists.find(l => l.id === listId)
        if (updated) await supabase.from('lists').update({ items: updated.items }).eq('id', listId)
      },

      /**
       * Reorder a list item (optimistic + Supabase sync).
       */
      moveListItem: async (listId, itemId, direction) => {
        const updatedLists = get().lists.map(l => {
          if (l.id !== listId) return l
          const items = [...l.items]
          const idx = items.findIndex(i => i.id === itemId)
          if (idx === -1) return l
          const newIdx = direction === 'up' ? idx - 1 : idx + 1
          if (newIdx < 0 || newIdx >= items.length) return l
          ;[items[idx], items[newIdx]] = [items[newIdx], items[idx]]
          return { ...l, items }
        })
        set({ lists: updatedLists })
        const updated = updatedLists.find(l => l.id === listId)
        if (updated) await supabase.from('lists').update({ items: updated.items }).eq('id', listId)
      },

      subscribeToPositions: () => {
        // FIX 1 — Au démarrage, charger TOUTES les positions (y compris les nôtres) depuis card_positions.
        // Le filtre "skip own user" s'applique uniquement aux mises à jour realtime temps réel,
        // pas au chargement initial (sinon nos propres positions sauvegardées ne seraient jamais restaurées).
        supabase.from('card_positions').select('*').then(({ data }) => {
          if (!data) return
          set(state => {
            let projects = state.projects
            let lists = state.lists
            let ideaPos = state.ideaWidgetPosition
            for (const row of data) {
              if (row.type === 'project') {
                projects = projects.map(p => p.id === row.id ? { ...p, position: { x: row.position_x, y: row.position_y } } : p)
              } else if (row.type === 'list') {
                lists = lists.map(l => l.id === row.id ? { ...l, position: { x: row.position_x, y: row.position_y } } : l)
              } else if (row.id === 'idea-widget') {
                ideaPos = { x: row.position_x, y: row.position_y }
              }
            }
            return { projects, lists, ideaWidgetPosition: ideaPos }
          })
        })

        const channel = supabase.channel('card_positions_rt')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'card_positions' }, ({ new: row }) => {
            const myUser = useLaunchpadStore.getState().currentUser?.username ?? 'anon'
            if (row.updated_by === myUser) return
            if (row.type === 'project') {
              set(s => ({ projects: s.projects.map(p => p.id === row.id ? { ...p, position: { x: row.position_x, y: row.position_y } } : p) }))
            } else if (row.type === 'list') {
              set(s => ({ lists: s.lists.map(l => l.id === row.id ? { ...l, position: { x: row.position_x, y: row.position_y } } : l) }))
            } else if (row.id === 'idea-widget') {
              set({ ideaWidgetPosition: { x: row.position_x, y: row.position_y } })
            }
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'card_positions' }, ({ new: row }) => {
            const myUser = useLaunchpadStore.getState().currentUser?.username ?? 'anon'
            if (row.updated_by === myUser) return
            if (row.type === 'project') {
              set(s => ({ projects: s.projects.map(p => p.id === row.id ? { ...p, position: { x: row.position_x, y: row.position_y } } : p) }))
            } else if (row.type === 'list') {
              set(s => ({ lists: s.lists.map(l => l.id === row.id ? { ...l, position: { x: row.position_x, y: row.position_y } } : l) }))
            } else if (row.id === 'idea-widget') {
              set({ ideaWidgetPosition: { x: row.position_x, y: row.position_y } })
            }
          })
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      },

      updateListPosition: (id, x, y) => {
        set(state => ({ lists: state.lists.map(l => l.id === id ? { ...l, position: { x, y } } : l) }))
        supabase.from('lists').update({ position_x: x, position_y: y }).eq('id', id)
        get().syncPositionToDb(id, x, y, 'list')
      },

      pushOverlapping: (draggedId, dragX, dragY) => {
        const state = get()
        const PADDING = 16
        const DEAD_ZONE = 8
        const CANVAS_W = 6000, CANVAS_H = 4000
        const CANVAS_PAD = 8
        const MAX_PASSES = 8

        const objects = getAllCanvasObjectsFromState(state)

        const positions = new Map<string, { x: number; y: number }>()
        for (const obj of objects) {
          positions.set(obj.id, { x: obj.x, y: obj.y })
        }
        positions.set(draggedId, { x: dragX, y: dragY })

        const getObj = (id: string) => objects.find(o => o.id === id)

        const pushPair = (srcId: string, tgtId: string): boolean => {
          const src = getObj(srcId)
          const tgt = getObj(tgtId)
          if (!src || !tgt) return false
          const sPos = positions.get(srcId)!
          const tPos = positions.get(tgtId)!

          const sLeft = sPos.x, sRight = sPos.x + src.width
          const sTop = sPos.y, sBottom = sPos.y + src.height
          const tLeft = tPos.x, tRight = tPos.x + tgt.width
          const tTop = tPos.y, tBottom = tPos.y + tgt.height

          const overlapX = Math.min(sRight + PADDING - tLeft, tRight + PADDING - sLeft)
          const overlapY = Math.min(sBottom + PADDING - tTop, tBottom + PADDING - sTop)
          if (overlapX <= DEAD_ZONE || overlapY <= DEAD_ZONE) return false

          const dx = (tPos.x + tgt.width / 2) - (sPos.x + src.width / 2)
          const dy = (tPos.y + tgt.height / 2) - (sPos.y + src.height / 2)

          const pushX = dx >= 0 ? sRight + PADDING - tLeft : -(tRight + PADDING - sLeft)
          const pushY = dy >= 0 ? sBottom + PADDING - tTop : -(tBottom + PADDING - sTop)

          let nx = tPos.x, ny = tPos.y
          if (Math.abs(pushX) <= Math.abs(pushY)) {
            nx = tPos.x + pushX
          } else {
            ny = tPos.y + pushY
          }
          nx = Math.max(CANVAS_PAD, Math.min(nx, CANVAS_W - tgt.width - CANVAS_PAD))
          ny = Math.max(CANVAS_PAD, Math.min(ny, CANVAS_H - tgt.height - CANVAS_PAD))
          positions.set(tgtId, { x: nx, y: ny })
          return true
        }

        const movedInLastPass = new Set<string>([draggedId])

        for (let pass = 0; pass < MAX_PASSES; pass++) {
          const movedThisPass = new Set<string>()

          for (const mover of movedInLastPass) {
            for (const other of objects) {
              if (other.id === mover || other.id === draggedId) continue
              if (pushPair(mover, other.id)) {
                movedThisPass.add(other.id)
              }
            }
          }

          if (movedThisPass.size === 0) break
          movedInLastPass.clear()
          for (const id of movedThisPass) movedInLastPass.add(id)
        }

        const newProjects = state.projects.map(p => {
          if (p.id === draggedId) return p
          const pos = positions.get(p.id)
          return pos ? { ...p, position: pos } : p
        })
        const newLists = state.lists.map(l => {
          if (l.id === draggedId) return l
          const pos = positions.get(l.id)
          return pos ? { ...l, position: pos } : l
        })
        const ideaPos = draggedId === 'idea-widget' ? undefined : positions.get('idea-widget')

        const newAgents = state.canvasAgents.map(a => {
          if (a.id === draggedId) return a
          const pos = positions.get(a.id)
          if (!pos) return a
          supabase.from('canvas_agents').update({ position_x: pos.x, position_y: pos.y }).eq('id', a.id)
          return { ...a, position: pos }
        })

        set({
          projects: newProjects,
          lists: newLists,
          ideaWidgetPosition: ideaPos ?? state.ideaWidgetPosition,
          canvasAgents: newAgents,
          swapTarget: null,
        })
      },
    }),
)

// Persist manuel — sauvegarde synchrone sur changement
let _lastSaved = ''
useLaunchpadStore.subscribe((state) => {
  // On ne persiste plus que la préférence UI locale (activeGroup).
  // groups, boardName, isPrivate → Supabase board_settings (source de vérité collaborative)
  // deletedIds → redondant (les projets supprimés disparaissent de la DB)
  // activeGroup retiré du localStorage — un groupe orphelin rendait le canvas vide
  // groups/boardName/isPrivate gardés comme cache de démarrage rapide uniquement
  const toSave = JSON.stringify({
    groups: state.groups,
    boardName: state.boardName,
    isPrivate: state.isPrivate,
  })
  if (toSave !== _lastSaved) {
    _lastSaved = toSave
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: JSON.parse(toSave) })) } catch { /* ignore */ }
  }
})
