/**
 * MarketplacePage — TK-0190
 * Page /marketplace pour parcourir et importer des templates d'agents.
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MARKETPLACE_AGENTS } from '../data/marketplaceAgents'
import { AgentBuilderModal, type AgentBuilderPrefill } from '../components/AgentBuilderModal'
import { BlueprintVerifier } from '../components/BlueprintVerifier'
import type { MarketplaceAgent } from '../types/marketplace'

// ─── Star Rating ─────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {stars.map(s => (
        <span
          key={s}
          style={{
            fontSize: 11,
            color: s <= Math.round(rating) ? '#F59E0B' : 'rgba(255,255,255,0.15)',
          }}
        >
          ★
        </span>
      ))}
      <span style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginLeft: 3,
        fontFamily: "'Poppins', sans-serif",
      }}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

// ─── Tier Badge ──────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: 'free' | 'pro' | 'enterprise' }) {
  const config = {
    free: { label: 'Free', bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
    pro: { label: 'Pro', bg: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', border: 'rgba(124, 58, 237, 0.3)' },
    enterprise: { label: 'Enterprise', bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  }[tier]

  return (
    <span style={{
      padding: '2px 8px',
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      color: config.color,
      fontFamily: "'Poppins', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {config.label}
    </span>
  )
}

// ─── Agent Card ──────────────────────────────────────────────────────────────
interface MarketplaceAgentCardProps {
  agent: MarketplaceAgent
  onImport: (agent: MarketplaceAgent) => void
}

function MarketplaceAgentCard({ agent, onImport }: MarketplaceAgentCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--bg-panel, rgba(255,255,255,0.04))',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 14,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'default',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124, 58, 237, 0.4)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border, rgba(255,255,255,0.08))'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: 'var(--bg-card, rgba(255,255,255,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          flexShrink: 0,
        }}>
          {agent.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary, #fff)',
              fontFamily: "'Poppins', sans-serif",
            }}>
              {agent.name}
            </h3>
            <TierBadge tier={agent.tier} />
          </div>
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted, rgba(255,255,255,0.45))',
            fontFamily: "'Poppins', sans-serif",
            textTransform: 'capitalize',
          }}>
            {agent.role}
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: 0,
        fontSize: 12,
        color: 'var(--text-secondary, rgba(255,255,255,0.6))',
        fontFamily: "'Poppins', sans-serif",
        lineHeight: 1.5,
        flex: 1,
      }}>
        {agent.description}
      </p>

      {/* Skills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {agent.skills.slice(0, 4).map(skill => (
          <span
            key={skill}
            style={{
              padding: '3px 8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              fontSize: 10,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTop: '1px solid var(--border, rgba(255,255,255,0.06))',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <StarRating rating={agent.rating} />
          <span style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: "'Poppins', sans-serif",
          }}>
            📦 {agent.installs.toLocaleString()} installs · {agent.author}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onImport(agent)}
          style={{
            padding: '8px 16px',
            background: 'var(--accent, #7C3AED)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
            cursor: 'pointer',
          }}
        >
          Importer
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        color: 'var(--text-muted, rgba(255,255,255,0.4))',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
        Aucun agent trouvé
      </h3>
      <p style={{ margin: 0, fontSize: 13 }}>
        Essayez de modifier vos filtres de recherche
      </p>
    </motion.div>
  )
}

// ─── MarketplacePage ──────────────────────────────────────────────────────────
const ROLES = ['Tous', ...Array.from(new Set(MARKETPLACE_AGENTS.map(a => a.role))).sort()]
type TierFilter = 'all' | 'free' | 'pro' | 'enterprise'

export function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('Tous')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [prefill, setPrefill] = useState<AgentBuilderPrefill | undefined>()
  const [verifierOpen, setVerifierOpen] = useState(false)

  const filteredAgents = useMemo(() => {
    return MARKETPLACE_AGENTS.filter(agent => {
      const matchesSearch = search.trim() === '' ||
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase()) ||
        agent.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      const matchesRole = roleFilter === 'Tous' || agent.role === roleFilter
      const matchesTier = tierFilter === 'all' || agent.tier === tierFilter
      return matchesSearch && matchesRole && matchesTier
    })
  }, [search, roleFilter, tierFilter])

  const handleImport = (agent: MarketplaceAgent) => {
    setPrefill({
      name: agent.name,
      emoji: agent.emoji,
      role: agent.role,
      skills: agent.skills,
      system_prompt: agent.system_prompt,
      model: agent.model,
    })
    setBuilderOpen(true)
  }

  const tierTabs: { key: TierFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'free', label: 'Free' },
    { key: 'pro', label: 'Pro' },
    { key: 'enterprise', label: 'Enterprise' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base, #0d0d1a)',
      padding: '32px 24px',
      maxWidth: 1200,
      margin: '0 auto',
    }}>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          margin: '0 0 8px',
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--text-primary, #fff)',
          fontFamily: "'Poppins', sans-serif",
        }}>
          🏪 Marketplace
        </h1>
        <p style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--text-muted, rgba(255,255,255,0.5))',
          fontFamily: "'Poppins', sans-serif",
        }}>
          {MARKETPLACE_AGENTS.length} templates d'agents prêts à déployer dans votre organisation
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 28,
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <span style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 14,
            color: 'rgba(255,255,255,0.3)',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher un agent…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              background: 'var(--bg-panel, rgba(255,255,255,0.05))',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: 10,
              color: 'var(--text-primary, #fff)',
              fontSize: 13,
              fontFamily: "'Poppins', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Role Select */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            background: 'var(--bg-panel, rgba(255,255,255,0.05))',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: 10,
            color: 'var(--text-primary, #fff)',
            fontSize: 13,
            fontFamily: "'Poppins', sans-serif",
            cursor: 'pointer',
            outline: 'none',
            minWidth: 140,
          }}
        >
          {ROLES.map(role => (
            <option key={role} value={role} style={{ background: '#1a1a2e' }}>
              {role === 'Tous' ? 'Tous les rôles' : role}
            </option>
          ))}
        </select>

        {/* Tier Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--bg-panel, rgba(255,255,255,0.04))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: 10,
          padding: 4,
        }}>
          {tierTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTierFilter(tab.key)}
              style={{
                padding: '7px 14px',
                background: tierFilter === tab.key
                  ? 'var(--accent, #7C3AED)'
                  : 'transparent',
                border: 'none',
                borderRadius: 7,
                color: tierFilter === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <span style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.35)',
          fontFamily: "'Poppins', sans-serif",
          marginLeft: 'auto',
        }}>
          {filteredAgents.length} résultat{filteredAgents.length !== 1 ? 's' : ''}
        </span>

        {/* Blueprint Verifier button */}
        <button
          onClick={() => setVerifierOpen(true)}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: '1px solid rgba(124,58,237,0.4)',
            background: 'rgba(124,58,237,0.1)',
            color: '#A78BFA',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Poppins', sans-serif",
            flexShrink: 0,
          }}
        >
          🔍 Vérifier blueprint
        </button>
      </div>

      {/* Grid */}
      <motion.div
        layout
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        <AnimatePresence mode="popLayout">
          {filteredAgents.length === 0 ? (
            <EmptyState key="empty" />
          ) : (
            filteredAgents.map(agent => (
              <MarketplaceAgentCard
                key={agent.id}
                agent={agent}
                onImport={handleImport}
              />
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* AgentBuilderModal pré-rempli */}
      <AgentBuilderModal
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false)
          setPrefill(undefined)
        }}
        prefill={prefill}
      />

      {/* Blueprint Verifier Modal */}
      <AnimatePresence>
        {verifierOpen && (
          <>
            <motion.div
              key="bp-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerifierOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                zIndex: 800,
              }}
            />
            <motion.div
              key="bp-modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 560,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: '85vh',
                overflowY: 'auto',
                background: '#0F0D12',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '20px',
                zIndex: 801,
                boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
                  🔍 Blueprint Verifier
                </h2>
                <button
                  onClick={() => setVerifierOpen(false)}
                  style={{
                    width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
              <BlueprintVerifier />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
