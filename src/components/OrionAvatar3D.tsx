import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ── Types AvatarConfig (locaux, pas d'import cross-project) ──────────────────
type BodyShape = 'blob' | 'heart' | 'star' | 'ghost'
type EyeStyle = 'cute' | 'sleepy' | 'star' | 'pixel'
type EyeColor = 'blue' | 'green' | 'red' | 'gold' | 'rainbow'
type BlushStyle = 'none' | 'soft' | 'hearts'
type MouthStyle = 'smile' | 'open' | 'cool' | 'tongue'
type ArmorStyle = 'none' | 'space' | 'knight' | 'casual' | 'wizard'
type HeadgearStyle = 'none' | 'crown' | 'antennae' | 'halo' | 'wizard-hat'
type EarPieceStyle = 'none' | 'tech' | 'headphones' | 'cat-ears'
type AnimationStyle = 'rotate' | 'bounce' | 'float' | 'wiggle'
type SkinPattern = 'solid' | 'glow'

interface AvatarColor { h: number; s: number; l: number }
interface AvatarConfig {
  bodyShape: BodyShape
  color: AvatarColor
  eyes: EyeStyle
  eyeColor: EyeColor
  blush: BlushStyle
  mouth: MouthStyle
  armor: ArmorStyle
  headgear: HeadgearStyle
  earPiece: EarPieceStyle
  animation: AnimationStyle
  skinPattern: SkinPattern
  bodyScale: number
}

const DEFAULT_CONFIG: AvatarConfig = {
  bodyShape: 'blob',
  color: { h: 0, s: 80, l: 40 },
  eyes: 'cute',
  eyeColor: 'blue',
  blush: 'soft',
  mouth: 'smile',
  armor: 'space',
  headgear: 'crown',
  earPiece: 'tech',
  animation: 'rotate',
  skinPattern: 'solid',
  bodyScale: 1.0,
}

function getOrionConfig(): AvatarConfig {
  try {
    const raw = localStorage.getItem('tailor_avatar_orion')
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as AvatarConfig
  } catch { return DEFAULT_CONFIG }
}

// ── Eye color map ─────────────────────────────────────────────────────────────
const eyeColorMap: Record<EyeColor, string> = {
  blue: '#4FC3F7',
  green: '#69F0AE',
  red: '#FF5252',
  gold: '#FFD740',
  rainbow: '#FF80AB',
}

// ── AvatarScene (R3F) ─────────────────────────────────────────────────────────
function AvatarScene({ config }: { config: AvatarConfig }) {
  const groupRef = useRef<THREE.Group>(null!)
  const t = useRef(0)

  const bodyColor = `hsl(${config.color.h}, ${config.color.s}%, ${config.color.l}%)`
  const isGlow = config.skinPattern === 'glow'

  useFrame((_state, delta) => {
    if (!groupRef.current) return
    t.current += delta

    switch (config.animation) {
      case 'rotate':
        groupRef.current.rotation.y += 0.01
        break
      case 'bounce':
        groupRef.current.position.y = Math.sin(t.current * 4) * 0.1
        break
      case 'float':
        groupRef.current.position.y = Math.sin(t.current * 1.2) * 0.07
        break
      case 'wiggle':
        groupRef.current.rotation.z = Math.sin(t.current * 3) * 0.15
        break
    }
  })

  return (
    <group scale={config.bodyScale}>
      <group ref={groupRef}>
        {/* Body */}
        {config.bodyShape === 'blob' && (
          <mesh>
            <sphereGeometry args={[0.75, 32, 32]} />
            <MeshDistortMaterial
              color={bodyColor}
              distort={0.35}
              speed={2}
              roughness={0.3}
              emissive={isGlow ? bodyColor : '#000000'}
              emissiveIntensity={isGlow ? 0.4 : 0}
            />
          </mesh>
        )}

        {config.bodyShape === 'heart' && (
          <>
            <mesh position={[-0.28, 0.22, 0]}>
              <sphereGeometry args={[0.52, 32, 32]} />
              <meshStandardMaterial
                color={bodyColor}
                emissive={isGlow ? bodyColor : '#000000'}
                emissiveIntensity={isGlow ? 0.4 : 0}
              />
            </mesh>
            <mesh position={[0.28, 0.22, 0]}>
              <sphereGeometry args={[0.52, 32, 32]} />
              <meshStandardMaterial
                color={bodyColor}
                emissive={isGlow ? bodyColor : '#000000'}
                emissiveIntensity={isGlow ? 0.4 : 0}
              />
            </mesh>
            <mesh position={[0, -0.25, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.62, 0.8, 32]} />
              <meshStandardMaterial
                color={bodyColor}
                emissive={isGlow ? bodyColor : '#000000'}
                emissiveIntensity={isGlow ? 0.4 : 0}
              />
            </mesh>
          </>
        )}

        {config.bodyShape === 'star' && (
          <>
            <mesh>
              <sphereGeometry args={[0.6, 32, 32]} />
              <meshStandardMaterial
                color={bodyColor}
                emissive={isGlow ? bodyColor : '#000000'}
                emissiveIntensity={isGlow ? 0.4 : 0}
              />
            </mesh>
            {[0, 72, 144, 216, 288].map((deg, i) => {
              const rad = (deg * Math.PI) / 180
              return (
                <mesh
                  key={i}
                  position={[Math.cos(rad) * 0.75, Math.sin(rad) * 0.75, 0]}
                  rotation={[0, 0, rad]}
                >
                  <coneGeometry args={[0.18, 0.45, 8]} />
                  <meshStandardMaterial
                    color={bodyColor}
                    emissive={isGlow ? bodyColor : '#000000'}
                    emissiveIntensity={isGlow ? 0.4 : 0}
                  />
                </mesh>
              )
            })}
          </>
        )}

        {config.bodyShape === 'ghost' && (
          <>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.65, 32, 32]} />
              <meshStandardMaterial
                color={bodyColor}
                emissive={isGlow ? bodyColor : '#000000'}
                emissiveIntensity={isGlow ? 0.4 : 0}
              />
            </mesh>
            <mesh position={[0, -0.38, 0]}>
              <cylinderGeometry args={[0.65, 0.65, 0.55, 32]} />
              <meshStandardMaterial
                color={bodyColor}
                emissive={isGlow ? bodyColor : '#000000'}
                emissiveIntensity={isGlow ? 0.4 : 0}
              />
            </mesh>
          </>
        )}

        {/* Kirby Eyes — left */}
        <mesh position={[-0.22, 0.12, 0.48]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshStandardMaterial color="#1A1A2E" />
        </mesh>
        {/* Eye highlight left */}
        <mesh position={[-0.17, 0.17, 0.62]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color={eyeColorMap[config.eyeColor]}
            emissive={eyeColorMap[config.eyeColor]}
            emissiveIntensity={2.0}
          />
        </mesh>

        {/* Kirby Eyes — right */}
        <mesh position={[0.22, 0.12, 0.48]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshStandardMaterial color="#1A1A2E" />
        </mesh>
        {/* Eye highlight right */}
        <mesh position={[0.27, 0.17, 0.62]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color={eyeColorMap[config.eyeColor]}
            emissive={eyeColorMap[config.eyeColor]}
            emissiveIntensity={2.0}
          />
        </mesh>

        {/* Blush (soft) */}
        {config.blush === 'soft' && (
          <>
            <mesh position={[-0.35, -0.05, 0.45]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color="#FF9EBC" transparent opacity={0.75} />
            </mesh>
            <mesh position={[0.35, -0.05, 0.45]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color="#FF9EBC" transparent opacity={0.75} />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
}

// ── OrionAvatar3D ─────────────────────────────────────────────────────────────
export function OrionAvatar3D({ size = 120, avatarConfig }: { size?: number; avatarConfig?: Record<string, unknown> | null }) {
  const [config, setConfig] = useState<AvatarConfig>(() => avatarConfig ? { ...DEFAULT_CONFIG, ...(avatarConfig as Partial<AvatarConfig>) } : getOrionConfig())
  const [hovered, setHovered] = useState(false)

  // Mise à jour quand le prop avatarConfig change (ex: après save depuis The Tailor)
  useEffect(() => {
    if (avatarConfig) setConfig({ ...DEFAULT_CONFIG, ...(avatarConfig as Partial<AvatarConfig>) })
  }, [avatarConfig])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'tailor_avatar_update' && e.data?.agent === 'orion') {
        try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(e.data.config) }) } catch {}
      }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tailor_avatar_orion') setConfig(getOrionConfig())
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const hsl = `hsl(${config.color.h}, ${config.color.s}%, ${config.color.l}%)`

  return (
    <div
      style={{
        width: size,
        height: size,
        cursor: 'pointer',
        position: 'relative',
        borderRadius: '50%',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
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
        camera={{ position: [0, 0, 3.5], fov: 42 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[2, 2, 2]} intensity={2} color={hsl} />
        <pointLight position={[-2, -1, 1]} intensity={1} color="#7C3AED" />
        <Stars radius={5} depth={2} count={150} factor={0.4} fade speed={1} />
        <AvatarScene config={config} />
      </Canvas>
    </div>
  )
}
