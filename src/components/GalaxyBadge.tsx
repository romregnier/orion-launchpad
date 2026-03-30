/**
 * GalaxyBadge — TK-0232 [DS-004]
 * Badge cosmique avec emoji et terme Galaxy
 */
import React from 'react'
import type { GalaxyTermKey } from '../constants/galaxyTerms'
import { GALAXY_TERMS, GALAXY_EMOJIS } from '../constants/galaxyTerms'

interface GalaxyBadgeProps {
  termKey: GalaxyTermKey
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'glow' | 'subtle'
  className?: string
  style?: React.CSSProperties
}

const sizeStyles = {
  sm: { fontSize: 11, padding: '2px 8px', gap: 4 },
  md: { fontSize: 12, padding: '4px 10px', gap: 5 },
  lg: { fontSize: 14, padding: '6px 14px', gap: 6 },
}

const variantStyles = {
  default: {
    background: 'rgba(225,31,123,0.12)',
    border: '1px solid rgba(225,31,123,0.25)',
    color: 'var(--accent)',
  },
  glow: {
    background: 'rgba(225,31,123,0.18)',
    border: '1px solid rgba(225,31,123,0.4)',
    color: 'var(--accent)',
    boxShadow: '0 0 12px rgba(225,31,123,0.2)',
  },
  subtle: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(240,237,245,0.6)',
  },
}

export function GalaxyBadge({ termKey, size = 'md', variant = 'default', style }: GalaxyBadgeProps) {
  const emoji = GALAXY_EMOJIS[termKey]
  const label = GALAXY_TERMS[termKey]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        fontWeight: 600,
        fontFamily: "'Poppins', sans-serif",
        letterSpacing: '0.02em',
        transition: 'all 0.2s ease',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      <span style={{ lineHeight: 1 }}>{emoji}</span>
      <span>{label}</span>
    </span>
  )
}

/** Standalone use: display any galaxy term inline */
export function GalaxyLabel({ termKey, showEmoji = true }: { termKey: GalaxyTermKey; showEmoji?: boolean }) {
  return (
    <span>
      {showEmoji && <span style={{ marginRight: 4 }}>{GALAXY_EMOJIS[termKey]}</span>}
      {GALAXY_TERMS[termKey]}
    </span>
  )
}
