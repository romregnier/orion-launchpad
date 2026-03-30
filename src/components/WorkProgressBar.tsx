/**
 * WorkProgressBar
 *
 * Rôle : Widget flottant draggable sur le canvas — affiche les tâches build_tasks
 * actives en temps réel (Supabase Realtime). Position sauvegardée en localStorage.
 * Utilisé dans : App.tsx (canvas layer)
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

interface BuildTask {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  agent_key?: string | null
  step_label?: string | null
  project?: string | null
  created_at: string
}

const STORAGE_KEY = 'wpb-pos'
// FIX 3 — Sur mobile, positionner en haut (y=80) pour ne pas chevaucher la Toolbar du bas
const DEFAULT_POS = {
  x: 16,
  y: window.innerWidth < 768 ? 80 : window.innerHeight - 220,
}

function loadPos(): { x: number; y: number } {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : DEFAULT_POS
  } catch { return DEFAULT_POS }
}

export function WorkProgressBar() {
  const [activeTasks, setActiveTasks] = useState<BuildTask[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, wx: 0, wy: 0 })

  useEffect(() => {
    const loadTasks = () => {
      supabase
        .from('build_tasks')
        .select('*')
        .in('status', ['running', 'pending'])
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setActiveTasks(data as BuildTask[])
        })
    }
    loadTasks()
    const channel = supabase
      .channel('build_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, () => loadTasks())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  /** Drag handling — screen coordinates, no canvas transform needed */
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, wx: pos.x, wy: pos.y }

    const onMove = (ev: MouseEvent) => {
      const nx = dragStart.current.wx + (ev.clientX - dragStart.current.mouseX)
      const ny = dragStart.current.wy + (ev.clientY - dragStart.current.mouseY)
      setPos({ x: nx, y: ny })
    }
    const onUp = () => {
      setIsDragging(false)
      setPos(p => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
        return p
      })
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [pos.x, pos.y])

  const current = activeTasks[0] ?? null

  return (
    <div
      className="work-progress-bar-wrapper"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 34,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDown}
    >
      {/* Header — always visible */}
      <button
        data-no-drag
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(14,12,16,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-default)',
          borderRadius: collapsed ? 10 : '10px 10px 0 0',
          padding: '6px 12px', cursor: 'pointer', color: 'var(--text-secondary)',
          fontSize: 11, fontWeight: 700,
          boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Drag handle */}
        <span style={{ opacity: 0.3, fontSize: 10, cursor: 'grab', marginRight: 2 }}>⠿</span>
        <span style={{ color: current ? 'var(--accent)' : 'rgba(255,255,255,0.3)', fontSize: 9 }}>●</span>
        {current
          ? `⚡ ${current.agent_key ?? 'Agent'} · en cours`
          : '〇 Agents en veille'}
        <span style={{ marginLeft: 4, opacity: 0.4, fontSize: 9 }}>{collapsed ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="work-progress-bar"
            data-no-drag
            style={{
              originY: 0,
              background: 'rgba(14,12,16,0.92)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-default)',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              width: 280,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {current ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    {current.agent_key ?? 'Agent'}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    · {current.label}
                  </span>
                </div>
                {current.step_label && (
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{current.step_label}</span>
                )}
                {/* Projet associé */}
                {current.project && (
                  <span style={{ fontSize: 10, color: 'rgba(225,31,123,0.6)', fontWeight: 600 }}>
                    📌 {current.project}
                  </span>
                )}
              </>
            ) : (
              /* FIX 6 — état vide : "Agents en veille" avec animation de respiration douce */
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.25)',
                  fontStyle: 'italic',
                  animation: 'wpb-breathe 3s ease-in-out infinite',
                }}
              >
                😴 Agents en veille
              </span>
            )}

            {activeTasks.length > 1 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)' }}>
                + {activeTasks.length - 1} en attente
              </span>
            )}

            {/* FIX 6 — n'afficher la barre de progression que si une tâche est active */}
            {current && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${current.progress}%`,
                    background: 'var(--accent)',
                    borderRadius: 2,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', minWidth: 28, textAlign: 'right' }}>
                  {current.progress}%
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
