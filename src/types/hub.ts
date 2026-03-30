/**
 * hub.ts — TK-0228 [ARCH-004]
 * Types pour Orion Hub — backend orchestration
 */

export interface HubNode {
  id: string
  name: string
  type: 'orchestrator' | 'executor' | 'gateway' | 'monitor'
  status: 'online' | 'offline' | 'degraded'
  region: string
  latency_ms: number
  last_seen: string
  capabilities: string[]
}

export interface HubConfig {
  hub_id: string
  name: string
  nodes: HubNode[]
  routing_strategy: 'round_robin' | 'least_loaded' | 'geographic'
  failover_enabled: boolean
}
