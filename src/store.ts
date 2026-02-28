import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ListWidget, ListType, CanvasAgent } from './types'
import { supabase } from './lib/supabase'

export interface CanvasObject {
  id: string
  type: 'project' | 'list' | 'idea' | 'agent'
  x: number
  y: number
  width: number
  height: number
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
  currentUser: { username: string; role: 'admin' | 'member' } | null
  showSettings: boolean
  /** Fetch all projects from Supabase and update local state */
  fetchProjects: () => Promise<void>
  /** Subscribe to Supabase Realtime for projects — returns unsubscribe fn */
  subscribeToProjects: () => () => void
  addProject: (project: Project) => Promise<void>
  removeProject: (id: string) => Promise<void>
  restoreProject: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  syncPositionToDb: (id: string, x: number, y: number, type?: string) => void
  subscribeToPositions: () => (() => void)
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  addIdea: (text: string, author: string) => void
  deleteIdea: (id: string) => void
  voteIdea: (id: string, sessionId: string) => void
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
  clearProjects: () => void
  swapTarget: string | null
  setSwapTarget: (id: string | null) => void
  getAllCanvasObjects: () => CanvasObject[]
  pushOverlapping: (draggedId: string, dragX: number, dragY: number) => void
  activeBuildTasks: ActiveBuildTask[]
  subscribeToBuildTasks: () => () => void
  canvasAgents: CanvasAgent[]
  addCanvasAgent: (name: string, tailorUrl?: string, botToken?: string) => Promise<void>
  updateCanvasAgent: (id: string, updates: Partial<Pick<CanvasAgent, 'name' | 'tailorUrl' | 'bot_token' | 'tailor_config'>>) => Promise<void>
  removeCanvasAgent: (id: string) => Promise<void>
  updateAgentPosition: (id: string, x: number, y: number) => Promise<void>
  subscribeToAgents: () => () => void
  setAgentWorkingOn: (agentId: string, projectId: string | null) => Promise<void>
  returnAgentHome: (agentId: string) => Promise<void>
  lists: ListWidget[]
  addList: (title: string, type: ListType) => void
  removeList: (id: string) => void
  addListItem: (listId: string, text: string, sessionId: string) => void
  removeListItem: (listId: string, itemId: string) => void
  toggleListItem: (listId: string, itemId: string) => void
  voteListItem: (listId: string, itemId: string, sessionId: string) => void
  moveListItem: (listId: string, itemId: string, direction: 'up' | 'down') => void
  updateListPosition: (id: string, x: number, y: number) => void
}

