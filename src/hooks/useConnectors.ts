// TK-0236: [ARCH-009] BaseConnector SDK — useConnectors hook
// Hook React pour utiliser le registre de connecteurs depuis les composants

import { useState, useCallback, useEffect } from 'react'
import type { BaseConnector, ConnectorConfig, ConnectorResult } from '../types/connector'
import { connectorRegistry } from '../connectors/registry'
import { HttpConnector } from '../connectors/HttpConnector'

export interface ConnectorState {
  connectors: BaseConnector[]
  loading: boolean
  error: string | null
}

export interface ExecuteState {
  loading: boolean
  error: string | null
  result: ConnectorResult | null
}

export function useConnectors() {
  const [connectors, setConnectors] = useState<BaseConnector[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executeStates, setExecuteStates] = useState<Record<string, ExecuteState>>({})

  // Sync connectors from registry on mount
  useEffect(() => {
    setConnectors(connectorRegistry.list())
  }, [])

  /**
   * Enregistre un nouveau connecteur HTTP depuis une config
   */
  const registerConnector = useCallback(async (options: {
    id: string
    name: string
    description?: string
    version?: string
    knowledgeSpaceId?: string
    config: ConnectorConfig
  }): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const connector = new HttpConnector(options)

      // Validate before registering
      const validation = await connector.validate()
      if (!validation.valid) {
        throw new Error(`Invalid connector config: ${validation.issues.join(', ')}`)
      }

      connectorRegistry.register(connector)
      setConnectors(connectorRegistry.list())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to register connector'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Exécute un outil sur un connecteur avec loading/error state
   */
  const executeConnector = useCallback(async (
    id: string,
    tool: string,
    params: Record<string, unknown> = {}
  ): Promise<ConnectorResult> => {
    const connector = connectorRegistry.get(id)
    if (!connector) {
      const result: ConnectorResult = { success: false, error: `Connector '${id}' not found` }
      return result
    }

    setExecuteStates(prev => ({
      ...prev,
      [id]: { loading: true, error: null, result: null }
    }))

    try {
      const result = await connector.execute(tool, params)
      setExecuteStates(prev => ({
        ...prev,
        [id]: { loading: false, error: result.success ? null : (result.error || 'Execution failed'), result }
      }))
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution error'
      const result: ConnectorResult = { success: false, error: msg }
      setExecuteStates(prev => ({
        ...prev,
        [id]: { loading: false, error: msg, result }
      }))
      return result
    }
  }, [])

  /**
   * Supprime un connecteur du registre
   */
  const removeConnector = useCallback((id: string): void => {
    connectorRegistry.unregister(id)
    setConnectors(connectorRegistry.list())
    setExecuteStates(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  /**
   * Retourne l'état d'exécution pour un connecteur spécifique
   */
  const getExecuteState = useCallback((id: string): ExecuteState => {
    return executeStates[id] || { loading: false, error: null, result: null }
  }, [executeStates])

  return {
    connectors,
    loading,
    error,
    registerConnector,
    executeConnector,
    removeConnector,
    getExecuteState
  }
}
