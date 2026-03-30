/**
 * HelpTooltip.tsx — TK-0224
 * Icône ? circulaire avec tooltip intégré.
 */
import { useState } from 'react'
import { Tooltip } from './Tooltip'

interface HelpTooltipProps {
  tip: string
  size?: number
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function HelpTooltip({ tip, size = 14, placement = 'top' }: HelpTooltipProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <Tooltip content={tip} placement={placement}>
      <span
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size + 4,
          height: size + 4,
          borderRadius: '50%',
          border: `1px solid ${hovered ? 'var(--text-secondary, rgba(255,255,255,0.5))' : 'var(--text-tertiary, rgba(255,255,255,0.25))'}`,
          color: hovered ? 'var(--text-secondary, rgba(255,255,255,0.5))' : 'var(--text-tertiary, rgba(255,255,255,0.25))',
          fontSize: size - 2,
          lineHeight: 1,
          cursor: 'help',
          userSelect: 'none',
          transition: 'color 0.15s ease, border-color 0.15s ease',
          flexShrink: 0,
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
        }}
      >
        ?
      </span>
    </Tooltip>
  )
}
