/**
 * useAgentMemory — TK-0226
 * Infrastructure de mémoire pour les agents du Launchpad.
 * Graceful degradation si la table agent_memory n'existe pas encore.
 */
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface AgentMemory {
  id: string
  agent_key: string
  capsule_id: string
  memory_type: 'core' | 'episodic'
  content: string
  metadata: Record<string, unknown>
  importance: number
  expires_at?: string
  created_at: string
  updated_at: string
}

interface UseAgentMemoryOptions {
  agentKey: string
  capsuleId?: string
}

export function useAgentMemory({ agentKey, capsuleId }: UseAgentMemoryOptions) {
  const [memories, setMemories] = useState<AgentMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)

  const fetchMemories = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('agent_memory')
        .select('*')
        .eq('agent_key', agentKey)
        .order('created_at', { ascending: false })

      if (capsuleId) {
        query = query.eq('capsule_id', capsuleId)
      }

      const { data, error } = await query

      if (error) {
        // Graceful degradation si table absente
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setTableExists(false)
          setMemories([])
        } else {
          console.warn('[useAgentMemory] Fetch error:', error.message)
          setMemories([])
        }
        return
      }
      setTableExists(true)
      setMemories(data ?? [])
    } catch (err) {
      console.warn('[useAgentMemory] Unexpected error:', err)
      setMemories([])
    } finally {
      setLoading(false)
    }
  }, [agentKey, capsuleId])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  const addMemory = useCallback(async (data: Partial<AgentMemory>) => {
    if (!tableExists) {
      // Demo mode: ajouter localement
      const mock: AgentMemory = {
        id: crypto.randomUUID(),
        agent_key: agentKey,
        capsule_id: capsuleId ?? '',
        memory_type: data.memory_type ?? 'episodic',
        content: data.content ?? '',
        metadata: data.metadata ?? {},
        importance: data.importance ?? 5,
        expires_at: data.expires_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setMemories(prev => [mock, ...prev])
      return
    }
    const { error } = await supabase.from('agent_memory').insert({
      agent_key: agentKey,
      capsule_id: capsuleId,
      memory_type: data.memory_type ?? 'episodic',
      content: data.content,
      metadata: data.metadata ?? {},
      importance: data.importance ?? 5,
      expires_at: data.expires_at,
    })
    if (error) {
      console.warn('[useAgentMemory] Insert error:', error.message)
      return
    }
    await fetchMemories()
  }, [agentKey, capsuleId, tableExists, fetchMemories])

  const deleteMemory = useCallback(async (id: string) => {
    if (!tableExists) {
      setMemories(prev => prev.filter(m => m.id !== id))
      return
    }
    const { error } = await supabase.from('agent_memory').delete().eq('id', id)
    if (error) {
      console.warn('[useAgentMemory] Delete error:', error.message)
      return
    }
    setMemories(prev => prev.filter(m => m.id !== id))
  }, [tableExists])

  const updateMemory = useCallback(async (id: string, data: Partial<AgentMemory>) => {
    if (!tableExists) {
      setMemories(prev => prev.map(m => m.id === id ? { ...m, ...data, updated_at: new Date().toISOString() } : m))
      return
    }
    const { error } = await supabase
      .from('agent_memory')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.warn('[useAgentMemory] Update error:', error.message)
      return
    }
    await fetchMemories()
  }, [tableExists, fetchMemories])

  return { memories, loading, tableExists, addMemory, deleteMemory, updateMemory, refetch: fetchMemories }
}
