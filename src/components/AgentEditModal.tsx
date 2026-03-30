import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { ModelSelector } from './ModelSelector'
import type { CanvasAgent } from '../types'

interface AgentEditModalProps {
  agent: CanvasAgent | null
  onClose: () => void
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

export function AgentEditModal({ agent, onClose }: AgentEditModalProps) {
  const { updateCanvasAgent } = useLaunchpadStore()

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [modelFallback, setModelFallback] = useState('claude-haiku-3-5')
  const [skills, setSkills] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (agent) {
      setName(agent.name ?? '')
      setRole(agent.role ?? agent.agent_meta?.role ?? '')
      setModel(agent.model ?? agent.agent_meta?.model ?? 'claude-sonnet-4-6')
      setModelFallback(agent.agent_meta?.model_fallback ?? 'claude-haiku-3-5')
      setSkills((agent.skills ?? []).join(', '))
      setSystemPrompt(agent.agent_meta?.system_prompt ?? '')
    }
  }, [agent])

  const handleSave = async () => {
    if (!agent) return
    setSaving(true)
    await updateCanvasAgent(agent.id, {
      name,
      role,
      model,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      agent_meta: {
        ...agent.agent_meta,
        role,
        model,
        model_fallback: modelFallback,
        system_prompt: systemPrompt,
      },
    })
    setSaving(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Inner backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 10,
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Modal drawer */}
          <motion.div
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: 420,
              background: '#0F0D12',
              borderLeft: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              zIndex: 11,
              padding: '20px 24px',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  Éditer l'agent
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'monospace',
                  marginTop: 2,
                }}>
                  {agent.agent_key ?? agent.id}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-default)',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontFamily: "'Poppins', sans-serif",
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'
                  ;(e.currentTarget as HTMLElement).style.color = '#fff'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div>
                <label style={labelStyle}>Nom</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
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
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>

              <div>
                <label style={labelStyle}>Modèle LLM</label>
                <ModelSelector
                  value={model}
                  onChange={(modelId) => setModel(modelId)}
                />
              </div>

              <div>
                <label style={labelStyle}>Modèle de secours</label>
                <ModelSelector
                  value={modelFallback}
                  onChange={(id) => setModelFallback(id)}
                />
              </div>

              <div>
                <label style={labelStyle}>Skills (séparés par des virgules)</label>
                <input
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  placeholder="ex: code, design, infra"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>

              <div>
                <label style={labelStyle}>System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder="Instructions système pour l'agent..."
                  rows={6}
                  style={{
                    ...inputStyle,
                    resize: 'vertical' as const,
                    minHeight: 120,
                    lineHeight: 1.5,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  background: saving ? 'rgba(225,31,123,0.5)' : 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#C8166A' }}
                onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = 'var(--accent)' }}
              >
                {saving ? '⏳ Sauvegarde...' : '✓ Sauvegarder'}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-default)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Annuler
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
