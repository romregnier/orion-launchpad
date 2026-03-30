import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ModalShell } from './ModalShell'
import { SkillsTagInput } from './SkillsTagInput'
import { ModelSelector } from './ModelSelector'
import { Select } from './Select'
import { HelpTooltip } from './HelpTooltip'
import { useLaunchpadStore } from '../store'
import { supabase } from '../lib/supabase'
import { ROLE_TEMPLATES } from '../constants/roleTemplates'
import type { SelectOption } from './Select'
import { findFreePosition } from '../store'
import { logAuditEvent } from '../lib/auditLog'

interface AgentBuilderForm {
  name: string
  agent_key: string
  emoji: string
  role: string
  skills: string[]
  system_prompt: string
  model: string
  model_fallback: string
  can_spawn: string[]
  can_be_spawned_by: string[]
  bot_token: string
  telegram_chat_id: string
  entity_type: 'ai' | 'human'
  reports_to: string
  templateId: string | null
}

const defaultForm: AgentBuilderForm = {
  name: '',
  agent_key: '',
  emoji: '🤖',
  role: '',
  skills: [],
  system_prompt: '',
  model: 'claude-sonnet-4-6',
  model_fallback: 'claude-haiku-4-5',
  can_spawn: [],
  can_be_spawned_by: [],
  bot_token: '',
  telegram_chat_id: '',
  entity_type: 'ai',
  reports_to: '',
  templateId: null,
}

