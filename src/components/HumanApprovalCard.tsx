/**
 * HumanApprovalCard — TK-0170 Board Approvals
 * Card d'approbation humaine pour les actions d'agents en attente
 */
import { useState, useEffect } from 'react'

const AGENT_EMOJI: Record<string, string> = {
  forge: '🔧', nova: '✦', aria: '🎨', rex: '🛡️', orion: '🌟',
}

function formatCountdown(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'Expiré'
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `Expire dans ${hrs}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
  if (mins > 0) return `Expire dans ${mins}m`
  return `Expire dans ${Math.floor(diff / 1000)}s`
}

interface ApprovalProps {
  approval: {
    id: string
    agent_key: string
    action: string
    detail: Record<string, unknown>
    created_at: string
    timeout_at?: string
  }
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
}

export function HumanApprovalCard({ approval, onApprove, onReject }: ApprovalProps) {
  const [loadingApprove, setLoadingApprove] = useState(false)
  const [loadingReject, setLoadingReject] = useState(false)
  const [countdown, setCountdown] = useState('')

  const agentEmoji = AGENT_EMOJI[approval.agent_key?.toLowerCase()] ?? '🤖'
  const description = typeof approval.detail?.description === 'string'
    ? approval.detail.description
    : JSON.stringify(approval.detail, null, 2)

  useEffect(() => {
    if (!approval.timeout_at) return
    setCountdown(formatCountdown(approval.timeout_at))
    const interval = setInterval(() => {
      setCountdown(formatCountdown(approval.timeout_at!))
    }, 1000)
    return () => clearInterval(interval)
  }, [approval.timeout_at])

  const handleApprove = async () => {
    setLoadingApprove(true)
    try { await onApprove(approval.id) } finally { setLoadingApprove(false) }
  }

  const handleReject = async () => {
    setLoadingReject(true)
    try { await onReject(approval.id) } finally { setLoadingReject(false) }
  }

  return (
    <div style={{
      background: 'rgba(225,31,123,0.08)',
      border: '1px solid rgba(225,31,123,0.25)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{agentEmoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {approval.agent_key} veut {approval.action}
          </div>
          {countdown && (
            <div style={{
              fontSize: 10,
              color: 'rgba(245,158,11,0.8)',
              fontFamily: 'var(--font-sans)',
              marginTop: 2,
            }}>
              ⏱ {countdown}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div style={{
        fontSize: 11,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        lineHeight: 1.5,
        background: 'rgba(0,0,0,0.2)',
        padding: '6px 8px',
        borderRadius: 'var(--radius-sm)',
        fontStyle: typeof approval.detail?.description !== 'string' ? 'italic' : 'normal',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 80,
        overflowY: 'auto',
      }}>
        {description}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => void handleApprove()}
          disabled={loadingApprove || loadingReject}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: loadingApprove ? 'rgba(16,185,129,0.4)' : '#10B981',
            color: '#fff',
            border: 'none',
            cursor: loadingApprove || loadingReject ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            opacity: loadingReject ? 0.5 : 1,
            transition: 'background 0.15s, opacity 0.15s',
          }}
        >
          {loadingApprove ? '⏳ …' : '✅ Approuver'}
        </button>
        <button
          onClick={() => void handleReject()}
          disabled={loadingApprove || loadingReject}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: loadingReject ? 'rgba(239,68,68,0.4)' : '#EF4444',
            color: '#fff',
            border: 'none',
            cursor: loadingApprove || loadingReject ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            opacity: loadingApprove ? 0.5 : 1,
            transition: 'background 0.15s, opacity 0.15s',
          }}
        >
          {loadingReject ? '⏳ …' : '❌ Rejeter'}
        </button>
      </div>
    </div>
  )
}
