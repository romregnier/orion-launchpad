/**
 * CredentialsPanel — TK-0233
 * Panel 360px slide-from-right pour gérer les credentials chiffrés des agents.
 * Pattern similaire à AgentMemoryPanel. CSS variables uniquement.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentCredentials } from '../hooks/useAgentCredentials'
import type { AgentCredential } from '../hooks/useAgentCredentials'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

interface CredentialsPanelProps {
  agentId: string
  agentName?: string
  onClose: () => void
}

export function CredentialsPanel({ agentId, agentName, onClose }: CredentialsPanelProps) {
  const {
    credentials,
    loading,
    error,
    tableAvailable,
    fetchCredentials,
    storeCredential,
    deleteCredential,
  } = useAgentCredentials()

  const [showAddForm, setShowAddForm] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyValue, setKeyValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchCredentials(agentId)
  }, [agentId, fetchCredentials])

  const handleAdd = async () => {
    if (!keyName.trim() || !keyValue.trim()) return
    setSaving(true)
    const ok = await storeCredential(agentId, keyName.trim(), keyValue.trim())
    setSaving(false)
    if (ok) {
      setKeyName('')
      setKeyValue('')
      setShowAddForm(false)
      setSuccessMsg('Credential enregistré ✓')
      setTimeout(() => setSuccessMsg(null), 2500)
    }
  }

  const handleDelete = async (cred: AgentCredential) => {
    if (deleteConfirm !== cred.key_name) {
      setDeleteConfirm(cred.key_name)
      return
    }
    await deleteCredential(agentId, cred.key_name)
    setDeleteConfirm(null)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="credentials-panel"
        initial={{ x: 380 }}
        animate={{ x: 0 }}
        exit={{ x: 380 }}
        transition={{ type: 'spring', damping: 26, stiffness: 200 }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 360,
          height: '100vh',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              🔐 Credentials
            </div>
            {agentName && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{agentName}</div>
            )}
          </div>
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
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Table unavailable notice */}
          {!tableAvailable && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}>
              ⚠️ Table agent_credentials non disponible. La migration SQL doit être appliquée.
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.12)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Success */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
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

          {/* Add form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  padding: '14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    Nouveau credential
                  </div>
                  <input
                    type="text"
                    placeholder="Nom de la clé (ex: OPENAI_API_KEY)"
                    value={keyName}
                    onChange={e => setKeyName(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Valeur (sera chiffrée)"
                    value={keyValue}
                    onChange={e => setKeyValue(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleAdd}
                      disabled={saving || !keyName.trim() || !keyValue.trim()}
                      style={{
                        flex: 1,
                        background: 'var(--accent)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: saving ? 'wait' : 'pointer',
                        opacity: saving || !keyName.trim() || !keyValue.trim() ? 0.6 : 1,
                      }}
                    >
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => { setShowAddForm(false); setKeyName(''); setKeyValue('') }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        padding: '8px 14px',
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add button */}
          {!showAddForm && tableAvailable && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px dashed rgba(255,255,255,0.18)',
                borderRadius: 8,
                padding: '10px',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <span style={{ fontSize: 16 }}>+</span> Ajouter un credential
            </button>
          )}

          {/* Credentials list */}
          {loading && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Chargement…
            </div>
          )}

          {!loading && credentials.length === 0 && tableAvailable && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '24px 0', opacity: 0.6 }}>
              Aucun credential enregistré
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {credentials.map(cred => (
              <motion.div
                key={cred.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>🔑</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                  }}>
                    {cred.key_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatDate(cred.updated_at ?? cred.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    letterSpacing: 2,
                  }}>
                    ••••••
                  </span>
                  <button
                    onClick={() => handleDelete(cred)}
                    title={deleteConfirm === cred.key_name ? 'Cliquer pour confirmer' : 'Supprimer'}
                    style={{
                      background: deleteConfirm === cred.key_name
                        ? 'rgba(239,68,68,0.2)'
                        : 'transparent',
                      border: deleteConfirm === cred.key_name
                        ? '1px solid rgba(239,68,68,0.4)'
                        : 'none',
                      borderRadius: 4,
                      padding: '4px 6px',
                      cursor: 'pointer',
                      fontSize: 14,
                      lineHeight: 1,
                      transition: 'background 0.15s',
                    }}
                  >
                    🗑
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {deleteConfirm && (
            <div style={{
              fontSize: 12,
              color: 'rgba(239,68,68,0.8)',
              textAlign: 'center',
              padding: '4px 0',
            }}>
              Cliquer à nouveau sur 🗑 pour confirmer la suppression
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          opacity: 0.5,
          textAlign: 'center',
        }}>
          Chiffrement AES-256 applicatif · Vault TK-0233
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CredentialsPanel
