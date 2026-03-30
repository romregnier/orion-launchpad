/**
 * AgentDetailDrawer — TK-0177
 * Drawer latéral (slide depuis la droite) fusionnant BotModal + AgentEditModal.
 * 4 tabs : Infos | Prompt | Skills | Connexions
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CanvasAgent } from '../types'
import { AdapterConfigPanel } from './AdapterConfigPanel'
import { InferenceProxyPanel } from './InferenceProxyPanel'
import type { AdapterConfig } from '../types/adapter'
import { supabase } from '../lib/supabase'

export interface AgentDetailDrawerProps {
  agent: CanvasAgent | null
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<CanvasAgent>) => Promise<void>
  onDelete?: (agentId: string) => Promise<void>
  isAdmin?: boolean
}

type Tab = 'infos' | 'prompt' | 'skills' | 'connexions' | 'adapter' | 'proxy'

const TAB_LABELS: Record<Tab, string> = {
  infos: '📋 Infos',
  prompt: '💬 Prompt',
  skills: '⚡ Skills',
  connexions: '🔗 Connexions',
  adapter: '🔌 Adapter',
  proxy: '🛡️ Proxy',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#fff',
  fontSize: 13,
  fontFamily: "'Poppins', sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box' as const,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 6,
  display: 'block',
  fontFamily: "'Poppins', sans-serif",
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const AGENT_META_EMOJI: Record<string, string> = {
  orion: '🌟', nova: '✦', aria: '🎨', forge: '🔧', rex: '🛡️',
}

export function AgentDetailDrawer({
  agent,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isAdmin = false,
}: AgentDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('infos')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [model, setModel] = useState('')
  const [description, setDescription] = useState('')
  const [entityType, setEntityType] = useState<'ai' | 'human' | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [skills, setSkills] = useState('')
  const [botToken, setBotToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [canSpawn, setCanSpawn] = useState('')
  const [canBeSpawnedBy, setCanBeSpawnedBy] = useState('')
  const [adapterConfig, setAdapterConfig] = useState<AdapterConfig>({ type: 'openclaw_gateway' })

  // ── Sync form with agent ───────────────────────────────────────────────────
  useEffect(() => {
    if (agent) {
      setName(agent.name ?? '')
      setRole(agent.role ?? agent.agent_meta?.role ?? '')
      setModel(agent.model ?? agent.agent_meta?.model ?? '')
      setDescription((agent.agent_meta as Record<string, unknown> & { description?: string })?.description ?? '')
      setEntityType(agent.entity_type ?? null)
      setSystemPrompt(agent.agent_meta?.system_prompt ?? '')
      setSkills((agent.skills ?? []).join(', '))
      setBotToken(agent.bot_token ?? '')
      setTelegramChatId(agent.telegram_chat_id ?? '')
      setCanSpawn((agent.can_spawn ?? []).join(', '))
      setCanBeSpawnedBy((agent.can_be_spawned_by ?? []).join(', '))
      setAdapterConfig(
        ((agent.agent_meta as Record<string, unknown> | undefined)?.adapter as AdapterConfig | undefined)
        ?? { type: 'openclaw_gateway' }
      )
      setConfirmDelete(false)
      setActiveTab('infos')
    }
  }, [agent, isOpen])

  const handleSave = async () => {
    if (!agent) return
    setSaving(true)
    try {
      await onSave({
        name,
        role,
        model: model || undefined,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        entity_type: entityType,
        bot_token: botToken || undefined,
        telegram_chat_id: telegramChatId || undefined,
        can_spawn: canSpawn.split(',').map(s => s.trim()).filter(Boolean),
        can_be_spawned_by: canBeSpawnedBy.split(',').map(s => s.trim()).filter(Boolean),
        agent_meta: {
          ...agent.agent_meta,
          role,
          model: model || agent.agent_meta?.model,
          system_prompt: systemPrompt,
        },
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!agent || !onDelete) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await onDelete(agent.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const agentEmoji = agent ? (AGENT_META_EMOJI[agent.name?.toLowerCase()] ?? '🤖') : '🤖'

  return (
    <AnimatePresence>
      {isOpen && agent && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(3px)',
              zIndex: 600,
            }}
          />

          {/* Drawer */}
          <motion.div
            key="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100%',
              width: 420,
              background: '#0F0D12',
              borderLeft: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '-16px 0 48px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 601,
              boxSizing: 'border-box',
            }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {agentEmoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace', marginTop: 2 }}>
                  {agent.agent_key ?? agent.id}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontFamily: "'Poppins', sans-serif",
                }}
              >
                ✕
              </button>
            </div>

            {/* ── Tabs ────────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              {(Object.keys(TAB_LABELS) as Tab[]).map(tab => {
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      background: 'transparent',
                      color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.35)',
                      fontFamily: "'Poppins', sans-serif",
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                )
              })}
            </div>

            {/* ── Tab Content ─────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
              {/* TAB: Infos */}
              {activeTab === 'infos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Nom</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Rôle</label>
                    <input
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      placeholder="ex: CPO Agent, Dev Lead..."
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Modèle LLM</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { value: '', label: 'Défaut', badge: '🧠' },
                        { value: 'claude-sonnet-4-6', label: 'Sonnet', badge: '🧠' },
                        { value: 'claude-haiku-4-5', label: 'Haiku', badge: '⚡' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setModel(opt.value)}
                          style={{
                            flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                            border: model === opt.value ? '1px solid rgba(225,31,123,0.5)' : '1px solid rgba(255,255,255,0.10)',
                            background: model === opt.value ? 'rgba(225,31,123,0.1)' : 'rgba(255,255,255,0.04)',
                            color: model === opt.value ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                            fontSize: 11, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                            transition: 'all 0.15s',
                          }}
                        >
                          {opt.badge} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Description de l'agent..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Type d'entité</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { value: 'ai', label: '🤖 IA' },
                        { value: 'human', label: '👤 Humain' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEntityType(opt.value as 'ai' | 'human')}
                          style={{
                            flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                            border: entityType === opt.value ? '1px solid rgba(225,31,123,0.5)' : '1px solid rgba(255,255,255,0.10)',
                            background: entityType === opt.value ? 'rgba(225,31,123,0.1)' : 'rgba(255,255,255,0.04)',
                            color: entityType === opt.value ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                            fontSize: 12, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                            transition: 'all 0.15s',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Prompt */}
              {activeTab === 'prompt' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>System Prompt</label>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, lineHeight: 1.5 }}>
                      Instructions système envoyées à chaque conversation avec cet agent.
                    </p>
                    <textarea
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      placeholder="Tu es un agent senior spécialisé en React. Toujours écrire des tests..."
                      rows={14}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 280, lineHeight: 1.6 }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                    {systemPrompt.length > 0 && (
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                        {systemPrompt.length} caractères
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Skills */}
              {activeTab === 'skills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Skills (séparés par des virgules)</label>
                    <input
                      value={skills}
                      onChange={e => setSkills(e.target.value)}
                      placeholder="ex: code, design, infra, review, deploy"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                  </div>
                  {/* Tags preview */}
                  {skills.trim().length > 0 && (
                    <div>
                      <label style={labelStyle}>Aperçu</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: 'rgba(124,58,237,0.15)',
                              border: '1px solid rgba(124,58,237,0.3)',
                              color: 'rgba(167,139,250,0.9)',
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {skills.trim().length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                      Aucun skill défini
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Connexions */}
              {activeTab === 'connexions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>
                      Token Bot Telegram <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none' }}>(optionnel)</span>
                    </label>
                    <input
                      value={botToken}
                      onChange={e => setBotToken(e.target.value)}
                      placeholder="123456789:AAF..."
                      type="password"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, lineHeight: 1.5 }}>
                      Obtenir via @BotFather sur Telegram.
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Telegram Chat ID <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none' }}>(optionnel)</span>
                    </label>
                    <input
                      value={telegramChatId}
                      onChange={e => setTelegramChatId(e.target.value)}
                      placeholder="-100123456789"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Peut spawner (agent_keys, séparés par virgules)</label>
                    <input
                      value={canSpawn}
                      onChange={e => setCanSpawn(e.target.value)}
                      placeholder="ex: forge, rex, aria"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Peut être spawné par (agent_keys, séparés par virgules)</label>
                    <input
                      value={canBeSpawnedBy}
                      onChange={e => setCanBeSpawnedBy(e.target.value)}
                      placeholder="ex: orion, nova"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    />
                  </div>
                </div>
              )}

              {/* TAB: Adapter */}
              {activeTab === 'adapter' && agent && (
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                    Configure le runtime d'exécution de cet agent.
                  </div>
                  <AdapterConfigPanel
                    initialConfig={adapterConfig}
                    agentKey={agent.agent_key ?? agent.id}
                    onSave={async (config) => {
                      setAdapterConfig(config)
                      const currentMeta = (agent.agent_meta as Record<string, unknown>) ?? {}
                      await supabase
                        .from('canvas_agents')
                        .update({ agent_meta: { ...currentMeta, adapter: config } })
                        .eq('id', agent.id)
                    }}
                  />
                </div>
              )}

              {/* TAB: Proxy */}
              {activeTab === 'proxy' && (
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.5 }}>
                    Proxy d'inférence avec redaction automatique des PII avant envoi au LLM.
                  </div>
                  <InferenceProxyPanel />
                </div>
              )}

              {/* Spacer */}
              <div style={{ height: 100 }} />
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flexShrink: 0,
              background: '#0F0D12',
            }}>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  borderRadius: 8,
                  background: saving ? 'rgba(225,31,123,0.5)' : 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: "'Poppins', sans-serif",
                  opacity: (!name.trim()) ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {saving ? '⏳ Sauvegarde...' : '✓ Enregistrer'}
              </button>

              {isAdmin && onDelete && !agent.is_system && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    width: '100%',
                    padding: '9px 0',
                    borderRadius: 8,
                    background: confirmDelete ? 'rgba(239,68,68,0.2)' : 'transparent',
                    border: `1px solid ${confirmDelete ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: confirmDelete ? '#EF4444' : 'rgba(255,255,255,0.3)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: "'Poppins', sans-serif",
                    transition: 'all 0.15s',
                  }}
                >
                  {deleting ? '⏳ Suppression...' : confirmDelete ? '⚠️ Confirmer la suppression' : '🗑 Supprimer l\'agent'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
