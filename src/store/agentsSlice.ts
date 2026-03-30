/**
 * agentsSlice.ts — Canvas agents: fetch, add, update position, subscribe realtime
 */
import type { StateCreator } from 'zustand'
import type { CanvasAgent } from '../types'
import type { LaunchpadStore, ActiveBuildTask } from './sliceTypes'
import { supabase } from '../lib/supabase'
import { getAllCanvasObjectsFromState } from './storeHelpers'
import { findFreePosition } from './canvasHelpers'

type AgentRow = {
  id: string
  owner: string
  name: string
  tailor_url: string | null
  position_x: number
  position_y: number
  bot_token?: string
  agent_key?: string
  is_system?: boolean
  working_on_project?: string | null
  home_x?: number | null
  home_y?: number | null
  tailor_config?: import('../types').AvatarConfig | null
  agent_meta?: import('../types').AgentMeta | null
}

function rowToAgent(row: AgentRow): CanvasAgent {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    tailorUrl: row.tailor_url ?? undefined,
    bot_token: row.bot_token ?? undefined,
    agent_key: row.agent_key ?? undefined,
    is_system: row.is_system ?? false,
    position: { x: row.position_x, y: row.position_y },
    working_on_project: row.working_on_project ?? null,
    home_x: row.home_x ?? null,
    home_y: row.home_y ?? null,
    tailor_config: row.tailor_config ?? null,
  }
}

export type AgentsSlice = Pick<
  LaunchpadStore,
  | 'canvasAgents'
  | 'addCanvasAgent'
  | 'updateCanvasAgent'
  | 'removeCanvasAgent'
  | 'updateAgentPosition'
  | 'subscribeToAgents'
  | 'setAgentWorkingOn'
  | 'returnAgentHome'
  | 'activeBuildTasks'
  | 'subscribeToBuildTasks'
>

export const createAgentsSlice: StateCreator<LaunchpadStore, [], [], AgentsSlice> = (set, get) => ({
  canvasAgents: [],
  activeBuildTasks: [],

  addCanvasAgent: async (name, tailorUrl, botToken, tailorConfig, agentMeta) => {
    const { randomAvatarConfig } = await import('../utils/randomAvatar')
    const owner = get().currentUser?.username ?? 'anon'
    if (!tailorConfig) tailorConfig = randomAvatarConfig()
    const allObjects = getAllCanvasObjectsFromState(get())
    const freePos = findFreePosition(allObjects, 80, 100, 60, 60, 20)
    const { data, error } = await supabase
      .from('canvas_agents')
      .insert({
        name,
        tailor_url: tailorUrl ?? null,
        bot_token: botToken ?? null,
        owner,
        position_x: freePos.x,
        position_y: freePos.y,
        tailor_config: tailorConfig,
        agent_meta: agentMeta ?? null,
      })
      .select()
      .single()
    if (error || !data) return
    const row = data as AgentRow
    const agent: CanvasAgent = {
      id: row.id,
      owner: row.owner,
      name: row.name,
      tailorUrl: row.tailor_url ?? undefined,
      bot_token: row.bot_token ?? undefined,
      position: { x: row.position_x, y: row.position_y },
      tailor_config: row.tailor_config ?? null,
      agent_meta: row.agent_meta ?? null,
    }
    set(state => ({ canvasAgents: [...state.canvasAgents, agent] }))
  },

  updateCanvasAgent: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.tailorUrl !== undefined) dbUpdates.tailor_url = updates.tailorUrl ?? null
    if (updates.bot_token !== undefined) dbUpdates.bot_token = updates.bot_token ?? null
    if (updates.tailor_config !== undefined) dbUpdates.tailor_config = updates.tailor_config ?? null
    if (updates.agent_meta !== undefined) dbUpdates.agent_meta = updates.agent_meta ?? null
    if (updates.role !== undefined) dbUpdates.role = updates.role ?? null
    if (updates.skills !== undefined) dbUpdates.skills = updates.skills ?? []
    if (updates.model !== undefined) dbUpdates.model = updates.model ?? null
    await supabase.from('canvas_agents').update(dbUpdates).eq('id', id)
    set(state => ({
      canvasAgents: state.canvasAgents.map(a => a.id === id ? { ...a, ...updates } : a),
    }))
  },

  removeCanvasAgent: async (id) => {
    await supabase.from('canvas_agents').delete().eq('id', id)
    set(state => ({ canvasAgents: state.canvasAgents.filter(a => a.id !== id) }))
  },

  updateAgentPosition: async (id, x, y) => {
    set(state => ({
      canvasAgents: state.canvasAgents.map(a =>
        a.id === id ? { ...a, position: { x, y } } : a
      ),
    }))
    supabase.from('canvas_agents').update({ position_x: x, position_y: y }).eq('id', id).then(() => {})
  },

  subscribeToBuildTasks: () => {
    const load = () => {
      supabase
        .from('build_tasks')
        .select('id, label, status, progress, agent_key, step_label, project, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          const tasks = (data ?? []) as ActiveBuildTask[]
          set({ activeBuildTasks: tasks })
          const activeByKey: Record<string, string> = {}
          tasks
            .filter(t => t.status === 'running')
            .forEach(t => { if (t.agent_key && t.project) activeByKey[t.agent_key] = t.project })
          set(state => ({
            canvasAgents: state.canvasAgents.map(agent => {
              const targetProject = agent.agent_key ? (activeByKey[agent.agent_key] ?? null) : null
              if (agent.working_on_project === targetProject) return agent
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
    const interval = setInterval(load, 5000)
    const ch = supabase
      .channel('store_build_tasks_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, load)
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(ch) }
  },

  subscribeToAgents: () => {
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
})
