/**
 * GalaxyCanvas
 *
 * Canvas HTML5 animé en permanence (requestAnimationFrame).
 * Affiche des étoiles/particules, des étoiles filantes et des connexions entre étoiles proches.
 * Position fixed, zIndex 0, pointerEvents none — fond du workspace.
 */
import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseAlpha: number
  color: string
  twinkleOffset: number
  twinkleSpeed: number
  connected: boolean
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  trail: Array<{ x: number; y: number }>
  trailLength: number
  color: string
  thickness: number
  active: boolean
}

const STAR_COLORS = ['#ffffff', 'var(--accent)', '#7C3AED', '#00d4ff']
const STAR_COLOR_WEIGHTS = [0.60, 0.15, 0.15, 0.10]
const STAR_COUNT = 120
const CONNECTION_DIST = 120
const SHOOT_INTERVAL_MIN = 8000
const SHOOT_INTERVAL_MAX = 12000

function weightedColor(): string {
  const r = Math.random()
  let cumul = 0
  for (let i = 0; i < STAR_COLORS.length; i++) {
    cumul += STAR_COLOR_WEIGHTS[i]
    if (r < cumul) return STAR_COLORS[i]
  }
  return STAR_COLORS[0]
}

export function GalaxyCanvas({ opacity = 0.6 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let nextShoot = Date.now() + SHOOT_INTERVAL_MIN + Math.random() * (SHOOT_INTERVAL_MAX - SHOOT_INTERVAL_MIN)

    // Init stars
    const stars: Star[] = []
    const init = () => {
      const W = canvas.width
      const H = canvas.height
      stars.length = 0
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.06,
          radius: 0.3 + Math.random() * 1.5,
          baseAlpha: 0.05 + Math.random() * 0.20,
          color: weightedColor(),
          twinkleOffset: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.4 + Math.random() * 0.8,
          connected: false,
        })
      }
    }

    // Shooting star
    let shootingStar: ShootingStar | null = null
    const spawnShootingStar = () => {
      const W = canvas.width
      const H = canvas.height
      const angle = (-30 + (Math.random() - 0.5) * 20) * (Math.PI / 180)
      const speed = 6 + Math.random() * 5
      const trailLength = 40 + Math.floor(Math.random() * 20)
      shootingStar = {
        x: Math.random() * W * 0.7,
        y: Math.random() * H * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        trail: [],
        trailLength,
        color: Math.random() < 0.6 ? '#ffffff' : 'var(--accent)',
        thickness: 1 + Math.random() * 0.5,
        active: true,
      }
    }

    // Resize
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      init()
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)
      t += 0.016

      // ── Connexions ──────────────────────────────────────────────────────
      for (let i = 0; i < stars.length; i++) {
        stars[i].connected = false
      }
      for (let i = 0; i < stars.length; i++) {
        if (stars[i].connected) continue
        let minDist = CONNECTION_DIST + 1
        let minJ = -1
        for (let j = i + 1; j < stars.length; j++) {
          if (stars[j].connected) continue
          const dx = stars[i].x - stars[j].x
          const dy = stars[i].y - stars[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < minDist) { minDist = d; minJ = j }
        }
        if (minJ >= 0) {
          ctx.beginPath()
          ctx.moveTo(stars[i].x, stars[i].y)
          ctx.lineTo(stars[minJ].x, stars[minJ].y)
          ctx.strokeStyle = 'rgba(150,80,200,0.03)'
          ctx.lineWidth = 0.5
          ctx.stroke()
          stars[i].connected = true
          stars[minJ].connected = true
        }
      }

      // ── Stars ────────────────────────────────────────────────────────────
      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinkleOffset)
        const alpha = star.baseAlpha * (0.6 + 0.4 * twinkle)

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = star.color === '#ffffff'
          ? `rgba(255,255,255,${alpha})`
          : star.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()

        // Drift + wrap
        star.x += star.vx
        star.y += star.vy
        if (star.x < 0) star.x += W
        if (star.x > W) star.x -= W
        if (star.y < 0) star.y += H
        if (star.y > H) star.y -= H
      }

      // ── Shooting star ────────────────────────────────────────────────────
      const now = Date.now()
      if (!shootingStar && now >= nextShoot) {
        spawnShootingStar()
        nextShoot = now + SHOOT_INTERVAL_MIN + Math.random() * (SHOOT_INTERVAL_MAX - SHOOT_INTERVAL_MIN)
      }

      if (shootingStar && shootingStar.active) {
        const ss = shootingStar
        ss.trail.unshift({ x: ss.x, y: ss.y })
        if (ss.trail.length > ss.trailLength) ss.trail.pop()

        // Draw trail
        for (let i = 0; i < ss.trail.length - 1; i++) {
          const alpha = (1 - i / ss.trail.length) * 0.8
          ctx.beginPath()
          ctx.moveTo(ss.trail[i].x, ss.trail[i].y)
          ctx.lineTo(ss.trail[i + 1].x, ss.trail[i + 1].y)
          ctx.strokeStyle = ss.color === '#ffffff'
            ? `rgba(255,255,255,${alpha})`
            : `rgba(225,31,123,${alpha})`
          ctx.lineWidth = ss.thickness * (1 - i / ss.trail.length)
          ctx.stroke()
        }

        // Move
        ss.x += ss.vx
        ss.y += ss.vy

        // Off screen?
        if (ss.x > W + 100 || ss.y > H + 100 || ss.x < -100 || ss.y < -100) {
          shootingStar = null
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity,
      }}
    />
  )
}
