// TK-0238: [ARCH-008] Learning Loop
// Hook pour observer passivement les patterns d'efficacité (Phase 1: observation seulement)

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface LearningPattern {
  id: string
  capsule_id?: string
  pattern_type: 'routing' | 'model_selection' | 'prompt' | 'workflow'
  pattern_key: string
  success_rate: number
  avg_duration_ms: number
  avg_cost_cents: number
  sample_count: number
  last_observed_at: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface RecordOutcomeParams {
  capsuleId?: string
  patternType: 'routing' | 'model_selection' | 'prompt' | 'workflow'
  patternKey: string
  success: boolean
  durationMs: number
  costCents?: number
  metadata?: Record<string, unknown>
}

export interface DashboardStats {
  topPatterns: LearningPattern[]
  topAgents: Array<{ agent: string; success_rate: number; sample_count: number }>
  avgCostByTaskType: Array<{ task_type: string; avg_cost: number }>
}

export function useLearningLoop() {
  const [patterns, setPatterns] = useState<LearningPattern[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Insère/upsert un pattern après chaque tâche agent
   * Graceful degradation: logs warning si Supabase indisponible
   */
  const recordOutcome = useCallback(async (params: RecordOutcomeParams): Promise<void> => {
    try {
      const { capsuleId, patternType, patternKey, success, durationMs, costCents = 0, metadata = {} } = params

      // Fetch existing pattern if any
      const { data: existing } = await supabase
        .from('learning_patterns')
        .select('*')
        .eq('pattern_type', patternType)
        .eq('pattern_key', patternKey)
        .maybeSingle()

      if (existing) {
        // Rolling average update
        const newCount = existing.sample_count + 1
        const newSuccessRate = (existing.success_rate * existing.sample_count + (success ? 1 : 0)) / newCount
        const newAvgDuration = Math.round((existing.avg_duration_ms * existing.sample_count + durationMs) / newCount)
        const newAvgCost = Math.round((existing.avg_cost_cents * existing.sample_count + costCents) / newCount)

        await supabase
          .from('learning_patterns')
          .update({
            success_rate: newSuccessRate,
            avg_duration_ms: newAvgDuration,
            avg_cost_cents: newAvgCost,
            sample_count: newCount,
            last_observed_at: new Date().toISOString(),
            metadata: { ...existing.metadata, ...metadata },
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Insert new pattern
        await supabase.from('learning_patterns').insert({
          capsule_id: capsuleId || null,
          pattern_type: patternType,
          pattern_key: patternKey,
          success_rate: success ? 1 : 0,
          avg_duration_ms: durationMs,
          avg_cost_cents: costCents,
          sample_count: 1,
          last_observed_at: new Date().toISOString(),
          metadata
        })
      }
    } catch (err) {
      // Graceful degradation: don't throw, just log
      console.warn('[useLearningLoop] recordOutcome failed (graceful degradation):', err)
    }
  }, [])

  /**
   * Récupère les patterns actifs, optionnellement filtrés par type
   */
  const getPatterns = useCallback(async (type?: LearningPattern['pattern_type']): Promise<LearningPattern[]> => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('learning_patterns')
        .select('*')
        .order('success_rate', { ascending: false })

      if (type) {
        query = query.eq('pattern_type', type)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const result = (data as LearningPattern[]) || []
      setPatterns(result)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.warn('[useLearningLoop] getPatterns failed (graceful degradation):', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Retourne l'agent avec le meilleur success_rate pour un type de tâche donné
   */
  const getBestAgent = useCallback(async (taskType: string): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('learning_patterns')
        .select('pattern_key, success_rate, sample_count')
        .eq('pattern_type', 'routing')
        .ilike('pattern_key', `agent:%:task_type:${taskType}`)
        .order('success_rate', { ascending: false })
        .gte('sample_count', 3) // Minimum samples for reliability
        .limit(1)
        .maybeSingle()

      if (!data) return null

      // Extract agent name from pattern_key (format: 'agent:<name>:task_type:<type>')
      const parts = (data.pattern_key as string).split(':')
      return parts[1] || null
    } catch (err) {
      console.warn('[useLearningLoop] getBestAgent failed (graceful degradation):', err)
      return null
    }
  }, [])

  /**
   * Agrégation pour le dashboard: top patterns, agents les + efficaces, coûts
   */
  const getDashboardStats = useCallback(async (): Promise<DashboardStats> => {
    try {
      const { data: allPatterns } = await supabase
        .from('learning_patterns')
        .select('*')
        .order('success_rate', { ascending: false })

      const patternList = (allPatterns as LearningPattern[]) || []

      // Top 5 patterns by success_rate
      const topPatterns = patternList.slice(0, 5)

      // Top 3 agents (routing patterns with agent: prefix)
      const agentPatterns = patternList
        .filter(p => p.pattern_type === 'routing' && p.pattern_key.startsWith('agent:'))
        .reduce<Map<string, { success_rate: number; sample_count: number }>>(
          (acc, p) => {
            const agent = p.pattern_key.split(':')[1] || 'unknown'
            const existing = acc.get(agent)
            if (!existing || p.success_rate > existing.success_rate) {
              acc.set(agent, { success_rate: p.success_rate, sample_count: p.sample_count })
            }
            return acc
          },
          new Map()
        )

      const topAgents = Array.from(agentPatterns.entries())
        .map(([agent, stats]) => ({ agent, ...stats }))
        .sort((a, b) => b.success_rate - a.success_rate)
        .slice(0, 3)

      // Avg cost by task type
      const costByType = patternList.reduce<Map<string, number[]>>((acc, p) => {
        const parts = p.pattern_key.split(':')
        const taskType = parts.includes('task_type') ? parts[parts.indexOf('task_type') + 1] : p.pattern_type
        const existing = acc.get(taskType) || []
        acc.set(taskType, [...existing, p.avg_cost_cents])
        return acc
      }, new Map())

      const avgCostByTaskType = Array.from(costByType.entries())
        .map(([task_type, costs]) => ({
          task_type,
          avg_cost: costs.reduce((a, b) => a + b, 0) / costs.length
        }))
        .sort((a, b) => b.avg_cost - a.avg_cost)

      return { topPatterns, topAgents, avgCostByTaskType }
    } catch (err) {
      console.warn('[useLearningLoop] getDashboardStats failed (graceful degradation):', err)
      return { topPatterns: [], topAgents: [], avgCostByTaskType: [] }
    }
  }, [])

  return {
    patterns,
    loading,
    error,
    recordOutcome,
    getPatterns,
    getBestAgent,
    getDashboardStats
  }
}
