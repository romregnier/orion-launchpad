/**
 * useOrionHub — TK-0228 [ARCH-004]
 * Hook de simulation pour l'Orion Hub (pas de DB — tout client-side)
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import type { HubConfig, HubNode } from '../types/hub'

// ── Mock initial data ─────────────────────────────────────────────────────────

const INITIAL_NODES: HubNode[] = [
  {
    id: 'node-eu-west',
    name: 'Orion EU-West',
    type: 'orchestrator',
    status: 'online',
    region: 'EU-West (Paris)',
    latency_ms: 12,
    last_seen: new Date().toISOString(),
    capabilities: ['routing', 'scheduling', 'failover', 'audit'],
  },
  {
    id: 'node-eu-central',
    name: 'Orion EU-Central',
    type: 'executor',
    status: 'online',
    region: 'EU-Central (Frankfurt)',
    latency_ms: 18,
    last_seen: new Date().toISOString(),
    capabilities: ['execution', 'caching', 'batch-processing'],
  },
  {
    id: 'node-apac',
    name: 'Orion APAC',
    type: 'gateway',
    status: 'degraded',
    region: 'APAC (Singapore)',
    latency_ms: 145,
    last_seen: new Date().toISOString(),
    capabilities: ['gateway', 'load-balancing', 'cdn'],
  },
  {
    id: 'node-monitor',
    name: 'Orion Monitor',
    type: 'monitor',
    status: 'online',
    region: 'EU-West (Paris)',
    latency_ms: 4,
    last_seen: new Date().toISOString(),
    capabilities: ['monitoring', 'alerting', 'metrics', 'tracing'],
  },
]

const INITIAL_CONFIG: HubConfig = {
  hub_id: 'hub-orion-prod',
  name: 'Orion Hub (Production)',
  nodes: INITIAL_NODES,
  routing_strategy: 'least_loaded',
  failover_enabled: true,
}

// ── Jitter helpers ────────────────────────────────────────────────────────────

function addJitter(base: number, spread: number): number {
  return Math.max(1, Math.round(base + (Math.random() - 0.5) * spread))
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOrionHub() {
  const [config, setConfig] = useState<HubConfig>(INITIAL_CONFIG)
  const [failoverLog, setFailoverLog] = useState<{ nodeId: string; ts: string }[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Refresh latencies every 5s with jitter */
  const refreshLatencies = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => ({
        ...node,
        latency_ms: addJitter(node.latency_ms, node.region.includes('APAC') ? 60 : 10),
        last_seen: new Date().toISOString(),
      })),
    }))
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(refreshLatencies, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refreshLatencies])

  const getHubStatus = useCallback((): HubConfig => config, [config])

  const getNodeHealth = useCallback((nodeId: string): number => {
    const node = config.nodes.find(n => n.id === nodeId)
    if (!node) return 0
    return addJitter(node.latency_ms, 20)
  }, [config])

  const triggerFailover = useCallback((nodeId: string) => {
    setConfig(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, status: 'offline', latency_ms: 9999 }
        }
        // Promote first online node to orchestrator if failing one was orchestrator
        const failedNode = prev.nodes.find(n => n.id === nodeId)
        if (failedNode?.type === 'orchestrator' && node.type === 'executor' && node.status === 'online') {
          return { ...node, capabilities: [...new Set([...node.capabilities, 'routing', 'failover'])] }
        }
        return node
      }),
    }))
    setFailoverLog(prev => [{ nodeId, ts: new Date().toISOString() }, ...prev.slice(0, 9)])

    // Simulate recovery after 8s
    setTimeout(() => {
      setConfig(prev => ({
        ...prev,
        nodes: prev.nodes.map(node =>
          node.id === nodeId
            ? { ...node, status: 'degraded', latency_ms: addJitter(50, 30) }
            : node
        ),
      }))
    }, 8000)
  }, [])

  const setRoutingStrategy = useCallback((strategy: HubConfig['routing_strategy']) => {
    setConfig(prev => ({ ...prev, routing_strategy: strategy }))
  }, [])

  return {
    config,
    failoverLog,
    getHubStatus,
    getNodeHealth,
    triggerFailover,
    setRoutingStrategy,
  }
}
