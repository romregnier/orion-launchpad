/**
 * AgentSessionPanel — TK-0185
 * Panel slide-from-right pour gérer les sessions persistantes d'un agent.
 * 360px, Framer Motion, CSS variables uniquement.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentSessions, type AgentSession } from '../hooks/useAgentSessions'

interface AgentSessionPanelProps {
  open: boolean
  onClose: () => void
  agentKey: string
  capsuleId?: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, max = 80): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '…'
}

export function AgentSessionPanel({
  open,
  onClose,
  agentKey,
  capsuleId,
}: AgentSessionPanelProps) {
  const { getSessions, createSession, tableExists } = useAgentSessions()
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null)
  const [creating, setCreating] = useState(false)

  const loadSessions = async () => {
    setLoading(true)
    const data = await getSessions(agentKey)
    setSessions(data)
    setLoading(false)
  }

  useEffect(() => {
    if (open && agentKey) {
      loadSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentKey])

  const handleNewSession = async () => {
    if (!capsuleId) return
    setCreating(true)
    const session = await createSession(
      agentKey,
      capsuleId,
      `Session ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
    )
    if (session) {
      setSessions(prev => [session, ...prev])
      setSelectedSession(session)
    }
    setCreating(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 200,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 360,
              background: 'var(--bg-panel, #1a1a2e)',
              borderLeft: '1px solid var(--border, rgba(255,255,255,0.08))',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text-primary, #fff)',
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  Sessions
                </h3>
                <p style={{
                  margin: '2px 0 0',
                  fontSize: 12,
                  color: 'var(--text-muted, rgba(255,255,255,0.4))',
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  {agentKey}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, rgba(255,255,255,0.4))',
                  cursor: 'pointer',
                  padding: 4,
                  fontSize: 18,
                  lineHeight: 1,
                  borderRadius: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Table-not-found warning */}
            {!tableExists && (
              <div style={{
                margin: '12px 16px',
                padding: '10px 14px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 8,
                fontSize: 12,
                color: '#F59E0B',
                fontFamily: "'Poppins', sans-serif",
              }}>
                ⚠️ La table agent_sessions n'est pas encore disponible.
              </div>
            )}

            {/* Détail session sélectionnée */}
            <AnimatePresence>
              {selectedSession && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    margin: '12px 16px 0',
                    padding: 14,
                    background: 'var(--bg-card, rgba(255,255,255,0.04))',
                    border: '1px solid var(--accent, #7C3AED)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary, #fff)',
                      fontFamily: "'Poppins', sans-serif",
                    }}>
                      {selectedSession.session_name ?? 'Session sans nom'}
                    </span>
                    <button
                      onClick={() => setSelectedSession(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted, rgba(255,255,255,0.4))',
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: 0,
                      }}
                    >
                      fermer ✕
                    </button>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    color: 'var(--text-secondary, rgba(255,255,255,0.6))',
                    fontFamily: "'Poppins', sans-serif",
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {selectedSession.context_summary ?? 'Aucun résumé de contexte disponible.'}
                  </p>
                  <div style={{
                    marginTop: 8,
                    display: 'flex',
                    gap: 12,
                    fontSize: 11,
                    color: 'var(--text-muted, rgba(255,255,255,0.4))',
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    <span>💬 {selectedSession.message_count} messages</span>
                    <span>🕐 {formatDate(selectedSession.last_active_at)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Liste des sessions */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 80,
                }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--accent, #7C3AED)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              ) : sessions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-muted, rgba(255,255,255,0.4))',
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Aucune session pour cet agent</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>Créez une nouvelle session ci-dessous</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map(session => (
                    <motion.button
                      key={session.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedSession(
                        selectedSession?.id === session.id ? null : session
                      )}
                      style={{
                        background: selectedSession?.id === session.id
                          ? 'rgba(124, 58, 237, 0.12)'
                          : 'var(--bg-card, rgba(255,255,255,0.04))',
                        border: `1px solid ${selectedSession?.id === session.id
                          ? 'var(--accent, #7C3AED)'
                          : 'var(--border, rgba(255,255,255,0.08))'}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}>
                        <span style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary, #fff)',
                          fontFamily: "'Poppins', sans-serif",
                        }}>
                          {session.session_name ?? 'Session sans nom'}
                        </span>
                        <span style={{
                          fontSize: 10,
                          color: 'var(--text-muted, rgba(255,255,255,0.4))',
                          fontFamily: "'Poppins', sans-serif",
                          whiteSpace: 'nowrap',
                          marginLeft: 8,
                        }}>
                          {formatDate(session.last_active_at)}
                        </span>
                      </div>
                      {session.context_summary && (
                        <p style={{
                          margin: 0,
                          fontSize: 12,
                          color: 'var(--text-secondary, rgba(255,255,255,0.5))',
                          fontFamily: "'Poppins', sans-serif",
                          lineHeight: 1.4,
                        }}>
                          {truncate(session.context_summary)}
                        </p>
                      )}
                      <div style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: 'var(--text-muted, rgba(255,255,255,0.3))',
                        fontFamily: "'Poppins', sans-serif",
                      }}>
                        💬 {session.message_count} messages
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer — Nouvelle session */}
            <div style={{
              padding: '14px 16px',
              borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewSession}
                disabled={creating || !capsuleId || !tableExists}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: creating || !capsuleId || !tableExists
                    ? 'rgba(255,255,255,0.06)'
                    : 'var(--accent, #7C3AED)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  cursor: creating || !capsuleId || !tableExists ? 'not-allowed' : 'pointer',
                  opacity: creating || !capsuleId || !tableExists ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                {creating ? (
                  <>
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Création…
                  </>
                ) : (
                  <>+ Nouvelle session</>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
