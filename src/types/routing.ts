// TK-0239: [ARCH-011] Smart LLM Routing — Types

export type TaskType = 'code' | 'analysis' | 'creative' | 'qa' | 'data' | 'chat' | 'search'
export type ModelTier = 'fast' | 'balanced' | 'powerful'

export interface RoutingRule {
  taskType: TaskType
  preferredTier: ModelTier
  maxCostUsd?: number
  minSuccessRate?: number
  fallbackModel?: string
}

export interface RouteDecision {
  model: string
  tier: ModelTier
  estimatedCost: number
  reasoning: string
  confidence: number  // 0–1
}

export interface RoutingConfig {
  rules: RoutingRule[]
  defaultModel: string
  enableLearning: boolean
}

export interface RoutingStats {
  totalRouted: number
  savedCost: number
  avgConfidence: number
}

// Model mapping by tier
export const TIER_MODELS: Record<ModelTier, { model: string; costPer1kTokens: number }> = {
  fast:     { model: 'claude-haiku-4-5',  costPer1kTokens: 0.001 },
  balanced: { model: 'claude-sonnet-4-6', costPer1kTokens: 0.01  },
  powerful: { model: 'claude-opus-4-5',   costPer1kTokens: 0.075 },
}

// Default routing rules
export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  { taskType: 'code',     preferredTier: 'powerful'  },
  { taskType: 'analysis', preferredTier: 'balanced'  },
  { taskType: 'creative', preferredTier: 'powerful'  },
  { taskType: 'qa',       preferredTier: 'fast'      },
  { taskType: 'data',     preferredTier: 'balanced'  },
  { taskType: 'chat',     preferredTier: 'balanced'  },
  { taskType: 'search',   preferredTier: 'fast'      },
]
