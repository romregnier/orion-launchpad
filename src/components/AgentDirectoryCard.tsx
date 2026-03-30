import { motion } from 'framer-motion'
import type { CanvasAgent } from '../types'

// Agent color palette by agent_key
const AGENT_COLORS: Record<string, string> = {
  orion: 'var(--accent)',
  nova: '#7C3AED',
  aria: '#0EA5E9',
  forge: '#F59E0B',
  rex: '#10B981',
  romain: '#F59E0B',
}

function getAgentColor(key?: string): string {
  return AGENT_COLORS[key ?? ''] ?? '#6B7280'
}

function getModelLabel(model?: string | null): string {
  if (!model) return 'HUMAN'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('opus')) return 'Opus'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  return model.split('/').pop() ?? model
}

function getModelStyle(model?: string | null, entityType?: string | null): { bg: string; border: string; color: string; emoji: string } {
  if (entityType === 'human' || !model) {
    return { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.35)', color: '#FBBF24', emoji: '👤' }
  }
  if (model.includes('sonnet')) return { bg: 'rgba(124,58,237,0.18)', border: 'rgba(124,58,237,0.35)', color: '#A78BFA', emoji: '🧠' }
  if (model.includes('haiku')) return { bg: 'rgba(14,165,233,0.18)', border: 'rgba(14,165,233,0.35)', color: '#38BDF8', emoji: '⚡' }
  if (model.includes('opus')) return { bg: 'rgba(225,31,123,0.18)', border: 'rgba(225,31,123,0.35)', color: 'var(--accent)', emoji: '💎' }
  if (model.includes('gpt-4o')) return { bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.35)', color: '#34D399', emoji: '🤖' }
  return { bg: 'var(--border-default)', border: 'rgba(255,255,255,0.15)', color: 'var(--text-secondary)', emoji: '🔮' }
}

function StatusDot({ status }: { status?: 'online' | 'idle' | 'offline' | null }) {
  const s = status ?? 'offline'
  const color = s === 'online' ? '#22C55E' : s === 'idle' ? '#F59E0B' : 'rgba(255,255,255,0.2)'

  return (
    <motion.div
      animate={s === 'online' ? {
        boxShadow: [
          '0 0 0 0 rgba(34,197,94,0.5)',
          '0 0 0 5px rgba(34,197,94,0)',
          '0 0 0 0 rgba(34,197,94,0)',
        ]
      } : {}}
      transition={s === 'online' ? { repeat: Infinity, duration: 2, ease: 'easeOut' } : {}}
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        border: '2px solid var(--bg-surface)',
        flexShrink: 0,
      }}
    />
  )
}

interface Props {
  agent: CanvasAgent
}

export function AgentDirectoryCard({ agent }: Props) {
  const color = getAgentColor(agent.agent_key)
  const modelStyle = getModelStyle(agent.model, agent.entity_type)
  const isHuman = agent.entity_type === 'human'
  const skills = agent.skills ?? []
  const visibleSkills = skills.slice(0, 3)
  const extraCount = skills.length - 3

  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        width: '100%',
        minHeight: 140,
        padding: '18px 20px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'var(--bg-surface)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: isHuman
              ? `radial-gradient(circle at 35% 35%, rgba(245,158,11,0.35), rgba(245,158,11,0.1))`
              : `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`,
            border: isHuman ? '2px solid #F59E0B' : `2px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            overflow: 'hidden',
          }}>
            {isHuman ? '👤' : (
              agent.tailorUrl ? (
                <iframe
                  src={agent.tailorUrl}
                  style={{ width: 56, height: 56, border: 'none', borderRadius: '50%', pointerEvents: 'none' }}
                  title={agent.name}
                />
              ) : initials
            )}
          </div>
          {/* Status dot */}
          <div style={{ position: 'absolute', bottom: 1, right: 1 }}>
            <StatusDot status={agent.status} />
          </div>
        </div>

        {/* Name + Role + Model */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {agent.role ?? (isHuman ? 'Humain' : 'Agent IA')}
          </div>
          {/* Model Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 7px',
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            fontFamily: "'Poppins', sans-serif",
            marginTop: 4,
            background: modelStyle.bg,
            border: `1px solid ${modelStyle.border}`,
            color: modelStyle.color,
          }}>
            <span>{modelStyle.emoji}</span>
            <span>{getModelLabel(agent.model ?? (isHuman ? null : undefined))}</span>
          </div>
        </div>

        {/* Status dot on the right for larger view */}
        <StatusDot status={agent.status} />
      </div>

      {/* Skills row */}
      {visibleSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, overflow: 'hidden' }}>
          {visibleSkills.map(skill => (
            <div
              key={skill}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
                fontSize: 10,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
                maxWidth: 100,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
              }}
            >
              {skill}
            </div>
          ))}
          {extraCount > 0 && (
            <div style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(225,31,123,0.12)',
              border: '1px solid rgba(225,31,123,0.25)',
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(225,31,123,0.8)',
              flexShrink: 0,
            }}>
              +{extraCount}
            </div>
          )}
        </div>
      )}

      {/* Can spawn */}
      {(agent.can_spawn ?? []).length > 0 && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 4, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <span>Peut spawner :</span>
          {(agent.can_spawn ?? []).map(key => (
            <span key={key} style={{
              padding: '1px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.07)',
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
            }}>{key}</span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
