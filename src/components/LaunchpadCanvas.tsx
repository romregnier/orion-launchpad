/**
 * LaunchpadCanvas — Whiteboard canvas principal
 * Extrait de App.tsx (TK-0160) — fonctionne identiquement
 * TK-0183 : logique état/effets extraite dans useCanvas hook
 * Rendu dans <main> de AppShell (flex:1), les éléments fixed sont offset de --nav-width
 */
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { useCanvas } from '../hooks/useCanvas'
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

// ── LaunchpadCanvas ───────────────────────────────────────────────────────────
export function LaunchpadCanvas() {
  const {
    projects, lists, canvasAgents,
    remoteLoaded, activeFilter, setFilter, activeGroup,
    boardName, currentUser, lastNewAgentId,
  } = useLaunchpadStore()

  const canvas = useCanvas()
  const {
    scale, offset, isPanning, isMobile,
    agentBudgetPcts, newCardPosition,
    canvasRef,
    handleWheel, handleMouseDown,
    onTouchStart, onTouchMove, onTouchEnd,
    zoomIn, zoomOut, resetView, tidyUp,
  } = canvas

  const sessionId = localStorage.getItem('launchpad_session') ?? ''

  const [showAdd, setShowAdd] = useState(false)
  const [showAddList, setShowAddList] = useState(false)
  const [showGlobalChat, setShowGlobalChat] = useState(false)
  const [chatAgent, setChatAgent] = useState<CanvasAgent | null>(null)
  const [showBotModal, setShowBotModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<CanvasAgent | null>(null)
  const [showTagBar, setShowTagBar] = useState(false)

  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags ?? [])))
  const hasGroupMatch = !activeGroup || projects.some(p => p.groupId === activeGroup)
  const visibleProjects = projects.filter(p => {
    const groupMatch = !activeGroup || !hasGroupMatch || p.groupId === activeGroup
    const tagMatch = !activeFilter || (p.tags ?? []).includes(activeFilter)
    return groupMatch && tagMatch
  })

  // Nav width offset (NavSidebar = 64px)
  const NAV_OFFSET = 'var(--nav-width, 64px)'

  return (
    <div
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', touchAction: 'none' }}
      data-projects={projects.length}
      data-agents={canvasAgents.length}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
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

      {/* ── Top navbar ───────────────────────────────────────────────────────── */}
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'all' }}>
              <CapsuleSwitcher />
            </div>
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
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, pointerEvents: 'all', overflow: 'hidden', minWidth: 0 }}>
              <PresenceBar currentUser={currentUser} />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, width: '100%', pointerEvents: 'all', overflow: 'hidden', minWidth: 0 }}>
            <PresenceBar currentUser={currentUser} />
          </div>
        )}
      </header>

      {/* ── Group filter bar ─────────────────────────────────────────────────── */}
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
        {allTags.length > 0 && (
          <button
            onClick={() => setShowTagBar(v => !v)}
            title="Filtrer par tags"
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              border: `1px solid ${showTagBar ? 'rgba(225,31,123,0.6)' : 'rgba(255,255,255,0.15)'}`,
              cursor: 'pointer', flexShrink: 0, marginLeft: 4,
              background: showTagBar ? 'rgba(225,31,123,0.15)' : 'transparent',
              color: showTagBar ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
            }}
          >
            🏷 Tags
          </button>
        )}
      </nav>

      {/* ── Tag filter bar ─────────────────────────────────────────────────── */}
      {showTagBar && allTags.length > 0 && (
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
              background: !activeFilter ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
              color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            Tous
          </button>
          {allTags.map((tag) => {
            const active = activeFilter === tag
            let hash = 0
            for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff
            const colors = ['var(--accent)', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
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

      {/* MobileBottomNav — mobile only */}
      {isMobile && <MobileBottomNav />}
    </div>
  )
}
