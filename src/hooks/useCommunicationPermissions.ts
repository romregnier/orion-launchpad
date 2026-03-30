import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface CommunicationPermission {
  id: string
  capsule_id: string
  agent_key: string
  visibility: 'public' | 'team' | 'admin' | 'private'
  can_message: string[]
  can_mention: string[]
  can_view: string[]
  created_at: string
  updated_at: string
}

export type PermissionUpdate = Partial<
  Pick<
    CommunicationPermission,
    'visibility' | 'can_message' | 'can_mention' | 'can_view'
  >
>

/**
 * Hook to fetch and manage communication permissions for a capsule.
 *
 * @param capsuleId - UUID of the capsule
 */
export function useCommunicationPermissions(capsuleId: string) {
  const [permissions, setPermissions] = useState<CommunicationPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!capsuleId) return
    try {
      const { data, error: fetchError } = await supabase
        .from('communication_permissions')
        .select('*')
        .eq('capsule_id', capsuleId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        // Table might not exist yet — degrade gracefully
        setError(fetchError.message)
        setPermissions([])
        return
      }

      setPermissions((data ?? []) as CommunicationPermission[])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [capsuleId])

  useEffect(() => {
    if (!capsuleId) return
    setLoading(true)
    fetchPermissions()
  }, [capsuleId, fetchPermissions])

  /**
   * Update an existing permission row by id.
   */
  const updatePermission = useCallback(
    async (id: string, updates: PermissionUpdate) => {
      // Optimistic update
      setPermissions(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, ...updates, updated_at: new Date().toISOString() }
            : p
        )
      )
      const { error: updateError } = await supabase
        .from('communication_permissions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (updateError) {
        setError(updateError.message)
        await fetchPermissions()
      }
    },
    [fetchPermissions]
  )

  /**
   * Add a new permission for a given agent_key in this capsule.
   * Uses upsert to avoid duplicates.
   */
  const addPermission = useCallback(
    async (
      agentKey: string,
      overrides: Partial<
        Omit<CommunicationPermission, 'id' | 'capsule_id' | 'agent_key' | 'created_at' | 'updated_at'>
      > = {}
    ) => {
      const newPerm: Omit<CommunicationPermission, 'id'> = {
        capsule_id: capsuleId,
        agent_key: agentKey,
        visibility: overrides.visibility ?? 'team',
        can_message: overrides.can_message ?? ['owner', 'admin', 'member'],
        can_mention: overrides.can_mention ?? ['owner', 'admin', 'member', 'junior'],
        can_view: overrides.can_view ?? ['owner', 'admin', 'member', 'junior', 'viewer'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data, error: insertError } = await supabase
        .from('communication_permissions')
        .upsert(newPerm, { onConflict: 'capsule_id,agent_key' })
        .select()
        .single()
      if (insertError) {
        setError(insertError.message)
        return null
      }
      await fetchPermissions()
      return data as CommunicationPermission
    },
    [capsuleId, fetchPermissions]
  )

  return {
    permissions,
    loading,
    error,
    updatePermission,
    addPermission,
    refetch: fetchPermissions,
  }
}
