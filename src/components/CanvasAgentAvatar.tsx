import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import type { CanvasAgent, AvatarConfig } from '../types'


// ── Couleurs et emojis par agent ──────────────────────────────────────────────
const AGENT_META: Record<string, { emoji: string; color: string; glow: string }> = {
  orion: { emoji: '🌟', color: '#4FC3F7', glow: 'rgba(79,195,247,0.4)' },
  nova:  { emoji: '✦',  color: '#E11F7B', glow: 'rgba(225,31,123,0.4)' },
  aria:  { emoji: '🎨', color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)' },
  forge: { emoji: '🔧', color: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
  rex:   { emoji: '🛡️', color: '#10B981', glow: 'rgba(16,185,129,0.4)' },
}

/**
 * TailorCanvas — Avatar Three.js animé 64×64px.
 * Rendu basé sur tailor_config (couleur + forme).
 * Fallback automatique si WebGL indisponible ou erreur.
 *
 * @param tailorConfig - Config avatar issue de la DB (couleur HSL, forme, etc.)
 * @param fallbackColor - Couleur hex de fallback si tailor_config sans couleur
 */
function TailorCanvas({ tailorConfig, fallbackColor }: { tailorConfig: AvatarConfig; fallbackColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let frameId: number
    let disposed = false

    const init = async () => {
      try {
        const THREE = await import('three')

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
        renderer.setSize(64, 64)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = false

        const scene = new THREE.Scene()
        // Caméra identique à The Tailor (position [0,0,4], fov 45)
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
        camera.position.set(0, 0, 4)
        camera.lookAt(0, 0, 0)

        // Éclairage identique à The Tailor : ambientLight + 2 pointLights
        const ambiancePointColors: Record<string, string> = {
          space: '#4488ff', forest: '#86efac', sunset: '#fb923c',
          neon: '#e879f9', retro: '#fcd34d', void: '#ffffff',
        }
        const ambianceAmbient: Record<string, number> = {
          space: 0.4, forest: 0.5, sunset: 0.8, neon: 0.6, retro: 0.7, void: 0.6,
        }
        const ambianceKey = tailorConfig.ambiance ?? 'space'
        const ambientIntensity = ambianceAmbient[ambianceKey] ?? 0.5
        const pointColor = ambiancePointColors[ambianceKey] ?? '#4488ff'

        const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity)
        const pointLight1 = new THREE.PointLight(0xffffff, 1.5)
        pointLight1.position.set(3, 3, 3)
        const pointLight2 = new THREE.PointLight(new THREE.Color(pointColor), 0.5)
        pointLight2.position.set(-2, -1, 2)
        scene.add(ambient, pointLight1, pointLight2)

        // ── Couleur corps depuis tailor_config.color — {h,s,l} sont en 0-100/360 ──
        const hsl = tailorConfig.color
        // s et l sont déjà en 0-100 (pas 0-1), h en 0-360
        const colorCss = hsl ? `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)` : fallbackColor
        const bodyColor = new THREE.Color(colorCss)
        const bodyScale = tailorConfig.bodyScale ?? 1

        // ── Corps principal — forme selon bodyShape ──
        let bodyGeo: import('three').BufferGeometry
        const bs = tailorConfig.bodyShape ?? 'blob'
        if (bs === 'heart') {
          // cœur approximé avec 2 sphères + 1 cône
          bodyGeo = new THREE.SphereGeometry(0.32 * bodyScale, 20, 20)
        } else if (bs === 'star') {
          bodyGeo = new THREE.OctahedronGeometry(0.38 * bodyScale, 0)
        } else if (bs === 'ghost') {
          bodyGeo = new THREE.CapsuleGeometry(0.22 * bodyScale, 0.28 * bodyScale, 6, 16)
        } else {
          bodyGeo = new THREE.SphereGeometry(0.38 * bodyScale, 24, 24)
        }
        // MeshStandardMaterial identique à The Tailor (PBR vs Lambert = rendu plus fidèle)
        const isGlow = tailorConfig.skinPattern === 'glow'
        const bodyMat = new THREE.MeshStandardMaterial({
          color: bodyColor,
          emissive: isGlow ? bodyColor : new THREE.Color(0x000000),
          emissiveIntensity: isGlow ? 0.4 : 0,
          roughness: 0.7,
          metalness: 0.05,
        })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.y = -0.05

        // ── Yeux — taille/forme selon eyeStyle + couleur selon eyeColor ──
        const eyeColorMap: Record<string, number> = {
          blue: 0x3b82f6, green: 0x22c55e, red: 0xef4444,
          gold: 0xfbbf24, rainbow: 0xe11f7b,
        }
        const eyeCol = eyeColorMap[tailorConfig.eyeColor ?? 'blue'] ?? 0x3b82f6
        const eyeStyle = tailorConfig.eyes ?? 'cute'
        const eyeSize = eyeStyle === 'pixel' ? 0.07 : eyeStyle === 'star' ? 0.10 : 0.08
        const eyeGeo = eyeStyle === 'pixel'
          ? new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize)
          : new THREE.SphereGeometry(eyeSize, 12, 12)
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0 })
        const eyePupilMat = new THREE.MeshStandardMaterial({ color: eyeCol, roughness: 0.5, metalness: 0.1 })
        const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat)
        const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat)
        const pupilL = new THREE.Mesh(
          eyeStyle === 'pixel' ? new THREE.BoxGeometry(eyeSize * 0.6, eyeSize * 0.6, eyeSize) : new THREE.SphereGeometry(eyeSize * 0.5, 8, 8),
          eyePupilMat
        )
        const pupilR = pupilL.clone()
        const eyeY = eyeStyle === 'sleepy' ? 0.06 : 0.12
        eyeL.position.set(-0.14, eyeY, 0.32)
        eyeR.position.set(0.14, eyeY, 0.32)
        pupilL.position.set(-0.14, eyeY, 0.38)
        pupilR.position.set(0.14, eyeY, 0.38)
        if (eyeStyle === 'sleepy') {
          eyeL.scale.y = 0.5; eyeR.scale.y = 0.5
        }

        const meshGroup = new THREE.Group()
        meshGroup.add(body, eyeL, eyeR, pupilL, pupilR)

        // ── Blush (joues) selon style ──
        if (tailorConfig.blush && tailorConfig.blush !== 'none') {
          const blushColor = tailorConfig.blush === 'hearts' ? 0xff4d88 : 0xff8fa3
          const blushMat = new THREE.MeshStandardMaterial({ color: blushColor, transparent: true, opacity: 0.6, roughness: 0.9 })
          const blushGeo = new THREE.SphereGeometry(0.07, 8, 8)
          const blushL = new THREE.Mesh(blushGeo, blushMat)
          const blushR = new THREE.Mesh(blushGeo, blushMat)
          blushL.position.set(-0.22, -0.02, 0.28)
          blushR.position.set(0.22, -0.02, 0.28)
          meshGroup.add(blushL, blushR)
        }

        // ── Armor — couleur et forme selon style ──
        if (tailorConfig.armor && tailorConfig.armor !== 'none') {
          const armorColors: Record<string, number> = {
            space: 0x334155, knight: 0x78716c, casual: 0x3b82f6, wizard: 0x7c3aed
          }
          const armorMat = new THREE.MeshStandardMaterial({ color: armorColors[tailorConfig.armor] ?? 0x666688, roughness: 0.5, metalness: 0.3 })
          if (tailorConfig.armor === 'knight') {
            // bouclier large
            const ag = new THREE.BoxGeometry(0.32, 0.22, 0.07)
            const a = new THREE.Mesh(ag, armorMat); a.position.set(0, -0.1, 0.37)
            meshGroup.add(a)
          } else if (tailorConfig.armor === 'wizard') {
            // robe (cone bas)
            const ag = new THREE.ConeGeometry(0.22, 0.3, 8)
            const a = new THREE.Mesh(ag, armorMat); a.position.set(0, -0.38, 0)
            meshGroup.add(a)
          } else {
            // plaque space / casual
            const ag = new THREE.BoxGeometry(0.28, 0.18, 0.08)
            const a = new THREE.Mesh(ag, armorMat); a.position.set(0, -0.12, 0.36)
            meshGroup.add(a)
          }
        }

        // ── Headgear ──
        if (tailorConfig.headgear && tailorConfig.headgear !== 'none') {
          const hgColors: Record<string, number> = {
            crown: 0xffd700, antennae: 0x60a5fa, halo: 0xfef08a, 'wizard-hat': 0x7c3aed
          }
          const hgMat = new THREE.MeshStandardMaterial({ color: hgColors[tailorConfig.headgear] ?? 0xffd700, roughness: 0.4, metalness: 0.2 })
          const topY = 0.38 * bodyScale
          if (tailorConfig.headgear === 'crown') {
            const cg = new THREE.CylinderGeometry(0.18, 0.22, 0.14, 6, 1, true)
            const c = new THREE.Mesh(cg, hgMat); c.position.set(0, topY + 0.07, 0)
            meshGroup.add(c)
          } else if (tailorConfig.headgear === 'wizard-hat') {
            const cg = new THREE.ConeGeometry(0.18, 0.35, 8)
            const c = new THREE.Mesh(cg, hgMat); c.position.set(0, topY + 0.17, 0)
            meshGroup.add(c)
          } else if (tailorConfig.headgear === 'halo') {
            const rg = new THREE.TorusGeometry(0.2, 0.03, 8, 24)
            const r = new THREE.Mesh(rg, hgMat); r.position.set(0, topY + 0.18, 0)
            meshGroup.add(r)
          } else if (tailorConfig.headgear === 'antennae') {
            const sg = new THREE.SphereGeometry(0.05, 8, 8)
            const sm = new THREE.MeshLambertMaterial({ color: 0x60a5fa })
            const cyl = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6)
            const cylm = new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
            const stickL = new THREE.Mesh(cyl, cylm); stickL.position.set(-0.12, topY + 0.1, 0)
            const stickR = new THREE.Mesh(cyl, cylm); stickR.position.set(0.12, topY + 0.1, 0)
            const ballL = new THREE.Mesh(sg, sm); ballL.position.set(-0.12, topY + 0.22, 0)
            const ballR = new THREE.Mesh(sg, sm); ballR.position.set(0.12, topY + 0.22, 0)
            meshGroup.add(stickL, stickR, ballL, ballR)
          }
        }

        // ── Ear piece ──
        if (tailorConfig.earPiece && tailorConfig.earPiece !== 'none') {
          const epColors: Record<string, number> = {
            tech: 0x64748b, headphones: 0x1e293b, 'cat-ears': 0xfbbf24
          }
          const epMat = new THREE.MeshStandardMaterial({ color: epColors[tailorConfig.earPiece] ?? 0x888899, roughness: 0.6, metalness: 0.2 })
          const x = 0.4 * bodyScale
          if (tailorConfig.earPiece === 'cat-ears') {
            const cg = new THREE.ConeGeometry(0.07, 0.14, 4)
            const eL = new THREE.Mesh(cg, epMat); eL.position.set(-x, 0.28, 0)
            const eR = new THREE.Mesh(cg, epMat); eR.position.set(x, 0.28, 0)
            meshGroup.add(eL, eR)
          } else {
            const eg = new THREE.BoxGeometry(0.07, 0.1, 0.07)
            const eL = new THREE.Mesh(eg, epMat); eL.position.set(-x, 0.08, 0)
            const eR = new THREE.Mesh(eg, epMat); eR.position.set(x, 0.08, 0)
            meshGroup.add(eL, eR)
          }
        }

        scene.add(meshGroup)

        const animType = tailorConfig.animation ?? 'rotate'
        let t = 0
        const animate = () => {
          if (disposed) return
          frameId = requestAnimationFrame(animate)
          t += 0.016
          // Animations identiques à The Tailor (useFrame)
          meshGroup.rotation.y = 0
          meshGroup.position.y = 0
          meshGroup.rotation.z = 0
          if (animType === 'rotate') {
            meshGroup.rotation.y += 0.005
          } else if (animType === 'bounce') {
            meshGroup.position.y = Math.sin(t * 2) * 0.15
          } else if (animType === 'float') {
            meshGroup.position.y = Math.sin(t * 0.8) * 0.1
            meshGroup.rotation.y += 0.001
          } else if (animType === 'wiggle') {
            meshGroup.rotation.z = Math.sin(t * 3) * 0.15
          } else {
            // default: rotate
            meshGroup.rotation.y += 0.005
          }
          renderer.render(scene, camera)
        }
        animate()

        return () => {
          disposed = true
          cancelAnimationFrame(frameId)
          renderer.dispose()
        }
      } catch {
        // Three.js indisponible — canvas reste vide, le parent affichera le fallback
      }
    }

    const cleanup = init()
    return () => { disposed = true; cancelAnimationFrame(frameId); cleanup.then(fn => fn?.()) }
  }, [tailorConfig, fallbackColor])

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        pointerEvents: 'none',
      }}
    />
  )
}

