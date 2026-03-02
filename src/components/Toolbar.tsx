/**
 * Toolbar
 *
 * Rôle : Barre d'outils flottante en bas du canvas — zoom, refresh, ajout de projets/listes/agents, settings.
 * Utilisé dans : App.tsx
 * Props : scale, onZoomIn, onZoomOut, onReset, onRefresh, onAdd, onAddList, onAddAgent, projectCount, onChat?
 */
import { useState, useEffect, useRef } from 'react'
import { Plus, ZoomIn, ZoomOut, RefreshCw, Settings, MessageCircle, LayoutGrid } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { supabase } from '../lib/supabase'

interface ActiveTask { id: string; agent_key?: string | null; progress: number; step_label?: string | null }

interface Props {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onRefresh: () => void
  onAdd: () => void
  onAddList: () => void
  onAddAgent: () => void
  onTidyUp: () => void
  projectCount: number
  /** Appelé au clic sur le bouton 💬 — pour ouvrir le panel de chat global */
  onChat?: () => void
}

// ── MiniProgress ─────────────────────────────────────────────────────────────

/**
 * Mini indicateur de tâches dans la Toolbar.
 * Subscription Supabase directe (indépendant du store Zustand) pour garantir la réactivité.
 * - Idle : "Agents en veille"
 * - Actif : ⚡ agent · progress% + mini barre rose
 */
