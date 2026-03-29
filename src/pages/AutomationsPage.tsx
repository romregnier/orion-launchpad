/**
 * AutomationsPage — Route "/automations"
 * FIX-6 : Automations en premier niveau de navigation (inspiré Paperclip)
 * Liste complète des automations avec AutomationCard + bouton "+ New Automation"
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AutomationCard } from '../components/AutomationCard'
import type { Automation } from '../types'

// ── NewAutomationModal ────────────────────────────────────────────────────────
interface NewAutomationModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function NewAutomationModal({ open, onClose, onCreated }: NewAutomationModalProps) {
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState('')
  const [adapterType, setAdapterType] = useState('n8n')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Le nom est requis'); return }
    setLoading(true)
    setError('')
    try {
      const { error: insertErr } = await supabase.from('automations').insert({
        name: name.trim(),
        schedule: schedule.trim() || null,
        adapter_type: adapterType,
        enabled: true,
      })
      if (insertErr) throw insertErr
      setName('')
      setSchedule('')
      setAdapterType('n8n')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-elevated, #1E1B22)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 440,
        fontFamily: 'var(--font-display, "Poppins", sans-serif)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>⚡ Nouvelle Automation</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', fontSize: 12, color: '#EF4444', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Nom *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Sync GitHub Issues, Daily Standup..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
                padding: '9px 12px', color: '#fff', fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
              }}
              onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Schedule (cron) <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.25)' }}>optionnel</span>
            </label>
            <input
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              placeholder="Ex: 0 9 * * 1-5 (lun-ven à 9h)"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
                padding: '9px 12px', color: '#fff', fontSize: 13,
                outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Adapter
            </label>
            <select
              value={adapterType}
              onChange={e => setAdapterType(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
                padding: '9px 12px', color: '#fff', fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
              }}
            >
              <option value="n8n">n8n</option>
              <option value="webhook">Webhook</option>
              <option value="cron">Cron</option>
              <option value="zapier">Zapier</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Annuler</button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loading}
            style={{
              padding: '9px 24px', borderRadius: 10,
              background: loading ? 'rgba(225,31,123,0.5)' : '#E11F7B',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Création...' : '+ Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AutomationsPage ───────────────────────────────────────────────────────────
export function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  const loadAutomations = async () => {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('name')
      if (error) {
        setAutomations([])
      } else {
        setAutomations((data as Automation[]) ?? [])
      }
    } catch {
      setAutomations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAutomations()
  }, [])

  const handleAutomationToggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from('automations')
      .update({ enabled })
      .eq('id', id)
    if (!error) {
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a))
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      padding: '24px 32px',
      fontFamily: 'var(--font-display, "Poppins", sans-serif)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary, #fff)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            ⚡ Automations
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary, rgba(255,255,255,0.4))' }}>
            {automations.length} automation{automations.length !== 1 ? 's' : ''} configurée{automations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            background: '#E11F7B',
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          + New Automation
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: 'var(--text-tertiary, rgba(255,255,255,0.4))', fontSize: 14, textAlign: 'center', paddingTop: 48 }}>
          Chargement...
        </div>
      ) : automations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          paddingTop: 64,
          color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.6))', marginBottom: 8 }}>
            Aucune automation configurée
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            Créez votre première automation pour automatiser des tâches répétitives
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              padding: '10px 20px', borderRadius: 12,
              background: 'rgba(225,31,123,0.15)',
              border: '1px solid rgba(225,31,123,0.35)',
              color: '#E11F7B', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            + Créer ma première automation
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
          maxWidth: 960,
        }}>
          {automations.map(a => (
            <AutomationCard
              key={a.id}
              automation={a}
              onToggle={handleAutomationToggle}
            />
          ))}
        </div>
      )}

      <NewAutomationModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => void loadAutomations()}
      />

      <style>{`
        @media (max-width: 640px) {
          .automations-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
