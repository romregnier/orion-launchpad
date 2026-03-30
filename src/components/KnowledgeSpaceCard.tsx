/**
 * KnowledgeSpaceCard — TK-0230
 * Card pour afficher un Knowledge Space avec ses métadonnées.
 */
import { useState } from 'react'
import type { KnowledgeSpace } from '../hooks/useKnowledgeSpaces'

interface KnowledgeSpaceCardProps {
  space: KnowledgeSpace
  entryCount?: number
  onEdit?: (space: KnowledgeSpace) => void
  onDelete?: (id: string) => void
  onClick?: (space: KnowledgeSpace) => void
}

const VISIBILITY_CONFIG = {
  private:  { icon: '🔒', label: 'Privé',   color: 'rgba(239,68,68,0.15)',  textColor: '#ef4444' },
  shared:   { icon: '👥', label: 'Partagé', color: 'rgba(251,146,60,0.15)', textColor: '#fb923c' },
  public:   { icon: '🌐', label: 'Public',  color: 'rgba(34,197,94,0.15)',  textColor: '#22c55e' },
}

export function KnowledgeSpaceCard({ space, entryCount = 0, onEdit, onDelete, onClick }: KnowledgeSpaceCardProps) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const vis = VISIBILITY_CONFIG[space.visibility] ?? VISIBILITY_CONFIG.private
  const agents = space.allowed_agents ?? []
  const visibleAgents = agents.slice(0, 3)
  const extraAgents = agents.length - 3

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
      onClick={() => onClick?.(space)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.2)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <div style={{
          fontSize: 32, lineHeight: 1,
          width: 48, height: 48,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {space.icon || '📚'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: 15, fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {space.name}
          </h3>
          {space.description && (
            <p style={{
              margin: '4px 0 0', fontSize: 12,
              color: 'var(--text-muted)', opacity: 0.7,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {space.description}
            </p>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Visibility badge */}
        <span style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 8,
          background: vis.color, color: vis.textColor,
          fontWeight: 500,
        }}>
          {vis.icon} {vis.label}
        </span>

        {/* Entry count */}
        <span style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 8,
          background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
        }}>
          📄 {entryCount} entrée{entryCount !== 1 ? 's' : ''}
        </span>

        {/* Agent avatars */}
        {agents.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: -4, marginLeft: 'auto' }}>
            {visibleAgents.map((agentKey, i) => (
              <div
                key={agentKey}
                title={agentKey}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `hsl(${(agentKey.charCodeAt(0) * 37) % 360}, 60%, 45%)`,
                  border: '2px solid var(--bg-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  marginLeft: i > 0 ? -6 : 0,
                  zIndex: visibleAgents.length - i,
                  position: 'relative',
                }}
              >
                {agentKey.charAt(0).toUpperCase()}
              </div>
            ))}
            {extraAgents > 0 && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: 'var(--text-muted)',
                marginLeft: -6, position: 'relative',
              }}>
                +{extraAgents}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovered && (onEdit || onDelete) && (
        <div
          style={{
            position: 'absolute', top: 12, right: 12,
            display: 'flex', gap: 6,
          }}
          onClick={e => e.stopPropagation()}
        >
          {onEdit && (
            <button
              onClick={() => onEdit(space)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6, padding: '4px 10px',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11,
              }}
            >
              ✏️ Éditer
            </button>
          )}
          {onDelete && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, padding: '4px 10px',
                color: '#ef4444', cursor: 'pointer', fontSize: 11,
              }}
            >
              🗑
            </button>
          )}
          {onDelete && confirmDelete && (
            <>
              <button
                onClick={() => onDelete(space.id)}
                style={{
                  background: 'rgba(239,68,68,0.2)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11,
                }}
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '4px 10px',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11,
                }}
              >
                ×
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
