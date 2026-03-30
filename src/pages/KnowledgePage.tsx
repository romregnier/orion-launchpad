/**
 * KnowledgePage — TK-0230
 * Page dédiée aux Knowledge Spaces.
 * Grid de cards + création/suppression avec modal.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKnowledgeSpaces } from '../hooks/useKnowledgeSpaces'
import type { KnowledgeSpace } from '../hooks/useKnowledgeSpaces'
import { KnowledgeSpaceCard } from '../components/KnowledgeSpaceCard'
import { EmptyState } from '../components/EmptyState'
import { SkeletonCard } from '../components/Skeleton'
import { useLaunchpadStore } from '../store'

// ── Modal création ─────────────────────────────────────────────────────────────

interface CreateSpaceModalProps {
  onClose: () => void
  onCreate: (data: Partial<KnowledgeSpace>) => Promise<void>
}

const VISIBILITY_OPTIONS = [
  { value: 'private', label: '🔒 Privé' },
  { value: 'shared', label: '👥 Partagé' },
  { value: 'public', label: '🌐 Public' },
] as const

const ICON_PRESETS = ['📚', '🧠', '🔬', '🗂️', '💡', '🌐', '🔐', '📊', '🎯', '⚙️']

function CreateSpaceModal({ onClose, onCreate }: CreateSpaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('📚')
  const [visibility, setVisibility] = useState<KnowledgeSpace['visibility']>('private')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    await onCreate({ name: name.trim(), description: description.trim() || null, icon, visibility })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 28,
          width: '100%', maxWidth: 460,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
          ➕ Nouveau Knowledge Space
        </h2>

        {/* Icon picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Icône</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ICON_PRESETS.map(ic => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  width: 36, height: 36, borderRadius: 8, fontSize: 18,
                  background: icon === ic ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: icon === ic ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Nom *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Documentation Produit"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '10px 14px',
              color: 'var(--text-primary)', fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description optionnelle…"
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '10px 14px',
              color: 'var(--text-primary)', fontSize: 13,
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Visibility */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            Visibilité
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value as KnowledgeSpace['visibility'])}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: visibility === opt.value ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border: visibility === opt.value ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, cursor: 'pointer',
                  color: visibility === opt.value ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: visibility === opt.value ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            style={{
              flex: 1, background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '11px 20px',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              opacity: (submitting || !name.trim()) ? 0.5 : 1,
            }}
          >
            {submitting ? 'Création…' : 'Créer le Space'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '11px 20px',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
            }}
          >
            Annuler
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── KnowledgePage ─────────────────────────────────────────────────────────────

export function KnowledgePage() {
  const { currentCapsule } = useLaunchpadStore()
  const { spaces, loading, createSpace, deleteSpace } = useKnowledgeSpaces({
    capsuleId: currentCapsule?.id,
  })
  const [showModal, setShowModal] = useState(false)

  return (
    <div style={{
      padding: '32px 40px',
      maxWidth: 1200,
      margin: '0 auto',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 32,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
            📚 Knowledge Spaces
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)', opacity: 0.7 }}>
            Espaces de connaissance partagés entre vos agents
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '10px 18px', cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ➕ Nouveau Space
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && spaces.length === 0 && (
        <EmptyState
          icon="📚"
          title="Aucun Knowledge Space"
          description="Créez votre premier espace de connaissance pour centraliser les informations de vos agents."
          action={{ label: '➕ Créer un Space', onClick: () => setShowModal(true) }}
        />
      )}

      {/* Grid */}
      {!loading && spaces.length > 0 && (
        <motion.div
          layout
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          <AnimatePresence>
            {spaces.map(space => (
              <motion.div
                key={space.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <KnowledgeSpaceCard
                  space={space}
                  onDelete={deleteSpace}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showModal && (
          <CreateSpaceModal
            onClose={() => setShowModal(false)}
            onCreate={createSpace}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
