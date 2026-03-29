/**
 * SettingsPage — Route "/settings"
 * TK-0168 — Settings shell
 * TK-0165 — Automations tab added
 */
import { useState, useEffect } from 'react'
import { AppSettingsTab } from '../components/AppSettingsTab'
import { AutomationCard } from '../components/AutomationCard'
import { supabase } from '../lib/supabase'
import type { Automation } from '../types'

type SettingsTab = 'general' | 'automations'

// ── AutomationsPanel ──────────────────────────────────────────────────────────
function AutomationsPanel() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)

  const loadAutomations = async () => {
    setLoading(true)
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

  const handleToggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from('automations')
      .update({ enabled })
      .eq('id', id)
    if (!error) {
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a))
      if (selectedAutomation?.id === id) {
        setSelectedAutomation(prev => prev ? { ...prev, enabled } : prev)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
        Chargement des automations…
      </div>
    )
  }

  if (automations.length === 0) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          padding: 32,
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: 'var(--glass-border)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
            Aucune automation configurée
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
            Les automations seront disponibles après la migration SQL
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, display: 'flex', gap: 16, height: '100%', boxSizing: 'border-box' }}>
      {/* Left: automation list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {automations.length} automation{automations.length > 1 ? 's' : ''}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
            {automations.filter(a => a.enabled).length} active{automations.filter(a => a.enabled).length > 1 ? 's' : ''}
          </p>
        </div>
        {automations.map(a => (
          <div
            key={a.id}
            onClick={() => setSelectedAutomation(selectedAutomation?.id === a.id ? null : a)}
            style={{ cursor: 'pointer' }}
          >
            <AutomationCard automation={a} onToggle={handleToggle} />
          </div>
        ))}
      </div>

      {/* Right: detail panel */}
      {selectedAutomation && (
        <div style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--bg-surface)',
          border: 'var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignSelf: 'flex-start',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', flex: 1 }}>
              {selectedAutomation.name}
            </h3>
            <button
              onClick={() => setSelectedAutomation(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 16, padding: 0, marginLeft: 8, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          {selectedAutomation.description && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
              {selectedAutomation.description}
            </p>
          )}

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Type', value: selectedAutomation.adapter_type },
              { label: 'Schedule', value: selectedAutomation.schedule ?? 'Manuel' },
              { label: 'Statut', value: selectedAutomation.enabled ? '✅ Activée' : '⏸️ Désactivée' },
              ...(selectedAutomation.last_run_at ? [{ label: 'Dernier run', value: new Date(selectedAutomation.last_run_at).toLocaleString('fr-FR') }] : []),
              ...(selectedAutomation.last_run_status ? [{ label: 'Résultat', value: selectedAutomation.last_run_status }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', textAlign: 'right' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Last output */}
          {selectedAutomation.last_run_output && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Output
              </div>
              <pre style={{
                margin: 0,
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                overflow: 'auto',
                maxHeight: 120,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {selectedAutomation.last_run_output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── SettingsPage ──────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const TABS: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'Général', icon: '⚙️' },
    { id: 'automations', label: 'Automations', icon: '🔄' },
  ]

  return (
    <div style={{
      height: '100vh',
      background: '#0B090D',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        padding: '16px 24px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'general' && (
          <div style={{ padding: 24 }}>
            <AppSettingsTab />
          </div>
        )}
        {activeTab === 'automations' && <AutomationsPanel />}
      </div>
    </div>
  )
}