function MiniProgress() {
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('build_tasks')
        .select('id, agent_key, progress, step_label, status')
        .in('status', ['running', 'pending'])
        .order('started_at', { ascending: false })
      if (data) setActiveTasks(data as ActiveTask[])
    }
    load()
    // Realtime — peut avoir un délai selon la connexion
    const ch = supabase
      .channel('miniprogress_direct')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, load)
      .subscribe()
    // Polling 2s en fallback — garantit la mise à jour même si Realtime lag
    const poll = setInterval(load, 2000)
    return () => { supabase.removeChannel(ch); clearInterval(poll) }
  }, [])

  const activeTask = activeTasks[0] ?? null
  const taskCount = activeTasks.length

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}>
      <AnimatePresence mode="wait">
        {!activeTask ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              Agents en veille
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
              ⚡ {activeTask.agent_key ?? 'agent'} · {Math.round(activeTask.progress)}%
              {taskCount > 1 && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> +{taskCount - 1}</span>}
            </span>
            <div style={{ width: 72, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, activeTask.progress)}%`,
                  height: '100%',
                  background: '#E11F7B',
                  borderRadius: 2,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── useChatUnread ─────────────────────────────────────────────────────────────

/**
 * Hook qui indique s'il y a des messages non lus dans launchpad_messages.
 * Compare la date du dernier message avec localStorage('last_seen_msg').
 *
 * @returns true si badge non lu à afficher
 */
function useChatUnread(): boolean {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const check = async () => {
      const lastSeen = localStorage.getItem('last_seen_msg') ?? '1970-01-01T00:00:00Z'
      const { data } = await supabase
        .from('launchpad_messages')
        .select('id')
        .gt('created_at', lastSeen)
        .limit(1)
      setHasUnread((data?.length ?? 0) > 0)
    }
    check()

    const channel = supabase
      .channel('toolbar_chat_unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'launchpad_messages' }, () => {
        setHasUnread(true)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return hasUnread
}

// ── AddMenu ──────────────────────────────────────────────────────────────────

interface AddMenuProps {
  onAdd: () => void
  onAddList: () => void
  onAddAgent: () => void
  isAdmin?: boolean
  isMobile?: boolean
}

function AddMenu({ onAdd, onAddList, onAddAgent, isAdmin, isMobile }: AddMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const items = [
    { emoji: '🗂️', label: 'Projet', onClick: onAdd, adminOnly: false },
    { emoji: '📋', label: 'Liste', onClick: onAddList, adminOnly: false },
    { emoji: '🤖', label: 'Agent', onClick: onAddAgent, adminOnly: true },
  ].filter((item) => !item.adminOnly || isAdmin)

  const handleItem = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Main button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ajouter…"
        data-testid="btn-add-project"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 4 : 6,
          height: isMobile ? 30 : 34,
          paddingInline: isMobile ? 10 : 14,
          borderRadius: 10,
          background: open
            ? 'linear-gradient(135deg, #c41a6a, #E11F7B)'
            : 'linear-gradient(135deg, #E11F7B, #c41a6a)',
          color: '#fff',
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600,
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 2px 12px rgba(225,31,123,0.4)',
          whiteSpace: 'nowrap',
        }}
      >
        <Plus size={isMobile ? 13 : 15} />
        {!isMobile && 'Ajouter'}
      </button>

      {/* Submenu */}
      <AnimatePresence>
        {open && (
          isMobile ? (
            // Mobile: bottom sheet (portal not needed, positioned fixed)
            <motion.div
              key="addmenu-sheet"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(26,23,28,0.98)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px 16px 0 0',
                padding: 16,
                zIndex: 60,
              }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItem(item.onClick)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 14px',
                    borderRadius: 10, border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 15, cursor: 'pointer',
                    transition: 'background 0.12s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                </button>
              ))}
            </motion.div>
          ) : (
            // Desktop: floating submenu above toolbar
            <motion.div
              key="addmenu-float"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(26,23,28,0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: 6,
                minWidth: 160,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 60,
              }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItem(item.onClick)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px',
                    borderRadius: 8, border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 14, cursor: 'pointer',
                    transition: 'background 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export function Toolbar({ scale, onZoomIn, onZoomOut, onReset, onRefresh, onAdd, onAddList, onAddAgent, onTidyUp, projectCount: _projectCount, onChat }: Props) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const { showSettings, setShowSettings, currentUser } = useLaunchpadStore()
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'member'
  const hasUnread = useChatUnread()

  const handleChatClick = () => {
    // Marquer comme lu quand l'utilisateur ouvre le chat
    localStorage.setItem('last_seen_msg', new Date().toISOString())
    onChat?.()
  }

  return (
    <div
      className="launchpad-toolbar"
      style={{
        position: 'fixed',
        bottom: isMobile ? 16 : 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 4 : 8,
        padding: isMobile ? '8px 10px' : '10px 16px',
        borderRadius: 16,
        background: 'rgba(22,18,26,0.95)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        maxWidth: 'calc(100vw - 24px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Mini progress — desktop uniquement */}
      {!isMobile && <MiniProgress />}

      {/* Mobile: compact task indicator */}
      {isMobile && <MiniProgress />}

      {/* Zoom controls */}
      <button className="launchpad-toolbar__btn" onClick={onZoomOut} title="Zoom arrière" style={btnStyle(isMobile)}>
        <ZoomOut size={isMobile ? 13 : 15} />
      </button>
      <button
        onClick={onReset}
        title="Réinitialiser le zoom"
        style={{
          ...btnStyle(isMobile),
          fontFamily: 'monospace',
          fontSize: 10,
          width: 'auto',
          padding: '0 6px',
          color: Math.abs(scale - 1) > 0.01 ? '#E11F7B' : 'rgba(255,255,255,0.5)',
        }}
      >
        {Math.round(scale * 100)}%
      </button>
      <button className="launchpad-toolbar__btn" onClick={onZoomIn} title="Zoom avant" style={btnStyle(isMobile)}>
        <ZoomIn size={isMobile ? 13 : 15} />
      </button>

      <button onClick={onRefresh} title="Rafraîchir" style={{ ...btnStyle(isMobile), marginLeft: isMobile ? 0 : 2 }}>
        <RefreshCw size={isMobile ? 12 : 14} />
      </button>

      {/* Tidy Up button — réorganise le canvas en grille */}
      <button data-testid="btn-tidy-up" onClick={onTidyUp} title="Tidy up — Réorganiser" style={{ ...btnStyle(isMobile), color: 'rgba(255,255,255,0.5)' }}>
        <LayoutGrid size={isMobile ? 12 : 14} />
      </button>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        title="Paramètres"
        style={{
          ...btnStyle(isMobile),
          color: showSettings ? '#E11F7B' : 'rgba(255,255,255,0.5)',
        }}
      >
        <Settings size={isMobile ? 12 : 14} />
      </button>

      {/* Chat button — visible pour tous les rôles */}
      <button
        onClick={handleChatClick}
        title="Chat global"
        style={{
          ...btnStyle(isMobile),
          position: 'relative',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <MessageCircle size={isMobile ? 12 : 14} />
        {hasUnread && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#EF4444',
              border: '1.5px solid #16121a',
            }}
          />
        )}
      </button>

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', marginInline: isMobile ? 2 : 4 }} />

      {/* Unified Add menu — canEdit only */}
      {canEdit && (
        <AddMenu
          onAdd={onAdd}
          onAddList={onAddList}
          onAddAgent={onAddAgent}
          isAdmin={currentUser?.role === 'admin'}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

function btnStyle(isMobile: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isMobile ? 40 : 32,
    height: isMobile ? 40 : 32,
    borderRadius: 8,
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  }
}