export const useLaunchpadStore = create<LaunchpadStore>()(
  persist(
    (set, get) => ({
      projects: [],
      deletedProjects: [],
      deletedIds: [],
      remoteLoaded: false,
      swapTarget: null,
      ideaWidgetPosition: { x: -300, y: 60 },
      ideas: [
        { id: 'idea-1', text: 'Un dashboard analytics pour nos apps 📊', author: 'Orion', votes: 3, votedBy: [], createdAt: new Date().toISOString() },
        { id: 'idea-2', text: 'Une landing page pour Crumb 🌍', author: 'Nova', votes: 2, votedBy: [], createdAt: new Date().toISOString() },
        { id: 'idea-3', text: 'Dark UI Kit vendu sur Gumroad 💰', author: 'Aria', votes: 5, votedBy: [], createdAt: new Date().toISOString() },
      ],
      activeFilter: null,
      groups: [
        { id: 'group-prod', name: 'En prod', color: '#22c55e', emoji: '🚀', order: 0 },
        { id: 'group-dev', name: 'En dev', color: '#3b82f6', emoji: '🔧', order: 1 },
        { id: 'group-ideas', name: 'Idées', color: '#f59e0b', emoji: '💡', order: 2 },
        { id: 'group-archived', name: 'Archivé', color: '#6b7280', emoji: '📦', order: 3 },
      ],
      activeGroup: null,
      boardName: 'Mon Launchpad',
      isPrivate: false,
      currentUser: null,
      showSettings: false,
      activeBuildTasks: [],
      canvasAgents: [],
      lists: [],

      /**
       * Fetch all projects from Supabase and hydrate local state.
       * Also loads isPrivate from board_settings.
       */
      fetchProjects: async () => {
        // Load isPrivate from Supabase
        try {
          const { data: settings } = await supabase.from('board_settings').select('value').eq('key', 'isPrivate').single()
          if (settings) {
            const serverPrivate = settings.value === true || settings.value === 'true'
            if (serverPrivate !== get().isPrivate) set({ isPrivate: serverPrivate })
          }
        } catch { /* ignore */ }

        const { data } = await supabase.from('projects').select('*')
        if (data) {
          const projects = (data as ProjectRow[]).map(rowToProject)
          set({ projects, remoteLoaded: true })
        } else {
          set({ remoteLoaded: true })
        }
      },

      /**
       * Subscribe to Supabase Realtime for the projects table.
       * Performs an initial fetch, then re-fetches on any change.
       * Returns an unsubscribe function.
       */
      subscribeToProjects: () => {
        get().fetchProjects()
        const ch = supabase.channel('projects_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
            get().fetchProjects()
          })
          .subscribe()
        return () => { supabase.removeChannel(ch) }
      },

      /** Add a project optimistically and persist to Supabase */
      addProject: async (project) => {
        set((state) => ({
          projects: [...state.projects, project],
          deletedIds: state.deletedIds.filter((id) => id !== project.id),
          deletedProjects: state.deletedProjects.filter((p) => p.id !== project.id),
        }))
        await supabase.from('projects').insert(projectToRow(project))
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
        supabase.from('card_positions').upsert({ id, type, position_x: x, position_y: y, updated_by: username, updated_at: new Date().toISOString() })
        // For projects, also update the projects table
        if (type === 'project') {
          supabase.from('projects').update({ position_x: x, position_y: y }).eq('id', id)
        }
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

      addIdea: (text, author) =>
        set((state) => ({
          ideas: [...state.ideas, {
            id: `idea-${Date.now()}`,
            text, author, votes: 0, votedBy: [],
            createdAt: new Date().toISOString(),
          }],
        })),

      voteIdea: (id, sessionId) =>
        set((state) => ({
          ideas: state.ideas.map((idea) => {
            if (idea.id !== id) return idea
            const hasVoted = idea.votedBy.includes(sessionId)
            return {
              ...idea,
              votes: hasVoted ? idea.votes - 1 : idea.votes + 1,
              votedBy: hasVoted
                ? idea.votedBy.filter((s) => s !== sessionId)
                : [...idea.votedBy, sessionId],
            }
          }),
        })),

      deleteIdea: (id) => set((state) => ({ ideas: state.ideas.filter(i => i.id !== id) })),
      setFilter: (tag) => set({ activeFilter: tag }),
      setIdeaWidgetPosition: (x, y) => set({ ideaWidgetPosition: { x, y } }),

      addGroup: (group) => set((state) => ({
        groups: [...state.groups, { ...group, id: `group-${Date.now()}`, order: state.groups.length }]
      })),
      deleteGroup: (id) => set((state) => ({
        groups: state.groups.filter(g => g.id !== id),
        projects: state.projects.map(p => p.groupId === id ? { ...p, groupId: undefined } : p),
        activeGroup: state.activeGroup === id ? null : state.activeGroup,
      })),
      updateGroup: (id, updates) => set((state) => ({
        groups: state.groups.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      setProjectGroup: (projectId, groupId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, groupId: groupId ?? undefined } : p)
      })),
      setGroupFilter: (groupId) => set({ activeGroup: groupId }),

      setBoardName: (name) => set({ boardName: name }),
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
        set({ currentUser: null })
      },

      setShowSettings: (v) => set({ showSettings: v }),
      clearProjects: () => set({ projects: [], deletedIds: [], deletedProjects: [] }),

      setSwapTarget: (id) => set({ swapTarget: id }),

      getAllCanvasObjects: () => getAllCanvasObjectsFromState(get()),

      addCanvasAgent: async (name, tailorUrl, botToken) => {
        const { randomAvatarConfig } = await import('./utils/randomAvatar')
        const owner = get().currentUser?.username ?? 'anon'
        const tailorConfig = randomAvatarConfig()
        const { data, error } = await supabase
          .from('canvas_agents')
          .insert({ name, tailor_url: tailorUrl ?? null, bot_token: botToken ?? null, owner, position_x: 200, position_y: 200, tailor_config: tailorConfig })
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
              if (data) set({ activeBuildTasks: data as ActiveBuildTask[] })
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
              const row = payload.new as AgentRow
              set(state => ({ canvasAgents: state.canvasAgents.map(a => a.id === row.id ? { ...a, position: { x: row.position_x, y: row.position_y } } : a) }))
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

      addList: (title, type) => set((state) => {
        const SESSION_ID = localStorage.getItem('launchpad_session') ?? 'unknown'
        const CARD_W = 280, CARD_H = 220, PAD = 16
        let x = 60, y = 400
        let attempts = 0
        const overlaps = (cx: number, cy: number) =>
          [...state.projects, ...state.lists].some(p =>
            cx < p.position.x + CARD_W + PAD &&
            cx + CARD_W + PAD > p.position.x &&
            cy < p.position.y + CARD_H + PAD &&
            cy + CARD_H + PAD > p.position.y
          )
        while (overlaps(x, y) && attempts < 20) {
          x += CARD_W + PAD
          if (attempts % 4 === 3) { x = 60; y += CARD_H + PAD }
          attempts++
        }
        const newList: ListWidget = {
          id: `list-${Date.now()}`,
          title, type,
          createdBy: SESSION_ID,
          createdAt: Date.now(),
          position: { x, y },
          items: [],
        }
        return { lists: [...state.lists, newList] }
      }),

      removeList: (id) => set((state) => ({ lists: state.lists.filter(l => l.id !== id) })),

      addListItem: (listId, text, sessionId) => set((state) => ({
        lists: state.lists.map(l => l.id !== listId ? l : {
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
        }),
      })),

      removeListItem: (listId, itemId) => set((state) => ({
        lists: state.lists.map(l => l.id !== listId ? l : {
          ...l, items: l.items.filter(i => i.id !== itemId),
        }),
      })),

      toggleListItem: (listId, itemId) => set((state) => ({
        lists: state.lists.map(l => l.id !== listId ? l : {
          ...l, items: l.items.map(i => i.id !== itemId ? i : { ...i, checked: !i.checked }),
        }),
      })),

      voteListItem: (listId, itemId, sessionId) => set((state) => ({
        lists: state.lists.map(l => l.id !== listId ? l : {
          ...l, items: l.items.map(i => {
            if (i.id !== itemId) return i
            const hasVoted = (i.votedBy ?? []).includes(sessionId)
            return {
              ...i,
              votes: hasVoted ? (i.votes ?? 1) - 1 : (i.votes ?? 0) + 1,
              votedBy: hasVoted ? (i.votedBy ?? []).filter(s => s !== sessionId) : [...(i.votedBy ?? []), sessionId],
            }
          }),
        }),
      })),

      moveListItem: (listId, itemId, direction) => set((state) => ({
        lists: state.lists.map(l => {
          if (l.id !== listId) return l
          const items = [...l.items]
          const idx = items.findIndex(i => i.id === itemId)
          if (idx === -1) return l
          const newIdx = direction === 'up' ? idx - 1 : idx + 1
          if (newIdx < 0 || newIdx >= items.length) return l
          ;[items[idx], items[newIdx]] = [items[newIdx], items[idx]]
          return { ...l, items }
        }),
      })),

      subscribeToPositions: () => {
        supabase.from('card_positions').select('*').then(({ data }) => {
          if (!data) return
          set(state => {
            const myUser = state.currentUser?.username ?? 'anon'
            let projects = state.projects
            let lists = state.lists
            let ideaPos = state.ideaWidgetPosition
            for (const row of data) {
              if (row.updated_by === myUser) continue
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

      updateListPosition: (id, x, y) => set((state) => ({
        lists: state.lists.map(l => l.id === id ? { ...l, position: { x, y } } : l),
      })),

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
    {
      name: 'orion-launchpad',
      partialize: (state) => ({
        projects: state.projects,
        deletedIds: state.deletedIds,
        deletedProjects: state.deletedProjects,
        ideas: state.ideas,
        groups: state.groups,
        activeGroup: state.activeGroup,
        boardName: state.boardName,
        isPrivate: state.isPrivate,
        currentUser: state.currentUser,
        lists: state.lists,

      }),
    }
  )
)
