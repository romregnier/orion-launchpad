/**
 * useKnowledgeSources — TK-0188
 * Gestion des sources de données pour les Knowledge Spaces.
 * Graceful degradation si table absente.
 */
import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { KnowledgeSource } from '../types/knowledge'

function isTableMissing(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    (error.message?.includes('relation') ?? false) ||
    (error.message?.includes('does not exist') ?? false)
  )
}

export function useKnowledgeSources() {
  /**
   * getSources — Récupère toutes les sources d'un space.
   */
  const getSources = useCallback(async (spaceId: string): Promise<KnowledgeSource[]> => {
    try {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })

      if (error) {
        if (!isTableMissing(error)) {
          console.warn('[useKnowledgeSources] getSources error:', error.message)
        }
        return []
      }
      return (data as KnowledgeSource[]) ?? []
    } catch (err) {
      console.warn('[useKnowledgeSources] getSources exception:', err)
      return []
    }
  }, [])

  /**
   * addSource — Ajoute une source à un space.
   */
  const addSource = useCallback(async (
    spaceId: string,
    data: Partial<KnowledgeSource>,
  ): Promise<KnowledgeSource> => {
    const { data: inserted, error } = await supabase
      .from('knowledge_sources')
      .insert({
        space_id: spaceId,
        name: data.name ?? 'Nouvelle source',
        source_type: data.source_type ?? 'url',
        config: data.config ?? {},
        status: 'pending',
        entry_count: 0,
        capsule_id: data.capsule_id,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }
    return inserted as KnowledgeSource
  }, [])

  /**
   * updateSource — Met à jour une source.
   */
  const updateSource = useCallback(async (
    id: string,
    updates: Partial<KnowledgeSource>,
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('knowledge_sources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error && !isTableMissing(error)) {
        console.warn('[useKnowledgeSources] updateSource error:', error.message)
      }
    } catch (err) {
      console.warn('[useKnowledgeSources] updateSource exception:', err)
    }
  }, [])

  /**
   * deleteSource — Supprime une source.
   */
  const deleteSource = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('knowledge_sources')
        .delete()
        .eq('id', id)

      if (error && !isTableMissing(error)) {
        console.warn('[useKnowledgeSources] deleteSource error:', error.message)
      }
    } catch (err) {
      console.warn('[useKnowledgeSources] deleteSource exception:', err)
    }
  }, [])

  /**
   * triggerSync — Déclenche la synchronisation d'une source.
   * Simule le sync : status syncing → après 2s → synced + entry_count + last_sync_at.
   */
  const triggerSync = useCallback(async (id: string): Promise<void> => {
    try {
      // Passe en syncing
      await supabase
        .from('knowledge_sources')
        .update({ status: 'syncing', updated_at: new Date().toISOString() })
        .eq('id', id)

      // Simule le sync (2s)
      setTimeout(async () => {
        try {
          // Fetch current entry_count
          const { data: current } = await supabase
            .from('knowledge_sources')
            .select('entry_count')
            .eq('id', id)
            .single()

          const currentCount = (current as { entry_count?: number } | null)?.entry_count ?? 0
          const newCount = currentCount + Math.floor(Math.random() * 50) + 10

          await supabase
            .from('knowledge_sources')
            .update({
              status: 'synced',
              last_sync_at: new Date().toISOString(),
              entry_count: newCount,
              updated_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', id)
        } catch (err) {
          console.warn('[useKnowledgeSources] triggerSync finalize error:', err)
          await supabase
            .from('knowledge_sources')
            .update({
              status: 'error',
              error_message: 'Sync simulation failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
        }
      }, 2000)
    } catch (err) {
      console.warn('[useKnowledgeSources] triggerSync exception:', err)
    }
  }, [])

  return { getSources, addSource, updateSource, deleteSource, triggerSync }
}
