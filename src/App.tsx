import { useRef, useState, useCallback, useEffect, Component, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLaunchpadStore } from './store'
import { ProjectCard } from './components/ProjectCard'
import { AddProjectModal } from './components/AddProjectModal'
import { Toolbar } from './components/Toolbar'
import { OrionAvatar3D } from './components/OrionAvatar3D'
import { ChatPanel } from './components/ChatPanel'
import { IdeaWidget } from './components/IdeaWidget'
import { ListWidgetCard } from './components/ListWidgetCard'
import { AddListModal } from './components/AddListModal'
import { GroupBar } from './components/GroupBar'
import { SettingsPanel } from './components/SettingsPanel'
import { LoginScreen } from './components/LoginScreen'
import { BuildStatusWidget } from './components/BuildStatusWidget'
import { PresenceBar } from './components/PresenceBar'
import { CanvasAgentAvatar } from './components/CanvasAgentAvatar'
import { AgentChatPanel } from './components/AgentChatPanel'
import type { CanvasAgent } from './types'

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
const SCALE_STEP = 0.15

// ── Canvas principal (séparé pour respecter les règles des hooks) ─────────────
function LaunchpadCanvas() {
  const { projects, lists, canvasAgents, subscribeToAgents, addCanvasAgent, fetchRemote, remoteLoaded, activeFilter, setFilter, activeGroup, boardName, isPrivate, currentUser, logout } = useLaunchpadStore()
  const sessionId = localStorage.getItem('launchpad_session') ?? ''

  const [showTailorModal, setShowTailorModal] = useState(false)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddList, setShowAddList] = useState(false)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [agentNameInput, setAgentNameInput] = useState('')
  const [chatAgent, setChatAgent] = useState<CanvasAgent | null>(null)
  const panStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const touchState = useRef<{ touches: React.Touch[]; lastDist: number; lastMid: { x: number; y: number } } | null>(null)

  useEffect(() => {
    setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 })
    fetchRemote()
  }, [fetchRemote])

  useEffect(() => {
    const unsub = subscribeToAgents()
    return unsub
  }, [subscribeToAgents])

  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags ?? [])))
  const visibleProjects = projects.filter(p => {
    const groupMatch = !activeGroup || p.groupId === activeGroup
    const tagMatch = !activeFilter || (p.tags ?? []).includes(activeFilter)
    return groupMatch && tagMatch
  })

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = { touches: Array.from(e.touches), lastDist: 0, lastMid: { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      touchState.current = { touches: Array.from(e.touches), lastDist: Math.hypot(dx, dy), lastMid: { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 } }
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
            setOffset(o => ({ x: o.x - mx * (newScale / s - 1) + (mid.x - prevMid.x), y: o.y - my * (newScale / s - 1) + (mid.y - prevMid.y) }))
            return newScale
          })
        }
      }
      touchState.current.lastDist = dist
      touchState.current.lastMid = mid
    }
  }, [])

  const onTouchEnd = useCallback(() => { touchState.current = null }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    if ((e.target as HTMLElement).closest('[data-no-drag], .project-card, button, a, input, textarea')) return
    e.preventDefault()
    setIsPanning(true)
    panStart.current = { mouseX: e.clientX, mouseY: e.clientY, offsetX: offset.x, offsetY: offset.y }
    const onMove = (ev: MouseEvent) => { setOffset({ x: panStart.current.offsetX + (ev.clientX - panStart.current.mouseX), y: panStart.current.offsetY + (ev.clientY - panStart.current.mouseY) }) }
    const onUp = () => { setIsPanning(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [offset])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    setScale((s) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta))
      setOffset(o => ({ x: o.x - mouseX * (newScale / s - 1), y: o.y - mouseY * (newScale / s - 1) }))
      return newScale
    })
  }, [])

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))
  const resetView = () => { setScale(1); setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 }) }
  const newCardPosition = { x: (window.innerWidth / 2 - offset.x) / scale - 130, y: (window.innerHeight / 2 - offset.y) / scale - 120 }

  return (
    <div
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', touchAction: 'none' }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="canvas-bg" style={{ position: 'absolute', inset: 0, backgroundPosition: `${((offset.x % (32 * scale)) + 32 * scale) % (32 * scale)}px ${((offset.y % (32 * scale)) + 32 * scale) % (32 * scale)}px`, backgroundSize: `${32 * scale}px ${32 * scale}px` }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(225,31,123,0.05) 0%, transparent 70%)' }} />

      <div ref={canvasRef} style={{ position: 'absolute', inset: 0, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', cursor: isPanning ? 'grabbing' : 'grab' }}>
        <AnimatePresence>
          {visibleProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} canvasScale={scale} index={index} />
          ))}
        </AnimatePresence>
        {lists.map((list) => (
          <ListWidgetCard key={list.id} list={list} canvasScale={scale} sessionId={sessionId} />
        ))}
        <IdeaWidget canvasScale={scale} index={visibleProjects.length} />
        {canvasAgents.map(agent => (
          <CanvasAgentAvatar key={agent.id} agent={agent} canvasScale={scale} onChat={setChatAgent} />
        ))}
        {remoteLoaded && projects.length === 0 && (
          <div style={{ position: 'absolute', left: 400, top: 260, transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌟</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Launchpad vide</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)' }}>Cliquez sur + Ajouter pour démarrer</p>
          </div>
        )}
      </div>

      {!remoteLoaded && (
        <motion.div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌟</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Chargement des projets…</p>
          </div>
        </motion.div>
      )}

      <Toolbar scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} onRefresh={() => fetchRemote()} onAdd={() => setShowAdd(true)} onAddList={() => setShowAddList(true)} onAddAgent={() => { setAgentNameInput(''); setShowAddAgent(true) }} projectCount={projects.length} />

      <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 35, userSelect: 'none', pointerEvents: 'none' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{boardName}</span>
      </div>

      {isPrivate && currentUser && (
        <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(22,18,26,0.9)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>👤 {currentUser.username}</span>
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#E11F7B', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>Déconnexion</button>
        </div>
      )}

      <div style={{ position: 'fixed', top: 46, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,12,20,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999, zIndex: 40 }}>
        <GroupBar />
      </div>

      {allTags.length > 0 && (
        <div style={{ position: 'fixed', top: 92, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap', padding: '6px 10px', background: 'rgba(15,12,20,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999, zIndex: 40 }}>
          <button onClick={() => setFilter(null)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: !activeFilter ? '#E11F7B' : 'rgba(255,255,255,0.07)', color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.4)' }}>Tous</button>
          {allTags.map((tag) => {
            const active = activeFilter === tag
            let hash = 0; for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff
            const colors = ['#E11F7B','#7C3AED','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4']
            const c = colors[Math.abs(hash) % colors.length]
            return <button key={tag} onClick={() => setFilter(active ? null : tag)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, border: `1px solid ${active ? c : `${c}44`}`, cursor: 'pointer', background: active ? `${c}22` : 'transparent', color: active ? c : 'rgba(255,255,255,0.4)' }}>{tag}</button>
          })}
        </div>
      )}

      <AddListModal open={showAddList} onClose={() => setShowAddList(false)} />
      <AddProjectModal open={showAdd} onClose={() => setShowAdd(false)} defaultPosition={newCardPosition} />

      <div style={{ position: 'fixed', bottom: 100, left: 20, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <ErrorBoundary fallback={<div style={{ fontSize: 32 }}>🌟</div>}>
          <OrionAvatar3D size={80} />
        </ErrorBoundary>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowTailorModal(true)} style={{ background: 'rgba(22,18,26,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 4 }}>
          ✂️ Personnaliser
        </motion.button>
      </div>

      <AnimatePresence>
        {showTailorModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTailorModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 490 }} />
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, pointerEvents: 'none' }}>
              <div style={{ width: 'min(900px, calc(100vw - 32px))', height: 'min(620px, calc(100vh - 80px))', background: '#0B090D', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', pointerEvents: 'all' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(22,18,26,0.95)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✂️</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>The Tailor</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Personnalise ton avatar Orion</span>
                  </div>
                  <button onClick={() => setShowTailorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 20, lineHeight: 1 }}>×</button>
                </div>
                <iframe src="https://the-tailor.surge.sh" style={{ flex: 1, border: 'none', width: '100%' }} title="The Tailor" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChatPanel />
      <SettingsPanel />
      <PresenceBar currentUser={currentUser} />
      <BuildStatusWidget />

      {/* Agent chat panel */}
      <AnimatePresence>
        {chatAgent && (
          <AgentChatPanel
            agent={chatAgent}
            currentUser={currentUser?.username ?? 'visiteur'}
            onClose={() => setChatAgent(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddAgent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddAgent(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 490 }} />
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 500, background: '#1A171C', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 320, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>＋ Ajouter un agent</h3>
              <input autoFocus value={agentNameInput} onChange={e => setAgentNameInput(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && agentNameInput.trim()) { await addCanvasAgent(agentNameInput.trim()); setShowAddAgent(false) }
                  if (e.key === 'Escape') setShowAddAgent(false)
                }}
                placeholder="Nom de l'agent (ex: Nova, Forge…)"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setShowAddAgent(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
                <button onClick={async () => { if (agentNameInput.trim()) { await addCanvasAgent(agentNameInput.trim()); setShowAddAgent(false) } }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'linear-gradient(135deg, #F59E0B, #d97706)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Ajouter</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── App root — auth routing uniquement ────────────────────────────────────────
export default function App() {
  const { isPrivate, currentUser, fetchRemote } = useLaunchpadStore()

  // Charger isPrivate depuis Supabase au démarrage
  useEffect(() => {
    fetchRemote()
  }, [fetchRemote])

  if (isPrivate && !currentUser) return <LoginScreen />
  return <LaunchpadCanvas />
}
