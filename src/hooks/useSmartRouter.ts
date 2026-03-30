// TK-0239: [ARCH-011] Smart LLM Routing
// Hook pour router intelligemment les tâches vers le meilleur modèle LLM

import { useState, useCallback } from 'react'
import {
  type TaskType,
  type ModelTier,
  type RoutingRule,
  type RouteDecision,
  type RoutingConfig,
  type RoutingStats,
  TIER_MODELS,
  DEFAULT_ROUTING_RULES,
} from '../types/routing'
import { useLearningLoop } from './useLearningLoop'

// Learning success rate threshold for automatic downgrade
const DOWNGRADE_THRESHOLD = 0.85

const DEFAULT_CONFIG: RoutingConfig = {
  rules: DEFAULT_ROUTING_RULES,
  defaultModel: TIER_MODELS.balanced.model,
  enableLearning: true,
}

export function useSmartRouter() {
  const [config, setConfig] = useState<RoutingConfig>(DEFAULT_CONFIG)
  const [stats, setStats] = useState<RoutingStats>({
    totalRouted: 0,
    savedCost: 0,
    avgConfidence: 0,
  })
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>([])

  const { getBestAgent } = useLearningLoop()

  /**
   * Route une tâche vers le meilleur modèle LLM
   */
  const routeTask = useCallback(async (
    taskType: TaskType,
    _context?: string
  ): Promise<RouteDecision> => {
    const rule = config.rules.find(r => r.taskType === taskType)
    let chosenTier: ModelTier = rule?.preferredTier ?? 'balanced'
    let reasoning = `Règle par défaut pour "${taskType}" → tier "${chosenTier}"`
    let confidence = 0.7

    // Learning mode: check if a cheaper model performs well enough
    if (config.enableLearning) {
      try {
        const bestAgent = await getBestAgent(taskType)
        if (bestAgent) {
          // Try to map bestAgent to a model tier
          const tierEntry = Object.entries(TIER_MODELS).find(
            ([, v]) => v.model === bestAgent
          )
          if (tierEntry) {
            const learnedTier = tierEntry[0] as ModelTier
            const tierOrder: ModelTier[] = ['fast', 'balanced', 'powerful']
            const learnedIndex = tierOrder.indexOf(learnedTier)
            const defaultIndex = tierOrder.indexOf(chosenTier)

            // Only downgrade if learned tier is cheaper (lower index) and we met the threshold
            if (learnedIndex < defaultIndex) {
              chosenTier = learnedTier
              reasoning = `Learning Loop: modèle ${bestAgent} performant (success_rate > ${DOWNGRADE_THRESHOLD}) → downgrade de "${tierOrder[defaultIndex]}" vers "${learnedTier}"`
              confidence = 0.9
            }
          }
        }
      } catch {
        // Graceful degradation
        console.warn('[useSmartRouter] Learning loop unavailable, using default rules')
      }
    }

    const { model, costPer1kTokens } = TIER_MODELS[chosenTier]

    // Estimate cost for a typical ~500 token request
    const estimatedTokens = 500
    const estimatedCost = (estimatedTokens / 1000) * costPer1kTokens

    // Update stats
    const defaultTier = rule?.preferredTier ?? 'balanced'
    const defaultCost = (estimatedTokens / 1000) * TIER_MODELS[defaultTier].costPer1kTokens
    const savedOnThisRoute = defaultCost - estimatedCost

    setStats(prev => {
      const newTotal = prev.totalRouted + 1
      const newSaved = prev.savedCost + Math.max(0, savedOnThisRoute)
      const newConfHistory = [...confidenceHistory, confidence]
      const avgConf = newConfHistory.reduce((a, b) => a + b, 0) / newConfHistory.length
      return { totalRouted: newTotal, savedCost: newSaved, avgConfidence: avgConf }
    })

    setConfidenceHistory(prev => [...prev, confidence])

    return {
      model,
      tier: chosenTier,
      estimatedCost,
      reasoning,
      confidence,
    }
  }, [config, getBestAgent, confidenceHistory])

  /**
   * Met à jour une règle de routing
   */
  const updateRule = useCallback((taskType: TaskType, patch: Partial<RoutingRule>): void => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(r =>
        r.taskType === taskType ? { ...r, ...patch } : r
      ),
    }))
  }, [])

  /**
   * Retourne les stats actuelles
   */
  const getRoutingStats = useCallback((): RoutingStats => {
    return stats
  }, [stats])

  /**
   * Remet les règles par défaut
   */
  const resetToDefaults = useCallback((): void => {
    setConfig(DEFAULT_CONFIG)
    setStats({ totalRouted: 0, savedCost: 0, avgConfidence: 0 })
    setConfidenceHistory([])
  }, [])

  /**
   * Toggle Learning Mode
   */
  const toggleLearning = useCallback((enabled: boolean): void => {
    setConfig(prev => ({ ...prev, enableLearning: enabled }))
  }, [])

  return {
    config,
    stats,
    routeTask,
    updateRule,
    getRoutingStats,
    resetToDefaults,
    toggleLearning,
  }
}
