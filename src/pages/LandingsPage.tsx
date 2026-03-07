/**
 * LandingsPage — Répertoire des landing pages (Landing Builder)
 * TK-0074
 *
 * - Grid de LandingCards (titre, statut, URL publiée, date, bouton "Ouvrir")
 * - Filtres: Tous | Brouillons | Publiés
 * - Bouton "Nouvelle landing" → /landings/new
 * - Empty state illustré
 * - Fetch depuis Supabase `landings`
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Plus, Globe, FileText, ChevronLeft, Monitor, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Landing {
  id: string
  title: string
  description: string | null
  domain_slug: string | null
  status: 'draft' | 'published' | 'archived'
  published_url: string | null
  created_at: string
  updated_at: string
}

type FilterStatus = 'all' | 'draft' | 'published'

// ── LandingCard ───────────────────────────────────────────────────────────────

function LandingCard({ landing, onOpen }: { landing: Landing; onOpen: (l: Landing) => void }) {
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

  const date = new Date(landing.updated_at).toLocaleDateString('fr-FR', {
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
      style={{
        background: '#2C272F',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => onOpen(landing)}
    >
      {/* Accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: landing.status === 'published'
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
          <Monitor size={18} color="#E11F7B" />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: `${statusColors[landing.status]}22`,
          color: statusColors[landing.status],
          border: `1px solid ${statusColors[landing.status]}44`,
          whiteSpace: 'nowrap',
        }}>
          {statusLabels[landing.status]}
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 15, fontWeight: 700, color: '#FFFFFF',
        marginBottom: 4, lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {landing.title}
      </h3>

      {/* Description */}
      {landing.description && (
        <p style={{
          fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          lineHeight: 1.5,
        }}>
          {landing.description}
        </p>
      )}

      {/* Published URL */}
      {landing.published_url && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8,
          fontSize: 11, color: '#10B981',
        }}>
          <Globe size={11} />
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
          }}>
            {landing.published_url}
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto', paddingTop: 12,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{date}</span>
        <button
          onClick={e => { e.stopPropagation(); onOpen(landing) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(225,31,123,0.3)',
            background: 'rgba(225,31,123,0.1)', color: '#E11F7B',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,31,123,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(225,31,123,0.1)' }}
        >
          <ExternalLink size={11} />
          Ouvrir
        </button>
      </div>
    </motion.div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onNew, filter }: { onNew: () => void; filter: FilterStatus }) {
  const msgs: Record<FilterStatus, { emoji: string; title: string; sub: string }> = {
    all: { emoji: '🌐', title: 'Aucune landing page', sub: 'Créez votre première landing pour démarrer.' },
    draft: { emoji: '📝', title: 'Aucun brouillon', sub: 'Vos landing pages en cours apparaîtront ici.' },
    published: { emoji: '🚀', title: 'Aucune landing publiée', sub: 'Publiez une landing pour la partager.' },
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
          Nouvelle landing
        </button>
      )}
    </motion.div>
  )
}

// ── LandingsPage ──────────────────────────────────────────────────────────────

export function LandingsPage() {
  const navigate = useNavigate()
  const [landings, setLandings] = useState<Landing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    fetchLandings()
  }, [])

  async function fetchLandings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('landings')
      .select('id,title,description,domain_slug,status,published_url,created_at,updated_at')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setLandings(data as Landing[])
    } else if (error) {
      console.error('[LandingsPage] fetch error:', error.message)
    }
    setLoading(false)
  }

  function handleOpen(landing: Landing) {
    navigate(`/landings/${landing.id}/edit`)
  }

  const filtered = landings.filter(l => {
    if (filter === 'all') return l.status !== 'archived'
    return l.status === filter
  })

  const publishedCount = landings.filter(l => l.status === 'published').length
  const draftCount = landings.filter(l => l.status === 'draft').length

  const filterTabs: { key: FilterStatus; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Tous', icon: <FileText size={13} />, count: landings.filter(l => l.status !== 'archived').length },
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
                <Monitor size={20} color="#E11F7B" />
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
                  Landing Builder
                </h1>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                {landings.filter(l => l.status !== 'archived').length} landing{landings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/landings/new')}
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
            Nouvelle landing
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
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Chargement des landings…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => navigate('/landings/new')} filter={filter} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            paddingBottom: 40,
          }}>
            <AnimatePresence>
              {filtered.map(landing => (
                <LandingCard key={landing.id} landing={landing} onOpen={handleOpen} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default LandingsPage
