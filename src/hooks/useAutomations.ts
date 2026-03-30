import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Automation {
  id: string
  capsule_id: string
  name: string
  description: string | null
  schedule: string | null
  script_path: string | null
  adapter_type: string
  adapter_config: Record<string, unknown>
  enabled: boolean
  last_run_at: string | null
  last_run_status: string | null
  last_run_output: string | null
  next_run_at: string | null
  created_at: string
}

/**
 * Parse a cron expression and return the next run time from now.
 * Supports 5-field cron: min hour dom month dow
 * Simplified: only handles numeric or * values.
 */
function getNextRunAt(schedule: string | null): string | null {
  if (!schedule) return null
  try {
    const parts = schedule.trim().split(/\s+/)
    if (parts.length !== 5) return null
    const [min, hour] = parts

    const now = new Date()
    const next = new Date()
    next.setSeconds(0, 0)

    const parsedMin = min === '*' ? 0 : parseInt(min, 10)
    const parsedHour = hour === '*' ? now.getHours() : parseInt(hour, 10)

    if (isNaN(parsedMin) || isNaN(parsedHour)) return null

    next.setHours(parsedHour, parsedMin, 0, 0)
    // If this time already passed today, move to tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    return next.toISOString()
  } catch {
    return null
  }
}

/**
 * Hook to fetch and manage automations for a given capsule.
 * Supports realtime updates, triggerRun (simulation), and toggleEnabled.
 *
 * @param capsuleId - UUID of the capsule
 */
export function useAutomations(capsuleId: string) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAutomations = useCallback(async () => {
    if (!capsuleId) return
    try {
      const { data, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .eq('capsule_id', capsuleId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const rows = (data ?? []) as Automation[]
      // Compute next_run_at client-side if column not yet present in DB row
      const enriched = rows.map(r => ({
        ...r,
        next_run_at: r.next_run_at ?? getNextRunAt(r.schedule),
      }))
      setAutomations(enriched)
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
    fetchAutomations()

    // Realtime subscription
    const channel = supabase
      .channel(`automations_${capsuleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automations',
          filter: `capsule_id=eq.${capsuleId}`,
        },
        () => {
          fetchAutomations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [capsuleId, fetchAutomations])

  /**
   * Simulate triggering a job manually.
   * Sets last_run_status = 'running', last_run_at = now()
   */
  const triggerRun = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    // Optimistic update
    setAutomations(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, last_run_status: 'running', last_run_at: now }
          : a
      )
    )
    const { error: updateError } = await supabase
      .from('automations')
      .update({ last_run_status: 'running', last_run_at: now })
      .eq('id', id)
    if (updateError) {
      setError(updateError.message)
      // Revert on error
      await fetchAutomations()
    }
  }, [fetchAutomations])

  /**
   * Toggle the enabled state of an automation.
   */
  const toggleEnabled = useCallback(async (id: string) => {
    const automation = automations.find(a => a.id === id)
    if (!automation) return

    const newEnabled = !automation.enabled
    // Optimistic update
    setAutomations(prev =>
      prev.map(a => (a.id === id ? { ...a, enabled: newEnabled } : a))
    )
    const { error: updateError } = await supabase
      .from('automations')
      .update({ enabled: newEnabled })
      .eq('id', id)
    if (updateError) {
      setError(updateError.message)
      // Revert on error
      await fetchAutomations()
    }
  }, [automations, fetchAutomations])

  return {
    automations,
    loading,
    error,
    triggerRun,
    toggleEnabled,
    refetch: fetchAutomations,
  }
}
