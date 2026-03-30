/**
 * CanvasElementStats.tsx — TK-0227
 * Mini widget affichant le compte d'éléments canvas par type.
 */
import { useCanvasElements } from '../hooks/useCanvasElements'

export function CanvasElementStats() {
  const { getElementsByType } = useCanvasElements()

  const projects = getElementsByType('project').length
  const lists = getElementsByType('list').length
  const ideas = getElementsByType('idea').length

  // Hide if no content
  if (projects === 0 && lists === 0 && ideas === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 16,
        zIndex: 20,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 11,
        color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {projects > 0 && <span>📌 {projects} projet{projects !== 1 ? 's' : ''}</span>}
      {projects > 0 && (lists > 0 || ideas > 0) && <span style={{ opacity: 0.4 }}>•</span>}
      {lists > 0 && <span>📋 {lists} liste{lists !== 1 ? 's' : ''}</span>}
      {lists > 0 && ideas > 0 && <span style={{ opacity: 0.4 }}>•</span>}
      {ideas > 0 && <span>💡 {ideas} idée{ideas !== 1 ? 's' : ''}</span>}
    </div>
  )
}
