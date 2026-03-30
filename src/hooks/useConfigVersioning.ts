// TK-0244: [DS-005] Config Versioning + Rollback
// Hook pour versionner les configurations des agents et permettre le rollback

import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface ConfigVersion {
  id: string
  agent_id: string
  capsule_id?: string
  version_number: number
  config_snapshot: Record<string, unknown>
  change_summary?: string
  created_by?: string
  created_at: string
  is_active: boolean
}

/**
 * useConfigVersioning
 * Versionne les configurations des agents et permet le rollback.
 * Graceful degradation si la table agent_config_versions est absente.
 */
export function useConfigVersioning() {

  /**
   * Sauvegarde une nouvelle version de la config d'un agent
   */
  const saveVersion = useCallback(async (
    agentId: string,
    config: object,
    summary?: string
  ): Promise<void> => {
    try {
      // Get next version number
      const { data: existing, error: fetchError } = await supabase
        .from('agent_config_versions')
        .select('version_number')
        .eq('agent_id', agentId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError?.code === '42P01') {
        // Table doesn't exist — graceful degradation
        console.warn('[useConfigVersioning] Table agent_config_versions not found. Skipping save.')
        return
      }

      const nextVersion = existing ? (existing.version_number as number) + 1 : 1

      // Deactivate previous active version
      await supabase
        .from('agent_config_versions')
        .update({ is_active: false })
        .eq('agent_id', agentId)
        .eq('is_active', true)

      // Insert new version
      const { error: insertError } = await supabase
        .from('agent_config_versions')
        .insert({
          agent_id: agentId,
          version_number: nextVersion,
          config_snapshot: config,
          change_summary: summary || `Version ${nextVersion}`,
          is_active: true,
        })

      if (insertError) {
        console.warn('[useConfigVersioning] saveVersion failed:', insertError.message)
      }
    } catch (err) {
      console.warn('[useConfigVersioning] saveVersion error (graceful degradation):', err)
    }
  }, [])

  /**
   * Récupère l'historique des versions d'un agent (ordre desc)
   */
  const getVersionHistory = useCallback(async (agentId: string): Promise<ConfigVersion[]> => {
    try {
      const { data, error } = await supabase
        .from('agent_config_versions')
        .select('*')
        .eq('agent_id', agentId)
        .order('version_number', { ascending: false })

      if (error?.code === '42P01') {
        console.warn('[useConfigVersioning] Table agent_config_versions not found.')
        return []
      }

      if (error) {
        console.warn('[useConfigVersioning] getVersionHistory error:', error.message)
        return []
      }

      return (data as ConfigVersion[]) || []
    } catch (err) {
      console.warn('[useConfigVersioning] getVersionHistory error (graceful degradation):', err)
      return []
    }
  }, [])

  /**
   * Rollback vers une version précédente
   * Restore config_snapshot → canvas_agents.agent_meta
   */
  const rollbackTo = useCallback(async (versionId: string): Promise<void> => {
    try {
      // Fetch the version to rollback to
      const { data: version, error: fetchError } = await supabase
        .from('agent_config_versions')
        .select('*')
        .eq('id', versionId)
        .single()

      if (fetchError?.code === '42P01') {
        console.warn('[useConfigVersioning] Table agent_config_versions not found.')
        return
      }

      if (fetchError || !version) {
        console.warn('[useConfigVersioning] rollbackTo: version not found', versionId)
        return
      }

      const v = version as ConfigVersion

      // Deactivate all versions for this agent
      await supabase
        .from('agent_config_versions')
        .update({ is_active: false })
        .eq('agent_id', v.agent_id)

      // Activate the target version
      await supabase
        .from('agent_config_versions')
        .update({ is_active: true })
        .eq('id', versionId)

      // Restore config_snapshot → canvas_agents.agent_meta
      const { error: restoreError } = await supabase
        .from('canvas_agents')
        .update({ agent_meta: v.config_snapshot })
        .eq('id', v.agent_id)

      if (restoreError) {
        console.warn('[useConfigVersioning] rollbackTo: failed to restore canvas_agents:', restoreError.message)
      }
    } catch (err) {
      console.warn('[useConfigVersioning] rollbackTo error (graceful degradation):', err)
    }
  }, [])

  /**
   * Récupère la version active courante d'un agent
   */
  const getCurrentVersion = useCallback(async (agentId: string): Promise<ConfigVersion | null> => {
    try {
      const { data, error } = await supabase
        .from('agent_config_versions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .maybeSingle()

      if (error?.code === '42P01') {
        console.warn('[useConfigVersioning] Table agent_config_versions not found.')
        return null
      }

      if (error) {
        console.warn('[useConfigVersioning] getCurrentVersion error:', error.message)
        return null
      }

      return (data as ConfigVersion) || null
    } catch (err) {
      console.warn('[useConfigVersioning] getCurrentVersion error (graceful degradation):', err)
      return null
    }
  }, [])

  return {
    saveVersion,
    getVersionHistory,
    rollbackTo,
    getCurrentVersion,
  }
}
