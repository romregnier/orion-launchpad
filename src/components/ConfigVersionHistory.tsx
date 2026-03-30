// TK-0244: [DS-005] Config Versioning + Rollback
// Composant: historique des versions de config avec rollback

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfigVersioning, type ConfigVersion } from '../hooks/useConfigVersioning'

interface ConfigVersionHistoryProps {
  agentId: string
  onRollback?: (versionId: string) => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ConfigVersionHistory({ agentId, onRollback }: ConfigVersionHistoryProps) {
  const { getVersionHistory, rollbackTo } = useConfigVersioning()
  const [versions, setVersions] = useState<ConfigVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const history = await getVersionHistory(agentId)
      setVersions(history)
    } finally {
      setLoading(false)
    }
  }, [agentId, getVersionHistory])

  useEffect(() => {
    if (agentId) loadHistory()
  }, [agentId, loadHistory])

  const handleRollback = useCallback(async (versionId: string) => {
    setRollingBack(versionId)
    try {
      await rollbackTo(versionId)
      onRollback?.(versionId)
      await loadHistory()
    } finally {
      setRollingBack(null)
    }
  }, [rollbackTo, onRollback, loadHistory])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: 16,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          🕐 Historique des versions
        </h4>
        <button
          onClick={loadHistory}
          disabled={loading}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, padding: '4px 8px',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 11,
          }}
        >
          {loading ? '⏳' : '↻ Refresh'}
        </button>
      </div>

      {/* Empty state */}
      {!loading && versions.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 16px',
          color: 'var(--text-muted)', opacity: 0.5,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p style={{ margin: 0, fontSize: 13 }}>Aucune version sauvegardée</p>
        </div>
      )}

      {/* Version list */}
      <AnimatePresence>
        {versions.map((version, index) => (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            style={{
              background: version.is_active
                ? 'rgba(34,197,94,0.08)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${version.is_active
                ? 'rgba(34,197,94,0.3)'
                : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}
          >
            {/* Top row: version number + active badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontWeight: 700, fontSize: 13,
                  color: version.is_active ? 'var(--success, #22c55e)' : 'var(--text-primary)',
                }}>
                  v{version.version_number}
                </span>
                {version.is_active && (
                  <span style={{
                    background: 'rgba(34,197,94,0.2)',
                    color: 'var(--success, #22c55e)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    borderRadius: 12, padding: '2px 8px',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  }}>
                    ✓ Active
                  </span>
                )}
              </div>

              {/* Rollback button (only on non-active versions) */}
              {!version.is_active && (
                <button
                  onClick={() => handleRollback(version.id)}
                  disabled={rollingBack === version.id}
                  style={{
                    background: 'rgba(139,92,246,0.15)',
                    color: 'var(--purple, #8b5cf6)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 6, padding: '4px 10px',
                    cursor: rollingBack === version.id ? 'not-allowed' : 'pointer',
                    fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                    opacity: rollingBack === version.id ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {rollingBack === version.id ? '⏳' : '↩'} Rollback
                </button>
              )}
            </div>

            {/* Summary */}
            {version.change_summary && (
              <p style={{
                margin: 0, fontSize: 12,
                color: 'var(--text-primary)', opacity: 0.8,
              }}>
                {version.change_summary}
              </p>
            )}

            {/* Date */}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
              {formatDate(version.created_at)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
