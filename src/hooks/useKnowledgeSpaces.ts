/**
 * useKnowledgeSpaces — TK-0230
 * Infrastructure des Knowledge Spaces pour les agents du Launchpad.
 * Graceful degradation si les tables n'existent pas encore.
 */
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface KnowledgeSpace {
  id: string
  capsule_id: string
  name: string
  description: string | null
  icon: string
  visibility: 'private' | 'shared' | 'public'
  allowed_agents: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // virtuel : nombre d'entrées (jointure ou comptage)
  entry_count?: number
}

export interface KnowledgeEntry {
  id: string
  space_id: string
  title: string
  content: string
  tags: string[]
  source_agent: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface UseKnowledgeSpacesOptions {
  capsuleId?: string
  selectedSpaceId?: string
}

export function useKnowledgeSpaces({ capsuleId, selectedSpaceId }: UseKnowledgeSpacesOptions = {}) {
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>([])
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)

  const isTableMissing = (error: { code?: string; message?: string }) =>
    error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')

  const fetchSpaces = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('knowledge_spaces')
        .select('*')
        .order('created_at', { ascending: false })

      if (capsuleId) {
        query = query.eq('capsule_id', capsuleId)
      }

      const { data, error } = await query

      if (error) {
        if (isTableMissing(error)) {
          setTableExists(false)
          setSpaces([])
        } else {
          console.warn('[useKnowledgeSpaces] Fetch spaces error:', error.message)
          setSpaces([])
        }
        return
      }
      setTableExists(true)
      setSpaces(data ?? [])
    } catch (err) {
      console.warn('[useKnowledgeSpaces] Unexpected error:', err)
      setSpaces([])
    } finally {
      setLoading(false)
    }
  }, [capsuleId])

  const fetchEntries = useCallback(async (spaceId: string) => {
    if (!tableExists) return
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })

    if (error) {
      if (isTableMissing(error)) {
        setEntries([])
      } else {
        console.warn('[useKnowledgeSpaces] Fetch entries error:', error.message)
        setEntries([])
      }
      return
    }
    setEntries(data ?? [])
  }, [tableExists])

  useEffect(() => {
    fetchSpaces()
  }, [fetchSpaces])

  useEffect(() => {
    if (selectedSpaceId) {
      fetchEntries(selectedSpaceId)
    } else {
      setEntries([])
    }
  }, [selectedSpaceId, fetchEntries])

  const createSpace = useCallback(async (data: Partial<KnowledgeSpace>) => {
    if (!tableExists) {
      const mock: KnowledgeSpace = {
        id: crypto.randomUUID(),
        capsule_id: capsuleId ?? '',
        name: data.name ?? 'Nouveau Space',
        description: data.description ?? null,
        icon: data.icon ?? '📚',
        visibility: data.visibility ?? 'private',
        allowed_agents: data.allowed_agents ?? [],
        metadata: data.metadata ?? {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSpaces(prev => [mock, ...prev])
      return
    }
    const { error } = await supabase.from('knowledge_spaces').insert({
      capsule_id: capsuleId,
      name: data.name,
      description: data.description,
      icon: data.icon ?? '📚',
      visibility: data.visibility ?? 'private',
      allowed_agents: data.allowed_agents ?? [],
      metadata: data.metadata ?? {},
    })
    if (error) {
      console.warn('[useKnowledgeSpaces] Create space error:', error.message)
      return
    }
    await fetchSpaces()
  }, [capsuleId, tableExists, fetchSpaces])

  const deleteSpace = useCallback(async (id: string) => {
    if (!tableExists) {
      setSpaces(prev => prev.filter(s => s.id !== id))
      return
    }
    const { error } = await supabase.from('knowledge_spaces').delete().eq('id', id)
    if (error) {
      console.warn('[useKnowledgeSpaces] Delete space error:', error.message)
      return
    }
    setSpaces(prev => prev.filter(s => s.id !== id))
  }, [tableExists])

  const addEntry = useCallback(async (data: Partial<KnowledgeEntry>) => {
    if (!tableExists) {
      const mock: KnowledgeEntry = {
        id: crypto.randomUUID(),
        space_id: data.space_id ?? selectedSpaceId ?? '',
        title: data.title ?? '',
        content: data.content ?? '',
        tags: data.tags ?? [],
        source_agent: data.source_agent ?? null,
        metadata: data.metadata ?? {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setEntries(prev => [mock, ...prev])
      return
    }
    const { error } = await supabase.from('knowledge_entries').insert({
      space_id: data.space_id ?? selectedSpaceId,
      title: data.title,
      content: data.content,
      tags: data.tags ?? [],
      source_agent: data.source_agent,
      metadata: data.metadata ?? {},
    })
    if (error) {
      console.warn('[useKnowledgeSpaces] Add entry error:', error.message)
      return
    }
    if (selectedSpaceId) await fetchEntries(selectedSpaceId)
  }, [tableExists, selectedSpaceId, fetchEntries])

  const deleteEntry = useCallback(async (id: string) => {
    if (!tableExists) {
      setEntries(prev => prev.filter(e => e.id !== id))
      return
    }
    const { error } = await supabase.from('knowledge_entries').delete().eq('id', id)
    if (error) {
      console.warn('[useKnowledgeSpaces] Delete entry error:', error.message)
      return
    }
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [tableExists])

  return {
    spaces,
    entries,
    loading,
    tableExists,
    createSpace,
    deleteSpace,
    addEntry,
    deleteEntry,
    refetch: fetchSpaces,
  }
}
