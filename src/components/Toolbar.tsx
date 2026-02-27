/**
 * Toolbar
 *
 * Rôle : Barre d'outils flottante en bas du canvas — zoom, refresh, ajout de projets/listes/agents, settings.
 * Utilisé dans : App.tsx
 * Props : scale, onZoomIn, onZoomOut, onReset, onRefresh, onAdd, onAddList, onAddAgent, projectCount
 */
import { Plus, ZoomIn, ZoomOut, RefreshCw, Settings } from 'lucide-react'
import { useLaunchpadStore } from '../store'

interface Props {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onRefresh: () => void
  onAdd: () => void
  onAddList: () => void
  onAddAgent: () => void
  projectCount: number
}

export function Toolbar({ scale, onZoomIn, onZoomOut, onReset, onRefresh, onAdd, onAddList, onAddAgent, projectCount }: Props) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 500
  const { showSettings, setShowSettings, boardName } = useLaunchpadStore()

  return (
    <div
      className="launchpad-toolbar"
      style={{
        position: 'fixed',
        bottom: isMobile ? 16 : 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 4 : 8,
        padding: isMobile ? '8px 10px' : '10px 16px',
        borderRadius: 16,
        background: 'rgba(22,18,26,0.95)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        maxWidth: 'calc(100vw - 24px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo — hidden on very small screens */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 18 }}>🌟</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{boardName}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>{projectCount} projet{projectCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Mobile logo — compact */}
      {isMobile && (
        <span style={{ fontSize: 16, paddingRight: 6, borderRight: '1px solid rgba(255,255,255,0.08)', marginRight: 2 }}>🌟</span>
      )}

      {/* Zoom controls */}
      <button className="launchpad-toolbar__btn" onClick={onZoomOut} title="Zoom arrière" style={btnStyle(isMobile)}>
        <ZoomOut size={isMobile ? 13 : 15} />
      </button>
      <button
        onClick={onReset}
        title="Réinitialiser le zoom"
        style={{
          ...btnStyle(isMobile),
          fontFamily: 'monospace',
          fontSize: 10,
          width: 'auto',
          padding: '0 6px',
          color: Math.abs(scale - 1) > 0.01 ? '#E11F7B' : 'rgba(255,255,255,0.5)',
        }}
      >
        {Math.round(scale * 100)}%
      </button>
      <button className="launchpad-toolbar__btn" onClick={onZoomIn} title="Zoom avant" style={btnStyle(isMobile)}>
        <ZoomIn size={isMobile ? 13 : 15} />
      </button>

      <button onClick={onRefresh} title="Rafraîchir" style={{ ...btnStyle(isMobile), marginLeft: isMobile ? 0 : 2 }}>
        <RefreshCw size={isMobile ? 12 : 14} />
      </button>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        title="Paramètres"
        style={{
          ...btnStyle(isMobile),
          color: showSettings ? '#E11F7B' : 'rgba(255,255,255,0.5)',
        }}
      >
        <Settings size={isMobile ? 12 : 14} />
      </button>

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', marginInline: isMobile ? 2 : 4 }} />

      {/* Add agent button */}
      <button
        onClick={onAddAgent}
        title="Ajouter un agent sur le canvas"
        style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6,
          height: isMobile ? 30 : 34, paddingInline: isMobile ? 10 : 14,
          borderRadius: 10, background: 'rgba(245,158,11,0.15)',
          color: '#F59E0B', fontSize: isMobile ? 12 : 13, fontWeight: 600,
          cursor: 'pointer', border: '1px solid rgba(245,158,11,0.3)',
          whiteSpace: 'nowrap',
        }}
      >
        ＋{!isMobile && ' Agent'}
      </button>

      {/* Add list button */}
      <button
        onClick={onAddList}
        title="Nouvelle liste"
        style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6,
          height: isMobile ? 30 : 34, paddingInline: isMobile ? 10 : 14,
          borderRadius: 10, background: 'rgba(139,92,246,0.2)',
          color: '#8B5CF6', fontSize: isMobile ? 12 : 13, fontWeight: 600,
          cursor: 'pointer', border: '1px solid rgba(139,92,246,0.3)',
          whiteSpace: 'nowrap',
        }}
      >
        📋{!isMobile && ' Liste'}
      </button>

      {/* Add button */}
      <button
        onClick={onAdd}
        title="Ajouter un projet"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 4 : 6,
          height: isMobile ? 30 : 34,
          paddingInline: isMobile ? 10 : 14,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #E11F7B, #c41a6a)',
          color: '#fff',
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600,
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 2px 12px rgba(225,31,123,0.4)',
          whiteSpace: 'nowrap',
        }}
      >
        <Plus size={isMobile ? 13 : 15} />
        {!isMobile && 'Ajouter'}
      </button>
    </div>
  )
}

function btnStyle(isMobile: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isMobile ? 28 : 32,
    height: isMobile ? 28 : 32,
    borderRadius: 8,
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  }
}
