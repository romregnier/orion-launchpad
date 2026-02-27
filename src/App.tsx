import { useRef, useState, useCallback, useEffect, Component, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLaunchpadStore } from './store'
import { ProjectCard } from './components/ProjectCard'
import { AddProjectModal } from './components/AddProjectModal'
import { Toolbar } from './components/Toolbar'
import { OrionAvatar3D } from './components/OrionAvatar3D'
import { ChatPanel } from './components/ChatPanel'
import { IdeaWidget } from './components/IdeaWidget'
import { GroupBar } from './components/GroupBar'

// Error boundary to prevent Three.js crashes from killing the app
class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

const MIN_SCALE = 0.2
const MAX_SCALE = 2.5
const SCALE_STEP = 0.15 // used for toolbar buttons only

export default function App() {
  const { projects, fetchRemote, remoteLoaded, activeFilter, setFilter, activeGroup } = useLaunchpadStore()

  // Collect all unique tags from all projects
  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags ?? [])))

  // Filtered projects
  const visibleProjects = projects.filter(p => {
    const groupMatch = !activeGroup || p.groupId === activeGroup
    const tagMatch = !activeFilter || (p.tags ?? []).includes(activeFilter)
    return groupMatch && tagMatch
  })
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

  // Touch pan + pinch-to-zoom
  const touchState = useRef<{ touches: React.Touch[]; lastDist: number; lastMid: { x: number; y: number } } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = {
        touches: Array.from(e.touches),
        lastDist: 0,
        lastMid: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      touchState.current = {
        touches: Array.from(e.touches),
        lastDist: Math.hypot(dx, dy),
        lastMid: { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 },
      }
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!touchState.current) return

    if (e.touches.length === 1) {
      const prev = touchState.current.lastMid
      const cur = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setOffset(o => ({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }))
      touchState.current.lastMid = cur
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      const dist = Math.hypot(dx, dy)
      const mid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 }
      const prevDist = touchState.current.lastDist
      const prevMid = touchState.current.lastMid

      if (prevDist > 0) {
        const pinchRatio = dist / prevDist
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const mx = mid.x - rect.left
          const my = mid.y - rect.top
          setScale(s => {
            const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * pinchRatio))
            setOffset(o => ({
              x: o.x - mx * (newScale / s - 1) + (mid.x - prevMid.x),
              y: o.y - my * (newScale / s - 1) + (mid.y - prevMid.y),
            }))
            return newScale
          })
        }
      }
      touchState.current.lastDist = dist
      touchState.current.lastMid = mid
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    touchState.current = null
  }, [])

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

  // Scroll to zoom (cursor-centered)
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    setScale((s) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta))
      setOffset(o => ({
        x: o.x - mouseX * (newScale / s - 1),
        y: o.y - mouseY * (newScale / s - 1),
      }))
      return newScale
    })
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
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', touchAction: 'none' }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
          {visibleProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              canvasScale={scale}
              index={index}
            />
          ))}
        </AnimatePresence>

        {/* IdeaWidget — fixed position on canvas */}
        <IdeaWidget
          canvasScale={scale}
          index={visibleProjects.length}
        />

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
        onRefresh={() => fetchRemote()}
        onAdd={() => setShowAdd(true)}
        projectCount={projects.length}
      />

      {/* Navigation hint */}
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: 'rgba(255,255,255,0.15)', pointerEvents: 'none',
        letterSpacing: '0.05em', whiteSpace: 'nowrap',
      }}>
        <span className="hidden sm:inline">Scroll pour zoomer · Alt+drag pour naviguer</span>
        <span className="sm:hidden">Pincer pour zoomer · Glisser pour naviguer</span>
      </div>

      {/* Group filter bar */}
      <div style={{
        position: 'fixed', top: 36, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(15,12,20,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999,
        zIndex: 40,
      }}>
        <GroupBar />
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap',
          padding: '6px 10px',
          background: 'rgba(15,12,20,0.85)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999,
          zIndex: 40,
        }}>
          <button
            onClick={() => setFilter(null)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.03em',
              background: !activeFilter ? '#E11F7B' : 'rgba(255,255,255,0.07)',
              color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            Tous
          </button>
          {allTags.map((tag) => {
            const active = activeFilter === tag
            let hash = 0
            for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff
            const colors = ['#E11F7B','#7C3AED','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4']
            const c = colors[Math.abs(hash) % colors.length]
            return (
              <button key={tag} onClick={() => setFilter(active ? null : tag)}
                style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  border: `1px solid ${active ? c : `${c}44`}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? `${c}22` : 'transparent',
                  color: active ? c : 'rgba(255,255,255,0.4)',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      <AddProjectModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        defaultPosition={newCardPosition}
      />

      {/* Orion 3D Avatar — wrapped in error boundary in case WebGL is unavailable */}
      <ErrorBoundary fallback={
        <div style={{ position: 'fixed', bottom: 24, left: 24, width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#E11F7B,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, zIndex: 200, boxShadow: '0 0 20px rgba(225,31,123,0.4)' }}>🌟</div>
      }>
        <OrionAvatar3D />
      </ErrorBoundary>

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  )
}
