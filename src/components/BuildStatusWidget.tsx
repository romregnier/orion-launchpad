import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export interface BuildTask {
  id: string
  agent: string
  label: string
  status: 'running' | 'done' | 'failed'
  project?: string
  created_at: string
  updated_at?: string
}

const AGENT_COLORS: Record<string, string> = {
  Nova: '#E11F7B',
  Aria: '#8B5CF6',
  Forge: '#F59E0B',
  Rex: '#10B981',
}

function statusIcon(status: string) {
  if (status === 'done') return '✅'
  if (status === 'failed') return '❌'
  return '⏳'
}

function isRecent(task: BuildTask): boolean {
  if (task.status === 'running') return true
  const updated = task.updated_at ?? task.created_at
  return Date.now() - new Date(updated).getTime() < 10 * 60 * 1000
}

export function BuildStatusWidget() {
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // Initial fetch
    supabase
      .from('build_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setTasks((data as BuildTask[]).filter(isRecent))
      })

    // Realtime subscription
    const channel = supabase
      .channel('build_tasks_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'build_tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const task = payload.new as BuildTask
            if (isRecent(task)) {
              setTasks(prev => [task, ...prev.filter(t => t.id !== task.id)])
            }
          } else if (payload.eventType === 'UPDATE') {
            const task = payload.new as BuildTask
            setTasks(prev =>
              isRecent(task)
                ? prev.map(t => (t.id === task.id ? task : t))
                : prev.filter(t => t.id !== task.id)
            )
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as BuildTask).id))
          }
        }
      )
      .subscribe()

    // Purge old tasks every minute
    const interval = setInterval(() => {
      setTasks(prev => prev.filter(isRecent))
    }, 60_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  if (tasks.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        position: 'fixed',
        bottom: 80,
        right: 14,
        zIndex: 45,
        background: '#1A171C',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
        minWidth: 240,
        maxWidth: 320,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: 'none',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
          ⚡ BUILD STATUS
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </button>

      {/* Task list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '6px 0', maxHeight: 200, overflowY: 'auto' }}>
              {tasks.map(task => {
                const agentColor = AGENT_COLORS[task.agent] ?? '#fff'
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 12px',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{statusIcon(task.status)}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: agentColor,
                      minWidth: 40,
                      textTransform: 'uppercase',
                    }}>
                      {task.agent}
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.7)',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {task.label}
                    </span>
                    <span style={{
                      fontSize: 9,
                      color: task.status === 'running'
                        ? '#F59E0B'
                        : task.status === 'done'
                        ? '#10B981'
                        : '#EF4444',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      {task.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
