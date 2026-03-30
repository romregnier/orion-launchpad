/**
 * AgentMemoryPanel — TK-0226
 * Panel latéral (380px, slide depuis droite) affichant les mémoires d'un agent.
 * Onglets : Core Memory / Episodic Memory
 * Graceful degradation : démo avec mock data si table absente.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentMemory } from '../hooks/useAgentMemory'
import type { AgentMemory } from '../hooks/useAgentMemory'

// ── Helpers ───────────────────────────────────────────────────────────────────

function ImportanceDots({ value }: { value: number }) {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: i < value ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// ── Mock data pour démo ───────────────────────────────────────────────────────

const MOCK_MEMORIES: AgentMemory[] = [
  {
    id: 'mock-1',
    agent_key: 'demo',
    capsule_id: 'mock-capsule',
    memory_type: 'core',
    content: "Je suis Forge, l'agent développeur senior du Launchpad. Ma mission est d'implémenter des features complexes avec une qualité TypeScript irréprochable.",
    metadata: {},
    importance: 9,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'mock-2',
    agent_key: 'demo',
    capsule_id: 'mock-capsule',
    memory_type: 'core',
    content: "Je préfère les solutions minimalistes et élégantes. Pas de librairies externes superflues.",
    metadata: {},
    importance: 7,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'mock-3',
    agent_key: 'demo',
    capsule_id: 'mock-capsule',
    memory_type: 'episodic',
    content: "Sprint TK-0226/0230/0231 terminé avec succès. Build 0 erreur, déployé sur orion-launchpad.surge.sh.",
    metadata: { sprint: 'TK-0226/0230/0231' },
    importance: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    agent_key: 'demo',
    capsule_id: 'mock-capsule',
    memory_type: 'episodic',
    content: "Romain a demandé de ne pas toucher Crumb, Tailor, Deck Builder, Manga Reader.",
    metadata: {},
    importance: 6,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

// ── Composant principal ───────────────────────────────────────────────────────

interface AgentMemoryPanelProps {
  agentKey: string
  capsuleId?: string
  open: boolean
  onClose: () => void
}

type MemoryTab = 'core' | 'episodic'

export function AgentMemoryPanel({ agentKey, capsuleId, open, onClose }: AgentMemoryPanelProps) {
  const { memories: dbMemories, loading, tableExists, addMemory, deleteMemory } = useAgentMemory({ agentKey, capsuleId })
  const [tab, setTab] = useState<MemoryTab>('core')
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [formContent, setFormContent] = useState('')
  const [formImportance, setFormImportance] = useState(5)
  const [formType, setFormType] = useState<MemoryTab>('episodic')
  const [submitting, setSubmitting] = useState(false)

  // Utilise mock si table absente
  const memories = tableExists ? dbMemories : MOCK_MEMORIES

  const filtered = memories.filter(m => m.memory_type === tab)

  const handleAdd = useCallback(async () => {
    if (!formContent.trim()) return
    setSubmitting(true)
    await addMemory({
      content: formContent.trim(),
      importance: formImportance,
      memory_type: formType,
    })
    setFormContent('')
    setFormImportance(5)
    setFormType('episodic')
    setShowForm(false)
    setSubmitting(false)
  }, [formContent, formImportance, formType, addMemory])

  const handleDelete = useCallback(async (id: string) => {
    await deleteMemory(id)
    setConfirmDelete(null)
  }, [deleteMemory])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              background: 'rgba(0,0,0,0.4)',
            }}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 380, zIndex: 401,
              background: 'var(--bg-surface)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  🧠 Agent Memory
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', opacity: 0.7 }}>
                  {agentKey}{!tableExists && ' (démo)'}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4,
                }}
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}>
              {(['core', 'episodic'] as MemoryTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '12px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                    fontWeight: tab === t ? 600 : 400,
                    fontSize: 13,
                    transition: 'color 0.15s',
                  }}
                >
                  {t === 'core' ? '🔒 Core' : '💭 Episodic'}
                  <span style={{
                    marginLeft: 6, fontSize: 11,
                    background: 'rgba(255,255,255,0.08)',
                    padding: '1px 6px', borderRadius: 10,
                  }}>
                    {memories.filter(m => m.memory_type === t).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {loading && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  Chargement…
                </div>
              )}

              {!loading && filtered.length === 0 && (
                <div style={{
                  textAlign: 'center', marginTop: 40,
                  color: 'var(--text-muted)', fontSize: 13,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧩</div>
                  Aucune mémoire {tab === 'core' ? 'permanente' : 'épisodique'}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(memory => (
                  <motion.div
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <p style={{
                        margin: 0, fontSize: 13,
                        color: 'var(--text-primary)',
                        lineHeight: 1.5, flex: 1,
                      }}>
                        {memory.content}
                      </p>
                      <button
                        onClick={() => setConfirmDelete(memory.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-muted)', fontSize: 14,
                          flexShrink: 0, padding: '2px 4px',
                          opacity: 0.6,
                          transition: 'opacity 0.15s',
                        }}
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </div>

                    <div style={{
                      marginTop: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: 6,
                    }}>
                      <ImportanceDots value={memory.importance} />
                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        background: memory.memory_type === 'core'
                          ? 'rgba(var(--accent-rgb, 139,92,246), 0.15)'
                          : 'rgba(255,255,255,0.06)',
                        padding: '2px 8px', borderRadius: 8,
                      }}>
                        {memory.memory_type}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
                        {formatDate(memory.created_at)}
                      </span>
                    </div>

                    {/* Confirm delete */}
                    <AnimatePresence>
                      {confirmDelete === memory.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            marginTop: 10, paddingTop: 10,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', gap: 8, alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
                            Confirmer la suppression ?
                          </span>
                          <button
                            onClick={() => handleDelete(memory.id)}
                            style={{
                              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                            }}
                          >
                            Oui
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: 'var(--text-muted)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                            }}
                          >
                            Annuler
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Add form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    padding: 16,
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <textarea
                    value={formContent}
                    onChange={e => setFormContent(e.target.value)}
                    placeholder="Contenu de la mémoire…"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '8px 12px',
                      color: 'var(--text-primary)', fontSize: 13,
                      resize: 'vertical', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
                    <select
                      value={formType}
                      onChange={e => setFormType(e.target.value as MemoryTab)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6, padding: '4px 8px',
                        color: 'var(--text-primary)', fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="core">Core</option>
                      <option value="episodic">Épisodic</option>
                    </select>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Importance : {formImportance}/10
                      </label>
                      <input
                        type="range" min={1} max={10} value={formImportance}
                        onChange={e => setFormImportance(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={handleAdd}
                      disabled={submitting || !formContent.trim()}
                      style={{
                        flex: 1,
                        background: 'var(--accent)', color: '#fff',
                        border: 'none', borderRadius: 8, padding: '8px 16px',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        opacity: (submitting || !formContent.trim()) ? 0.5 : 1,
                      }}
                    >
                      {submitting ? 'Ajout…' : 'Ajouter'}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '8px 14px',
                        cursor: 'pointer', fontSize: 13,
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            {!showForm && (
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: 8, padding: '10px 16px',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    fontSize: 13, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                    transition: 'background 0.15s',
                  }}
                >
                  ➕ Ajouter une mémoire
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
