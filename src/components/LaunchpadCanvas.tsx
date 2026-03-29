/**
 * LaunchpadCanvas — Whiteboard canvas principal
 * Extrait de App.tsx (TK-0160) — fonctionne identiquement
 * Rendu dans <main> de AppShell (flex:1), les éléments fixed sont offset de --nav-width
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'
import { ProjectCard } from './ProjectCard'
import { AddProjectModal } from './AddProjectModal'
import { Toolbar } from './Toolbar'
import { ChatPanel } from './ChatPanel'
import { ListWidgetCard } from './ListWidgetCard'
import { AddListModal } from './AddListModal'
import { GroupBar } from './GroupBar'
import { PresenceBar } from './PresenceBar'
import { CanvasAgentAvatar } from './CanvasAgentAvatar'
import { AgentChatPanel } from './AgentChatPanel'
import { BotModal } from './BotModal'
import { GalaxyCanvas } from './GalaxyCanvas'
import { NebulaOverlay } from './NebulaBackground'
import { CapsuleSwitcher } from './CapsuleSwitcher'
import { MobileBottomNav } from './MobileBottomNav'
import type { CanvasAgent } from '../types'

const MIN_SCALE = 0.2
const MAX_SCALE = 2.5
const SCALE_STEP = 0.15

// ── LoadingTimeout ────────────────────────────────────────────────────────────
function LoadingTimeout() {
  const { fetchProjects } = useLaunchpadStore()
  const [tick, setTick] = useState(6)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t - 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (tick <= 0) {
      useLaunchpadStore.setState({ remoteLoaded: false })
      fetchProjects()
    }
  }, [tick, fetchProjects])

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌟</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          {tick > 0 ? 'Chargement des projets…' : 'Connexion…'}
        </p>
      </div>
    </div>
  )
}

// ── Agent budget type ─────────────────────────────────────────────────────────
interface AgentBudget {
  agent_key: string
  monthly_token_limit: number
  monthly_usd_limit: number
  tokens_used_mtd: number
  usd_used_mtd: number
}

// ── LaunchpadCanvas ───────────────────────────────────────────────────────────
export function LaunchpadCanvas() {
  const {
    projects, lists, canvasAgents,
    subscribeToAgents, subscribeToPositions, subscribeToBuildTasks,
    subscribeToProjects, subscribeToIdeas, subscribeToLists,
    fetchProjectMetadata, fetchPublicSettings, tidyUp,
    remoteLoaded, activeFilter, setFilter, activeGroup,
    boardName, isPrivate, currentUser, logout, fetchCapsules, lastNewAgentId,
  } = useLaunchpadStore()
  const sessionId = localStorage.getItem('launchpad_session') ?? ''

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddList, setShowAddList] = useState(false)
  const [showGlobalChat, setShowGlobalChat] = useState(false)
  const [chatAgent, setChatAgent] = useState<CanvasAgent | null>(null)
  const [showBotModal, setShowBotModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<CanvasAgent | null>(null)
  const [agentBudgetPcts, setAgentBudgetPcts] = useState<Record<string, number>>({})
  const panStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const touchState = useRef<{ touches: React.Touch[]; lastDist: number; lastMid: { x: number; y: number } } | null>(null)
  const hasAutoFitted = useRef(false)

  useEffect(() => {
    setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 })
  }, [])

  useEffect(() => {
    if (remoteLoaded && !hasAutoFitted.current) {
      hasAutoFitted.current = true
      setOffset({ x: 40, y: 10 })
      setScale(0.75)
    }
  }, [remoteLoaded])

  useEffect(() => {
    fetchPublicSettings()
    const unsubProjects = subscribeToProjects()
    const unsubAgents = subscribeToAgents()
    const unsubPos = subscribeToPositions()
    const unsubTasks = subscribeToBuildTasks()
    const unsubIdeas = subscribeToIdeas()
    const unsubLists = subscribeToLists()
    fetchProjectMetadata()
    fetchCapsules()
    return () => { unsubProjects(); unsubAgents(); unsubPos(); unsubTasks(); unsubIdeas(); unsubLists() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    supabase.from('agent_budgets').select('agent_key,monthly_token_limit,monthly_usd_limit,tokens_used_mtd,usd_used_mtd')
      .then(({ data }) => {
        if (!data) return
        const pcts: Record<string, number> = {}
        ;(data as AgentBudget[]).forEach(b => {
          const tokenPct = b.monthly_token_limit > 0 ? Math.round((b.tokens_used_mtd / b.monthly_token_limit) * 100) : 0
          const usdPct = b.monthly_usd_limit > 0 ? Math.round((b.usd_used_mtd / b.monthly_usd_limit) * 100) : 0
          pcts[b.agent_key] = Math.max(tokenPct, usdPct)
        })
        setAgentBudgetPcts(pcts)
      })
  }, [])

  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags ?? [])))
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

  // Nav width offset (NavSidebar = 64px)
  const NAV_OFFSET = 'var(--nav-width, 64px)'

  return (
    <div
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', touchAction: 'none' }}
      data-projects={projects.length}
      data-agents={canvasAgents.length}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <GalaxyCanvas opacity={0.5} />
      <NebulaOverlay />
      <div
        className="canvas-bg"
        style={{
          position: 'absolute', inset: 0, zIndex: 2,
          backgroundPosition: `${((offset.x % (32 * scale)) + 32 * scale) % (32 * scale)}px ${((offset.y % (32 * scale)) + 32 * scale) % (32 * scale)}px`,
          backgroundSize: `${32 * scale}px ${32 * scale}px`,
        }}
      />
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(225,31,123,0.05) 0%, transparent 70%)' }} />

      <div
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, zIndex: 3, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <AnimatePresence>
          {visibleProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} canvasScale={scale} index={index} />
          ))}
        </AnimatePresence>
        {lists.map((list) => (
          <ListWidgetCard key={list.id} list={list} canvasScale={scale} sessionId={sessionId} isAdmin={currentUser?.role === 'admin'} />
        ))}
        {canvasAgents.map(agent => (
          <CanvasAgentAvatar
            key={agent.id} agent={agent} canvasScale={scale}
            onChat={currentUser?.role !== 'viewer' ? setChatAgent : undefined}
            onEdit={a => { setEditingAgent(a); setShowBotModal(true) }}
            isNew={agent.id === lastNewAgentId}
            budgetPct={agent.agent_key ? agentBudgetPcts[agent.agent_key] : undefined}
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

      {!remoteLoaded && currentUser && <LoadingTimeout />}
      {!remoteLoaded && !currentUser && (
        <motion.div
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}
          initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
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
        onAdd={() => setShowAdd(true)}
        onAddList={() => setShowAddList(true)}
        onAddAgent={() => { setEditingAgent(null); setShowBotModal(true) }}
        onTidyUp={tidyUp}
        projectCount={projects.length}
        onChat={() => setShowGlobalChat(v => !v)}
      />

      {/* ── Top navbar (canvas-specific) ─────────────────────────────────────── */}
      {/* Mobile : header complet (CapsuleSwitcher + boardName + PresenceBar + user info) */}
      {/* Desktop : juste PresenceBar + user info (CapsuleSwitcher et boardName sont dans NavSidebar) */}
      <header
        className="launchpad-navbar"
        style={{
          position: 'fixed',
          top: 0,
          left: isMobile ? 0 : NAV_OFFSET,
          right: 0,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 35,
          pointerEvents: 'none',
        }}
      >
        {isMobile ? (
          <>
            {/* Mobile Left: capsule switcher */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'all' }}>
              <CapsuleSwitcher />
            </div>

            {/* Mobile Center: board name */}
            <div style={{ userSelect: 'none' }}>
              <span style={{
                fontSize: 17,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #F0EDF5 60%, rgba(225,31,123,0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 700,
              }}>
                {boardName.replace(/[\p{Emoji}]/gu, '').trim()}
              </span>
            </div>

            {/* Mobile Right: présence only (user info masqué sur mobile — Bug 4) */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, pointerEvents: 'all', overflow: 'hidden', minWidth: 0 }}>
              <PresenceBar currentUser={currentUser} />
            </div>
          </>
        ) : (
          /* Desktop : juste PresenceBar + user info (NavSidebar gère CapsuleSwitcher) */
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, width: '100%', pointerEvents: 'all', overflow: 'hidden', minWidth: 0 }}>
            <PresenceBar currentUser={currentUser} />
            {isPrivate && currentUser && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
                borderRadius: 999, background: 'rgba(22,18,26,0.92)',
                border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                  👤 {currentUser.username}
                </span>
                <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                <button
                  onClick={logout}
                  data-testid="btn-logout"
                  style={{ background: 'none', border: 'none', color: '#E11F7B', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Group filter bar ─────────────────────────────────────────────────── */}
      {/* Bug 3 fix: offset left par --nav-width sur desktop pour éviter l'overlap avec la sidebar */}
      <nav
        className="launchpad-groupbar"
        style={{
          position: 'fixed',
          top: 54,
          left: isMobile ? '50%' : `calc(var(--nav-width, 64px) / 2 + 50%)`,
          transform: 'translateX(-50%)',
          background: 'rgba(15,12,20,0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 999,
          zIndex: 40,
          maxWidth: isMobile ? 'calc(100vw - 32px)' : 'calc(100vw - var(--nav-width, 64px) - 32px)',
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
            top: 96,
            left: isMobile ? '50%' : `calc(var(--nav-width, 64px) / 2 + 50%)`,
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
            maxWidth: isMobile ? 'calc(100vw - 32px)' : 'calc(100vw - var(--nav-width, 64px) - 32px)',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setFilter(null)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              border: 'none', cursor: 'pointer', flexShrink: 0,
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
                  padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, flexShrink: 0,
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

      <AnimatePresence>
        {chatAgent && (
          <AgentChatPanel
            agent={chatAgent}
            currentUser={currentUser?.username ?? 'visiteur'}
            onClose={() => setChatAgent(null)}
          />
        )}
      </AnimatePresence>

      <BotModal
        open={showBotModal}
        onClose={() => { setShowBotModal(false); setEditingAgent(null) }}
        editAgent={editingAgent}
      />

      {/* MobileBottomNav — mobile only (Bug 2) */}
      {isMobile && <MobileBottomNav />}
    </div>
  )
}
