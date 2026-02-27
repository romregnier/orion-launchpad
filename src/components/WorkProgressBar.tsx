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
  const visible = !!current

  return (
    <AnimatePresence>
      {visible && current && (
        <motion.div
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -36, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            position: 'fixed',
            top: 52,
            left: 0,
            right: 0,
            zIndex: 34,
            height: 36,
            background: 'rgba(14,12,16,0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(225,31,123,0.3)',
            display: 'flex',
            alignItems: 'center',
            paddingInline: 16,
            gap: 10,
            overflow: 'hidden',
          }}
        >
          {/* Agent icon */}
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            {current.agent_key ? current.agent_key.slice(0, 2).toUpperCase() : '⚡'}
          </span>

          {/* Agent key + title */}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#E11F7B', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {current.agent_key ?? 'Agent'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
            · {current.title}
          </span>

          {/* Step label */}
          {current.step_label && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {current.step_label}
            </span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Multiple tasks badge */}
          {activeTasks.length > 1 && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: 'rgba(225,31,123,0.2)',
              border: '1px solid rgba(225,31,123,0.4)',
              borderRadius: 4,
              padding: '1px 5px',
              color: '#E11F7B',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {activeTasks.length} tâches actives
            </span>
          )}

          {/* Progress bar + percentage */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${current.progress ?? 0}%`,
                  background: '#E11F7B',
                  borderRadius: 2,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', minWidth: 28, textAlign: 'right' }}>
              {current.progress ?? 0}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
