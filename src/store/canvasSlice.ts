/**
 * canvasSlice.ts — Projects, lists, ideas, groups, canvas positions
 */
import type { StateCreator } from 'zustand'
import type { ListWidget, ListType } from '../types'
import type { LaunchpadStore, Group, Idea, ProjectMeta } from './sliceTypes'
import { supabase } from '../lib/supabase'
import {
  rowToProject,
  projectToRow,
  getAllCanvasObjectsFromState,
  DEFAULT_GROUPS,
  type ProjectRow,
} from './storeHelpers'
import { findFreePosition } from './canvasHelpers'

let _fetching = false

export type CanvasSlice = Pick<
  LaunchpadStore,
  | 'projects' | 'deletedProjects' | 'deletedIds' | 'remoteLoaded'
  | 'fetchProjects' | 'fetchPublicSettings' | 'refreshAll'
  | 'subscribeToProjects' | 'addProject' | 'removeProject'
  | 'restoreProject' | 'updatePosition' | 'syncPositionToDb'
  | 'tidyUp' | 'subscribeToPositions' | 'updateProject' | 'clearProjects'
  | 'swapTarget' | 'setSwapTarget' | 'getAllCanvasObjects' | 'pushOverlapping'
  | 'ideas' | 'ideaWidgetPosition'
  | 'fetchIdeas' | 'subscribeToIdeas' | 'addIdea' | 'deleteIdea'
  | 'voteIdea' | 'setIdeaWidgetPosition'
  | 'activeFilter' | 'groups' | 'activeGroup'
  | 'setFilter' | 'addGroup' | 'deleteGroup' | 'updateGroup'
  | 'setProjectGroup' | 'setGroupFilter'
  | 'boardName' | 'isPrivate' | 'setBoardName' | 'setPrivate'
  | 'currentUser' | 'login' | 'logout'
  | 'boardMembers' | 'fetchBoardMembers'
  | 'inviteMember' | 'removeMember' | 'updateMemberRole'
  | 'lists' | 'fetchLists' | 'subscribeToLists'
  | 'addList' | 'removeList' | 'addListItem' | 'removeListItem'
  | 'toggleListItem' | 'voteListItem' | 'moveListItem' | 'updateListPosition'
  | 'projectMetadata' | 'fetchProjectMetadata'
>

// Read stored cache
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stored: { groups?: any[]; boardName?: string; isPrivate?: boolean; activeCapsuleId?: string } = {}
try {
  const raw = localStorage.getItem('orion-launchpad-v4')
  if (raw) {
    const parsed = JSON.parse(raw)
    _stored = parsed?.state ?? parsed ?? {}
  }
} catch { /* ignore */ }

