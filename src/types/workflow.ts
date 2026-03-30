// TK-0237: [ARCH-007] Durable Workflow Engine — Types
// TK-0240: [ARCH-012] Swarm Topologies — Extended Types
// Étend les types de workflow pour le moteur d'exécution durable

export interface WorkflowStep {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'agent' | 'delay' | 'parallel'
  name: string
  config: Record<string, unknown>
  retryPolicy?: RetryPolicy
  timeout?: number
}

export interface RetryPolicy {
  maxAttempts: number
  backoffMs: number
  exponential: boolean
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  currentStepId?: string
  checkpoint: ExecutionCheckpoint
  startedAt: string
  updatedAt: string
  completedAt?: string
  error?: string
}

export interface ExecutionCheckpoint {
  stepId: string
  attempt: number
  inputData: unknown
  outputData?: unknown
  timestamp: string
}

// ── TK-0240: Swarm Topologies ──────────────────────────────────────────────

export type SwarmTopology =
  | 'sequential'    // A → B → C
  | 'parallel'      // A → [B, C, D] (fan-out)
  | 'conditional'   // A → if/else → B ou C
  | 'fan_out'       // 1 → N (broadcast)
  | 'fan_in'        // N → 1 (agrégation)
  | 'recurrent'     // loop avec condition de sortie

export interface TopologyConfig {
  type: SwarmTopology
  maxParallel?: number        // pour parallel/fan-out
  condition?: string          // expression pour conditional
  loopCondition?: string      // pour recurrent
  maxIterations?: number      // sécurité pour recurrent
  aggregationMode?: 'all' | 'first' | 'vote'  // pour fan-in
}
