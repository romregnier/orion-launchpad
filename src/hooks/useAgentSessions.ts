/**
 * useAgentSessions — TK-0185
 * Hook pour gérer les sessions persistantes des agents.
 * Graceful degradation si la table agent_sessions n'existe pas encore.
 */
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface AgentSession {
  id: string
  agent_key: string
  capsule_id: string | null
  session_name: string | null
  context_summary: string | null
  message_count: number
  last_active_at: string
  created_at: string
  updated_at: string
}

const TABLE_NOT_FOUND_CODES = ['42P01', 'PGRST116']

function isTableMissingError(err: { code?: string; message?: string }) {
  return (
    TABLE_NOT_FOUND_CODES.includes(err.code ?? '') ||
    err.message?.includes('relation') ||
    err.message?.includes('does not exist')
  )
}

export function useAgentSessions() {
  const [tableExists, setTableExists] = useState(true)

  /**
   * Récupère toutes les sessions d'un agent, triées par last_active_at desc
   */
  const getSessions = useCallback(async (agentKey: string): Promise<AgentSession[]> => {
    try {
      const { data, error } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('agent_key', agentKey)
        .order('last_active_at', { ascending: false })

      if (error) {
        if (isTableMissingError(error)) {
          setTableExists(false)
          return []
        }
        console.warn('[useAgentSessions] getSessions error:', error.message)
        return []
      }

      setTableExists(true)
      return data ?? []
    } catch (err) {
      console.warn('[useAgentSessions] getSessions exception:', err)
      return []
    }
  }, [])

  /**
   * Crée une nouvelle session pour un agent
   */
  const createSession = useCallback(async (
    agentKey: string,
    capsuleId: string,
    name?: string,
  ): Promise<AgentSession | null> => {
    try {
      const { data, error } = await supabase
        .from('agent_sessions')
        .insert({
          agent_key: agentKey,
          capsule_id: capsuleId,
          session_name: name ?? null,
          message_count: 0,
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        if (isTableMissingError(error)) {
          setTableExists(false)
          return null
        }
        console.warn('[useAgentSessions] createSession error:', error.message)
        return null
      }

      setTableExists(true)
      return data
    } catch (err) {
      console.warn('[useAgentSessions] createSession exception:', err)
      return null
    }
  }, [])

  /**
   * Met à jour le résumé de contexte d'une session
   */
  const updateContextSummary = useCallback(async (
    sessionId: string,
    summary: string,
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('agent_sessions')
        .update({
          context_summary: summary,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (error) {
        if (isTableMissingError(error)) {
          setTableExists(false)
          return false
        }
        console.warn('[useAgentSessions] updateContextSummary error:', error.message)
        return false
      }

      return true
    } catch (err) {
      console.warn('[useAgentSessions] updateContextSummary exception:', err)
      return false
    }
  }, [])

  /**
   * Récupère la session la plus récente d'un agent (par last_active_at)
   */
  const getActiveSession = useCallback(async (agentKey: string): Promise<AgentSession | null> => {
    try {
      const { data, error } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('agent_key', agentKey)
        .order('last_active_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        if (isTableMissingError(error)) {
          setTableExists(false)
          return null
        }
        console.warn('[useAgentSessions] getActiveSession error:', error.message)
        return null
      }

      return data
    } catch (err) {
      console.warn('[useAgentSessions] getActiveSession exception:', err)
      return null
    }
  }, [])

  return {
    tableExists,
    getSessions,
    createSession,
    updateContextSummary,
    getActiveSession,
  }
}
