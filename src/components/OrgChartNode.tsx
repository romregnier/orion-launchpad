import { motion } from 'framer-motion'
import type { CanvasAgent } from '../types'
import { AGENT_META } from '../types'

const AGENT_COLORS: Record<string, string> = {
  orion: 'var(--accent)',
  nova: '#8B5CF6',
  aria: '#8B5CF6',
  forge: '#F59E0B',
  rex: '#10B981',
  romain: '#F59E0B',
}

interface Props {
  agent: CanvasAgent
  x: number
  y: number
  level: number
  nodeIndex?: number
  highlighted?: boolean
  onHover?: (hovered: boolean) => void
}

export function OrgChartNode({ agent, x, y, level, nodeIndex = 0, highlighted, onHover }: Props) {
  const color = AGENT_COLORS[agent.agent_key ?? ''] ?? '#6B7280'
  const isHuman = agent.entity_type === 'human'
  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const agentKey = agent.agent_key ?? agent.name.toLowerCase()
  const nodeEmoji = AGENT_META[agentKey]?.emoji ?? (isHuman ? '👤' : initials)

  const NODE_W = 120
  const NODE_H = 80

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 28,
        delay: level * 0.2 + nodeIndex * 0.08,
      }}
      style={{ cursor: 'pointer' }}
      onHoverStart={() => onHover?.(true)}
      onHoverEnd={() => onHover?.(false)}
    >
      {/* Background rect */}
      <motion.rect
        x={x - NODE_W / 2}
        y={y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={12}
        fill="var(--bg-surface)"
        stroke={highlighted ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}
        strokeWidth={highlighted ? 1.5 : 1}
        style={{ transition: 'stroke 0.2s ease' }}
      />

      {/* Avatar circle */}
      <circle
        cx={x}
        cy={y - 14}
        r={18}
        fill={isHuman
          ? 'rgba(245,158,11,0.22)'
          : `${color}33`
        }
        stroke={isHuman ? '#F59E0B' : color}
        strokeWidth={1.5}
      />

      {/* Avatar text (emoji) */}
      <text
        x={x}
        y={y - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight="700"
        fill="#fff"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {nodeEmoji}
      </text>

      {/* Name */}
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fontSize={11}
        fontWeight="700"
        fill="#fff"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {agent.name}
      </text>

      {/* Role */}
      <text
        x={x}
        y={y + 26}
        textAnchor="middle"
        fontSize={9}
        fill="rgba(255,255,255,0.45)"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {(agent.role ?? (isHuman ? 'CEO' : 'Agent')).slice(0, 16)}
      </text>
    </motion.g>
  )
}
