/**
 * KnowledgeSourceCard — TK-0188
 * Card pour une source de connaissance.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { KnowledgeSource, KnowledgeSourceType, KnowledgeSourceStatus } from '../types/knowledge'
import { useKnowledgeSources } from '../hooks/useKnowledgeSources'

const SOURCE_ICONS: Record<KnowledgeSourceType, string> = {
  notion: '📝',
  google_drive: '📁',
  ga4: '📊',
  url: '🌐',
  file: '📄',
  api: '🔌',
  database: '🗄️',
}

const STATUS_COLORS: Record<KnowledgeSourceStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
  syncing: { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  synced: { bg: 'rgba(52,211,153,0.12)', text: '#34d399', border: 'rgba(52,211,153,0.25)' },
  error: { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.25)' },
  paused: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
}

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Jamais'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

interface KnowledgeSourceCardProps {
  source: KnowledgeSource
  onSync?: (id: string) => void
  onDelete?: (id: string) => void
  onConfig?: (source: KnowledgeSource) => void
}

export function KnowledgeSourceCard({
  source,
  onSync,
  onDelete,
  onConfig,
}: KnowledgeSourceCardProps) {
  const { triggerSync } = useKnowledgeSources()
  const [syncing, setSyncing] = useState(source.status === 'syncing')

  const statusStyle = STATUS_COLORS[source.status] ?? STATUS_COLORS.pending

  const handleSync = async () => {
    setSyncing(true)
    await triggerSync(source.id)
    if (onSync) onSync(source.id)
    // Reset after 2.5s (sync simulation)
    setTimeout(() => setSyncing(false), 2500)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'background 0.15s ease',
      }}
      whileHover={{ background: 'rgba(255,255,255,0.07)' }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {SOURCE_ICONS[source.source_type] ?? '📄'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {source.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {/* Status badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 7px', borderRadius: 5,
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            fontSize: 10, fontWeight: 600, color: statusStyle.text,
            textTransform: 'uppercase' as const, letterSpacing: '0.04em',
          }}>
            {syncing ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                syncing
              </>
            ) : source.status}
          </span>
          {/* Entry count */}
          {source.entry_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {source.entry_count} entrées
            </span>
          )}
          {/* Last sync */}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {getRelativeTime(source.last_sync_at)}
          </span>
        </div>
        {/* Error message */}
        {source.status === 'error' && source.error_message && (
          <div style={{ fontSize: 11, color: '#f87171', marginTop: 4, opacity: 0.8 }}>
            ⚠️ {source.error_message}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {/* Sync */}
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Synchroniser"
          style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'rgba(96,165,250,0.1)',
            border: '1px solid rgba(96,165,250,0.2)',
            color: '#60a5fa', cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: syncing ? 0.5 : 1,
          }}
        >
          {syncing ? (
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          ) : '▶'}
        </button>
        {/* Config */}
        <button
          onClick={() => onConfig?.(source)}
          title="Configurer"
          style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ⚙
        </button>
        {/* Delete */}
        <button
          onClick={() => onDelete?.(source.id)}
          title="Supprimer"
          style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.15)',
            color: '#f87171', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          🗑
        </button>
      </div>
    </motion.div>
  )
}
