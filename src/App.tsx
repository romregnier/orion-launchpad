import { useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLaunchpadStore } from './store'
import { ProjectCard } from './components/ProjectCard'
import { AddProjectModal } from './components/AddProjectModal'
import { Toolbar } from './components/Toolbar'

const MIN_SCALE = 0.2
const MAX_SCALE = 2.5
const SCALE_STEP = 0.15

export default function App() {
  const { projects, fetchRemote, remoteLoaded } = useLaunchpadStore()
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const panStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Center canvas and fetch remote projects on mount
  useEffect(() => {
    setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 })
    fetchRemote()
  }, [fetchRemote])

  // Pan: middle mouse button or Alt+drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && !e.altKey) return
    e.preventDefault()
    setIsPanning(true)
    panStart.current = { mouseX: e.clientX, mouseY: e.clientY, offsetX: offset.x, offsetY: offset.y }

    const onMove = (ev: MouseEvent) => {
      setOffset({
        x: panStart.current.offsetX + (ev.clientX - panStart.current.mouseX),
        y: panStart.current.offsetY + (ev.clientY - panStart.current.mouseY),
      })
    }
    const onUp = () => {
      setIsPanning(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [offset])

  // Scroll to zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + delta).toFixed(2))))
  }, [])

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))
  const resetView = () => {
    setScale(1)
    setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 })
  }

  // Default position for new card: visible center of viewport
  const newCardPosition = {
    x: (window.innerWidth / 2 - offset.x) / scale - 130,
    y: (window.innerHeight / 2 - offset.y) / scale - 120,
  }

  return (
    <div
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      {/* Dot-grid background */}
      <div
        className="canvas-bg"
        style={{
          position: 'absolute', inset: 0,
          backgroundPosition: `${((offset.x % (32 * scale)) + 32 * scale) % (32 * scale)}px ${((offset.y % (32 * scale)) + 32 * scale) % (32 * scale)}px`,
          backgroundSize: `${32 * scale}px ${32 * scale}px`,
        }}
      />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(225,31,123,0.05) 0%, transparent 70%)',
      }} />

      {/* Canvas transform layer */}
      <div
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          cursor: isPanning ? 'grabbing' : 'default',
        }}
      >
        <AnimatePresence>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canvasScale={scale}
            />
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {remoteLoaded && projects.length === 0 && (
          <div style={{
            position: 'absolute', left: 400, top: 260,
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌟</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Launchpad vide</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)' }}>Cliquez sur + Ajouter pour démarrer</p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {!remoteLoaded && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌟</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Chargement des projets…</p>
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      <Toolbar
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onAdd={() => setShowAdd(true)}
        projectCount={projects.length}
      />

      {/* Navigation hint */}
      <div style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: 'rgba(255,255,255,0.18)', pointerEvents: 'none',
        letterSpacing: '0.05em', whiteSpace: 'nowrap',
      }}>
        Scroll pour zoomer · Alt+drag pour naviguer · Drag pour repositionner
      </div>

      {/* Add modal */}
      <AddProjectModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        defaultPosition={newCardPosition}
      />
    </div>
  )
}
