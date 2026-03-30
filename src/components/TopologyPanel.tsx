// TK-0240: [ARCH-012] Swarm Topologies
// Composant: panneau de configuration d'une topologie de nœud

import { useState, useEffect } from 'react'
import type { SwarmTopology, TopologyConfig } from '../types/workflow'

interface TopologyPanelProps {
  topology: SwarmTopology
  config?: TopologyConfig
  onChange: (config: TopologyConfig) => void
  onClose?: () => void
}

const TOPOLOGY_META: Record<SwarmTopology, { icon: string; label: string; description: string; color: string }> = {
  sequential:  {
    icon: '→', label: 'Séquentiel', color: 'var(--info, #3b82f6)',
    description: 'Les agents s\'exécutent les uns après les autres (A → B → C)',
  },
  parallel:    {
    icon: '⇉', label: 'Parallèle', color: 'var(--success, #22c55e)',
    description: 'Les agents s\'exécutent en parallèle depuis une source commune',
  },
  conditional: {
    icon: '⋔', label: 'Conditionnel', color: 'var(--warning, #f59e0b)',
    description: 'Routage conditionnel selon une expression logique',
  },
  fan_out:     {
    icon: '⊳', label: 'Fan-out', color: 'var(--purple, #8b5cf6)',
    description: 'Broadcast d\'un message vers N agents en simultané',
  },
  fan_in:      {
    icon: '⊲', label: 'Fan-in', color: 'var(--purple, #8b5cf6)',
    description: 'Agrège les résultats de N agents vers un seul',
  },
  recurrent:   {
    icon: '↺', label: 'Récurrent', color: 'var(--warning, #f59e0b)',
    description: 'Boucle avec condition de sortie et protection contre les boucles infinies',
  },
}

export function TopologyPanel({ topology, config, onChange, onClose }: TopologyPanelProps) {
  const meta = TOPOLOGY_META[topology]
  const [localConfig, setLocalConfig] = useState<TopologyConfig>(
    config || { type: topology }
  )

  useEffect(() => {
    setLocalConfig(config || { type: topology })
  }, [topology, config])

  const update = (patch: Partial<TopologyConfig>) => {
    const next = { ...localConfig, ...patch }
    setLocalConfig(next)
    onChange(next)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, padding: '6px 10px',
    color: 'var(--text-primary)', fontSize: 12, outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)',
    display: 'block', marginBottom: 5,
  }

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: 'var(--bg-surface)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      padding: 16, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{meta.icon}</span>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: meta.color }}>
              {meta.label}
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {meta.description}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: 16, padding: 4, flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{
        height: 1, background: 'rgba(255,255,255,0.08)',
        margin: '0 -16px',
      }} />

      {/* Config fields — varies by topology */}

      {/* parallel / fan_out: maxParallel */}
      {(topology === 'parallel' || topology === 'fan_out') && (
        <div>
          <label style={labelStyle}>Agents max en parallèle</label>
          <input
            type="number"
            min={1} max={32}
            value={localConfig.maxParallel ?? 3}
            onChange={e => update({ maxParallel: parseInt(e.target.value) || 3 })}
            style={inputStyle}
          />
          <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
            Limite la concurrence pour éviter la surcharge
          </p>
        </div>
      )}

      {/* conditional: condition expression */}
      {topology === 'conditional' && (
        <div>
          <label style={labelStyle}>Expression conditionnelle</label>
          <input
            type="text"
            placeholder="ex: result.score > 0.8"
            value={localConfig.condition ?? ''}
            onChange={e => update({ condition: e.target.value })}
            style={inputStyle}
          />
          <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
            Expression booléenne évaluée sur le résultat précédent
          </p>
        </div>
      )}

      {/* fan_in: aggregation mode */}
      {topology === 'fan_in' && (
        <div>
          <label style={labelStyle}>Mode d'agrégation</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'first', 'vote'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => update({ aggregationMode: mode })}
                style={{
                  flex: 1, padding: '6px 0',
                  background: localConfig.aggregationMode === mode
                    ? 'rgba(139,92,246,0.2)'
                    : 'rgba(255,255,255,0.04)',
                  color: localConfig.aggregationMode === mode
                    ? 'var(--purple, #8b5cf6)'
                    : 'var(--text-muted)',
                  border: `1px solid ${localConfig.aggregationMode === mode
                    ? 'rgba(139,92,246,0.4)'
                    : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 6, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'all' ? '🔀 Tous' : mode === 'first' ? '🥇 Premier' : '🗳 Vote'}
              </button>
            ))}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
            {localConfig.aggregationMode === 'all'
              ? 'Attend tous les résultats avant de continuer'
              : localConfig.aggregationMode === 'first'
              ? 'Continue avec le premier résultat reçu'
              : 'Vote majoritaire parmi les résultats'}
          </p>
        </div>
      )}

      {/* recurrent: loopCondition + maxIterations */}
      {topology === 'recurrent' && (
        <>
          <div>
            <label style={labelStyle}>Condition de sortie</label>
            <input
              type="text"
              placeholder="ex: iteration >= 10 || result.done"
              value={localConfig.loopCondition ?? ''}
              onChange={e => update({ loopCondition: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Itérations maximum (sécurité)</label>
            <input
              type="number"
              min={1} max={1000}
              value={localConfig.maxIterations ?? 10}
              onChange={e => update({ maxIterations: parseInt(e.target.value) || 10 })}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
              Protection contre les boucles infinies
            </p>
          </div>
        </>
      )}

      {/* sequential: no extra config */}
      {topology === 'sequential' && (
        <div style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            La topologie séquentielle ne nécessite pas de configuration supplémentaire.
            Les nœuds s'exécutent dans l'ordre des connexions.
          </p>
        </div>
      )}

      {/* JSON preview */}
      <div>
        <label style={labelStyle}>Config JSON</label>
        <pre style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6, padding: '8px 10px',
          fontSize: 10, color: 'var(--text-muted)',
          margin: 0, overflowX: 'auto',
          lineHeight: 1.6,
        }}>
          {JSON.stringify(localConfig, null, 2)}
        </pre>
      </div>
    </div>
  )
}
