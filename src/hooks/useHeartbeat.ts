/**
 * useHeartbeat — TK-0235
 * Système de heartbeats pour les agents avec subscription realtime.
 * Graceful degradation si la table agent_heartbeats est absente.
 */
import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type HeartbeatType = 'scheduled' | 'on_demand' | 'task_start' | 'task_end'
export type HeartbeatStatus = 'alive' | 'idle' | 'error'

export interface AgentHeartbeat {
  id: string
  agent_id: string
  capsule_id?: string
  heartbeat_type: HeartbeatType
  status: HeartbeatStatus
  payload: Record<string, unknown>
  created_at: string
}

export function useHeartbeat() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableAvailable, setTableAvailable] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const isTableError = (err: { code?: string; message?: string }) =>
    err.code === '42P01' || err.message?.includes('does not exist')

  const sendHeartbeat = useCallback(async (
    agentId: string,
    type: HeartbeatType = 'scheduled',
    status: HeartbeatStatus = 'alive',
    payload?: Record<string, unknown>,
    capsuleId?: string
  ): Promise<boolean> => {
    if (!tableAvailable) return false
    setError(null)
    try {
      const { error: err } = await supabase
        .from('agent_heartbeats')
        .insert({
          agent_id: agentId,
          capsule_id: capsuleId ?? null,
          heartbeat_type: type,
          status,
          payload: payload ?? {},
        })

      if (err) {
        if (isTableError(err)) { setTableAvailable(false); return false }
        throw err
      }
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      return false
    }
  }, [tableAvailable])

  const getRecentHeartbeats = useCallback(async (
    agentId: string,
    limit = 10
  ): Promise<AgentHeartbeat[]> => {
    if (!tableAvailable) return []
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('agent_heartbeats')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (err) {
        if (isTableError(err)) { setTableAvailable(false); return [] }
        throw err
      }
      return (data ?? []) as AgentHeartbeat[]
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      return []
    } finally {
      setLoading(false)
    }
  }, [tableAvailable])

  const isAlive = useCallback(async (agentId: string): Promise<boolean> => {
    if (!tableAvailable) return false
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data, error: err } = await supabase
        .from('agent_heartbeats')
        .select('id')
        .eq('agent_id', agentId)
        .eq('status', 'alive')
        .gte('created_at', fiveMinutesAgo)
        .limit(1)

      if (err) { return false }
      return (data?.length ?? 0) > 0
    } catch {
      return false
    }
  }, [tableAvailable])

  const subscribeToHeartbeats = useCallback((
    capsuleId: string,
    callback: (heartbeat: AgentHeartbeat) => void
  ): (() => void) => {
    if (!tableAvailable) return () => {}

    // Unsubscribe previous if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`heartbeats:capsule:${capsuleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_heartbeats',
          filter: `capsule_id=eq.${capsuleId}`,
        },
        (payload) => {
          callback(payload.new as AgentHeartbeat)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tableAvailable])

  return {
    loading,
    error,
    tableAvailable,
    sendHeartbeat,
    getRecentHeartbeats,
    isAlive,
    subscribeToHeartbeats,
  }
}