// Stepper component
function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { label: 'Identité', n: 1 },
    { label: 'Config', n: 2 },
    { label: 'Org', n: 3 },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((s, i) => {
        const isActive = s.n === step
        const isCompleted = s.n < step
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {/* Dot */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: isCompleted ? '#10B981' : isActive ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}>
                {isCompleted && <span style={{ fontSize: 6, color: '#fff', fontWeight: 900 }}>✓</span>}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isActive ? '#fff' : isCompleted ? '#10B981' : 'rgba(255,255,255,0.4)',
                fontFamily: "'Poppins', sans-serif",
                whiteSpace: 'nowrap',
              }}>{s.label}</span>
            </div>
            {/* Line between steps */}
            {i < steps.length - 1 && (
              <div style={{
                width: 60, height: 2, marginBottom: 14, marginLeft: 4, marginRight: 4,
                background: isCompleted ? '#10B981' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Role template card
function RoleTemplateCard({ template, selected, onSelect }: {
  template: typeof ROLE_TEMPLATES[0]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      style={{
        padding: 14,
        borderRadius: 12,
        background: selected ? 'rgba(225,31,123,0.10)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border-default)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        fontFamily: "'Poppins', sans-serif",
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
        }} />
      )}
      <div style={{ fontSize: 28, marginBottom: 8 }}>{template.emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{template.name}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {template.skills.slice(0, 4).map(skill => (
          <span key={skill} style={{
            background: 'var(--border-default)',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 10,
            color: 'var(--text-secondary)',
          }}>{skill}</span>
        ))}
      </div>
    </motion.button>
  )
}

// Step 1 — Identity
function Step1({ form, setForm }: { form: AgentBuilderForm; setForm: (f: AgentBuilderForm) => void }) {
  const [nameError, setNameError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const EMOJIS = ['🤖', '🔧', '🎨', '🛡️', '📊', '📣', '🤝', '🔍', '⚡', '🌟', '🧠', '🚀', '💡', '🔮', '🦁', '🐉']

  const generateKey = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 32)

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      agent_key: form.agent_key || generateKey(name),
    })
    if (nameError) setNameError('')
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = ROLE_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    setForm({
      ...form,
      templateId,
      emoji: template.emoji,
      role: template.role,
      skills: [...template.skills],
      system_prompt: template.system_prompt,
      model: template.model,
      model_fallback: template.model_fallback,
      can_spawn: [...template.can_spawn],
      can_be_spawned_by: [...template.can_be_spawned_by],
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Avatar + Name */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              width: 72, height: 72,
              borderRadius: 14,
              background: 'rgba(225,31,123,0.15)',
              border: '2px dashed rgba(225,31,123,0.35)',
              cursor: 'pointer',
              fontSize: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}
          >
            {form.emoji}
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</span>
          </button>
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  position: 'absolute', top: '110%', left: 0,
                  background: '#1E1B22', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 12, padding: 10, zIndex: 100,
                  display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setForm({ ...form, emoji: e }); setShowEmojiPicker(false) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, borderRadius: 6, padding: 4 }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'none')}
                  >{e}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
              NOM *
            </label>
            <input
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Ex: Luna, Forge Jr..."
              maxLength={32}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${nameError ? '#EF4444' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13,
                outline: 'none', boxSizing: 'border-box', fontFamily: "'Poppins', sans-serif",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
            />
            {nameError && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444', fontFamily: "'Poppins', sans-serif" }}>{nameError}</p>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
              AGENT KEY
            </label>
            <input
              value={form.agent_key}
              onChange={e => setForm({ ...form, agent_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              placeholder="mon-agent"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8, padding: '9px 12px', color: 'rgba(255,255,255,0.7)', fontSize: 12,
                outline: 'none', boxSizing: 'border-box', fontFamily: "'Poppins', sans-serif",
                fontStyle: 'italic',
              }}
            />
          </div>
        </div>
      </div>

      {/* Role templates */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
          CHOISIR UN TEMPLATE DE RÔLE *
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ROLE_TEMPLATES.map(template => (
            <RoleTemplateCard
              key={template.id}
              template={template}
              selected={form.templateId === template.id}
              onSelect={() => handleTemplateSelect(template.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Step 2 — Configuration
function Step2({ form, setForm }: { form: AgentBuilderForm; setForm: (f: AgentBuilderForm) => void }) {
  const charCount = form.system_prompt.length
  const charColor = charCount > 4000 ? '#EF4444' : charCount > 2000 ? '#F59E0B' : 'rgba(255,255,255,0.3)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* System prompt */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
            SYSTEM PROMPT
          </label>
          <HelpTooltip tip="Instructions de comportement de l'agent. Définit sa personnalité et ses capacités." />
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            value={form.system_prompt}
            onChange={e => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="Instructions personnalisées pour cet agent..."
            rows={5}
            style={{
              width: '100%', resize: 'vertical', minHeight: 120,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13,
              outline: 'none', boxSizing: 'border-box', fontFamily: "'Poppins', sans-serif",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
          />
          <span style={{
            position: 'absolute', bottom: 8, right: 8,
            fontSize: 11, color: charColor, fontFamily: "'Poppins', sans-serif",
          }}>
            {charCount}
          </span>
        </div>
      </div>

      {/* Model selector */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
            MODÈLE LLM
          </label>
          <HelpTooltip tip="Le modèle LLM utilisé. claude-sonnet-4-6 est recommandé pour la plupart des agents." />
        </div>
        <ModelSelector value={form.model} onChange={v => setForm({ ...form, model: v })} />
      </div>

      {/* Skills */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
          SKILLS
        </label>
        <SkillsTagInput
          value={form.skills}
          onChange={skills => setForm({ ...form, skills })}
        />
      </div>

      {/* Telegram Bot Token (optional) */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
          TELEGRAM BOT TOKEN{' '}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>OPTIONNEL</span>
        </label>
        <input
          type="password"
          value={form.bot_token}
          onChange={e => setForm({ ...form, bot_token: e.target.value })}
          placeholder="1234567890:AAF..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13,
            outline: 'none', boxSizing: 'border-box', fontFamily: "'Poppins', sans-serif",
          }}
        />
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: "'Poppins', sans-serif" }}>
          Pas encore de bot ? → <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ color: '#0EA5E9' }}>Créer via @BotFather ↗</a>
        </p>
      </div>
    </div>
  )
}

// Step 3 — Organisation + Summary
function Step3({ form, setForm }: { form: AgentBuilderForm; setForm: (f: AgentBuilderForm) => void }) {
  const { canvasAgents } = useLaunchpadStore()

  const agentOptions: SelectOption[] = [
    { value: '', label: '— Personne (agent autonome)' },
    ...canvasAgents.map(a => ({ value: a.agent_key || a.id, label: `${a.name} (${a.role || 'agent'})` }))
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Reports to */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
          REPORTERA À
        </label>
        <Select
          value={form.reports_to}
          onChange={v => setForm({ ...form, reports_to: v })}
          options={agentOptions}
        />
      </div>

      {/* Entity type */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
          TYPE D'ENTITÉ
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['ai', 'human'] as const).map(type => (
            <button
              key={type}
              onClick={() => setForm({ ...form, entity_type: type })}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                background: form.entity_type === type ? 'rgba(225,31,123,0.10)' : 'rgba(255,255,255,0.04)',
                border: form.entity_type === type ? '1.5px solid var(--accent)' : '1px solid var(--border-default)',
                cursor: 'pointer', color: form.entity_type === type ? '#fff' : 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.15s ease',
              }}
            >
              {type === 'ai' ? '🤖 IA' : '👤 Humain'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary preview */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
          RÉCAPITULATIF
        </label>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-default)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 36, flexShrink: 0 }}>{form.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
                  {form.name || 'Sans nom'}
                </span>
                {form.role && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: 'rgba(225,31,123,0.15)', color: 'var(--accent)',
                    padding: '2px 8px', borderRadius: 999,
                    fontFamily: "'Poppins', sans-serif",
                  }}>{form.role}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontFamily: "'Poppins', sans-serif" }}>
                Modèle : {form.model}
              </div>
              {form.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Poppins', sans-serif" }}>Skills :</span>
                  {form.skills.slice(0, 5).map(s => (
                    <span key={s} style={{
                      fontSize: 10, background: 'rgba(225,31,123,0.12)', color: 'var(--accent)',
                      padding: '2px 6px', borderRadius: 4, fontFamily: "'Poppins', sans-serif",
                    }}>{s}</span>
                  ))}
                  {form.skills.length > 5 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: "'Poppins', sans-serif" }}>+{form.skills.length - 5}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main modal component
export interface AgentBuilderPrefill {
  name?: string
  emoji?: string
  role?: string
  skills?: string[]
  system_prompt?: string
  model?: string
}

interface AgentBuilderModalProps {
  open: boolean
  onClose: () => void
  prefill?: AgentBuilderPrefill
}

export function AgentBuilderModal({ open, onClose, prefill }: AgentBuilderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<AgentBuilderForm>({ ...defaultForm })
  const [hiring, setHiring] = useState(false)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const { canvasAgents, currentUser, setLastNewAgentId } = useLaunchpadStore()

  // Pré-remplissage depuis Marketplace
  useEffect(() => {
    if (open && prefill) {
      setForm(prev => ({
        ...prev,
        name: prefill.name ?? prev.name,
        emoji: prefill.emoji ?? prev.emoji,
        role: prefill.role ?? prev.role,
        skills: prefill.skills ?? prev.skills,
        system_prompt: prefill.system_prompt ?? prev.system_prompt,
        model: prefill.model ?? prev.model,
      }))
    }
    if (!open) {
      // Reset form on close
      setTimeout(() => {
        setStep(1)
        setForm({ ...defaultForm })
        setError('')
      }, 300)
    }
  }, [open, prefill])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleClose = () => {
    setStep(1)
    setForm({ ...defaultForm })
    setError('')
    onClose()
  }

  const canNext = () => {
    if (step === 1) return form.name.trim().length >= 2 && form.templateId !== null
    if (step === 2) return true
    return true
  }

  const handleNext = () => {
    if (step === 1 && !canNext()) return
    setStep(prev => Math.min(prev + 1, 3) as 1 | 2 | 3)
  }

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1) as 1 | 2 | 3)
  }

  const getNextPosition = () => {
    const objects = canvasAgents.map(a => ({
      id: a.id, type: 'agent' as const,
      x: a.position.x, y: a.position.y, width: 80, height: 100,
    }))
    return findFreePosition(objects, 80, 100, 100, 100, 30)
  }

  const handleHire = async () => {
    if (hiring) return
    setHiring(true)
    setError('')
    try {
      const pos = getNextPosition()
      const { activeCapsuleId } = useLaunchpadStore.getState()
      const baseKey = form.agent_key || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const uniqueKey = `${baseKey}-${Date.now().toString(36).slice(-4)}`
      const { data: newAgent, error: insertError } = await supabase.from('canvas_agents').insert({
        owner: currentUser?.username ?? 'anon',
        name: form.name,
        agent_key: uniqueKey,
        position_x: pos.x, position_y: pos.y,
        home_x: pos.x, home_y: pos.y,
        entity_type: form.entity_type,
        role: form.role || null,
        skills: form.skills,
        model: form.model || null,
        model_fallback: form.model_fallback || null,
        can_spawn: form.can_spawn,
        can_be_spawned_by: form.can_be_spawned_by,
        agent_meta: {
          role: form.role,
          system_prompt: form.system_prompt,
          model: form.model,
          model_fallback: form.model_fallback,
          emoji: form.emoji,
        },
        bot_token: form.bot_token || null,
        telegram_chat_id: form.telegram_chat_id || null,
        status: 'idle',
        is_system: false,
        tailor_config: null,
        capsule_id: activeCapsuleId ?? undefined,
      }).select('id, position_x, position_y').single()
      if (insertError) throw insertError
      // Mark the new agent for spawn animation — use id directly, no separate query
      if (newAgent?.id) {
        setLastNewAgentId(newAgent.id)
        setTimeout(() => setLastNewAgentId(null), 5000)
      }
      const agentName = form.name
      // Force re-fetch canvas agents so the new agent appears immediately
      const { subscribeToAgents } = useLaunchpadStore.getState()
      subscribeToAgents()
      // TK-0157 — Audit log: agent hired
      logAuditEvent({
        agent_key: uniqueKey,
        capsule_id: useLaunchpadStore.getState().activeCapsuleId ?? undefined,
        event_type: 'agent_hired',
        event_data: { name: form.name, role: form.role, model: form.model },
        severity: 'info',
      })
      handleClose()
      showToast(`🎉 ${agentName} has joined the team!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setHiring(false)
    }
  }

  const footerContent = (
    <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'space-between' }}>
      {step > 1 ? (
        <button onClick={handleBack} style={{
          padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
        }}>← Retour</button>
      ) : <div />}

      {step < 3 ? (
        <button
          onClick={handleNext}
          disabled={!canNext()}
          style={{
            padding: '10px 24px', borderRadius: 10,
            background: canNext() ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
            border: 'none', color: canNext() ? '#fff' : 'rgba(255,255,255,0.4)',
            fontSize: 13, fontWeight: 700, cursor: canNext() ? 'pointer' : 'not-allowed',
            fontFamily: "'Poppins', sans-serif", transition: 'all 0.15s ease',
          }}
        >Suivant →</button>
      ) : (
        <button
          onClick={handleHire}
          disabled={hiring}
          style={{
            padding: '10px 24px', borderRadius: 10,
            background: hiring ? 'rgba(225,31,123,0.5)' : 'var(--accent)',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: hiring ? 'not-allowed' : 'pointer', fontFamily: "'Poppins', sans-serif",
          }}
        >
          {hiring ? '⏳ Création...' : '✓ Recruter l\'agent'}
        </button>
      )}
    </div>
  )

  return (
    <>
    {/* Toast notification */}
    <AnimatePresence>
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 99999,
            background: 'linear-gradient(135deg, #1E1B22 0%, #2A1F2E 100%)',
            border: '1px solid rgba(225,31,123,0.35)',
            borderRadius: 14, padding: '14px 20px',
            color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(225,31,123,0.15)',
            maxWidth: 320,
          }}
        >
          {toastMsg}
        </motion.div>
      )}
    </AnimatePresence>
    <ModalShell
      open={open}
      title={step === 1 ? 'Recruter un agent' : `Configurer ${form.name || 'l\'agent'}`}
      subtitle={`Étape ${step} sur 3`}
      emoji={form.emoji}
      onClose={handleClose}
      maxWidth={560}
      footer={footerContent}
    >
      <Stepper step={step} />

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', fontSize: 12, color: '#EF4444', marginBottom: 16, fontFamily: "'Poppins', sans-serif" }}>
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.15 }}
        >
          {step === 1 && <Step1 form={form} setForm={setForm} />}
          {step === 2 && <Step2 form={form} setForm={setForm} />}
          {step === 3 && <Step3 form={form} setForm={setForm} />}
        </motion.div>
      </AnimatePresence>
    </ModalShell>
    </>
  )
}
