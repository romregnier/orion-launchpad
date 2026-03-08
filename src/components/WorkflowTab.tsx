/**
 * WorkflowTab.tsx — TK-0104
 * CRUD de règles d'automatisation pour l'AdminPanel.
 * Implémente : triggers, actions, conditions, realtime + poll 5s, animations Framer Motion.
 */

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'
import type { WorkflowRule } from '../types'
import { Select } from './Select'

// ─── Types ──────────────────────────────────────────────────────────────────

type TriggerEvent =
  | 'ticket_status_change'
  | 'milestone_complete'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'label_added'

type ActionType = WorkflowRule['action_type']

type TicketStatus = 'backlog' | 'queued' | 'in_progress' | 'in_review' | 'verified' | 'done' | 'failed'

interface RuleFormState {
  name: string
  trigger_event: TriggerEvent | ''
  trigger_agent: string
  action_type: ActionType | ''
  action_agent: string
  conditions: Record<string, string>
  project: string
  priority: number
  enabled: boolean
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: 'ticket_status_change', label: '🎫 Ticket change de statut' },
  { value: 'milestone_complete',   label: '🏁 Milestone complétée' },
  { value: 'ticket_created',       label: '➕ Ticket créé' },
  { value: 'ticket_assigned',      label: '👤 Ticket assigné' },
  { value: 'label_added',          label: '🏷️ Label ajouté' },
]

const ACTION_OPTIONS = [
  { value: 'notify',        label: '🔔 Notifier un agent' },
  { value: 'spawn',         label: '🚀 Spawner un agent' },
  { value: 'add_label',     label: '🏷️ Ajouter un label automatique' },
  { value: 'update_ticket', label: '📋 Mettre à jour le ticket' },
  { value: 'send_summary',  label: '📨 Envoyer un résumé' },
]

const STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: 'backlog',     label: 'Backlog' },
  { value: 'queued',      label: 'Queued' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review',   label: 'In Review' },
  { value: 'verified',    label: 'Verified' },
  { value: 'done',        label: 'Done' },
  { value: 'failed',      label: 'Failed' },
]

// ─── Design tokens ──────────────────────────────────────────────────────────

const T = {
  accent:    '#E11F7B',
  bg:        '#0B090D',
  surface:   '#2C272F',
  elevated:  '#3E3742',
  text:      '#fff',
  muted:     'rgba(255,255,255,0.35)',
  border:    '1px solid rgba(255,255,255,0.07)',
  cardBg:    'rgba(255,255,255,0.03)',
  font:      "'Poppins', sans-serif",
  spring:    { type: 'spring' as const, stiffness: 350, damping: 28 },
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: T.text,
  fontFamily: T.font,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: T.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
  display: 'block',
  fontFamily: T.font,
}

// ─── StatusDot ──────────────────────────────────────────────────────────────

