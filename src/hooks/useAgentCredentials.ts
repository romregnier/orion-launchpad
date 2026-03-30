/**
 * useAgentCredentials — TK-0233
 * Gestion des credentials chiffrés (AES-256 simulation XOR) pour les agents.
 * Graceful degradation si la table agent_credentials est absente.
 */
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface AgentCredential {
  id: string
  agent_id: string
  key_name: string
  created_at: string
  updated_at: string
}

// ── XOR cipher (simulation AES-256 côté client) ───────────────────────────────
const SECRET_SEED = 'launchpad-vault-v1'

function xorEncrypt(value: string): string {
  const key = SECRET_SEED
  let result = ''
  for (let i = 0; i < value.length; i++) {
    result += String.fromCharCode(value.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(result)
}

function xorDecrypt(encrypted: string): string {
  try {
    const decoded = atob(encrypted)
    const key = SECRET_SEED
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    return ''
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAgentCredentials() {
  const [credentials, setCredentials] = useState<AgentCredential[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableAvailable, setTableAvailable] = useState(true)

  const fetchCredentials = useCallback(async (agentId: string) => {
    if (!tableAvailable) return []
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('agent_credentials')
        .select('id, agent_id, key_name, created_at, updated_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (err) {
        // Graceful degradation: table may not exist yet
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setTableAvailable(false)
          setCredentials([])
          return []
        }
        throw err
      }

      const result = (data ?? []) as AgentCredential[]
      setCredentials(result)
      return result
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }, [tableAvailable])

  const storeCredential = useCallback(async (
    agentId: string,
    keyName: string,
    value: string
  ): Promise<boolean> => {
    if (!tableAvailable) return false
    setError(null)
    try {
      const encryptedValue = xorEncrypt(value)
      const { error: err } = await supabase
        .from('agent_credentials')
        .upsert({
          agent_id: agentId,
          key_name: keyName,
          encrypted_value: encryptedValue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'agent_id,key_name' })

      if (err) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setTableAvailable(false)
          return false
        }
        throw err
      }

      await fetchCredentials(agentId)
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      return false
    }
  }, [tableAvailable, fetchCredentials])

  const deleteCredential = useCallback(async (
    agentId: string,
    keyName: string
  ): Promise<boolean> => {
    if (!tableAvailable) return false
    setError(null)
    try {
      const { error: err } = await supabase
        .from('agent_credentials')
        .delete()
        .eq('agent_id', agentId)
        .eq('key_name', keyName)

      if (err) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setTableAvailable(false)
          return false
        }
        throw err
      }

      setCredentials(prev => prev.filter(c => c.key_name !== keyName))
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      return false
    }
  }, [tableAvailable])

  // Expose decrypt for internal use only (not displayed in UI)
  const revealCredential = useCallback(async (
    agentId: string,
    keyName: string
  ): Promise<string | null> => {
    if (!tableAvailable) return null
    try {
      const { data, error: err } = await supabase
        .from('agent_credentials')
        .select('encrypted_value')
        .eq('agent_id', agentId)
        .eq('key_name', keyName)
        .single()

      if (err || !data) return null
      return xorDecrypt((data as { encrypted_value: string }).encrypted_value)
    } catch {
      return null
    }
  }, [tableAvailable])

  return {
    credentials,
    loading,
    error,
    tableAvailable,
    fetchCredentials,
    storeCredential,
    deleteCredential,
    revealCredential,
  }
}
