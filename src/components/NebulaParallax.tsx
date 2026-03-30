/**
 * NebulaParallax — TK-0221
 * Variante parallaxe de NebulaOverlay : les orbes réagissent à la position de la souris.
 * Chaque orbe a un `depth` (0.1–0.5) qui détermine l'intensité du déplacement.
 * Pointer-events none — ne bloque pas les interactions.
 */
import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'

interface OrbeConfig {
  width: number
  height: number
  color: string
  blur: number
  opacity: number
  top: string
  left: string
  floatDuration: number
  depth: number
}

const ORBES_PARALLAX: OrbeConfig[] = [
  { width: 600, height: 600, color: 'var(--accent)33', blur: 120, opacity: 0.20, top: '5%',  left: '10%', floatDuration: 14, depth: 0.1 },
  { width: 500, height: 500, color: '#7C3AED33',        blur: 100, opacity: 0.15, top: '55%', left: '65%', floatDuration: 18, depth: 0.3 },
  { width: 450, height: 450, color: '#00d4ff22',        blur: 110, opacity: 0.12, top: '75%', left: '25%', floatDuration: 10, depth: 0.2 },
]

export function NebulaParallax() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth spring for buttery parallax feel
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5)
      mouseY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [mouseX, mouseY])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {ORBES_PARALLAX.map((orbe, i) => (
        <ParallaxOrbe key={i} orbe={orbe} smoothX={smoothX} smoothY={smoothY} />
      ))}
    </div>
  )
}

function ParallaxOrbe({
  orbe,
  smoothX,
  smoothY,
}: {
  orbe: OrbeConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smoothX: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smoothY: any
}) {
  const range = orbe.depth * 100
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const parallaxX = useTransform(smoothX, [-0.5, 0.5], [-range, range])
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const parallaxY = useTransform(smoothY, [-0.5, 0.5], [-range, range])

  return (
    // Outer: parallax offset driven by mouse
    <motion.div
      style={{
        position: 'absolute',
        top: orbe.top,
        left: orbe.left,
        x: parallaxX,
        y: parallaxY,
        willChange: 'transform',
      }}
    >
      {/* Inner: autonomous floating animation */}
      <motion.div
        style={{
          width: orbe.width,
          height: orbe.height,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orbe.color}, transparent 70%)`,
          filter: `blur(${orbe.blur}px)`,
          opacity: orbe.opacity,
        }}
        animate={{ x: [0, 60, -40, 30, 0], y: [0, -40, 50, -20, 0] }}
        transition={{
          repeat: Infinity,
          repeatType: 'mirror',
          duration: orbe.floatDuration,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  )
}
