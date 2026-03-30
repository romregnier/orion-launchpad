/**
 * OrionHubPage — TK-0228 [ARCH-004]
 * Page de monitoring de l'Orion Hub distribué
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrionHub } from '../hooks/useOrionHub'
import type { HubNode, HubConfig } from '../types/hub'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<HubNode['status'], { color: string; bg: string; label: string; dot: string }> = {
  online: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'En ligne', dot: '#10B981' },
  degraded: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Dégradé', dot: '#F59E0B' },
  offline: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Hors ligne', dot: '#EF4444' },
}

const TYPE_CONFIG: Record<HubNode['type'], { emoji: string; label: string }> = {
  orchestrator: { emoji: '🎯', label: 'Orchestrateur' },
  executor: { emoji: '⚡', label: 'Exécuteur' },
  gateway: { emoji: '🌐', label: 'Gateway' },
  monitor: { emoji: '📊', label: 'Monitor' },
}

const ROUTING_OPTIONS: { value: HubConfig['routing_strategy']; label: string }[] = [
  { value: 'round_robin', label: '🔄 Round Robin' },
  { value: 'least_loaded', label: '⚖️ Least Loaded' },
  { value: 'geographic', label: '🗺️ Géographique' },
]

// ── Latency bar ───────────────────────────────────────────────────────────────
function LatencyBar({ ms, max = 200 }: { ms: number; max?: number }) {
  const pct = Math.min(100, (ms / max) * 100)
  const color = ms < 30 ? '#10B981' : ms < 80 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
          style={{ height: '100%', background: color, borderRadius: 2 }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 40, textAlign: 'right', fontFamily: "'Poppins', sans-serif" }}>
        {ms === 9999 ? '—' : `${ms}ms`}
      </span>
    </div>
  )
}

// ── Node Card ─────────────────────────────────────────────────────────────────
function NodeCard({ node, onFailover }: { node: HubNode; onFailover: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const status = STATUS_CONFIG[node.status]
  const type = TYPE_CONFIG[node.type]

  const handleFailover = () => {
    if (confirming) {
      onFailover(node.id)
      setConfirming(false)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '16px 18px',
        borderRadius: 14,
        background: status.bg,
        border: `1px solid ${status.color}30`,
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {/* Status dot */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: status.dot }} />
              {node.status === 'online' && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: status.dot, opacity: 0.4,
                  animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                }} />
              )}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
              {node.name}
            </span>
          </div>

          {/* Region */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif" }}>
            📍 {node.region}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 999,
            background: status.bg, color: status.color, fontWeight: 700,
            border: `1px solid ${status.color}40`, fontFamily: "'Poppins', sans-serif",
          }}>
            {status.label}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 999,
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
            fontWeight: 700, fontFamily: "'Poppins', sans-serif",
          }}>
            {type.emoji} {type.label}
          </span>
        </div>
      </div>

      {/* Latency */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Poppins', sans-serif" }}>
          Latence
        </div>
        <LatencyBar ms={node.latency_ms} />
      </div>

      {/* Capabilities */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {node.capabilities.map(cap => (
          <span key={cap} style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: "'Poppins', sans-serif",
          }}>
            {cap}
          </span>
        ))}
      </div>

      {/* Last seen + Failover */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Poppins', sans-serif" }}>
          Vu: {new Date(node.last_seen).toLocaleTimeString('fr-FR')}
        </span>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleFailover}
          disabled={node.status === 'offline'}
          style={{
            padding: '5px 12px', borderRadius: 8,
            background: confirming ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
            border: confirming ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: confirming ? '#EF4444' : node.status === 'offline' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
            cursor: node.status === 'offline' ? 'not-allowed' : 'pointer',
            fontSize: 11, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
            transition: 'all 0.15s ease',
          }}
        >
          {confirming ? '⚠️ Confirmer?' : '⚡ Failover'}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── OrionHubPage ──────────────────────────────────────────────────────────────
export function OrionHubPage() {
  const { config, failoverLog, triggerFailover, setRoutingStrategy } = useOrionHub()
  const onlineCount = config.nodes.filter(n => n.status === 'online').length
  const degradedCount = config.nodes.filter(n => n.status === 'degraded').length
  const offlineCount = config.nodes.filter(n => n.status === 'offline').length

  return (
    <div style={{
      padding: '24px 24px 48px',
      maxWidth: 900, margin: '0 auto',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            🌐 Orion Hub
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 999,
              background: 'rgba(14,165,233,0.15)', color: '#0EA5E9',
              border: '1px solid rgba(14,165,233,0.3)',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>
              Système distribué
            </span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {config.name} · Latence rafraîchie toutes les 5s
          </p>
        </div>

        {/* Routing selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Routing
          </span>
          <select
            value={config.routing_strategy}
            onChange={e => setRoutingStrategy(e.target.value as HubConfig['routing_strategy'])}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 12, cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {ROUTING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'En ligne', value: onlineCount, color: '#10B981' },
          { label: 'Dégradés', value: degradedCount, color: '#F59E0B' },
          { label: 'Hors ligne', value: offlineCount, color: '#EF4444' },
          { label: 'Nœuds total', value: config.nodes.length, color: 'rgba(255,255,255,0.6)' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            minWidth: 100,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}

        {/* Failover status */}
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: config.failover_enabled ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${config.failover_enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
          minWidth: 120,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: config.failover_enabled ? '#10B981' : '#EF4444' }}>
            {config.failover_enabled ? '✓ Activé' : '✗ Désactivé'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
            Auto-Failover
          </div>
        </div>
      </div>

      {/* Node grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 14,
        marginBottom: 28,
      }}>
        <AnimatePresence>
          {config.nodes.map(node => (
            <NodeCard key={node.id} node={node} onFailover={triggerFailover} />
          ))}
        </AnimatePresence>
      </div>

      {/* Failover log */}
      {failoverLog.length > 0 && (
        <div style={{
          padding: '16px 18px', borderRadius: 12,
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.15)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(239,68,68,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            ⚡ Journal des Failovers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {failoverLog.map((log, i) => {
              const node = config.nodes.find(n => n.id === log.nodeId)
              return (
                <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif" }}>
                  {new Date(log.ts).toLocaleTimeString('fr-FR')} — Failover déclenché sur <strong style={{ color: '#EF4444' }}>{node?.name ?? log.nodeId}</strong>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
