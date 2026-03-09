import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type AgentStatusValue = 'busy' | 'online' | 'idle'

// ── useAgentStatus ────────────────────────────────────────────────────────────
// Retourne un Map<agentKey, 'busy' | 'online' | 'idle'>
// - 'busy'  = build_task running
// - 'online' = dernière build_task done depuis < 5 min
// - 'idle'  = sinon
// Souscrit à Supabase Realtime sur build_tasks (postgres_changes)
// Refresh initial + live updates
export function useAgentStatus(): Map<string, AgentStatusValue> {
  const [statusMap, setStatusMap] = useState<Map<string, AgentStatusValue>>(new Map())

  const computeStatuses = (tasks: Array<{ agent_key: string; status: string; updated_at: string | null }>) => {
    const map = new Map<string, AgentStatusValue>()
    const now = Date.now()
    const FIVE_MINUTES = 5 * 60 * 1000

    // Group tasks by agent_key, keep only the most recent per agent
    const byAgent = new Map<string, { status: string; updated_at: string | null }>()
    for (const task of tasks) {
      const key = task.agent_key
      if (!key) continue
      const existing = byAgent.get(key)
      if (!existing) {
        byAgent.set(key, task)
      } else {
        // Keep most recent by updated_at
        const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0
        const taskTime = task.updated_at ? new Date(task.updated_at).getTime() : 0
        if (taskTime > existingTime) {
          byAgent.set(key, task)
        }
      }
    }

    for (const [agentKey, task] of byAgent.entries()) {
      if (task.status === 'running') {
        map.set(agentKey, 'busy')
      } else if (task.status === 'done' && task.updated_at) {
        const elapsed = now - new Date(task.updated_at).getTime()
        map.set(agentKey, elapsed < FIVE_MINUTES ? 'online' : 'idle')
      } else {
        map.set(agentKey, 'idle')
      }
    }

    return map
  }

  const loadStatuses = async () => {
    const { data, error } = await supabase
      .from('build_tasks')
      .select('agent_key, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error || !data) return

    setStatusMap(computeStatuses(data as Array<{ agent_key: string; status: string; updated_at: string | null }>))
  }

  useEffect(() => {
    // Initial load
    loadStatuses()

    // Supabase Realtime subscription on build_tasks
    const channel = supabase
      .channel('agent-status-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'build_tasks' },
        () => { loadStatuses() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return statusMap
}
