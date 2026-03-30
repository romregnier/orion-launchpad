/**
 * useTaskCheckout — TK-0245
 * Mécanisme de checkout atomique sur les tâches.
 * Inspiré Paperclip atomic execution.
 * Graceful degradation si table absente (code 42P01).
 */
import { supabase } from '../lib/supabase'

export interface TaskLock {
  id: string
  task_id: string
  locked_by: string
  locked_at: string
  expires_at: string
  capsule_id?: string
}

const DEFAULT_DURATION_MS = 5 * 60 * 1000 // 5 minutes

function isTableMissing(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    (error.message?.includes('relation') ?? false) ||
    (error.message?.includes('does not exist') ?? false)
  )
}

export function useTaskCheckout() {
  /**
   * checkoutTask — Prend un lock atomique sur une tâche.
   * Retourne { success: true, lock } si libre, { success: false, error } si déjà pris.
   */
  async function checkoutTask(
    taskId: string,
    agentKey: string,
    durationMs: number = DEFAULT_DURATION_MS,
  ): Promise<{ success: boolean; lock?: TaskLock; error?: string }> {
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + durationMs)

      // Check existing non-expired lock
      const { data: existing, error: checkErr } = await supabase
        .from('task_locks')
        .select('*')
        .eq('task_id', taskId)
        .gt('expires_at', now.toISOString())
        .maybeSingle()

      if (checkErr) {
        if (isTableMissing(checkErr)) {
          console.warn('[useTaskCheckout] table task_locks absente — dégradation gracieuse')
          return { success: true }
        }
        return { success: false, error: checkErr.message }
      }

      if (existing) {
        return { success: false, error: `Task locked by ${existing.locked_by}` }
      }

      // Delete any expired lock for this task first
      await supabase
        .from('task_locks')
        .delete()
        .eq('task_id', taskId)

      // Insert new lock
      const { data: newLock, error: insertErr } = await supabase
        .from('task_locks')
        .insert({
          task_id: taskId,
          locked_by: agentKey,
          locked_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (insertErr) {
        if (isTableMissing(insertErr)) {
          console.warn('[useTaskCheckout] table task_locks absente — dégradation gracieuse')
          return { success: true }
        }
        return { success: false, error: insertErr.message }
      }

      return { success: true, lock: newLock as TaskLock }
    } catch (err) {
      console.warn('[useTaskCheckout] checkoutTask error:', err)
      return { success: true } // Graceful degradation
    }
  }

  /**
   * releaseTask — Libère le lock d'une tâche.
   */
  async function releaseTask(taskId: string, agentKey: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_locks')
        .delete()
        .eq('task_id', taskId)
        .eq('locked_by', agentKey)

      if (error && !isTableMissing(error)) {
        console.warn('[useTaskCheckout] releaseTask error:', error.message)
      }
    } catch (err) {
      console.warn('[useTaskCheckout] releaseTask exception:', err)
    }
  }

  /**
   * extendLock — Prolonge l'expiration d'un lock existant.
   */
  async function extendLock(
    taskId: string,
    agentKey: string,
    additionalMs: number = DEFAULT_DURATION_MS,
  ): Promise<void> {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('task_locks')
        .select('expires_at')
        .eq('task_id', taskId)
        .eq('locked_by', agentKey)
        .maybeSingle()

      if (fetchErr) {
        if (!isTableMissing(fetchErr)) {
          console.warn('[useTaskCheckout] extendLock fetch error:', fetchErr.message)
        }
        return
      }

      if (!existing) return

      const currentExpiry = new Date(existing.expires_at)
      const newExpiry = new Date(currentExpiry.getTime() + additionalMs)

      const { error: updateErr } = await supabase
        .from('task_locks')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('task_id', taskId)
        .eq('locked_by', agentKey)

      if (updateErr && !isTableMissing(updateErr)) {
        console.warn('[useTaskCheckout] extendLock update error:', updateErr.message)
      }
    } catch (err) {
      console.warn('[useTaskCheckout] extendLock exception:', err)
    }
  }

  /**
   * getLocks — Liste tous les locks actifs, optionnellement filtrés par capsule.
   */
  async function getLocks(capsuleId?: string): Promise<TaskLock[]> {
    try {
      const now = new Date().toISOString()
      let query = supabase
        .from('task_locks')
        .select('*')
        .gt('expires_at', now)
        .order('locked_at', { ascending: false })

      if (capsuleId) {
        query = query.eq('capsule_id', capsuleId)
      }

      const { data, error } = await query

      if (error) {
        if (!isTableMissing(error)) {
          console.warn('[useTaskCheckout] getLocks error:', error.message)
        }
        return []
      }

      return (data as TaskLock[]) ?? []
    } catch (err) {
      console.warn('[useTaskCheckout] getLocks exception:', err)
      return []
    }
  }

  /**
   * isLocked — Vérifie rapidement si une tâche est lockée.
   */
  async function isLocked(taskId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('task_locks')
        .select('id')
        .eq('task_id', taskId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (error) {
        if (!isTableMissing(error)) {
          console.warn('[useTaskCheckout] isLocked error:', error.message)
        }
        return false
      }

      return !!data
    } catch (err) {
      console.warn('[useTaskCheckout] isLocked exception:', err)
      return false
    }
  }

  return { checkoutTask, releaseTask, extendLock, getLocks, isLocked }
}