function StatusDot({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
  )
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.div
      onClick={() => onChange(!value)}
      style={{
        width: 32, height: 18, borderRadius: 9,
        background: value ? T.accent : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s ease',
      }}
    >
      <motion.div
        animate={{ x: value ? 16 : 2 }}
        transition={T.spring}
        style={{
          position: 'absolute', top: 2, width: 14, height: 14,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </motion.div>
  )
}

// ─── Conditional fields ──────────────────────────────────────────────────────

interface CondFieldsProps {
  trigger: TriggerEvent | ''
  conditions: Record<string, string>
  onChange: (conditions: Record<string, string>) => void
  agentOptions: Array<{ value: string; label: string }>
  projectOptions: Array<{ value: string; label: string }>
}

function ConditionFields({ trigger, conditions, onChange, agentOptions, projectOptions }: CondFieldsProps) {
  const fadeIn = { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.15, ease: 'easeOut' as const } }

  if (!trigger) return null

  return (
    <AnimatePresence mode="wait">
      {trigger === 'ticket_status_change' && (
        <motion.div key="status_change" {...fadeIn} style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>De statut</label>
            <Select
              value={conditions.from_status ?? ''}
              onChange={v => onChange({ ...conditions, from_status: v })}
              options={STATUS_OPTIONS}
              placeholder="— Tout statut —"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>À statut</label>
            <Select
              value={conditions.to_status ?? ''}
              onChange={v => onChange({ ...conditions, to_status: v })}
              options={STATUS_OPTIONS}
              placeholder="— Tout statut —"
            />
          </div>
        </motion.div>
      )}
      {trigger === 'milestone_complete' && (
        <motion.div key="milestone" {...fadeIn}>
          <label style={labelStyle}>Nom de la milestone (optionnel)</label>
          <input
            style={inputStyle}
            placeholder="vide = toutes les milestones"
            value={conditions.milestone_name ?? ''}
            onChange={e => onChange({ ...conditions, milestone_name: e.target.value })}
          />
        </motion.div>
      )}
      {trigger === 'ticket_created' && (
        <motion.div key="ticket_created" {...fadeIn}>
          <label style={labelStyle}>Projet (optionnel)</label>
          <Select
            value={conditions.project ?? ''}
            onChange={v => onChange({ ...conditions, project: v })}
            options={projectOptions}
            placeholder="— Tous les projets —"
          />
        </motion.div>
      )}
      {trigger === 'ticket_assigned' && (
        <motion.div key="ticket_assigned" {...fadeIn}>
          <label style={labelStyle}>Agent assigné</label>
          <Select
            value={conditions.agent_key ?? ''}
            onChange={v => onChange({ ...conditions, agent_key: v })}
            options={agentOptions}
            placeholder="— N'importe quel agent —"
          />
        </motion.div>
      )}
      {trigger === 'label_added' && (
        <motion.div key="label_added" {...fadeIn}>
          <label style={labelStyle}>Label</label>
          <input
            style={inputStyle}
            placeholder="ex: urgent, bug, sprint-3..."
            value={conditions.label ?? ''}
            onChange={e => onChange({ ...conditions, label: e.target.value })}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── WorkflowRuleEditor ──────────────────────────────────────────────────────

interface EditorProps {
  initial?: Partial<WorkflowRule>
  onSave: (rule: Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel: () => void
  agentOptions: Array<{ value: string; label: string }>
  projectOptions: Array<{ value: string; label: string }>
}

function WorkflowRuleEditor({ initial, onSave, onCancel, agentOptions, projectOptions }: EditorProps) {
  const [form, setForm] = useState<RuleFormState>(() => ({
    name:          initial?.name          ?? '',
    trigger_event: (initial?.trigger_event as TriggerEvent) ?? '',
    trigger_agent: initial?.trigger_agent ?? '',
    action_type:   initial?.action_type   ?? '',
    action_agent:  initial?.action_agent  ?? '',
    conditions:    (initial?.conditions as Record<string, string>) ?? {},
    project:       initial?.project       ?? '',
    priority:      initial?.priority      ?? 0,
    enabled:       initial?.enabled       ?? true,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof RuleFormState, value: RuleFormState[keyof RuleFormState]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.trigger_event || !form.action_type || !form.name.trim()) {
      setError('Nom, déclencheur et action sont requis.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSave({
        name:          form.name.trim(),
        trigger_event: form.trigger_event,
        trigger_agent: form.trigger_agent || null,
        action_type:   form.action_type as ActionType,
        action_agent:  form.action_agent || null,
        conditions:    form.conditions,
        project:       form.project || null,
        priority:      form.priority,
        enabled:       form.enabled,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: T.surface,
      border: T.border,
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 16,
    }}>
      {/* 2-col grid: trigger | action */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
        marginBottom: 16,
      }}>
        {/* QUAND */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: T.font }}>
            QUAND...
          </div>
          <div>
            <label style={labelStyle}>Évènement</label>
            <Select
              value={form.trigger_event}
              onChange={v => { set('trigger_event', v as TriggerEvent); set('conditions', {}) }}
              options={TRIGGER_OPTIONS}
              placeholder="— Choisir un déclencheur —"
            />
          </div>
          <ConditionFields
            trigger={form.trigger_event}
            conditions={form.conditions}
            onChange={v => set('conditions', v)}
            agentOptions={agentOptions}
            projectOptions={projectOptions}
          />
        </div>

        {/* ALORS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: T.font }}>
            ALORS...
          </div>
          <div>
            <label style={labelStyle}>Action</label>
            <Select
              value={form.action_type}
              onChange={v => set('action_type', v as ActionType)}
              options={ACTION_OPTIONS}
              placeholder="— Choisir une action —"
            />
          </div>
          <div>
            <label style={labelStyle}>Destinataire (agent)</label>
            <Select
              value={form.action_agent}
              onChange={v => set('action_agent', v)}
              options={agentOptions}
              placeholder="— N'importe quel agent —"
            />
          </div>
        </div>
      </div>

      {/* Row: name + project */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Nom de la règle</label>
          <input
            style={inputStyle}
            placeholder="ex: Notify Forge on ticket → in_review"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Projet</label>
          <Select
            value={form.project}
            onChange={v => set('project', v)}
            options={projectOptions}
            placeholder="— Tous les projets —"
          />
        </div>
      </div>

      {/* Row: enabled + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: T.font, fontSize: 13, color: T.muted }}>
          <ToggleSwitch value={form.enabled} onChange={v => set('enabled', v)} />
          Activer immédiatement
        </label>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {error && <span style={{ fontSize: 12, color: '#f87171', fontFamily: T.font }}>{error}</span>}
          <button
            onClick={onCancel}
            style={{ padding: '7px 14px', borderRadius: 7, border: T.border, background: 'transparent', color: T.muted, fontSize: 13, fontFamily: T.font, cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none',
              background: saving ? 'rgba(225,31,123,0.5)' : T.accent,
              color: '#fff', fontSize: 13, fontFamily: T.font, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {saving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                  style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                />
                Enregistrement...
              </>
            ) : (
              initial?.id ? 'Enregistrer →' : 'Créer la règle →'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── WorkflowRuleCard ────────────────────────────────────────────────────────

interface CardProps {
  rule: WorkflowRule
  onEdit: (rule: WorkflowRule) => void
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

function WorkflowRuleCard({ rule, onEdit, onToggle, onDelete }: CardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const triggerLabel = TRIGGER_OPTIONS.find(t => t.value === rule.trigger_event)?.label ?? rule.trigger_event
  const actionLabel  = ACTION_OPTIONS.find(a => a.value === rule.action_type)?.label ?? rule.action_type

  const condStr = Object.entries(rule.conditions ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={T.spring}
      style={{
        background: T.cardBg,
        border: T.border,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <StatusDot enabled={rule.enabled} />
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {rule.name}
          </span>
        </div>
        <span style={{ fontSize: 11, color: rule.enabled ? '#4ade80' : T.muted, fontFamily: T.font, flexShrink: 0 }}>
          {rule.enabled ? '● actif' : '○ inactif'}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>QUAND</span>{'  '}
          {triggerLabel}{condStr ? ` (${condStr})` : ''}
        </div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ALORS</span>{'  '}
          {actionLabel}{rule.action_agent ? ` → ${rule.action_agent}` : ''}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>
          {rule.project ? `Projet: ${rule.project}` : 'Tous projets'}
          {' · '}Priorité: {rule.priority}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ display: 'flex', gap: 6, alignItems: 'center' }}
              >
                <span style={{ fontSize: 12, color: '#f87171', fontFamily: T.font }}>Supprimer ?</span>
                <button
                  onClick={() => onDelete(rule.id)}
                  style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: '#f87171', color: '#fff', fontSize: 11, fontFamily: T.font, cursor: 'pointer' }}
                >
                  Oui
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ padding: '3px 8px', borderRadius: 5, border: T.border, background: 'transparent', color: T.muted, fontSize: 11, fontFamily: T.font, cursor: 'pointer' }}
                >
                  Non
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', gap: 6 }}
              >
                <button
                  onClick={() => onEdit(rule)}
                  title="Modifier"
                  style={{ padding: '4px 8px', borderRadius: 6, border: T.border, background: 'transparent', color: T.muted, fontSize: 12, cursor: 'pointer' }}
                >
                  ✎
                </button>
                <button
                  onClick={() => onToggle(rule.id, !rule.enabled)}
                  title={rule.enabled ? 'Désactiver' : 'Activer'}
                  style={{ padding: '4px 8px', borderRadius: 6, border: T.border, background: 'transparent', color: T.muted, fontSize: 12, cursor: 'pointer' }}
                >
                  {rule.enabled ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="Supprimer"
                  style={{ padding: '4px 8px', borderRadius: 6, border: T.border, background: 'transparent', color: '#f87171', fontSize: 12, cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ─── WorkflowTab ─────────────────────────────────────────────────────────────

export function WorkflowTab() {
  const { currentUser, canvasAgents, projects } = useLaunchpadStore()
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  // Responsive
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Load rules — realtime + poll 5s
  const loadRules = useCallback(() => {
    supabase
      .from('workflow_rules')
      .select('*')
      .order('priority', { ascending: false })
      .then(({ data }) => setRules(data ?? []))
  }, [])

  useEffect(() => {
    loadRules()
    const interval = setInterval(loadRules, 5000)
    const channel = supabase
      .channel('workflow-rules-tab')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_rules' }, loadRules)
      .subscribe()
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [loadRules])

  // Agent options from canvas
  const agentOptions = canvasAgents
    .filter(a => a.agent_key)
    .map(a => ({ value: a.agent_key!, label: a.name }))

  // Project options
  const projectOptions = projects.map(p => ({ value: p.id, label: p.title }))

  // Admin guard
  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300, padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🔐</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, fontFamily: T.font }}>Accès réservé aux admins</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 6, fontFamily: T.font }}>
          Seuls les administrateurs peuvent gérer les règles d'automatisation.
        </div>
      </div>
    )
  }

  const handleSave = async (ruleData: Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRule) {
      await supabase
        .from('workflow_rules')
        .update({ ...ruleData, updated_at: new Date().toISOString() })
        .eq('id', editingRule.id)
        .then(() => {})
    } else {
      await supabase
        .from('workflow_rules')
        .insert(ruleData)
        .then(() => {})
    }
    loadRules()
    setShowEditor(false)
    setEditingRule(null)
  }

  const handleToggle = (id: string, enabled: boolean) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
    supabase
      .from('workflow_rules')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => {})
  }

  const handleDelete = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id))
    supabase
      .from('workflow_rules')
      .delete()
      .eq('id', id)
      .then(() => {})
  }

  const handleEdit = (rule: WorkflowRule) => {
    setEditingRule(rule)
    setShowEditor(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setShowEditor(false)
    setEditingRule(null)
  }

  const handleNewRule = () => {
    setEditingRule(null)
    setShowEditor(true)
  }

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', fontFamily: T.font, minHeight: 400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: T.font }}>
            🔀 Workflow Editor
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: T.font }}>
            {rules.length} règle{rules.length !== 1 ? 's' : ''} configurée{rules.length !== 1 ? 's' : ''}
          </div>
        </div>
        {!showEditor && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNewRule}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: T.accent, color: '#fff',
              fontSize: 13, fontWeight: 600, fontFamily: T.font,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>+</span> Nouvelle règle
          </motion.button>
        )}
      </div>

      {/* Editor — animated slide-in */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            key="editor"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={T.spring}
            style={{ overflow: 'hidden' }}
          >
            <WorkflowRuleEditor
              initial={editingRule ?? undefined}
              onSave={handleSave}
              onCancel={handleCancel}
              agentOptions={agentOptions}
              projectOptions={projectOptions}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', textAlign: 'center' }}>
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{ fontSize: 52, lineHeight: 1, marginBottom: 20 }}
          >
            🔀
          </motion.div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.muted, marginBottom: 8, fontFamily: T.font }}>
            Aucune règle configurée
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', maxWidth: 300, lineHeight: 1.5, marginBottom: 20, fontFamily: T.font }}>
            Créez votre première règle d'automatisation pour déclencher des actions automatiquement.
          </div>
          {!showEditor && (
            <button
              onClick={handleNewRule}
              style={{
                padding: '8px 18px', borderRadius: 8, border: `1px solid ${T.accent}`,
                background: 'transparent', color: T.accent,
                fontSize: 13, fontFamily: T.font, cursor: 'pointer',
              }}
            >
              + Créer une règle
            </button>
          )}
        </div>
      ) : (
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {rules.map(rule => (
              <WorkflowRuleCard
                key={rule.id}
                rule={rule}
                onEdit={handleEdit}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
