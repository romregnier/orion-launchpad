/**
 * usePolicyEngine — TK-0234
 * Policy Engine Gravity — YAML déclaratif versionné.
 * Parser YAML manuel (sans dépendance) pour les clés définies.
 * Graceful degradation si la table capsule_policies est absente.
 */
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CapsulePolicy, ParsedPolicy } from '../types/policy'

// ── YAML parser simple (sans dépendance) ─────────────────────────────────────
// Supporte: clés scalaires, clés boolean, listes simple (- item)
export function parsePolicy(yamlContent: string): ParsedPolicy {
  const result: ParsedPolicy = {}
  const lines = yamlContent.split('\n')
  let currentKey: keyof ParsedPolicy | null = null
  let inList = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trimEnd() // strip comments
    if (!line.trim()) continue

    const indent = line.length - line.trimStart().length

    // List item
    if (line.trimStart().startsWith('- ') && inList && currentKey) {
      const val = line.trimStart().slice(2).trim()
      if (currentKey === 'network_egress') {
        ;(result.network_egress ??= []).push(val)
      } else if (currentKey === 'tool_whitelist') {
        ;(result.tool_whitelist ??= []).push(val)
      }
      continue
    }

    // Key-value pair
    if (indent === 0 && line.includes(':')) {
      inList = false
      const colonIdx = line.indexOf(':')
      const key = line.slice(0, colonIdx).trim()
      const val = line.slice(colonIdx + 1).trim()

      if (key === 'budget_hard_stop') {
        result.budget_hard_stop = parseFloat(val) || undefined
        currentKey = null
      } else if (key === 'budget_alert') {
        result.budget_alert = parseFloat(val) || undefined
        currentKey = null
      } else if (key === 'rollback_on_error') {
        result.rollback_on_error = val === 'true'
        currentKey = null
      } else if (key === 'network_egress') {
        result.network_egress = []
        currentKey = 'network_egress'
        inList = true
      } else if (key === 'tool_whitelist') {
        result.tool_whitelist = []
        currentKey = 'tool_whitelist'
        inList = true
      } else {
        currentKey = null
        inList = false
      }
    }
  }

  return result
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePolicyEngine() {
  const [policies, setPolicies] = useState<CapsulePolicy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableAvailable, setTableAvailable] = useState(true)

  const handleSupabaseError = useCallback((err: { code?: string; message?: string }) => {
    if (err.code === '42P01' || err.message?.includes('does not exist')) {
      setTableAvailable(false)
      return true // graceful degradation
    }
    setError(err.message ?? 'Unknown error')
    return false
  }, [])

  const fetchPolicies = useCallback(async (capsuleId: string): Promise<CapsulePolicy[]> => {
    if (!tableAvailable) return []
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('capsule_policies')
        .select('*')
        .eq('capsule_id', capsuleId)
        .order('version', { ascending: false })

      if (err) { handleSupabaseError(err); return [] }
      const result = (data ?? []) as CapsulePolicy[]
      setPolicies(result)
      return result
    } catch {
      return []
    } finally {
      setLoading(false)
    }
  }, [tableAvailable, handleSupabaseError])

  const activePolicy = useCallback(async (capsuleId: string): Promise<CapsulePolicy | null> => {
    if (!tableAvailable) return null
    try {
      const { data, error: err } = await supabase
        .from('capsule_policies')
        .select('*')
        .eq('capsule_id', capsuleId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (err) { handleSupabaseError(err); return null }
      return data as CapsulePolicy
    } catch {
      return null
    }
  }, [tableAvailable, handleSupabaseError])

  const createPolicy = useCallback(async (
    capsuleId: string,
    yamlContent: string
  ): Promise<CapsulePolicy | null> => {
    if (!tableAvailable) return null
    setError(null)
    try {
      // Get max version for this capsule
      const { data: existing } = await supabase
        .from('capsule_policies')
        .select('version')
        .eq('capsule_id', capsuleId)
        .order('version', { ascending: false })
        .limit(1)

      const nextVersion = existing && existing.length > 0
        ? (existing[0] as { version: number }).version + 1
        : 1

      // Deactivate all existing
      await supabase
        .from('capsule_policies')
        .update({ is_active: false })
        .eq('capsule_id', capsuleId)

      const { data, error: err } = await supabase
        .from('capsule_policies')
        .insert({
          capsule_id: capsuleId,
          version: nextVersion,
          policy_yaml: yamlContent,
          is_active: true,
        })
        .select()
        .single()

      if (err) { handleSupabaseError(err); return null }
      await fetchPolicies(capsuleId)
      return data as CapsulePolicy
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      return null
    }
  }, [tableAvailable, fetchPolicies, handleSupabaseError])

  const activatePolicy = useCallback(async (
    policyId: string,
    capsuleId: string
  ): Promise<boolean> => {
    if (!tableAvailable) return false
    setError(null)
    try {
      // Deactivate all versions for this capsule
      await supabase
        .from('capsule_policies')
        .update({ is_active: false })
        .eq('capsule_id', capsuleId)

      // Activate the target
      const { error: err } = await supabase
        .from('capsule_policies')
        .update({ is_active: true })
        .eq('id', policyId)

      if (err) { handleSupabaseError(err); return false }
      await fetchPolicies(capsuleId)
      return true
    } catch {
      return false
    }
  }, [tableAvailable, fetchPolicies, handleSupabaseError])

  return {
    policies,
    loading,
    error,
    tableAvailable,
    fetchPolicies,
    activePolicy,
    createPolicy,
    activatePolicy,
    parsePolicy,
  }
}
