import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'

export interface IntegrationField {
  key: string
  label: string
  type: 'password' | 'text' | 'url'
  isSecret?: boolean
  placeholder?: string
  hint?: string
}

export interface IntegrationCardProps {
  icon: string
  name: string
  description: string
  section: string
  fields: IntegrationField[]
  onTest?: (values: Record<string, string>) => Promise<boolean>
}

type TestState = 'idle' | 'loading' | 'success' | 'error'

export function IntegrationCard({ icon, name, description, section, fields, onTest }: IntegrationCardProps) {
  const { activeCapsuleId } = useLaunchpadStore()
  const [expanded, setExpanded] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')
  const [testError, setTestError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  // Load existing values from DB
  useEffect(() => {
    if (!activeCapsuleId) return
    const loadValues = async () => {
      const keys = fields.map(f => f.key)
      const { data } = await supabase
        .from('capsule_settings')
        .select('key, value')
        .eq('capsule_id', activeCapsuleId)
        .eq('section', section)
        .in('key', keys)

      if (data && data.length > 0) {
        const vals: Record<string, string> = {}
        data.forEach(row => {
          vals[row.key] = row.value
        })
        setFieldValues(vals)
        setIsConnected(true)
      }
    }
    loadValues()
  }, [activeCapsuleId, section, fields])

  const handleSave = async () => {
    if (!activeCapsuleId) return
    setSaving(true)
    setSaveError('')
    try {
      const upserts = fields
        .filter(f => fieldValues[f.key] !== undefined && fieldValues[f.key] !== '')
        .map(f => ({
          capsule_id: activeCapsuleId,
          section,
          key: f.key,
          value: fieldValues[f.key],
          is_secret: f.isSecret ?? false,
          updated_at: new Date().toISOString(),
        }))

      if (upserts.length > 0) {
        const { error } = await supabase
          .from('capsule_settings')
          .upsert(upserts, { onConflict: 'capsule_id,section,key' })
        if (error) throw error
        setIsConnected(true)
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!onTest) return
    setTestState('loading')
    setTestError('')
    try {
      const ok = await onTest(fieldValues)
      if (ok) {
        setTestState('success')
        setTimeout(() => setTestState('idle'), 3000)
      } else {
        setTestState('error')
        setTestError('Connexion échouée')
      }
    } catch (err) {
      setTestState('error')
      setTestError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleDisconnect = async () => {
    if (!activeCapsuleId) return
    if (!confirmDisconnect) {
      setConfirmDisconnect(true)
      setTimeout(() => setConfirmDisconnect(false), 3000)
      return
    }
    try {
      await supabase
        .from('capsule_settings')
        .delete()
        .eq('capsule_id', activeCapsuleId)
        .eq('section', section)
        .in('key', fields.map(f => f.key))

      setFieldValues({})
      setIsConnected(false)
      setConfirmDisconnect(false)
      setExpanded(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const statusColor = isConnected ? '#10B981' : 'rgba(255,255,255,0.25)'
  const statusText = isConnected ? 'Connecté' : 'Non configuré'
  const cardBg = isConnected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)'
  const cardBorder = isConnected ? '1px solid rgba(16,185,129,0.20)' : '1px solid rgba(255,255,255,0.08)'

  return (
    <div style={{
      borderRadius: 12,
      background: cardBg,
      border: cardBorder,
      transition: 'all 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>{name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: "'Poppins', sans-serif" }}>{description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.div
              animate={isConnected ? { scale: [1, 1.3, 1] } : {}}
              transition={isConnected ? { repeat: Infinity, duration: 2 } : {}}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor,
              }}
            />
            <span style={{ fontSize: 12, color: statusColor, fontFamily: "'Poppins', sans-serif" }}>
              {statusText}
            </span>
          </div>
          {/* Chevron */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}
          >
            ▾
          </motion.div>
        </div>
      </div>

      {/* Expanded area */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '14px 16px 16px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {fields.map(field => (
                <div key={field.key}>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: 6,
                    letterSpacing: '0.04em',
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    {field.label}
                    {field.isSecret && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>🔒 secret</span>
                    )}
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type={field.type === 'password' && !showValues[field.key] ? 'password' : 'text'}
                        value={fieldValues[field.key] || ''}
                        onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={
                          isConnected && fieldValues[field.key]
                            ? `••••••••${fieldValues[field.key].slice(-4)}`
                            : (field.placeholder || '')
                        }
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          borderRadius: 8,
                          padding: '9px 40px 9px 12px',
                          color: '#fff',
                          fontSize: 13,
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                      />
                      {field.type === 'password' && (
                        <button
                          onClick={() => setShowValues(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 14,
                            color: 'rgba(255,255,255,0.4)',
                            padding: 2,
                          }}
                        >
                          {showValues[field.key] ? '🙈' : '👁'}
                        </button>
                      )}
                    </div>
                    {onTest && fields.indexOf(field) === 0 && (
                      <button
                        onClick={handleTest}
                        disabled={testState === 'loading'}
                        style={{
                          padding: '0 12px',
                          borderRadius: 8,
                          background: testState === 'success'
                            ? 'rgba(16,185,129,0.10)'
                            : testState === 'error'
                            ? 'rgba(239,68,68,0.10)'
                            : 'rgba(255,255,255,0.06)',
                          border: testState === 'success'
                            ? '1px solid rgba(16,185,129,0.25)'
                            : testState === 'error'
                            ? '1px solid rgba(239,68,68,0.25)'
                            : '1px solid rgba(255,255,255,0.12)',
                          color: testState === 'success'
                            ? '#10B981'
                            : testState === 'error'
                            ? '#EF4444'
                            : 'rgba(255,255,255,0.6)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: testState === 'loading' ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          fontFamily: "'Poppins', sans-serif",
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {testState === 'loading' ? '⏳' : testState === 'success' ? '✓ OK' : testState === 'error' ? '✕ Erreur' : 'Tester'}
                      </button>
                    )}
                  </div>
                  {testState === 'error' && testError && fields.indexOf(field) === 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444', fontFamily: "'Poppins', sans-serif" }}>
                      {testError}
                    </p>
                  )}
                  {field.hint && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Poppins', sans-serif" }}>
                      {field.hint}
                    </p>
                  )}
                </div>
              ))}

              {saveError && (
                <p style={{ margin: 0, fontSize: 12, color: '#EF4444', fontFamily: "'Poppins', sans-serif" }}>
                  {saveError}
                </p>
              )}

              {/* Actions row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                {isConnected ? (
                  <button
                    onClick={handleDisconnect}
                    style={{
                      background: confirmDisconnect ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${confirmDisconnect ? 'rgba(239,68,68,0.50)' : 'rgba(239,68,68,0.25)'}`,
                      color: confirmDisconnect ? '#EF4444' : 'rgba(239,68,68,0.8)',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {confirmDisconnect ? '⚠️ Confirmer ?' : 'Déconnecter'}
                  </button>
                ) : <div />}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: saving ? 'rgba(225,31,123,0.5)' : '#E11F7B',
                    border: 'none',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {saving ? '⏳ Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
