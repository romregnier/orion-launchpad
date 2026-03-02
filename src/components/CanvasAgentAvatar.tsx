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

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
        renderer.setSize(64, 64)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = false

        const scene = new THREE.Scene()

        // Caméra 1:1 (canvas carré)
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
        camera.position.set(0, 0.2, 2.5)
        camera.lookAt(0, 0, 0)

        // Éclairage
        const ambient = new THREE.AmbientLight(0xffffff, 0.8)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
        dirLight.position.set(-1, 2, 1)
        dirLight.castShadow = false
        scene.add(ambient, dirLight)

        // Couleur depuis tailor_config
        const hsl = tailorConfig.color
        const colorHex = hsl
          ? `hsl(${hsl.h}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`
          : fallbackColor
        const color = new THREE.Color(colorHex)

        // Corps principal (capsule Kirby-style)
        const bodyScale = tailorConfig.bodyScale ?? 1
        const bodyGeo = new THREE.SphereGeometry(0.38 * bodyScale, 24, 24)
        const bodyMat = new THREE.MeshLambertMaterial({ color })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.y = -0.05

        // Yeux (deux petites sphères blanches)
        const eyeGeo = new THREE.SphereGeometry(0.08, 12, 12)
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
        const eyePupilMat = new THREE.MeshLambertMaterial({ color: 0x111111 })
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
        const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyePupilMat)
        const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyePupilMat)

        eyeL.position.set(-0.14, 0.12, 0.32)
        eyeR.position.set(0.14, 0.12, 0.32)
        pupilL.position.set(-0.14, 0.12, 0.38)
        pupilR.position.set(0.14, 0.12, 0.38)

        // Groupe maître
        const meshGroup = new THREE.Group()
        meshGroup.add(body, eyeL, eyeR, pupilL, pupilR)
        scene.add(meshGroup)

        let t = 0
        const animate = () => {
          if (disposed) return
          frameId = requestAnimationFrame(animate)
          t += 0.016
          meshGroup.rotation.y += 0.005
          meshGroup.position.y = Math.sin(t * 1.5) * 0.05
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

  const showTailor = !isMobile && !!tailorConfig

  return (
    <motion.div
      animate={isWorking ? { boxShadow: [`0 0 0 0 ${meta.glow}`, `0 0 0 12px transparent`] } : {}}
      transition={isWorking ? { repeat: Infinity, duration: 1.2, ease: 'easeOut' } : {}}
      style={{
        width: 64, height: 64,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        background: (showTailor || tailorUrl)
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
      ) : tailorUrl ? (
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

  const ownerInitial = agent.owner.slice(0, 1).toUpperCase()

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

        {/* Owner badge */}
        <div
          className="canvas-agent-avatar__badge"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#E11F7B',
            border: '2px solid #0B090D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {ownerInitial}
        </div>

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
