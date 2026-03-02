/**
 * NebulaBackground
 *
 * Fond nébuleuse animée — 5 orbes Framer Motion sinusoïdaux.
 * Utilisé dans : LoginScreen.tsx
 * Performance : will-change:transform, pointer-events:none, overflow:hidden
 * Mobile : 3 orbes sur viewport ≤ 768px
 */
import { motion } from 'framer-motion'

interface OrbeConfig {
  width: number
  height: number
  color: string
  blur: number
  opacity: number
  top: string
  left: string
  duration: number
}

const ORBES: OrbeConfig[] = [
  { width: 500, height: 500, color: '#E11F7B55', blur: 80,  opacity: 0.50, top: '10%', left: '15%', duration: 10 },
  { width: 400, height: 400, color: '#8B5CF655', blur: 100, opacity: 0.40, top: '50%', left: '60%', duration: 13 },
  { width: 600, height: 600, color: '#4FC3F733', blur: 120, opacity: 0.35, top: '70%', left: '30%', duration: 8  },
  { width: 350, height: 350, color: '#E11F7B33', blur: 90,  opacity: 0.30, top: '25%', left: '75%', duration: 15 },
  { width: 450, height: 450, color: '#8B5CF633', blur: 110, opacity: 0.25, top: '80%', left: '80%', duration: 11 },
]

export function NebulaBackground() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const activeOrbes = isMobile ? ORBES.slice(0, 3) : ORBES

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#0B090D',
      }}
    >
      {activeOrbes.map((orbe, i) => {
        const size = isMobile
          ? { width: Math.round(orbe.width * 0.8), height: Math.round(orbe.height * 0.8) }
          : { width: orbe.width, height: orbe.height }

        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: size.width,
              height: size.height,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${orbe.color}, transparent 70%)`,
              filter: `blur(${orbe.blur}px)`,
              opacity: orbe.opacity,
              top: orbe.top,
              left: orbe.left,
              willChange: 'transform',
            }}
            animate={{ x: [0, 80, -60, 40, 0], y: [0, -50, 70, -30, 0] }}
            transition={{
              repeat: Infinity,
              repeatType: 'mirror',
              duration: orbe.duration,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}