export const createCanvasSlice: StateCreator<LaunchpadStore, [], [], CanvasSlice> = (set, get) => ({
  projects: [],
  deletedProjects: [],
  deletedIds: [],
  remoteLoaded: false,
  swapTarget: null,
  ideaWidgetPosition: { x: -300, y: 60 },
  ideas: [],
  activeFilter: null,
  groups: _stored.groups ?? DEFAULT_GROUPS,
  activeGroup: null,
  boardName: _stored.boardName ?? 'Mon Launchpad',
  isPrivate: true,
  currentUser: null,
  boardMembers: [],
  lists: [],
  projectMetadata: {},

  fetchProjects: async () => {
    if (_fetching) return
    _fetching = true
    const timeout = setTimeout(() => {
      _fetching = false
      if (!get().remoteLoaded) set({ remoteLoaded: true })
    }, 10000)
    try {
      supabase.from('board_settings').select('key,value').then(({ data: s }) => {
        if (!s) return
        const m = Object.fromEntries(s.map(r => [r.key, r.value]))
        if (m.isPrivate !== undefined) set({ isPrivate: m.isPrivate === true || m.isPrivate === 'true' })
        if (m.boardName) set({ boardName: m.boardName as string })
        if (Array.isArray(m.groups)) {
          const dbGroups = m.groups as Group[]
          const missing = DEFAULT_GROUPS.filter(d => !dbGroups.some(g => g.id === d.id))
          const merged = missing.length > 0 ? [...dbGroups, ...missing] : dbGroups
          set({ groups: merged })
          if (missing.length > 0) supabase.from('board_settings').upsert({ key: 'groups', value: merged }).then(() => {})
        }
      })
      const { data } = await supabase.from('projects').select('*')
      const projects = data ? (data as ProjectRow[]).map(rowToProject) : []
      const alreadyLoaded = get().remoteLoaded
      const existingProjects = get().projects
      if (alreadyLoaded && existingProjects.length > 0) {
        const localPosMap = new Map(existingProjects.map(p => [p.id, p.position]))
        set({
          projects: projects.map(p => {
            const localPos = localPosMap.get(p.id)
            return localPos ? { ...p, position: localPos } : p
          }),
          remoteLoaded: true,
        })
      } else {
        const { data: positions } = await supabase.from('card_positions').select('*')
        const posMap = new Map((positions ?? []).map((p: { id: string; position_x: number; position_y: number }) => [p.id, p]))
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
      _fetching = false
      if (!get().remoteLoaded) set({ remoteLoaded: true })
    }
  },

  fetchPublicSettings: async () => {
    const { data } = await supabase.from('board_settings').select('key,value').in('key', ['boardName', 'isPrivate'])
    if (!data) return
    const m = Object.fromEntries(data.map(r => [r.key, r.value]))
    if (m.boardName) set({ boardName: m.boardName as string })
    if (m.isPrivate !== undefined) set({ isPrivate: m.isPrivate === true || m.isPrivate === 'true' })
  },

  subscribeToProjects: () => {
    const ch = supabase.channel('projects_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        _fetching = false
        get().fetchProjects()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  },

  refreshAll: async () => {
    _fetching = false
    await get().fetchProjects()
    const { data } = await supabase.from('canvas_agents').select('*')
    if (data) {
      type AgentRow = { id: string; owner: string; name: string; tailor_url: string | null; position_x: number; position_y: number; bot_token?: string; agent_key?: string; is_system?: boolean; working_on_project?: string | null; home_x?: number | null; home_y?: number | null; tailor_config?: import('../types').AvatarConfig | null }
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

  addProject: async (project) => {
    let finalProject = project
    if (project.position.x === 0 && project.position.y === 0) {
      const allObjects = getAllCanvasObjectsFromState(get())
      const freePos = findFreePosition(allObjects)
      finalProject = { ...project, position: freePos }
    }
    set(state => ({
      projects: [...state.projects, finalProject],
      deletedIds: state.deletedIds.filter(id => id !== finalProject.id),
      deletedProjects: state.deletedProjects.filter(p => p.id !== finalProject.id),
    }))
    await supabase.from('projects').insert({
      ...projectToRow(finalProject),
      capsule_id: get().activeCapsuleId ?? undefined,
    })
  },

  removeProject: async (id) => {
    set(state => {
      const project = state.projects.find(p => p.id === id)
      return {
        projects: state.projects.filter(p => p.id !== id),
        deletedIds: [...state.deletedIds, id],
        deletedProjects: project ? [...state.deletedProjects, project] : state.deletedProjects,
      }
    })
    await supabase.from('projects').delete().eq('id', id)
  },

  restoreProject: (id) => set(state => {
    const project = state.deletedProjects.find(p => p.id === id)
    if (!project) return {}
    return {
      projects: [...state.projects, project],
      deletedIds: state.deletedIds.filter(did => did !== id),
      deletedProjects: state.deletedProjects.filter(p => p.id !== id),
    }
  }),

  updatePosition: (id, x, y) => {
    set(state => ({
      projects: state.projects.map(p => p.id === id ? { ...p, position: { x, y } } : p),
    }))
  },

  syncPositionToDb: (id, x, y, type = 'project') => {
    const username = get().currentUser?.username ?? 'anon'
    supabase.from('card_positions').upsert({
      id, type, position_x: x, position_y: y, updated_by: username, updated_at: new Date().toISOString(),
    }).then(() => {})
  },

  tidyUp: async () => {
    const { projects, canvasAgents } = get()
    const COLS = 3
    const CARD_W = 320, CARD_H = 200, GAP_X = 48, GAP_Y = 48
    const START_X = 80, START_Y = 100
    const username = get().currentUser?.username ?? 'anon'

    const updatedProjects = projects.map((proj, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      return { ...proj, position: { x: START_X + col * (CARD_W + GAP_X), y: START_Y + row * (CARD_H + GAP_Y) } }
    })
    set({ projects: updatedProjects })

    const agentRows = Math.ceil(projects.length / COLS)
    const agentY = START_Y + agentRows * (CARD_H + GAP_Y) + 60
    const agentStartX = START_X + 20
    const agentSpacing = 160
    const updatedAgents = canvasAgents.map((agent, i) => ({
      ...agent,
      position: { x: agentStartX + i * agentSpacing, y: agentY },
    }))
    set({ canvasAgents: updatedAgents })

    await Promise.all([
      ...updatedProjects.map(p =>
        supabase.from('card_positions').upsert({ id: p.id, type: 'project', position_x: p.position.x, position_y: p.position.y, updated_by: username, updated_at: new Date().toISOString() })
      ),
      ...updatedAgents.map(a =>
        supabase.from('canvas_agents').update({ position_x: a.position.x, position_y: a.position.y, home_x: a.position.x, home_y: a.position.y }).eq('id', a.id)
      ),
    ])
  },

  updateProject: async (id, updates) => {
    set(state => ({
      projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
    }))
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

  subscribeToIdeas: () => {
    get().fetchIdeas()
    const ch = supabase.channel('ideas_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, () => get().fetchIdeas())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  },

  addIdea: async (text, author) => {
    const idea: Idea = {
      id: `idea-${Date.now()}`,
      text, author, votes: 0, votedBy: [],
      createdAt: new Date().toISOString(),
    }
    set(state => ({ ideas: [...state.ideas, idea] }))
    await supabase.from('ideas').insert({ id: idea.id, text, author, votes: 0, voted_by: [] })
  },

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
    set(state => ({
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

  setProjectGroup: (projectId, groupId) => set(state => ({
    projects: state.projects.map(p => p.id === projectId ? { ...p, groupId: groupId ?? undefined } : p),
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

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return false
    const _adminEmails = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? '').split(',').map((e: string) => e.trim()).filter(Boolean)
    const role = _adminEmails.includes(data.user.email ?? '') ? 'admin' : 'member'
    set({ currentUser: { username: data.user.email ?? '', role } })
    return true
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ currentUser: null, boardMembers: [] })
  },

  fetchBoardMembers: async () => {
    const { data } = await supabase.from('board_members').select('*').order('invited_at', { ascending: true })
    if (data) {
      const members = (data as Array<{
        id: string; email: string; role: string; invited_by: string | null;
        invited_at: string; joined_at: string | null; status: string
      }>).map(row => ({
        id: row.id,
        email: row.email,
        role: row.role as import('../types').BoardMember['role'],
        invitedBy: row.invited_by ?? undefined,
        invitedAt: row.invited_at,
        joinedAt: row.joined_at ?? undefined,
        status: row.status as import('../types').BoardMember['status'],
      }))
      set({ boardMembers: members })
    }
  },

  inviteMember: async (email, role) => {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: crypto.randomUUID(),
      options: { emailRedirectTo: (import.meta.env.VITE_BASE_URL as string | undefined) ?? window.location.origin },
    })
    if (signUpError && !signUpError.message.includes('already registered') && !signUpError.message.includes('User already registered')) {
      return { ok: false, error: signUpError.message }
    }
    const { error: dbError } = await supabase.from('board_members').insert({
      email, role, invited_by: get().currentUser?.username ?? 'admin', status: 'pending',
    })
    if (dbError) return { ok: false, error: dbError.message }
    await get().fetchBoardMembers()
    return { ok: true }
  },

  removeMember: async (email) => {
    await supabase.from('board_members').delete().eq('email', email)
    set(state => ({ boardMembers: state.boardMembers.filter(m => m.email !== email) }))
  },

  updateMemberRole: async (email, role) => {
    await supabase.from('board_members').update({ role }).eq('email', email)
    set(state => ({
      boardMembers: state.boardMembers.map(m => m.email === email ? { ...m, role } : m),
    }))
  },

  clearProjects: () => set({ projects: [], deletedIds: [], deletedProjects: [] }),
  setSwapTarget: (id) => set({ swapTarget: id }),
  getAllCanvasObjects: () => getAllCanvasObjectsFromState(get()),

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
          if (pushPair(mover, other.id)) movedThisPass.add(other.id)
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

  subscribeToLists: () => {
    get().fetchLists()
    const ch = supabase.channel('lists_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => get().fetchLists())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  },

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
      capsule_id: get().activeCapsuleId ?? undefined,
    })
  },

  removeList: async (id) => {
    set(state => ({ lists: state.lists.filter(l => l.id !== id) }))
    await supabase.from('lists').delete().eq('id', id)
  },

  addListItem: async (listId, text, sessionId) => {
    const updatedLists = get().lists.map(l => l.id !== listId ? l : {
      ...l,
      items: [...l.items, {
        id: `item-${Date.now()}`,
        text, createdBy: sessionId, createdAt: Date.now(),
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

  removeListItem: async (listId, itemId) => {
    const updatedLists = get().lists.map(l => l.id !== listId ? l : {
      ...l, items: l.items.filter(i => i.id !== itemId),
    })
    set({ lists: updatedLists })
    const updated = updatedLists.find(l => l.id === listId)
    if (updated) await supabase.from('lists').update({ items: updated.items }).eq('id', listId)
  },

  toggleListItem: async (listId, itemId) => {
    const updatedLists = get().lists.map(l => l.id !== listId ? l : {
      ...l, items: l.items.map(i => i.id !== itemId ? i : { ...i, checked: !i.checked }),
    })
    set({ lists: updatedLists })
    const updated = updatedLists.find(l => l.id === listId)
    if (updated) await supabase.from('lists').update({ items: updated.items }).eq('id', listId)
  },

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
        const myUser = get().currentUser?.username ?? 'anon'
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
        const myUser = get().currentUser?.username ?? 'anon'
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
    supabase.from('lists').update({ position_x: x, position_y: y }).eq('id', id).then(() => {})
    get().syncPositionToDb(id, x, y, 'list')
  },

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
})
