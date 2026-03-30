// TK-0237: [ARCH-007] Durable Workflow Engine — Types
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
