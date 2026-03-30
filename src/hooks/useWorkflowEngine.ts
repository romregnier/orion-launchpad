// TK-0237: [ARCH-007] Durable Workflow Engine
// Moteur d'exécution durable côté client — simulated exactly-once via Supabase checkpoints

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkflowStep, WorkflowExecution, ExecutionCheckpoint, RetryPolicy } from '../types/workflow'

export function useWorkflowEngine() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Crée une nouvelle exécution de workflow en DB
   * Retourne l'exécution créée ou null si Supabase est indisponible
   */
  const startExecution = useCallback(async (
    workflowId: string,
    inputData: unknown,
    capsuleId?: string
  ): Promise<WorkflowExecution | null> => {
    setLoading(true)
    setError(null)
    try {
      const initialCheckpoint: ExecutionCheckpoint = {
        stepId: '',
        attempt: 0,
        inputData,
        timestamp: new Date().toISOString()
      }

      const { data, error: insertError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowId,
          capsule_id: capsuleId || null,
          status: 'running',
          checkpoint: initialCheckpoint,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      const execution: WorkflowExecution = {
        id: data.id,
        workflowId: data.workflow_id,
        status: data.status,
        currentStepId: data.current_step_id || undefined,
        checkpoint: data.checkpoint as ExecutionCheckpoint,
        startedAt: data.started_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at || undefined,
        error: data.error || undefined
      }

      return execution
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start execution'
      setError(msg)
      console.warn('[useWorkflowEngine] startExecution failed (graceful degradation):', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Reprend une exécution depuis le dernier checkpoint persisté
   */
  const resumeExecution = useCallback(async (executionId: string): Promise<WorkflowExecution | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single()

      if (fetchError) throw fetchError
      if (!data) throw new Error(`Execution ${executionId} not found`)

      if (data.status === 'completed' || data.status === 'failed') {
        throw new Error(`Cannot resume execution in status: ${data.status}`)
      }

      // Mark as running
      const { error: updateError } = await supabase
        .from('workflow_executions')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', executionId)

      if (updateError) throw updateError

      return {
        id: data.id,
        workflowId: data.workflow_id,
        status: 'running',
        currentStepId: data.current_step_id || undefined,
        checkpoint: data.checkpoint as ExecutionCheckpoint,
        startedAt: data.started_at,
        updatedAt: new Date().toISOString(),
        completedAt: data.completed_at || undefined
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resume execution'
      setError(msg)
      console.warn('[useWorkflowEngine] resumeExecution failed (graceful degradation):', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Exécute un step avec retry + checkpoint persisté
   * Pattern: save checkpoint before execution, update after
   */
  const executeStep = useCallback(async (
    executionId: string,
    step: WorkflowStep,
    inputData: unknown
  ): Promise<{ success: boolean; outputData?: unknown; error?: string }> => {
    const retryPolicy: RetryPolicy = step.retryPolicy || { maxAttempts: 3, backoffMs: 1000, exponential: true }
    let lastError: string | undefined

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      // Save checkpoint before attempting step
      const checkpoint: ExecutionCheckpoint = {
        stepId: step.id,
        attempt,
        inputData,
        timestamp: new Date().toISOString()
      }

      try {
        // Persist checkpoint + log start
        await Promise.all([
          supabase.from('workflow_executions').update({
            current_step_id: step.id,
            checkpoint,
            updated_at: new Date().toISOString()
          }).eq('id', executionId),
          supabase.from('workflow_step_logs').insert({
            execution_id: executionId,
            step_id: step.id,
            attempt,
            status: 'running',
            input_data: inputData as Record<string, unknown>,
            started_at: new Date().toISOString()
          })
        ])
      } catch (err) {
        // Non-fatal: continue even if checkpoint persistence fails
        console.warn('[useWorkflowEngine] Checkpoint persistence failed:', err)
      }

      try {
        // Execute the step based on type
        const outputData = await _executeStepByType(step, inputData)

        // Persist success
        try {
          const successCheckpoint: ExecutionCheckpoint = {
            ...checkpoint,
            outputData,
            timestamp: new Date().toISOString()
          }
          await supabase.from('workflow_executions').update({
            checkpoint: successCheckpoint,
            updated_at: new Date().toISOString()
          }).eq('id', executionId)

          await supabase.from('workflow_step_logs').update({
            status: 'completed',
            output_data: outputData as Record<string, unknown>,
            completed_at: new Date().toISOString()
          }).eq('execution_id', executionId).eq('step_id', step.id).eq('attempt', attempt)
        } catch (err) {
          console.warn('[useWorkflowEngine] Success checkpoint persistence failed:', err)
        }

        return { success: true, outputData }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Step execution failed'

        // Log failure
        try {
          await supabase.from('workflow_step_logs').update({
            status: 'failed',
            error: lastError,
            completed_at: new Date().toISOString()
          }).eq('execution_id', executionId).eq('step_id', step.id).eq('attempt', attempt)
        } catch (logErr) {
          console.warn('[useWorkflowEngine] Failure log persistence failed:', logErr)
        }

        if (attempt < retryPolicy.maxAttempts) {
          const delay = retryPolicy.exponential
            ? retryPolicy.backoffMs * Math.pow(2, attempt - 1)
            : retryPolicy.backoffMs
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    return { success: false, error: lastError || 'Max retries exceeded' }
  }, [])

  /**
   * Met en pause une exécution en sauvegardant l'état
   */
  const pauseExecution = useCallback(async (executionId: string): Promise<void> => {
    try {
      await supabase.from('workflow_executions').update({
        status: 'paused',
        updated_at: new Date().toISOString()
      }).eq('id', executionId)
    } catch (err) {
      console.warn('[useWorkflowEngine] pauseExecution failed (graceful degradation):', err)
    }
  }, [])

  /**
   * Liste les exécutions passées pour un workflow
   */
  const getExecutionHistory = useCallback(async (workflowId: string): Promise<WorkflowExecution[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      const result: WorkflowExecution[] = (data || []).map(row => ({
        id: row.id,
        workflowId: row.workflow_id,
        status: row.status,
        currentStepId: row.current_step_id || undefined,
        checkpoint: row.checkpoint as ExecutionCheckpoint,
        startedAt: row.started_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at || undefined,
        error: row.error || undefined
      }))

      setExecutions(result)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch execution history'
      setError(msg)
      console.warn('[useWorkflowEngine] getExecutionHistory failed (graceful degradation):', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    executions,
    loading,
    error,
    startExecution,
    resumeExecution,
    executeStep,
    pauseExecution,
    getExecutionHistory
  }
}

/**
 * Dispatche l'exécution d'un step selon son type
 * En Phase 1, les types agent/condition sont simulés — à brancher sur les vrais exécuteurs plus tard
 */
async function _executeStepByType(step: WorkflowStep, inputData: unknown): Promise<unknown> {
  switch (step.type) {
    case 'action': {
      // Execute configured action (HTTP call, Supabase insert, etc.)
      const config = step.config as { url?: string; method?: string; body?: unknown }
      if (config.url) {
        const response = await fetch(config.url, {
          method: config.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: config.body ? JSON.stringify(config.body) : JSON.stringify(inputData),
          signal: AbortSignal.timeout(step.timeout || 30000)
        })
        if (!response.ok) throw new Error(`Action HTTP ${response.status}`)
        return await response.json().catch(() => null)
      }
      return { executed: true, stepId: step.id }
    }

    case 'condition': {
      const config = step.config as { field?: string; operator?: string; value?: unknown }
      const data = inputData as Record<string, unknown>
      if (config.field && config.operator) {
        const fieldValue = data[config.field]
        switch (config.operator) {
          case 'eq': return { result: fieldValue === config.value, branch: fieldValue === config.value ? 'true' : 'false' }
          case 'neq': return { result: fieldValue !== config.value, branch: fieldValue !== config.value ? 'true' : 'false' }
          case 'gt': return { result: Number(fieldValue) > Number(config.value), branch: Number(fieldValue) > Number(config.value) ? 'true' : 'false' }
          case 'lt': return { result: Number(fieldValue) < Number(config.value), branch: Number(fieldValue) < Number(config.value) ? 'true' : 'false' }
        }
      }
      return { result: true, branch: 'true' }
    }

    case 'delay': {
      const config = step.config as { delayMs?: number }
      const delay = config.delayMs || 1000
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 30000))) // Max 30s in browser
      return { delayed: true, delayMs: delay }
    }

    case 'agent': {
      // Placeholder: in production this would call the agent execution engine
      console.log(`[WorkflowEngine] Agent step '${step.name}' — integration pending`)
      return { agentStep: true, stepId: step.id, input: inputData }
    }

    case 'trigger':
    case 'parallel':
    default:
      return { passthrough: true, stepId: step.id, input: inputData }
  }
}
