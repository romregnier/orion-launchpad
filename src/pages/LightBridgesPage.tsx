/**
 * LightBridgesPage — TK-0229 [FEAT-006]
 * Page de gestion des Light Bridges inter-capsules
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLightBridges } from '../hooks/useLightBridges'
import type { CreateBridgePayload, LightBridge } from '../hooks/useLightBridges'
import { useLaunchpadStore } from '../store'

// ── Types ─────────────────────────────────────────────────────────────────────
type BridgeType = LightBridge['bridge_type']

const BRIDGE_TYPE_LABELS: Record<BridgeType, { label: string; color: string; bg: string }> = {
  knowledge: { label: '📚 Knowledge', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
  agent: { label: '🤖 Agent', color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)' },
  workflow: { label: '✨ Workflow', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BridgeSkeleton() {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: 16, width: '60%', background: 'rgba(255,255,255,0.07)', borderRadius: 6, marginBottom: 10 }} />
      <div style={{ height: 12, width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function BridgesEmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🌉</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontFamily: "'Poppins', sans-serif" }}>
        Aucun Light Bridge
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24, maxWidth: 320, fontFamily: "'Poppins', sans-serif", lineHeight: 1.6 }}>
        Les Light Bridges connectent vos Nébuleuses pour partager agents, workflows et connaissances.
      </div>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNew}
        style={{
          padding: '10px 20px', borderRadius: 10,
          background: 'var(--accent)', border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
        }}
      >
        + Créer mon premier Bridge
      </motion.button>
    </div>
  )
}

// ── Bridge Card ───────────────────────────────────────────────────────────────
function BridgeCard({ bridge, onToggle, onDelete }: {
  bridge: LightBridge
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const typeInfo = BRIDGE_TYPE_LABELS[bridge.bridge_type]

  const handleDelete = () => {
    if (confirming) {
      onDelete(bridge.id)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  const sourceName = bridge.source_capsule?.name ?? 'Cette Nébuleuse'
  const targetName = bridge.target_capsule?.name ?? 'Inconnue'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        background: bridge.is_active
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${bridge.is_active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'}`,
        transition: 'all 0.2s ease',
        opacity: bridge.is_active ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* Left: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bridge.name}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 8px', borderRadius: 999,
              fontSize: 10, fontWeight: 700,
              color: typeInfo.color, background: typeInfo.bg,
              flexShrink: 0,
            }}>
              {typeInfo.label}
            </span>
          </div>

          {/* Source → Target */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif" }}>
            <span>🌀 {sourceName}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
            <span>🌀 {targetName}</span>
          </div>

          {/* Permissions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {bridge.permissions?.read && (
              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 600 }}>Read</span>
            )}
            {bridge.permissions?.write && (
              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontWeight: 600 }}>Write</span>
            )}
          </div>
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Toggle */}
          <button
            onClick={() => onToggle(bridge.id, !bridge.is_active)}
            style={{
              width: 36, height: 20, borderRadius: 999,
              background: bridge.is_active ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 2,
              left: bridge.is_active ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            title={confirming ? 'Confirmer la suppression' : 'Supprimer'}
            style={{
              background: confirming ? 'rgba(239,68,68,0.2)' : 'transparent',
              border: confirming ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
              color: confirming ? '#EF4444' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', borderRadius: 8, padding: '4px 8px',
              fontSize: 13, transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => !confirming && (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={e => !confirming && (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            {confirming ? '⚠️ Confirmer' : '🗑️'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Create Bridge Modal ───────────────────────────────────────────────────────
interface CreateBridgeModalProps {
  onClose: () => void
  onCreate: (payload: CreateBridgePayload) => Promise<boolean>
}

function CreateBridgeModal({ onClose, onCreate }: CreateBridgeModalProps) {
  const { capsules, activeCapsuleId } = useLaunchpadStore()
  const [name, setName] = useState('')
  const [targetCapsuleId, setTargetCapsuleId] = useState('')
  const [bridgeType, setBridgeType] = useState<BridgeType>('knowledge')
  const [canRead, setCanRead] = useState(true)
  const [canWrite, setCanWrite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const otherCapsules = capsules.filter(c => c.id !== activeCapsuleId)

  const handleSubmit = async () => {
    if (!name.trim()) { setErr('Nom requis'); return }
    if (!targetCapsuleId) { setErr('Capsule cible requise'); return }
    setSubmitting(true)
    setErr(null)
    const ok = await onCreate({
      name: name.trim(),
      targetCapsuleId,
      type: bridgeType,
      permissions: { read: canRead, write: canWrite },
    })
    setSubmitting(false)
    if (ok) onClose()
    else setErr('Erreur lors de la création. La table existe-t-elle en base ?')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
    color: '#fff', fontSize: 13, fontFamily: "'Poppins', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-surface)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif", marginBottom: 20 }}>
          🌉 Nouveau Light Bridge
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Nom du Bridge
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Partage Knowledge Marketing"
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Capsule cible */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Nébuleuse cible
            </label>
            <select
              value={targetCapsuleId}
              onChange={e => setTargetCapsuleId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— Sélectionner —</option>
              {otherCapsules.length > 0 ? otherCapsules.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              )) : (
                <option value="mock-capsule-1">🌀 Nébuleuse Demo (mock)</option>
              )}
            </select>
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Type de Bridge
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(Object.keys(BRIDGE_TYPE_LABELS) as BridgeType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setBridgeType(t)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    fontFamily: "'Poppins', sans-serif",
                    background: bridgeType === t ? BRIDGE_TYPE_LABELS[t].bg : 'rgba(255,255,255,0.04)',
                    color: bridgeType === t ? BRIDGE_TYPE_LABELS[t].color : 'rgba(255,255,255,0.4)',
                    outline: bridgeType === t ? `1px solid ${BRIDGE_TYPE_LABELS[t].color}40` : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {BRIDGE_TYPE_LABELS[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Permissions
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ label: 'Read', val: canRead, set: setCanRead }, { label: 'Write', val: canWrite, set: setCanWrite }].map(p => (
                <label key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
                  <input
                    type="checkbox"
                    checked={p.val}
                    onChange={e => p.set(e.target.checked)}
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {err && (
            <div style={{ fontSize: 12, color: '#EF4444', fontFamily: "'Poppins', sans-serif", padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)' }}>
              ⚠️ {err}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontFamily: "'Poppins', sans-serif" }}
          >
            Annuler
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: submitting ? 'rgba(225,31,123,0.5)' : 'var(--accent)',
              color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
            }}
          >
            {submitting ? 'Création…' : '🌉 Créer le Bridge'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── LightBridgesPage ──────────────────────────────────────────────────────────
export function LightBridgesPage() {
  const { bridges, loading, tableAvailable, createBridge, toggleBridge, deleteBridge } = useLightBridges()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div style={{
      padding: '24px 24px 48px',
      maxWidth: 800, margin: '0 auto',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            🌉 Light Bridges
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Connexions inter-Nébuleuses — partagez agents, workflows et connaissances
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          style={{
            padding: '9px 16px', borderRadius: 10,
            background: 'var(--accent)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Nouveau Bridge
        </motion.button>
      </div>

      {/* Table not available warning */}
      {!tableAvailable && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          color: '#F59E0B', fontSize: 12, marginBottom: 20,
        }}>
          ⚠️ La table <code>light_bridges</code> n'existe pas encore en base. Exécutez la migration SQL pour activer cette fonctionnalité.
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <BridgeSkeleton key={i} />)}
        </div>
      ) : bridges.length === 0 ? (
        <BridgesEmptyState onNew={() => setShowCreate(true)} />
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bridges.map(bridge => (
              <BridgeCard
                key={bridge.id}
                bridge={bridge}
                onToggle={toggleBridge}
                onDelete={deleteBridge}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateBridgeModal
            onClose={() => setShowCreate(false)}
            onCreate={createBridge}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
