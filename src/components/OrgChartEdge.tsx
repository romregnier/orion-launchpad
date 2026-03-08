import { motion } from 'framer-motion'

interface Props {
  x1: number
  y1: number
  x2: number
  y2: number
  index?: number
  highlighted?: boolean
}

export function OrgChartEdge({ x1, y1, x2, y2, index = 0, highlighted = false }: Props) {
  const midY = (y1 + y2) / 2
  const d = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={highlighted ? '#E11F7B' : 'rgba(255,255,255,0.15)'}
      strokeWidth={highlighted ? 2.5 : 1.5}
      markerEnd="url(#org-arrow)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: {
          type: 'spring',
          stiffness: 350,
          damping: 28,
          delay: 0.3 + index * 0.08,
        },
        opacity: { duration: 0.1, delay: 0.3 + index * 0.08 },
      }}
      style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
    />
  )
}
