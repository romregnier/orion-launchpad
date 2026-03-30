/**
 * AutomationCard — TK-0165 Automations UI / TK-0179 Enrichissement
 * Card d'automation avec toggle, status dot, schedule lisible
 * v2: + next_run_at, onRun, onDelete, description sous-titre
 */
import { useState } from 'react'

interface AutomationCardProps {
  automation: {
    id: string
    name: string
    description?: string
    schedule?: string
    enabled: boolean
    last_run_at?: string
    last_run_status?: string
    adapter_type: string
    next_run_at?: string
  }
  onToggle: (id: string, enabled: boolean) => Promise<void>
  onRun?: (id: string) => Promise<void>
  onDelete?: (id: string) => void
}

function parseSchedule(cron: string): string {
  if (!cron) return 'Pas de planification'
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return cron

  const [min, hour, , , dow] = parts

  // Common patterns
  if (dow === '*') {
    if (min === '0') {
      return `Chaque jour à ${hour}h`
    }
    return `Chaque jour à ${hour}h${min.padStart(2,'0')}`
  }
  if (dow !== '*') {
    const days: Record<string, string> = { '0':'dim', '1':'lun', '2':'mar', '3':'mer', '4':'jeu', '5':'ven', '6':'sam', 'MON':'lun', 'TUE':'mar', 'WED':'mer', 'THU':'jeu', 'FRI':'ven', 'SAT':'sam', 'SUN':'dim' }
    const dayLabel = days[dow] ?? dow
    return `Chaque ${dayLabel} à ${hour}h`
  }
  return cron
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'maintenant'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `dans ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `dans ${hrs}h`
  return `dans ${Math.floor(hrs / 24)}j`
}

function StatusDot({ status }: { status?: string }) {
  const config = {
    success: { color: '#22C55E', pulse: false },
    error: { color: '#EF4444', pulse: false },
    running: { color: '#F59E0B', pulse: true },
    default: { color: '#6B7280', pulse: false },
  }
  const c = config[status as keyof typeof config] ?? config.default

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: c.color,
        animation: c.pulse ? 'pulse-dot 1.5s infinite' : 'none',
      }} />
    </div>
  )
}

function ToggleSwitch({ enabled, onChange, loading }: { enabled: boolean; onChange: () => void; loading: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      title={enabled ? 'Désactiver' : 'Activer'}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: enabled ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: loading ? 0.6 : 1,
        padding: 0,
      }}
    >
      <div style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 2,
        left: enabled ? 16 : 2,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

export function AutomationCard({ automation, onToggle, onRun, onDelete }: AutomationCardProps) {
  const [loading, setLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      await onToggle(automation.id, !automation.enabled)
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    if (!onRun) return
    setRunLoading(true)
    try {
      await onRun(automation.id)
    } finally {
      setRunLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--bg-surface)',
          border: 'var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: automation.enabled ? 1 : 0.6,
          transition: 'opacity 0.2s',
          position: 'relative',
        }}
      >
        {/* Status dot */}
        <StatusDot status={automation.last_run_status ?? undefined} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {automation.name}
          </div>
          {/* Description sous-titre */}
          {automation.description && (
            <div style={{
              fontSize: 10,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {automation.description}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            {automation.schedule && (
              <span style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-sans)',
              }}>
                🕐 {parseSchedule(automation.schedule)}
              </span>
            )}
            {automation.last_run_at && (
              <span style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-sans)',
              }}>
                · {relativeTime(automation.last_run_at)}
              </span>
            )}
            {automation.next_run_at && (
              <span style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-sans)',
              }}>
                · Prochain: {timeUntil(automation.next_run_at)}
              </span>
            )}
          </div>
        </div>

        {/* Adapter badge */}
        <span style={{
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-sans)',
          flexShrink: 0,
        }}>
          {automation.adapter_type}
        </span>

        {/* Run button */}
        {onRun && (
          <button
            onClick={() => void handleRun()}
            disabled={runLoading}
            title="Lancer maintenant"
            style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-sm)',
              background: runLoading ? 'rgba(255,255,255,0.06)' : 'rgba(225,31,123,0.15)',
              border: '1px solid rgba(225,31,123,0.3)',
              color: 'var(--accent)',
              cursor: runLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              flexShrink: 0,
              opacity: runLoading ? 0.6 : 1,
              transition: 'background 0.2s, opacity 0.2s',
            }}
          >
            {runLoading ? (
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            ) : '▶'}
          </button>
        )}

        {/* Delete button — hover-reveal */}
        {onDelete && (
          <button
            onClick={() => onDelete(automation.id)}
            title="Supprimer"
            style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#EF4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              flexShrink: 0,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            🗑
          </button>
        )}

        {/* Toggle */}
        <ToggleSwitch enabled={automation.enabled} onChange={() => void handleToggle()} loading={loading} />
      </div>
    </>
  )
}
