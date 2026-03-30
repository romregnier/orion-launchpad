/**
 * PolicyEditor — TK-0234
 * Éditeur YAML déclaratif pour les capsule policies (Policy Engine Gravity).
 * Historique des versions, activation, CSS variables uniquement.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePolicyEngine } from '../hooks/usePolicyEngine'
import { DEFAULT_POLICY_YAML } from '../types/policy'
import type { CapsulePolicy } from '../types/policy'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

interface PolicyEditorProps {
  capsuleId: string
  capsuleName?: string
  onClose?: () => void
}

export function PolicyEditor({ capsuleId, capsuleName, onClose }: PolicyEditorProps) {
  const {
    policies,
    loading,
    error,
    tableAvailable,
    fetchPolicies,
    createPolicy,
    activatePolicy,
    parsePolicy,
  } = usePolicyEngine()

  const [yamlContent, setYamlContent] = useState(DEFAULT_POLICY_YAML)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showParsed, setShowParsed] = useState(false)

  useEffect(() => {
    fetchPolicies(capsuleId).then(fetched => {
      const active = fetched.find(p => p.is_active)
      if (active) setYamlContent(active.policy_yaml)
    })
  }, [capsuleId, fetchPolicies])

  const handleSave = async () => {
    setSaving(true)
    const created = await createPolicy(capsuleId, yamlContent)
    setSaving(false)
    if (created) {
      setSuccessMsg(`Version ${created.version} créée et activée ✓`)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleActivate = async (policy: CapsulePolicy) => {
    setActivating(policy.id)
    const ok = await activatePolicy(policy.id, capsuleId)
    setActivating(null)
    if (ok) {
      setYamlContent(policy.policy_yaml)
      setSuccessMsg(`Version ${policy.version} activée ✓`)
      setTimeout(() => setSuccessMsg(null), 2500)
    }
  }

  const parsed = showParsed ? parsePolicy(yamlContent) : null

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 720,
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚙️ Policy Engine
            <span style={{
              fontSize: 11,
              background: 'rgba(var(--accent-rgb, 99,102,241), 0.15)',
              color: 'var(--accent)',
              padding: '2px 7px',
              borderRadius: 20,
              fontWeight: 500,
            }}>GRAVITY</span>
          </div>
          {capsuleName && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{capsuleName}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowParsed(v => !v)}
            style={{
              background: showParsed ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '5px 12px',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {showParsed ? 'YAML' : 'Aperçu'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 18,
                padding: 4,
                lineHeight: 1,
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div style={{ padding: '0 20px' }}>
        {!tableAvailable && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}>
            ⚠️ Table capsule_policies non disponible. Éditeur en mode preview.
          </div>
        )}
        {error && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.1)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}>{error}</div>
        )}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 12,
                padding: '10px 14px',
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 8,
                color: 'var(--text-secondary)',
                fontSize: 13,
              }}
            >
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Editor */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 16, flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!showParsed ? (
            <textarea
              value={yamlContent}
              onChange={e => setYamlContent(e.target.value)}
              spellCheck={false}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '14px 16px',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                lineHeight: 1.6,
                resize: 'vertical',
                minHeight: 280,
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            // Parsed preview
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '14px 16px',
              minHeight: 280,
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600 }}>
                Politique parsée
              </div>
              {parsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {parsed.budget_hard_stop !== undefined && (
                    <PolicyRow icon="💰" label="Budget max/agent" value={`$${parsed.budget_hard_stop}/mois`} />
                  )}
                  {parsed.budget_alert !== undefined && (
                    <PolicyRow icon="🔔" label="Alerte budget" value={`$${parsed.budget_alert}`} />
                  )}
                  {parsed.network_egress && parsed.network_egress.length > 0 && (
                    <PolicyRow icon="🌐" label="Egress autorisé" value={parsed.network_egress.join(', ')} />
                  )}
                  {parsed.tool_whitelist && parsed.tool_whitelist.length > 0 && (
                    <PolicyRow icon="🔧" label="Outils autorisés" value={parsed.tool_whitelist.join(', ')} />
                  )}
                  {parsed.rollback_on_error !== undefined && (
                    <PolicyRow icon="↩️" label="Rollback on error" value={parsed.rollback_on_error ? 'Oui' : 'Non'} />
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving || !tableAvailable}
              style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 7,
                padding: '9px 18px',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: saving || !tableAvailable ? 'not-allowed' : 'pointer',
                opacity: saving || !tableAvailable ? 0.6 : 1,
              }}
            >
              {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Version history */}
        {policies.length > 0 && (
          <div style={{
            width: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Historique
            </div>
            {loading && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6 }}>Chargement…</div>
            )}
            {policies.map(policy => (
              <div
                key={policy.id}
                style={{
                  padding: '10px 12px',
                  background: policy.is_active
                    ? 'rgba(99,102,241,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${policy.is_active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: policy.is_active ? 'var(--accent)' : 'var(--text-primary)',
                  }}>
                    v{policy.version}
                  </span>
                  {policy.is_active && (
                    <span style={{
                      fontSize: 10,
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10B981',
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontWeight: 500,
                    }}>active</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>
                  {formatDate(policy.created_at)}
                </div>
                {!policy.is_active && (
                  <button
                    onClick={() => handleActivate(policy)}
                    disabled={activating === policy.id}
                    style={{
                      marginTop: 4,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 5,
                      padding: '4px',
                      color: 'var(--text-secondary)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {activating === policy.id ? '…' : 'Activer'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PolicyRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'monospace' }}>{value}</div>
      </div>
    </div>
  )
}

export default PolicyEditor
