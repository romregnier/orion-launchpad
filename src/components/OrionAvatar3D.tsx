import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Stars } from '@react-three/drei'
import * as THREE from 'three'

// Minimal AvatarConfig mirror (subset used here)
export interface AvatarColor {
  h: number
  s: number
  l: number
}

export interface AvatarConfig {
  bodyType?: string
  color?: AvatarColor
  eyes?: string
  accessory?: string
  ambiance?: string
  bodyScale?: number
  animation?: string
  skinPattern?: string
  mouth?: string
}

export function getAgentAvatar(name: string): Partial<AvatarConfig> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`tailor_avatar_${name.toLowerCase()}`)
    if (!raw) return null
    return JSON.parse(raw) as Partial<AvatarConfig>
  } catch {
    return null
  }
}

function OrionSphere({ hovered, config }: { hovered: boolean; config: Partial<AvatarConfig> | null }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const mainColor = config?.color
    ? `hsl(${config.color.h}, ${config.color.s}%, ${config.color.l}%)`
    : '#E11F7B'
  const animation = config?.animation ?? 'rotate'

  useFrame((state) => {
    if (!meshRef.current) return

    switch (animation) {
      case 'bounce':
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
        break
      case 'float':
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.07
        meshRef.current.rotation.y += 0.001
        break
      case 'wiggle':
        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.15
        break
      default: // rotate
        meshRef.current.rotation.y += 0.008
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15
    }

    const targetScale = hovered ? 1.15 : 1
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08)
  })

  const emissiveColor = config?.skinPattern === 'glow' ? mainColor : '#7C3AED'
  const emissiveIntensity = config?.skinPattern === 'glow' ? 0.6 : 0.3

  return (
    <>
      {/* Halo glow */}
      <mesh scale={1.35}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color={mainColor} transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      {/* Outer glow */}
      <mesh scale={1.15}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {/* Main sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.55, 64, 64]} />
        <MeshDistortMaterial
          color={mainColor}
          distort={0.4}
          speed={2}
          roughness={0.1}
          metalness={0.3}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </>
  )
}

interface OrionAvatar3DProps {
  size?: number
}

export function OrionAvatar3D({ size = 120 }: OrionAvatar3DProps) {
  const [hovered, setHovered] = useState(false)
  const [config, setConfig] = useState<Partial<AvatarConfig> | null>(null)

  useEffect(() => {
    const saved = getAgentAvatar('orion')
    if (saved) setConfig(saved)

    // Live update quand The Tailor sauvegarde dans localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tailor_avatar_orion') {
        const updated = getAgentAvatar('orion')
        setConfig(updated)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const lightColor = config?.color
    ? `hsl(${config.color.h}, ${config.color.s}%, ${config.color.l}%)`
    : '#E11F7B'

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
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 45 }}
        style={{ borderRadius: '50%', background: 'transparent', width: '100%', height: '100%' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[2, 2, 2]} intensity={2} color={lightColor} />
        <pointLight position={[-2, -1, 1]} intensity={1} color="#7C3AED" />
        <Stars radius={4} depth={2} count={200} factor={0.4} fade speed={1} />
        <OrionSphere hovered={hovered} config={config} />
      </Canvas>
    </div>
  )
}
