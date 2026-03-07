/**
 * DecksPage — Répertoire des présentations (Deck Builder)
 * TK-0030
 *
 * - Grid de DeckCards (titre, nb slides, statut, date)
 * - Bouton "Nouveau deck" en haut à droite
 * - Filtres: Tous | Brouillons | Publiés
 * - Empty state si aucun deck
 * - Fetch depuis Supabase `presentations`
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Plus, Presentation, FileText, Globe, ChevronLeft, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Deck {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
  slide_count: number
  created_at: string
  updated_at: string
  published_url: string | null
}

type FilterStatus = 'all' | 'draft' | 'published'

// ── DeckCard ──────────────────────────────────────────────────────────────────

function DeckCard({ deck, onClick }: { deck: Deck; onClick?: () => void }) {
  const statusColors: Record<string, string> = {
    draft: '#9CA3AF',
    published: '#10B981',
    archived: '#6B7280',
  }
  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    published: 'Publié',
    archived: 'Archivé',
  }

  const date = new Date(deck.updated_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(225,31,123,0.18)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={onClick}
      style={{
        background: '#2C272F',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: deck.status === 'published'
          ? 'linear-gradient(90deg, #E11F7B, #7C3AED)'
          : 'rgba(255,255,255,0.08)',
        borderRadius: '16px 16px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(225,31,123,0.2), rgba(124,58,237,0.2))',
          border: '1px solid rgba(225,31,123,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Presentation size={18} color="#E11F7B" />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: `${statusColors[deck.status]}22`,
          color: statusColors[deck.status],
          border: `1px solid ${statusColors[deck.status]}44`,
          whiteSpace: 'nowrap',
        }}>
          {statusLabels[deck.status]}
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 15, fontWeight: 700, color: '#FFFFFF',
        marginBottom: 4, lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {deck.title}
      </h3>

      {/* Description */}
      {deck.description && (
        <p style={{
          fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          lineHeight: 1.5,
        }}>
          {deck.description}
        </p>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto', paddingTop: 12,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
          <Layers size={12} />
          <span>{deck.slide_count} slide{deck.slide_count !== 1 ? 's' : ''}</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{date}</span>
      </div>
    </motion.div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onNew, filter }: { onNew: () => void; filter: FilterStatus }) {
  const msgs: Record<FilterStatus, { emoji: string; title: string; sub: string }> = {
    all: { emoji: '🎨', title: 'Aucune présentation', sub: 'Créez votre premier deck pour démarrer.' },
    draft: { emoji: '📝', title: 'Aucun brouillon', sub: 'Vos présentations en cours apparaîtront ici.' },
    published: { emoji: '🌐', title: 'Aucune présentation publiée', sub: 'Publiez un deck pour le partager.' },
  }
  const { emoji, title, sub } = msgs[filter]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px', textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 16 }}>{emoji}</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 24, maxWidth: 300 }}>{sub}</p>
      {filter === 'all' && (
        <button
          onClick={onNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #E11F7B, #c41a6a)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(225,31,123,0.3)',
          }}
        >
          <Plus size={16} />
          Nouveau deck
        </button>
      )}
    </motion.div>
  )
}

// ── DecksPage ─────────────────────────────────────────────────────────────────

export function DecksPage() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    fetchDecks()
  }, [])

  async function fetchDecks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('presentations')
      .select('id,title,description,status,slide_count,created_at,updated_at,published_url')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setDecks(data as Deck[])
    } else if (error) {
      console.error('[DecksPage] fetch error:', error.message)
    }
    setLoading(false)
  }

  function handleNewDeck() {
    navigate('/decks/new')
  }

  const filtered = decks.filter(d => {
    if (filter === 'all') return d.status !== 'archived'
    return d.status === filter
  })

  const publishedCount = decks.filter(d => d.status === 'published').length
  const draftCount = decks.filter(d => d.status === 'draft').length

  const filterTabs: { key: FilterStatus; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Tous', icon: <FileText size={13} />, count: decks.filter(d => d.status !== 'archived').length },
    { key: 'draft', label: 'Brouillons', icon: <FileText size={13} />, count: draftCount },
    { key: 'published', label: 'Publiés', icon: <Globe size={13} />, count: publishedCount },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B090D',
      color: '#FFFFFF',
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(225,31,123,0.08) 0%, transparent 70%)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
              title="Retour au Launchpad"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Presentation size={20} color="#E11F7B" />
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
                  Deck Builder
                </h1>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                {decks.filter(d => d.status !== 'archived').length} présentation{decks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={handleNewDeck}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #E11F7B, #c41a6a)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(225,31,123,0.3)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <Plus size={15} />
            Nouveau deck
          </button>
        </div>

        {/* ── Filter tabs ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {filterTabs.map(tab => {
            const active = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: active ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#E11F7B' : 'rgba(255,255,255,0.5)',
                  borderBottom: active ? '2px solid #E11F7B' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                    background: active ? 'rgba(225,31,123,0.25)' : 'rgba(255,255,255,0.08)',
                    color: active ? '#E11F7B' : 'rgba(255,255,255,0.35)',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Chargement des decks…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={handleNewDeck} filter={filter} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            paddingBottom: 40,
          }}>
            <AnimatePresence>
              {filtered.map(deck => (
                <DeckCard key={deck.id} deck={deck} onClick={() => navigate(`/decks/${deck.id}/edit`)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default DecksPage
