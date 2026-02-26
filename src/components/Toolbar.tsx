import { Plus, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface Props {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onAdd: () => void
  projectCount: number
}

export function Toolbar({ scale, onZoomIn, onZoomOut, onReset, onAdd, projectCount }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 16,
        background: 'rgba(22,18,26,0.95)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Logo / title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: 18 }}>🌟</span>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Launchpad</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>{projectCount} projet{projectCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Zoom controls */}
      <button onClick={onZoomOut} title="Zoom out" style={btnStyle}>
        <ZoomOut size={15} />
      </button>
      <button onClick={onReset} title="Reset view" style={{ ...btnStyle, fontFamily: 'monospace', fontSize: 11, width: 'auto', padding: '0 8px', color: Math.abs(scale - 1) > 0.01 ? '#E11F7B' : 'rgba(255,255,255,0.5)' }}>
        {Math.round(scale * 100)}%
      </button>
      <button onClick={onZoomIn} title="Zoom in" style={btnStyle}>
        <ZoomIn size={15} />
      </button>

      <button onClick={onReset} title="Réinitialiser la vue" style={{ ...btnStyle, marginLeft: 2 }}>
        <RotateCcw size={14} />
      </button>

      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', marginInline: 4 }} />

      {/* Add button */}
      <button
        onClick={onAdd}
        title="Ajouter un projet"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 34,
          paddingInline: 14,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #E11F7B, #c41a6a)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 2px 12px rgba(225,31,123,0.4)',
        }}
      >
        <Plus size={15} />
        Ajouter
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 8,
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  transition: 'background 0.15s, color 0.15s',
}
