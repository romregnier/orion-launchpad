// TK-0225 — useWorkspace hook minimal avec graceful degradation
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Workspace } from '../types/workspace'

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('workspaces')
          .select('*')
          .limit(1)
          .single()
        setWorkspace(data as Workspace | null)
      } catch {
        // Table might not exist yet — graceful degradation
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { workspace, loading }
}
