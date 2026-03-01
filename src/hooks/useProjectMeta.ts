/**
 * useProjectMeta
 * Charge et subscribe les métadonnées enrichies d'un projet (screenshot, ai_meta)
 * depuis la table project_metadata en Supabase.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ProjectMeta {
  project_id: string
  screenshot_url?: string | null
  ai_meta?: {
    summary?: string
    health_score?: number
    tags?: string[]
    suggestions?: string[]
    category?: string
  } | null
  ai_analyzed_at?: string | null
}

export function useProjectMeta(projectId: string) {
  const [meta, setMeta] = useState<ProjectMeta | null>(null)

  useEffect(() => {
    // maybeSingle() évite le 406 si aucune ligne n'existe (table vide)
    supabase.from('project_metadata').select('*').eq('project_id', projectId).maybeSingle()
      .then(({ data }) => { if (data) setMeta(data) })

    const channel = supabase.channel(`meta-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_metadata', filter: `project_id=eq.${projectId}` },
        ({ new: row }) => setMeta(row as ProjectMeta))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  return meta
}
