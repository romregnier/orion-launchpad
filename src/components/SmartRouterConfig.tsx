// TK-0239: [ARCH-011] Smart LLM Routing
// Composant: panneau de configuration du routeur LLM intelligent

import { useState, useEffect } from 'react'
import { useSmartRouter } from '../hooks/useSmartRouter'
import { type TaskType, type ModelTier, TIER_MODELS } from '../types/routing'

const TASK_TYPE_LABELS: Record<TaskType, { label: string; icon: string }> = {
  code:     { label: 'Code',     icon: '💻' },
  analysis: { label: 'Analyse',  icon: '🔍' },
  creative: { label: 'Créatif',  icon: '✨' },
  qa:       { label: 'Q&A',      icon: '❓' },
  data:     { label: 'Data',     icon: '📊' },
  chat:     { label: 'Chat',     icon: '💬' },
  search:   { label: 'Recherche',icon: '🔎' },
}

const TIER_LABELS: Record<ModelTier, { label: string; color: string; bg: string }> = {
  fast:     { label: 'Rapide',    color: 'var(--success, #22c55e)',   bg: 'rgba(34,197,94,0.1)'   },
  balanced: { label: 'Équilibré', color: 'var(--info, #3b82f6)',      bg: 'rgba(59,130,246,0.1)'  },
  powerful: { label: 'Puissant',  color: 'var(--purple, #8b5cf6)',    bg: 'rgba(139,92,246,0.1)'  },
}

export function SmartRouterConfig() {
  const { config, stats, updateRule, resetToDefaults, toggleLearning } = useSmartRouter()
  const [refreshStats, setRefreshStats] = useState(0)

  // Trigger re-render when stats update
  useEffect(() => {
    const timer = setInterval(() => setRefreshStats(n => n + 1), 2000)
    return () => clearInterval(timer)
  }, [])

  // Suppress unused variable warning
  void refreshStats

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      padding: 20,
      color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            🧠 Smart LLM Router
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Routage intelligent des tâches vers le meilleur modèle
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '6px 12px',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ↺ Défauts
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
      }}>
        {[
          { label: 'Total routé', value: stats.totalRouted.toString(), icon: '📡' },
          { label: 'Coût économisé', value: `$${stats.savedCost.toFixed(4)}`, icon: '💰' },
          { label: 'Confiance moy.', value: `${(stats.avgConfidence * 100).toFixed(0)}%`, icon: '🎯' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '12px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent, #6366f1)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Learning mode toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: config.enableLearning
          ? 'rgba(99,102,241,0.1)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${config.enableLearning
          ? 'rgba(99,102,241,0.3)'
          : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10, padding: '12px 16px',
        transition: 'all 0.2s',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            🤖 Learning Mode
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Utilise les patterns appris pour optimiser le routage
          </div>
        </div>
        <button
          onClick={() => toggleLearning(!config.enableLearning)}
          style={{
            width: 44, height: 24,
            background: config.enableLearning
              ? 'var(--accent, #6366f1)'
              : 'rgba(255,255,255,0.15)',
            border: 'none', borderRadius: 12,
            cursor: 'pointer', position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 2,
            left: config.enableLearning ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%',
            background: 'white',
            transition: 'left 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>

      {/* Routing rules */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
          ⚙️ Règles de routage
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.rules.map(rule => {
            const taskMeta = TASK_TYPE_LABELS[rule.taskType]
            const modelInfo = TIER_MODELS[rule.preferredTier]

            return (
              <div
                key={rule.taskType}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '10px 14px',
                }}
              >
                {/* Task type */}
                <span style={{ fontSize: 18, flexShrink: 0 }}>{taskMeta.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                  {taskMeta.label}
                </span>

                {/* Tier selector */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['fast', 'balanced', 'powerful'] as ModelTier[]).map(tier => {
                    const tm = TIER_LABELS[tier]
                    const isSelected = rule.preferredTier === tier
                    return (
                      <button
                        key={tier}
                        onClick={() => updateRule(rule.taskType, { preferredTier: tier })}
                        style={{
                          padding: '4px 10px',
                          background: isSelected ? tm.bg : 'transparent',
                          color: isSelected ? tm.color : 'var(--text-muted)',
                          border: `1px solid ${isSelected ? tm.color + '55' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 6, cursor: 'pointer',
                          fontSize: 11, fontWeight: isSelected ? 700 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        {tm.label}
                      </button>
                    )
                  })}
                </div>

                {/* Model name */}
                <span style={{
                  fontSize: 10, color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4, padding: '2px 6px',
                  fontFamily: 'monospace', flexShrink: 0,
                  maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {modelInfo.model}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Model cost reference */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <h5 style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Coûts de référence
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(Object.entries(TIER_MODELS) as [ModelTier, typeof TIER_MODELS[ModelTier]][]).map(([tier, info]) => {
            const tm = TIER_LABELS[tier]
            return (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  color: tm.color, fontSize: 11, fontWeight: 600,
                  minWidth: 80,
                }}>
                  {tm.label}
                </span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', flex: 1 }}>
                  {info.model}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
                  ${info.costPer1kTokens}/1k tokens
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
