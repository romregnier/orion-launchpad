import { useRef, useState, useCallback, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'
import { useLaunchpadStore } from './store'
import { ProjectCard } from './components/ProjectCard'
import { AddProjectModal } from './components/AddProjectModal'
import { Toolbar } from './components/Toolbar'
import { ChatPanel } from './components/ChatPanel'
// IdeaWidget supprimé — le système de listes remplace les idées fixes
import { ListWidgetCard } from './components/ListWidgetCard'
import { AddListModal } from './components/AddListModal'
import { GroupBar } from './components/GroupBar'
import { SettingsPanel } from './components/SettingsPanel'
import { LoginScreen } from './components/LoginScreen'
import { BuildStatusWidget } from './components/BuildStatusWidget'
import { PresenceBar } from './components/PresenceBar'
import { CanvasAgentAvatar } from './components/CanvasAgentAvatar'
import { AgentChatPanel } from './components/AgentChatPanel'
import { BotModal } from './components/BotModal'
// WorkProgressBar supprimé — remplacé par BuildStatusWidget (bottom right)
import type { CanvasAgent } from './types'


const MIN_SCALE = 0.2
const MAX_SCALE = 2.5
const SCALE_STEP = 0.15

// ── Canvas principal (séparé pour respecter les règles des hooks) ─────────────
function LaunchpadCanvas() {
  const { projects, lists, canvasAgents, subscribeToAgents, subscribeToPositions, subscribeToBuildTasks, subscribeToProjects, subscribeToIdeas, subscribeToLists, fetchProjectMetadata, tidyUp, remoteLoaded, activeFilter, setFilter, activeGroup, boardName, isPrivate, currentUser, logout, refreshAll } = useLaunchpadStore()
  const sessionId = localStorage.getItem('launchpad_session') ?? ''

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddList, setShowAddList] = useState(false)
  const [showGlobalChat, setShowGlobalChat] = useState(false)
  const [chatAgent, setChatAgent] = useState<CanvasAgent | null>(null)
  const [showBotModal, setShowBotModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<CanvasAgent | null>(null)
  const panStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const touchState = useRef<{ touches: React.Touch[]; lastDist: number; lastMid: { x: number; y: number } } | null>(null)
  const hasAutoFitted = useRef(false)

  useEffect(() => {
    setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 })
  }, [])

  // Auto-fit : centrer la vue sur les projets + agents une seule fois au chargement
  useEffect(() => {
    if (remoteLoaded && !hasAutoFitted.current) {
      hasAutoFitted.current = true
      // Offset centré sur les projets (qui sont à y≈60-350), assez bas pour voir les agents (y≈520)
      setOffset({ x: 60, y: 20 })
      setScale(0.85)
    }
  }, [remoteLoaded])

  useEffect(() => {
    const unsubProjects = subscribeToProjects()
    const unsubAgents = subscribeToAgents()
    const unsubPos = subscribeToPositions()
    const unsubTasks = subscribeToBuildTasks()
    const unsubIdeas = subscribeToIdeas()
    const unsubLists = subscribeToLists()
    fetchProjectMetadata()
    return () => { unsubProjects(); unsubAgents(); unsubPos(); unsubTasks(); unsubIdeas(); unsubLists() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags ?? [])))
  // Safety net : si activeGroup ne matche aucun projet, ignorer le filtre groupe
  const hasGroupMatch = !activeGroup || projects.some(p => p.groupId === activeGroup)
  const visibleProjects = projects.filter(p => {
    const groupMatch = !activeGroup || !hasGroupMatch || p.groupId === activeGroup
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
      data-projects={projects.length}
      data-agents={canvasAgents.length}
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
          <ListWidgetCard key={list.id} list={list} canvasScale={scale} sessionId={sessionId} isAdmin={currentUser?.role === 'admin'} />
        ))}
        {/* IdeaWidget retiré — utiliser "+ Liste" dans la toolbar pour créer des listes d'idées */}
        {/* BuildStatusWidget — flottant sur le canvas, draggable */}
        <BuildStatusWidget canvasScale={scale} />
        {canvasAgents.map(agent => (
          <CanvasAgentAvatar
            key={agent.id} agent={agent} canvasScale={scale}
            onChat={setChatAgent}
            onEdit={a => { setEditingAgent(a); setShowBotModal(true) }}
          />
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

      {/* ── Toolbar (bottom) ─────────────────────────────────────────────────── */}
      <Toolbar
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onRefresh={() => refreshAll()}
        onAdd={() => setShowAdd(true)}
        onAddList={() => setShowAddList(true)}
        onAddAgent={() => { setEditingAgent(null); setShowBotModal(true) }}
        onTidyUp={tidyUp}
        projectCount={projects.length}
        onChat={() => setShowGlobalChat(v => !v)}
      />

      {/* ── Top navbar ───────────────────────────────────────────────────────── */}
      <header
        className="launchpad-navbar"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 35,
          pointerEvents: 'none', // let canvas clicks pass through
        }}
      >
        {/* Left spacer (or future logo) */}
        <div className="launchpad-navbar__left" style={{ flex: 1 }} />

        {/* Center: board name */}
        <div className="launchpad-navbar__title" style={{ userSelect: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em' }}>
            {boardName.replace(/[\p{Emoji}]/gu, '').trim()}
          </span>
        </div>

        {/* Right: présence + user info + logout */}
        <div
          className="launchpad-navbar__right"
          style={{ flex: '0 1 auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, pointerEvents: 'all', overflow: 'hidden', minWidth: 0 }}
        >
          {/* Avatars des users connectés */}
          <PresenceBar currentUser={currentUser} />

          {/* User connecté + déconnexion */}
          {isPrivate && currentUser && (
            <div
              className="launchpad-navbar__user"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                borderRadius: 999,
                background: 'rgba(22,18,26,0.92)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                👤 {currentUser.username}
              </span>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
              <button
                onClick={logout}
                style={{
                  background: 'none', border: 'none',
                  color: '#E11F7B', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', padding: 0, whiteSpace: 'nowrap',
                }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Work progress bar ────────────────────────────────────────────────── */}
      {/* WorkProgressBar supprimé — BuildStatusWidget (bottom right) fait le même rôle */}

      {/* ── Group filter bar ─────────────────────────────────────────────────── */}
      <nav
        className="launchpad-groupbar"
        style={{
          position: 'fixed',
          top: 54, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,12,20,0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 999,
          zIndex: 40,
          maxWidth: 'calc(100vw - 32px)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <GroupBar />
      </nav>

      {/* ── Tag filter bar ───────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <nav
          className="launchpad-tagbar"
          style={{
            position: 'fixed',
            top: 96, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexWrap: 'nowrap',
            padding: '5px 10px',
            background: 'rgba(15,12,20,0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 999,
            zIndex: 40,
            maxWidth: 'calc(100vw - 32px)',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setFilter(null)}
            style={{
              padding: '3px 10px', borderRadius: 999,
              fontSize: 10, fontWeight: 700, border: 'none',
              cursor: 'pointer', flexShrink: 0,
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
            const colors = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
            const c = colors[Math.abs(hash) % colors.length]
            return (
              <button
                key={tag}
                onClick={() => setFilter(active ? null : tag)}
                style={{
                  padding: '3px 10px', borderRadius: 999,
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                  border: `1px solid ${active ? c : `${c}44`}`,
                  cursor: 'pointer',
                  background: active ? `${c}22` : 'transparent',
                  color: active ? c : 'rgba(255,255,255,0.4)',
                }}
              >
                {tag}
              </button>
            )
          })}
        </nav>
      )}

      <AddListModal open={showAddList} onClose={() => setShowAddList(false)} />
      <AddProjectModal open={showAdd} onClose={() => setShowAdd(false)} defaultPosition={newCardPosition} />

      <ChatPanel open={showGlobalChat} onClose={() => setShowGlobalChat(false)} />
      <SettingsPanel />
      {/* BuildStatusWidget déplacé dans le canvas div */}

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

      {/* Bot modal — add/edit */}
      <BotModal
        open={showBotModal}
        onClose={() => { setShowBotModal(false); setEditingAgent(null) }}
        editAgent={editingAgent}
      />
    </div>
  )
}

// ── App root — auth routing uniquement ────────────────────────────────────────
export default function App() {
  const { isPrivate, currentUser } = useLaunchpadStore()
  // authReady : true quand on sait si l'utilisateur est connecté ou non
  const [, setAuthReady] = useState(false)  // authReady retiré — plus utilisé (overlay pattern)

  useEffect(() => {
    // Timeout de sécurité : si getSession prend trop longtemps, on débloque quand même
    const timeout = setTimeout(() => setAuthReady(true), 3000)

    // 1. Vérifier la session existante immédiatement (évite le flash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.email === 'romain@rive-studio.com' ? 'admin' : 'member'
        useLaunchpadStore.setState({ currentUser: { username: session.user.email ?? '', role } })
        useLaunchpadStore.getState().fetchBoardMembers()
        useLaunchpadStore.getState().fetchProjects()
      }
      clearTimeout(timeout)
      setAuthReady(true)
    }).catch(() => { clearTimeout(timeout); setAuthReady(true) })

    // 2. Écouter les changements d'auth ultérieurs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const role = session.user.email === 'romain@rive-studio.com' ? 'admin' : 'member'
        useLaunchpadStore.setState({ currentUser: { username: session.user.email ?? '', role } })
        await supabase.from('board_members')
          .update({ status: 'active', joined_at: new Date().toISOString() })
          .eq('email', session.user.email ?? '')
          .eq('status', 'pending')
        await useLaunchpadStore.getState().fetchBoardMembers()
        // Re-fetch projects after login (initial fetch may have failed due to RLS)
        await useLaunchpadStore.getState().fetchProjects()
      }
      // NOTE : on n'efface PAS currentUser sur SIGNED_OUT automatique.
      // Supabase fire SIGNED_OUT durant les refresh de session (faux positif).
      // Le vrai logout passe par le bouton Déconnexion → logout() explicite.
    })
    return () => subscription.unsubscribe()
  }, [])

  // LaunchpadCanvas est TOUJOURS monté — les subscriptions tournent en fond.
  // Le LoginScreen est un overlay z-[1000] au-dessus du canvas, pas un remplacement.
  // Cela évite l'unmount/remount qui réinitialisait tout l'état Zustand.
  const showLoginOverlay = isPrivate && !currentUser

  return (
    <>
      <LaunchpadCanvas />
      {showLoginOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0B090D' }}>
          <LoginScreen />
        </div>
      )}
    </>
  )
}
