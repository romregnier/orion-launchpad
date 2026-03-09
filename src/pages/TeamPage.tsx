import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { AgentMemberCard } from '../components/AgentMemberCard'
import type { AgentMemberCardProps } from '../components/AgentMemberCard'

// ── Agent static metadata ─────────────────────────────────────────────────────
interface AgentDef {
  agentKey: string
  name: string
  role: string
  emoji: string
}

const AGENTS: AgentDef[] = [
  { agentKey: 'orion', name: 'Orion',  role: 'Orchestrateur',   emoji: '🌟' },
  { agentKey: 'nova',  name: 'Nova',   role: 'Stratège',        emoji: '✦'  },
  { agentKey: 'aria',  name: 'Aria',   role: 'Designer',        emoji: '🎨' },
  { agentKey: 'forge', name: 'Forge',  role: 'Développeur',     emoji: '🔧' },
  { agentKey: 'rex',   name: 'Rex',    role: 'QA & Validation', emoji: '🛡️' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface BuildTask {
  id: string
  agent_key: string
  label: string
  status: string
  progress: number
  step_label: string
  updated_at: string
}

// Determine agent status from most recent task
function computeStatus(tasks: BuildTask[]): AgentMemberCardProps['status'] {
  if (!tasks || tasks.length === 0) return 'idle'
  const latest = tasks[0]
  if (latest.status === 'running') return 'busy'
  if (latest.status === 'done') {
    const updatedMs = new Date(latest.updated_at).getTime()
    const diffMin = (Date.now() - updatedMs) / 60_000
    if (diffMin < 5) return 'online'
  }
  return 'idle'
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TeamPage() {
  const [tasksByAgent, setTasksByAgent] = useState<Record<string, BuildTask[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchTasks() {
      try {
        const { data, error } = await supabase
          .from('build_tasks')
          .select('id, agent_key, label, status, progress, step_label, updated_at')
          .in('agent_key', AGENTS.map(a => a.agentKey))
          .order('updated_at', { ascending: false })
          .limit(50)

        if (error) {
          console.warn('TeamPage fetch error:', error.message)
        } else if (data && !cancelled) {
          // Group by agent_key, keep 5 per agent
          const grouped: Record<string, BuildTask[]> = {}
          for (const task of data as BuildTask[]) {
            if (!grouped[task.agent_key]) grouped[task.agent_key] = []
            if (grouped[task.agent_key].length < 5) {
              grouped[task.agent_key].push(task)
            }
          }
          setTasksByAgent(grouped)
        }
      } catch (e) {
        console.warn('TeamPage fetch exception:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchTasks()

    // Refresh every 30s
    const interval = setInterval(() => { void fetchTasks() }, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B090D',
        fontFamily: "'Poppins', sans-serif",
        color: '#F0EDF5',
        padding: '0 0 60px',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(11,9,13,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '28px 32px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(225,31,123,0.15)',
              border: '1px solid rgba(225,31,123,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}>
              👥
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #F0EDF5 60%, rgba(225,31,123,0.85) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Mon équipe
            </h1>
          </div>
          <p style={{
            margin: 0,
            fontSize: 13,
            color: 'rgba(240,237,245,0.4)',
            letterSpacing: '0.01em',
          }}>
            Agents IA actifs · {AGENTS.length} agents
          </p>
        </motion.div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 32px 0', maxWidth: 1100, margin: '0 auto' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            gap: 12,
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: 28 }}
            >
              🌟
            </motion.div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
              Chargement des agents…
            </span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {AGENTS.map((agent, i) => {
              const tasks = tasksByAgent[agent.agentKey] ?? []
              const status = computeStatus(tasks)
              const lastTask = tasks[0]
                ? {
                    label: tasks[0].label,
                    progress: tasks[0].progress ?? 0,
                    step_label: tasks[0].step_label ?? '',
                    updated_at: tasks[0].updated_at,
                  }
                : undefined

              return (
                <motion.div
                  key={agent.agentKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 28,
                    delay: i * 0.07,
                  }}
                >
                  <AgentMemberCard
                    agentKey={agent.agentKey}
                    name={agent.name}
                    role={agent.role}
                    emoji={agent.emoji}
                    status={status}
                    lastTask={lastTask}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* ── Refresh hint ─────────────────────────────────────────────────── */}
        {!loading && (
          <div style={{
            textAlign: 'center',
            marginTop: 32,
            fontSize: 11,
            color: 'rgba(255,255,255,0.18)',
          }}>
            Actualisation automatique toutes les 30s
          </div>
        )}
      </div>
    </div>
  )
}
