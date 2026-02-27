/**
 * WorkProgressBar
 *
 * Rôle : Barre de progression fixe en haut, affiche les tâches build_tasks actives en temps réel (Supabase Realtime).
 * Utilisé dans : App.tsx
 * Props : aucune (auto-subscribe)
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

interface BuildTask {
  id: string
  title: string
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  agent_key?: string | null
  step_label?: string | null
  created_at: string
  updated_at?: string | null
}

export function WorkProgressBar() {
  const [activeTasks, setActiveTasks] = useState<BuildTask[]>([])

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, () => {
        loadTasks()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const current = activeTasks[0] ?? null
  const [collapsed, setCollapsed] = useState(false)

  // Toujours visible — affiche l'état vide si aucune tâche
  return (
    <div
      className="work-progress-bar-wrapper"
      style={{ position: 'fixed', bottom: 80, left: 16, zIndex: 34 }}
    >
      {/* Tête du widget (toujours visible) */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(14,12,16,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: collapsed ? 10 : '10px 10px 0 0',
          padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
          fontSize: 11, fontWeight: 700,
        }}
      >
        <span style={{ color: current ? '#E11F7B' : 'rgba(255,255,255,0.3)', fontSize: 9 }}>●</span>
        {current ? `⚡ ${current.agent_key ?? 'Agent'} · en cours` : '〇 Aucune tâche active'}
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
          style={{
            background: 'rgba(14,12,16,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            width: 280,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {current ? (
            <>
              {/* Ligne 1 : agent + titre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#E11F7B', whiteSpace: 'nowrap' }}>
                  {current.agent_key ?? 'Agent'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  · {current.title}
                </span>
              </div>

              {/* Ligne 2 : étape courante */}
              {current.step_label && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{current.step_label}</span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Aucune tâche en cours</span>
          )}

          {/* File d'attente */}
          {activeTasks.length > 1 && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>
              + {activeTasks.length - 1} en attente
            </span>
          )}

          {/* Progress bar + percentage */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div className="work-progress-bar__track" style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                className="work-progress-bar__fill"
                style={{ height: '100%', width: `${current?.progress ?? 0}%`, background: '#E11F7B', borderRadius: 2, transition: 'width 0.4s ease' }}
              />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', minWidth: 28, textAlign: 'right' }}>
              {current?.progress ?? 0}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  )
}