/**
 * Avatar visuel pour les agents sur le canvas.
 * Priorité : TailorCanvas (Three.js) > img PNG > emoji > initiales
 */
function AgentBubble({
  name,
  isWorking,
  tailorUrl,
  tailorConfig,
}: {
  name: string
  isWorking: boolean
  tailorUrl?: string
  tailorConfig?: AvatarConfig | null
}) {
  const key = name.toLowerCase()
  const meta = AGENT_META[key] ?? { emoji: '🤖', color: '#fff', glow: 'rgba(255,255,255,0.2)' }

  const isMobile = typeof navigator !== 'undefined'
    && (navigator.maxTouchPoints > 0 || window.innerWidth < 768)

  // Priorité (intentionnelle) :
  // 1. TailorCanvas 3D lightweight — si tailorConfig existe et desktop
  // 2. tailorUrl PNG — fallback si pas de config (ancien format) ou mobile
  // 3. emoji — dernier recours
  const showTailor = !isMobile && !!tailorConfig
  const showPng = !showTailor && !!tailorUrl

  return (
    <motion.div
      animate={isWorking ? { boxShadow: [`0 0 0 0 ${meta.glow}`, `0 0 0 12px transparent`] } : {}}
      transition={isWorking ? { repeat: Infinity, duration: 1.2, ease: 'easeOut' } : {}}
      style={{
        width: 64, height: 64,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        background: (showTailor || showPng)
          ? 'transparent'
          : `radial-gradient(circle at 35% 35%, ${meta.color}55, ${meta.color}22)`,
        border: `2px solid ${meta.color}88`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
        boxShadow: isWorking ? `0 0 16px ${meta.glow}` : `0 2px 8px rgba(0,0,0,0.4)`,
      }}
    >
      {showTailor ? (
        <TailorCanvas tailorConfig={tailorConfig!} fallbackColor={meta.color} />
      ) : showPng ? (
        <img
          src={tailorUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        meta.emoji
      )}
    </motion.div>
  )
}

/**
 * Génère une config avatar déterministe basée sur le nom de l'agent.
 * Même nom → même avatar (pas aléatoire).
 *
 * @param name - Nom de l'agent
 * @returns AvatarConfig déterministe
 */

interface CanvasAgentAvatarProps {
  agent: CanvasAgent
  canvasScale: number
  onChat?: (agent: CanvasAgent) => void
  onEdit?: (agent: CanvasAgent) => void
}

/**
 * Avatar draggable d'un agent sur le canvas.
 *
 * Deux modes :
 * - **Idle** : l'agent est draggable, positionné sur le canvas selon `agent.position`.
 * - **Working** : quand `agent.working_on_project` est défini, l'agent se déplace
 *   automatiquement (style Warcraft 3) vers la ProjectCard correspondante, sous
 *   celle-ci, aligné avec les autres agents qui travaillent sur le même projet.
 *   Le drag est désactivé pendant ce mode.
 *
 * Le déplacement utilise une animation Framer Motion spring lente et fluide
 * (stiffness 60) pour l'aller, et plus rapide (stiffness 120) pour le retour.
 */
export function CanvasAgentAvatar({ agent, canvasScale, onChat, onEdit }: CanvasAgentAvatarProps) {
  const { projects, canvasAgents, updateAgentPosition, removeCanvasAgent, currentUser, pushOverlapping, setAgentWorkingOn } = useLaunchpadStore()
  const [hovered, setHovered] = useState(false)

  // Local drag state for smooth visual feedback (no Supabase on every frame)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, agentX: 0, agentY: 0 })

  const isAdmin = currentUser?.role === 'admin'
  const isOwner = currentUser?.username === agent.owner
  const canEdit = isAdmin || isOwner

  // ── Warcraft-style movement ────────────────────────────────────────────────

  /** Projet sur lequel l'agent travaille actuellement. */
  const targetProject = agent.working_on_project
    ? projects.find(p => p.id === agent.working_on_project)
    : null

  const isWorking = !!targetProject

  /**
   * Index de cet agent parmi tous ceux qui travaillent sur le même projet.
   * Permet de les aligner horizontalement sans chevauchement.
   */
  const workingAgentIndex = agent.working_on_project
    ? canvasAgents
        .filter(a => a.working_on_project === agent.working_on_project)
        .findIndex(a => a.id === agent.id)
    : 0

  /**
   * Position d'affichage calculée.
   * - En mode working : sous la ProjectCard, décalée selon l'index.
   * - En mode idle : position de drag ou position persistée.
   */
  const displayX = targetProject
    ? targetProject.position.x + 10 + (workingAgentIndex * 44)
    : (dragPos?.x ?? agent.position.x)

  const displayY = targetProject
    ? targetProject.position.y + 195  // juste sous la carte (hauteur ~180px + marge)
    : (dragPos?.y ?? agent.position.y)

  // ── Détection du mouvement pour l'effet "marche" ──────────────────────────

  /** Indique si l'agent est en cours de déplacement (pour l'animation de marche). */
  const [isMoving, setIsMoving] = useState(false)
  const prevPosRef = useRef({ x: displayX, y: displayY })

  useEffect(() => {
    const moved =
      Math.abs(displayX - prevPosRef.current.x) > 2 ||
      Math.abs(displayY - prevPosRef.current.y) > 2
    if (moved) {
      setIsMoving(true)
      prevPosRef.current = { x: displayX, y: displayY }
      const t = setTimeout(() => setIsMoving(false), 800)
      return () => clearTimeout(t)
    }
  }, [displayX, displayY])

  // ── Drag handler ──────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isWorking) return // ne pas drag un agent qui travaille
    e.stopPropagation()
    e.preventDefault()
    isDragging.current = true
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      agentX: agent.position.x,
      agentY: agent.position.y,
    }

    let rafId: number | null = null
    const lastPosRef = { x: agent.position.x, y: agent.position.y }

    const onUpMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
        const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
        lastPosRef.x = dragStart.current.agentX + dx
        lastPosRef.y = dragStart.current.agentY + dy
        setDragPos({ x: lastPosRef.x, y: lastPosRef.y })
      })
    }

    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setDragPos(null)
      updateAgentPosition(agent.id, lastPosRef.x, lastPosRef.y).then(() => {
        pushOverlapping(agent.id, lastPosRef.x, lastPosRef.y)
      })
      window.removeEventListener('mousemove', onUpMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onUpMove)
    window.addEventListener('mouseup', onUp)
  }, [agent.id, agent.position.x, agent.position.y, canvasScale, updateAgentPosition, pushOverlapping, isWorking])

  // Void reference to prevent unused variable warning
  void setAgentWorkingOn

  return (
    <motion.div
      data-no-drag
      className="canvas-agent-avatar"
      initial={false}
      animate={{
        x: displayX,
        y: displayY,
        scale: isWorking ? 0.85 : 1,
        rotate: isMoving ? [-2, 2, -2] : 0,
      }}
      transition={
        isMoving
          ? { rotate: { repeat: Infinity, duration: 0.3, ease: 'easeInOut' },
              x: { type: 'spring', stiffness: isWorking ? 60 : 120, damping: isWorking ? 18 : 20, mass: isWorking ? 1.2 : 1 },
              y: { type: 'spring', stiffness: isWorking ? 60 : 120, damping: isWorking ? 18 : 20, mass: isWorking ? 1.2 : 1 },
              scale: { type: 'spring', stiffness: 120, damping: 20 },
            }
          : {
              type: 'spring',
              stiffness: isWorking ? 60 : 120,
              damping: isWorking ? 18 : 20,
              mass: isWorking ? 1.2 : 1,
            }
      }
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: isWorking ? 'default' : (isDragging.current ? 'grabbing' : 'grab'),
        userSelect: 'none',
        filter: isWorking
          ? 'drop-shadow(0 0 8px rgba(225,31,123,0.6))'
          : hovered ? 'drop-shadow(0 4px 16px rgba(225,31,123,0.35))' : 'none',
        transition: isWorking ? 'filter 1s ease-in-out' : 'filter 0.2s',
        zIndex: isDragging.current ? 500 : 10,
      }}
    >
      {/* Avatar — screenshot Tailor si disponible, sinon emoji */}
      <div className="canvas-agent-avatar__figure" style={{ position: 'relative' }}>
        <AgentBubble name={agent.name} isWorking={isWorking} tailorUrl={agent.tailorUrl} tailorConfig={agent.tailor_config} />



        {/* Indicateur visuel de déplacement */}
        {isMoving && isWorking && (
          <motion.div
            animate={{ opacity: [0.6, 0], scale: [1, 1.5] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(225,31,123,0.3)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Actions on hover — edit visible for admin or owner */}
        {hovered && canEdit && (
          <>
            <button
              className="canvas-agent-avatar__btn canvas-agent-avatar__btn--edit"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit?.(agent) }}
              title="Modifier l'agent"
              style={{
                position: 'absolute', top: -8, left: -8,
                width: 22, height: 22, borderRadius: '50%',
                background: '#6366F1', border: '2px solid #0B090D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', cursor: 'pointer', padding: 0,
              }}
            >
              ✏️
            </button>
            {/* Delete only for non-system agents */}
            {!agent.is_system && (
              <button
                className="canvas-agent-avatar__btn canvas-agent-avatar__btn--delete"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); removeCanvasAgent(agent.id) }}
                title="Supprimer l'agent"
                style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#EF4444', border: '2px solid #0B090D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#fff', cursor: 'pointer', lineHeight: 1, padding: 0,
                }}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>

      {/* Name tag + chat button */}
      <div className="canvas-agent-avatar__label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => onChat?.(agent)}
            title={`Discuter avec ${agent.name}`}
            style={{
              background: 'rgba(26,23,28,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
              cursor: onChat ? 'pointer' : 'default',
            }}
          >
            {agent.name}
          </div>

          {onChat && (
            <button
              className="canvas-agent-avatar__chat-btn"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onChat(agent) }}
              title="Ouvrir le chat"
              style={{
                background: 'rgba(225,31,123,0.15)',
                border: '1px solid rgba(225,31,123,0.3)',
                borderRadius: 6,
                padding: '3px 7px',
                fontSize: 12,
                cursor: 'pointer',
                color: '#E11F7B',
              }}
            >
              💬
            </button>
          )}
        </div>

        {/* Working badge — ⚡ quand en mouvement, 🔨 quand arrivé */}
        {isWorking && (
          <motion.div
            animate={isMoving ? { opacity: [1, 0.5, 1] } : {}}
            transition={isMoving ? { repeat: Infinity, duration: 0.6 } : {}}
            style={{
              background: 'rgba(225,31,123,0.2)',
              border: '1px solid rgba(225,31,123,0.4)',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 700,
              color: '#E11F7B',
              whiteSpace: 'nowrap',
            }}
          >
            {isMoving ? '⚡ en route' : '🔨 en cours'}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
