import { useState, useEffect } from 'react'

interface OrionAvatar3DProps {
  size?: number
}

export function OrionAvatar3D({ size = 120 }: OrionAvatar3DProps) {
  const [hovered, setHovered] = useState(false)
  const [ts, setTs] = useState(Date.now())

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'tailor_avatar_update' && e.data?.agent === 'orion') {
        setTs(Date.now())
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div
      style={{
        width: size,
        height: size,
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          background: 'rgba(26,22,30,0.95)',
          border: '1px solid rgba(225,31,123,0.4)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 600,
          color: '#fff',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}>
          Orion 🌟
        </div>
      )}
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}>
        <iframe
          key={ts}
          src={`https://the-tailor.surge.sh?embed=1&agent=orion&t=${ts}`}
          style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
          title="Orion Avatar"
        />
      </div>
    </div>
  )
}
