import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Stars } from '@react-three/drei'
import * as THREE from 'three'

function OrionSphere({ hovered }: { hovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.008
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15
    const targetScale = hovered ? 1.15 : 1
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08)
  })

  return (
    <>
      {/* Halo glow */}
      <mesh scale={1.35}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color="#E11F7B" transparent opacity={0.08} side={THREE.BackSide} />
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
          color="#E11F7B"
          distort={0.4}
          speed={2}
          roughness={0.1}
          metalness={0.3}
          emissive="#7C3AED"
          emissiveIntensity={0.3}
        />
      </mesh>
    </>
  )
}

export function OrionAvatar3D() {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: typeof window !== 'undefined' && window.innerWidth < 500 ? 80 : 24,
        left: 16,
        width: typeof window !== 'undefined' && window.innerWidth < 500 ? 64 : 120,
        height: typeof window !== 'undefined' && window.innerWidth < 500 ? 64 : 120,
        zIndex: 200,
        cursor: 'pointer',
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
        }}>
          Orion 🌟
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 45 }}
        style={{ borderRadius: '50%', background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[2, 2, 2]} intensity={2} color="#E11F7B" />
        <pointLight position={[-2, -1, 1]} intensity={1} color="#7C3AED" />
        <Stars radius={4} depth={2} count={200} factor={0.4} fade speed={1} />
        <OrionSphere hovered={hovered} />
      </Canvas>
    </div>
  )
}
