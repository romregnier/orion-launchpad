import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'
import { AgentBuilderModal } from '../components/AgentBuilderModal'
import { AgentEditModal } from '../components/AgentEditModal'
import type { CanvasAgent } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentRow {
  id: string
  name: string
  role?: string | null
  agent_key?: string | null
  tailor_config?: {
    emoji?: string
    imageUrl?: string
    color?: string
  } | null
  status?: string | null
  reports_to?: string | null
  created_at?: string | null
  position_x?: number
  position_y?: number
  owner?: string
  tailor_url?: string | null
  bot_token?: string | null
  working_on_project?: string | null
  home_x?: number | null
  home_y?: number | null
  is_system?: boolean
  skills?: string[] | null
  model?: string | null
  agent_meta?: import('../types').AgentMeta | null
}

// ── Shimmer card ──────────────────────────────────────────────────────────────
function ShimmerCard() {
  return (
    <div
      style={{
        width: '100%',
        height: 130,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-green {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

// ── Status badge helpers ──────────────────────────────────────────────────────
function getStatusColor(status: string | null | undefined): string {
  if (status === 'running') return '#10B981'
  if (status === 'error') return '#EF4444'
  return '#6B7280'
}

function getStatusLabel(status: string | null | undefined): string {
  if (status === 'running') return 'running'
  if (status === 'error') return 'error'
  return 'idle'
}

// ── Agent Card ────────────────────────────────────────────────────────────────
function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentRow
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const status = getStatusLabel(agent.status)
  const statusColor = getStatusColor(agent.status)
  const hasImage = !!agent.tailor_config?.imageUrl
  const emoji = agent.tailor_config?.emoji ?? '🤖'
  const displayRole = agent.role ?? agent.agent_key ?? 'Agent'

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '16px 12px',
        borderRadius: 12,
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(225,31,123,0.3)' : 'rgba(255,255,255,0.08)'}`,
        textAlign: 'center',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        fontFamily: "'Poppins', sans-serif",
        transition: 'all 0.15s ease',
        outline: 'none',
      }}
    >
      {/* Avatar */}
      {hasImage ? (
        <img
          src={agent.tailor_config!.imageUrl}
          alt={agent.name}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.12)',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            fontSize: 36,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {emoji}
        </div>
      )}

      {/* Name */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#F0EDF5',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
      >
        {agent.name}
      </div>

      {/* Role */}
      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
      >
        {displayRole}
      </div>

      {/* Status badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 2,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor,
            flexShrink: 0,
            animation: status === 'running' ? 'pulse-green 1.2s ease-in-out infinite' : undefined,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: statusColor,
            fontWeight: 500,
          }}
        >
          {status}
        </span>
      </div>
    </motion.button>
  )
}

// ── AgentsTabPage ─────────────────────────────────────────────────────────────
export function AgentsTabPage() {
  const { currentUser } = useLaunchpadStore()
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingAgent, setEditingAgent] = useState<CanvasAgent | null>(null)

  const isAdmin = currentUser?.role === 'admin'

  const loadAgents = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('canvas_agents')
      .select('*')
      .order('created_at')
    if (data) setAgents(data as AgentRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadAgents()
  }, [])

  const agentsWithReports = agents.filter(a => a.reports_to)

  const handleCardClick = (agent: AgentRow) => {
    // Convert AgentRow to CanvasAgent shape for the modal
    const canvasAgent: CanvasAgent = {
      id: agent.id,
      name: agent.name,
      owner: agent.owner ?? '',
      position: { x: agent.position_x ?? 0, y: agent.position_y ?? 0 },
      tailorUrl: agent.tailor_url ?? undefined,
      bot_token: agent.bot_token ?? undefined,
      agent_key: agent.agent_key ?? undefined,
      is_system: agent.is_system ?? false,
      working_on_project: agent.working_on_project ?? null,
      home_x: agent.home_x ?? null,
      home_y: agent.home_y ?? null,
      tailor_config: agent.tailor_config as import('../types').AvatarConfig | null ?? null,
      agent_meta: agent.agent_meta ?? null,
      role: agent.role ?? undefined,
      skills: agent.skills ?? undefined,
      model: agent.model ?? undefined,
    }
    setEditingAgent(canvasAgent)
  }

  const handleEditClose = () => {
    setEditingAgent(null)
    loadAgents()
  }

  const handleBuilderClose = () => {
    setShowBuilder(false)
    loadAgents()
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0B090D',
        fontFamily: "'Poppins', sans-serif",
        color: '#F0EDF5',
      }}
    >
      {/* Header sticky */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(11,9,13,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>👥</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#F0EDF5' }}>Agents</span>
          {!loading && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {agents.length}
            </span>
          )}
        </div>

        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowBuilder(true)}
            style={{
              background: '#E11F7B',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+</span>
            <span>Hire Agent</span>
          </motion.button>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}
      >
        {loading ? (
          /* Shimmer grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <ShimmerCard key={i} />
            ))}
          </div>
        ) : agents.length === 0 ? (
          /* Empty state */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60vh',
              gap: 12,
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            <div style={{ fontSize: 48 }}>🤖</div>
            <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
              Aucun agent recruté.{isAdmin ? ' Commencez par + Hire Agent.' : ''}
            </p>
          </div>
        ) : (
          <>
            {/* Agent grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
                marginBottom: agentsWithReports.length > 0 ? 32 : 0,
              }}
            >
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => handleCardClick(agent)}
                />
              ))}
            </div>

            {/* Organisation section (if any reports_to) */}
            {agentsWithReports.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  Organisation
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {agentsWithReports.map(agent => {
                    const manager = agents.find(a => a.agent_key === agent.reports_to || a.id === agent.reports_to)
                    return (
                      <div
                        key={agent.id}
                        style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.55)',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                          {agent.name}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>→</span>
                        <span>reporte à </span>
                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                          {manager?.name ?? agent.reports_to}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AgentBuilderModal */}
      <AnimatePresence>
        {showBuilder && (
          <AgentBuilderModal open={showBuilder} onClose={handleBuilderClose} />
        )}
      </AnimatePresence>

      {/* AgentEditModal */}
      <AnimatePresence>
        {editingAgent && (
          <AgentEditModal agent={editingAgent} onClose={handleEditClose} />
        )}
      </AnimatePresence>
    </div>
  )
}
