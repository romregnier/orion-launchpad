/**
 * AutomationCard — TK-0165 Automations UI
 * Card d'automation avec toggle, status dot, schedule lisible
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
  }
  onToggle: (id: string, enabled: boolean) => Promise<void>
}

function parseSchedule(cron: string): string {
  if (!cron) return 'Pas de planification'
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return cron

  const [min, hour, dom, month, dow] = parts

  // Common patterns
  if (dom === '*' && month === '*' && dow === '*') {
    if (min === '0') {
      return `Chaque jour à ${hour}h`
    }
    return `Chaque jour à ${hour}h${min.padStart(2,'0')}`
  }
  if (dom === '*' && month === '*' && dow !== '*') {
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

export function AutomationCard({ automation, onToggle }: AutomationCardProps) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      await onToggle(automation.id, !automation.enabled)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
      <div style={{
        background: 'var(--bg-surface)',
        border: 'var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: automation.enabled ? 1 : 0.6,
        transition: 'opacity 0.2s',
      }}>
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

        {/* Toggle */}
        <ToggleSwitch enabled={automation.enabled} onChange={() => void handleToggle()} loading={loading} />
      </div>
    </>
  )
}
