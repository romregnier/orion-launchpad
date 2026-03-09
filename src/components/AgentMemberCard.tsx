import { motion } from 'framer-motion'

function timeAgoFr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `il y a ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export interface AgentMemberCardProps {
  agentKey: string   // 'forge', 'rex', etc.
  name: string
  role: string
  emoji: string
  lastTask?: {
    label: string
    progress: number
    step_label: string
    updated_at: string
  }
  status: 'online' | 'busy' | 'idle'
}

const STATUS_CONFIG = {
  online: { color: '#22C55E', label: 'En ligne', dot: '●' },
  busy:   { color: '#E11F7B', label: 'Occupé',   dot: '●' },
  idle:   { color: '#6B7280', label: 'Inactif',  dot: '○' },
}

export function AgentMemberCard({ agentKey, name, role, emoji, lastTask, status }: AgentMemberCardProps) {
  const statusCfg = STATUS_CONFIG[status]

  const timeAgo = lastTask?.updated_at ? timeAgoFr(lastTask.updated_at) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 350, damping: 28 } }}
      style={{
        background: '#2C272F',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        fontFamily: "'Poppins', sans-serif",
        boxShadow: status === 'busy'
          ? '0 0 20px rgba(225,31,123,0.12)'
          : status === 'online'
          ? '0 0 20px rgba(34,197,94,0.08)'
          : 'none',
      }}
    >
      {/* Glow top-left accent */}
      <div style={{
        position: 'absolute',
        top: -30,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: status === 'busy'
          ? 'radial-gradient(circle, rgba(225,31,123,0.15) 0%, transparent 70%)'
          : status === 'online'
          ? 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header row: emoji + name + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        {/* Avatar */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#3E3742',
          border: '1px solid rgba(255,255,255,0.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}>
          {emoji}
        </div>

        {/* Name + role + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#F0EDF5',
            letterSpacing: '-0.01em',
            marginBottom: 3,
          }}>
            {name}
          </div>
          <div style={{
            fontSize: 12,
            color: 'rgba(240,237,245,0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}>
            <span>{role}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ color: statusCfg.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              {statusCfg.dot} {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Agent key badge */}
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 6,
          padding: '2px 7px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          {agentKey}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

      {/* Last task section */}
      {lastTask ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(240,237,245,0.6)', lineHeight: 1.4, flex: 1, minWidth: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Dernière tâche : </span>
              <span style={{ fontWeight: 600 }}>{lastTask.step_label || lastTask.label}</span>
            </div>
            {timeAgo && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {timeAgo}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, lastTask.progress))}%` }}
                transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.1 }}
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #E11F7B, #FF6BAE)',
                  boxShadow: '0 0 8px rgba(225,31,123,0.5)',
                }}
              />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#E11F7B',
              minWidth: 32,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {lastTask.progress}%
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.22)',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '8px 0',
        }}>
          Aucune tâche récente
        </div>
      )}
    </motion.div>
  )
}
