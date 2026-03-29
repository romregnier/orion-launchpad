import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import type { CanvasAgent, AvatarConfig } from '../types'


// ── Couleurs et emojis par agent ──────────────────────────────────────────────
const AGENT_META: Record<string, { emoji: string; color: string; glow: string }> = {
  orion: { emoji: '🌟', color: '#4FC3F7', glow: 'rgba(79,195,247,0.4)' },
  nova:  { emoji: '✦',  color: '#E11F7B', glow: 'rgba(225,31,123,0.4)' },
  aria:  { emoji: '🎨', color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)' },
  forge: { emoji: '🔧', color: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
  rex:   { emoji: '🛡️', color: '#10B981', glow: 'rgba(16,185,129,0.4)' },
}

// ── BODY_CONFIG — positions visage par shape (identique Avatar3D.tsx) ────────
interface BodyPositionConfig {
  faceZ: number
  eyeY: number
  eyeSpread: number
  blushSpread: number
  mouthY: number
}

const BODY_CONFIG: Record<string, BodyPositionConfig> = {
  blob:    { faceZ: 0.82, eyeY: 0.12, eyeSpread: 0.22, blushSpread: 0.52, mouthY: -0.22 },
  heart:   { faceZ: 0.70, eyeY: 0.10, eyeSpread: 0.20, blushSpread: 0.45, mouthY: -0.20 },
  star:    { faceZ: 0.62, eyeY: 0.08, eyeSpread: 0.18, blushSpread: 0.40, mouthY: -0.16 },
  ghost:   { faceZ: 0.78, eyeY: 0.22, eyeSpread: 0.22, blushSpread: 0.50, mouthY: -0.15 },
  capsule: { faceZ: 0.46, eyeY: 0.12, eyeSpread: 0.16, blushSpread: 0.32, mouthY: -0.16 },
  organic: { faceZ: 0.82, eyeY: 0.12, eyeSpread: 0.22, blushSpread: 0.52, mouthY: -0.22 },
}
function getBc(shape: string): BodyPositionConfig {
  return BODY_CONFIG[shape] ?? BODY_CONFIG.blob
}

// ── createGradientMap — pour MeshToonMaterial (cel-shading) ─────────────────
function createGradientMap(THREE: typeof import('three')): import('three').DataTexture {
  const colors = new Uint8Array([0, 128, 255])
  const tex = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

/**
 * TailorCanvas — Avatar Three.js animé 112×112px.
 * Géométrie exacte portée depuis Avatar3D.tsx (React Three Fiber → vanilla Three.js).
 * Fallback automatique si WebGL indisponible ou erreur.
 *
 * @param tailorConfig - Config avatar issue de la DB (couleur HSL, forme, etc.)
 * @param fallbackColor - Couleur hex de fallback si tailor_config sans couleur
 */
function TailorCanvas({ tailorConfig, fallbackColor }: { tailorConfig: AvatarConfig; fallbackColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let frameId: number
    let disposed = false

    const init = async () => {
      try {
        const THREE = await import('three')

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
        renderer.setSize(112, 112)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = false
        // Identique aux defaults R3F + The Tailor — évite le rendu "sombre"
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2   // idem The Tailor
        renderer.outputColorSpace = THREE.SRGBColorSpace

        const scene = new THREE.Scene()
        // Caméra identique à The Tailor (position [0,0,4], fov 45)
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
        camera.position.set(0, 0, 4)
        camera.lookAt(0, 0, 0)

        // ── Éclairage identique à The Tailor (AvatarScene) ──
        const ambiancePointColors: Record<string, string> = {
          space: '#4488ff', forest: '#86efac', sunset: '#fb923c',
          neon: '#e879f9', retro: '#fcd34d', void: '#ffffff',
        }
        const ambianceAmbient: Record<string, number> = {
          space: 0.4, forest: 0.5, sunset: 0.8, neon: 0.6, retro: 0.7, void: 0.6,
        }
        const ambianceKey = tailorConfig.ambiance ?? 'space'
        const ambientIntensity = ambianceAmbient[ambianceKey] ?? 0.5
        const pointColor = ambiancePointColors[ambianceKey] ?? '#4488ff'

        // MeshStandardMaterial applique un facteur 1/π dans BRDF_Lambert
        // ce qui divise la luminosité par ~3.14 vs un rendu "flat".
        // The Tailor compense via le Bloom post-processing (@react-three/postprocessing).
        // TailorCanvas (no bloom) doit multiplier les intensités par π pour matcher.
        const PI = Math.PI
        const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity * PI)
        const pointLight1 = new THREE.PointLight(0xffffff, 1.5 * PI)
        pointLight1.position.set(3, 3, 3)
        const pointLight2 = new THREE.PointLight(new THREE.Color(pointColor), 0.5 * PI)
        pointLight2.position.set(-2, -1, 2)
        scene.add(ambient, pointLight1, pointLight2)

        // ── Couleur corps depuis tailor_config.color ──
        const hsl = tailorConfig.color
        const colorCss = hsl ? `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)` : fallbackColor
        const bodyColor = new THREE.Color(colorCss)
        const bodyScale = tailorConfig.bodyScale ?? 1

        // Matériaux réutilisables
        const isGlow = tailorConfig.skinPattern === 'glow'
        const isHolographic = tailorConfig.skinPattern === 'holographic'
        const isMetal = tailorConfig.skinPattern === 'metal'
        const celShading = !!(tailorConfig as AvatarConfig & { celShading?: boolean }).celShading
        const gradientMap = celShading ? createGradientMap(THREE) : null

        // Emissive de base sur le corps pour compenser l'absence de Bloom (vs The Tailor)
        // Sans Bloom, le corps paraît sombre. L'emissive ajoute un auto-éclairage subtil.
        const bodyMat = isHolographic
          ? new THREE.MeshStandardMaterial({
              color: bodyColor,
              emissive: bodyColor,
              emissiveIntensity: 0.8,
              roughness: 0.1,
              metalness: 0.6,
              transparent: true,
              opacity: 0.85,
            })
          : isMetal
          ? new THREE.MeshStandardMaterial({
              color: bodyColor,
              roughness: 0.05,
              metalness: 0.9,
            })
          : celShading
          ? new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap! })
          : new THREE.MeshStandardMaterial({
              color: bodyColor,
              emissive: bodyColor,
              emissiveIntensity: isGlow ? 0.55 : 0.25,
              roughness: 0.5,
              metalness: 0.05,
            })
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.1, metalness: 0.1 })
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 })
        const darkOutlineMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, metalness: 0 })

        // EyeColor map identique à Avatar3D (EYE_COLOR_MAP)
        const eyeColorMap: Record<string, string> = {
          blue: '#00BFFF', green: '#00FF88', red: '#FF4444',
          gold: '#FFD700', rainbow: '#FF69B4',
        }
        const eyeColorHex = eyeColorMap[tailorConfig.eyeColor ?? 'blue'] ?? '#00BFFF'
        const eyeColor = new THREE.Color(eyeColorHex)
        const eyeGlowMat = new THREE.MeshStandardMaterial({
          color: eyeColor, emissive: eyeColor, emissiveIntensity: 2.0, roughness: 0, metalness: 0,
        })

        // ── Groupe principal (scale = bodyScale, comme <group scale={bodyScale}> dans Avatar3D) ──
        const meshGroup = new THREE.Group()
        meshGroup.scale.setScalar(bodyScale)
        scene.add(meshGroup)

        // ── Corps principal — forme selon bodyShape (copie exacte Avatar3D) ──
        const bs = tailorConfig.bodyShape ?? 'blob'
        const bc = getBc(bs)

        if (bs === 'heart') {
          const heartMat = bodyMat
          const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), heartMat)
          s1.position.set(-0.28, 0.22, 0); s1.scale.set(0.85, 0.85, 0.8)
          const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), heartMat)
          s2.position.set(0.28, 0.22, 0); s2.scale.set(0.85, 0.85, 0.8)
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.2, 32), heartMat)
          cone.position.set(0, -0.4, 0); cone.rotation.z = Math.PI
          meshGroup.add(s1, s2, cone)
        } else if (bs === 'star') {
          const starCore = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), bodyMat)
          starCore.scale.setScalar(0.65)
          meshGroup.add(starCore)
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
            const x = Math.cos(angle) * 0.88
            const y = Math.sin(angle) * 0.88
            const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.05, 0.6, 8), bodyMat)
            spike.position.set(x, y, 0)
            spike.rotation.z = angle + Math.PI / 2
            meshGroup.add(spike)
          }
        } else if (bs === 'ghost') {
          const ghostBody = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), bodyMat)
          ghostBody.scale.set(1.0, 1.1, 0.88); ghostBody.position.y = 0.1
          meshGroup.add(ghostBody)
          ;[-0.35, -0.1, 0.15, 0.4].forEach((gx) => {
            const nub = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), bodyMat)
            nub.position.set(gx, -0.85, 0)
            meshGroup.add(nub)
          })
        } else if (bs === 'capsule') {
          // Corps cylindrique avec hémisphères (capsule médicale)
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.1, 32), bodyMat)
          const topSphere = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat)
          const botSphere = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bodyMat)
          topSphere.position.y = 0.55; botSphere.position.y = -0.55
          meshGroup.add(cyl, topSphere, botSphere)
        } else if (bs === 'organic') {
          // Seeded random vertex displacement (identique Avatar3D TK-0016)
          const geo = new THREE.SphereGeometry(1, 32, 32)
          const pos = geo.attributes.position
          let seed = 42
          const rand = () => {
            seed = (seed * 16807 + 0) % 2147483647
            return seed / 2147483647
          }
          for (let i = 0; i < pos.count; i++) {
            const noise = (rand() - 0.5) * 0.28
            pos.setX(i, pos.getX(i) * (1 + noise))
            pos.setY(i, pos.getY(i) * (1 + noise))
            pos.setZ(i, pos.getZ(i) * (1 + noise))
          }
          pos.needsUpdate = true
          geo.computeVertexNormals()
          const organicMesh = new THREE.Mesh(geo, bodyMat)
          organicMesh.scale.set(1.0, 0.92, 0.88)
          meshGroup.add(organicMesh)
        } else {
          // blob (défaut) — scale [1.0, 0.92, 0.88] exactement comme Avatar3D
          const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), bodyMat)
          body.scale.set(1.0, 0.92, 0.88)
          meshGroup.add(body)
        }

        // ── Gradient skin pattern ──
        if (tailorConfig.skinPattern === 'gradient' && !celShading && !isHolographic && !isMetal) {
          const canvas2d = document.createElement('canvas')
          canvas2d.width = 1; canvas2d.height = 256
          const ctx2d = canvas2d.getContext('2d')!
          const grad = ctx2d.createLinearGradient(0, 0, 0, 256)
          grad.addColorStop(0, colorCss)
          grad.addColorStop(1, new THREE.Color(bodyColor).offsetHSL(0.1, 0.1, -0.2).getStyle())
          ctx2d.fillStyle = grad; ctx2d.fillRect(0, 0, 1, 256)
          const gradTex = new THREE.CanvasTexture(canvas2d)
          ;(bodyMat as import('three').MeshStandardMaterial).map = gradTex
          ;(bodyMat as import('three').MeshStandardMaterial).needsUpdate = true
        }

        // ── KirbyEye — copie exacte de la fonction KirbyEye dans Avatar3D.tsx ──
        const buildKirbyEye = (pos: [number, number, number]) => {
          const eyeGroup = new THREE.Group()
          eyeGroup.position.set(...pos)
          const eyeStyle = tailorConfig.eyes ?? 'cute'

          if (eyeStyle === 'pixel') {
            const outer = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.1), darkMat)
            const inner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), eyeGlowMat)
            inner.position.set(0.07, 0.07, 0.08)
            eyeGroup.add(outer, inner)
          } else if (eyeStyle === 'sleepy') {
            const outer = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), darkMat)
            outer.scale.set(1.0, 0.52, 1.0)
            const inner = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), eyeGlowMat)
            inner.position.set(0.06, 0.02, 0.15); inner.scale.set(1, 0.52, 1)
            eyeGroup.add(outer, inner)
          } else if (eyeStyle === 'star') {
            const outer = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), darkMat)
            outer.scale.set(1.0, 1.15, 1.0)
            const inner1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), eyeGlowMat)
            inner1.position.set(0.06, 0.06, 0.15)
            const inner2 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeGlowMat)
            inner2.position.set(-0.05, -0.04, 0.14)
            eyeGroup.add(outer, inner1, inner2)
          } else {
            // cute (default) — outer sphere dark, inner glow, scale [1.0, 1.15, 1.0]
            const outer = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), darkMat)
            outer.scale.set(1.0, 1.15, 1.0)
            const inner = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), eyeGlowMat)
            inner.position.set(0.06, 0.06, 0.15)
            eyeGroup.add(outer, inner)
          }
          return eyeGroup
        }

        // Positions KirbyEye via BODY_CONFIG par shape (DM-016)
        meshGroup.add(buildKirbyEye([-bc.eyeSpread, bc.eyeY, bc.faceZ]))
        meshGroup.add(buildKirbyEye([bc.eyeSpread, bc.eyeY, bc.faceZ]))

        // ── Blush — CircleGeometry (copie Avatar3D Blush 'soft') ──
        if (tailorConfig.blush && tailorConfig.blush !== 'none') {
          const blushMat = new THREE.MeshStandardMaterial({
            color: 0xff9999, transparent: true, opacity: 0.55, roughness: 1, metalness: 0,
            side: THREE.DoubleSide, depthWrite: false,
          })
          // Positions blush via BODY_CONFIG par shape (DM-016)
          ;[-bc.blushSpread, bc.blushSpread].forEach((bx) => {
            const blush = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), blushMat)
            blush.position.set(bx, -0.05, bc.faceZ + 0.06)
            blush.rotation.x = -0.2
            meshGroup.add(blush)
          })
        }

        // ── Mouth — copie exacte Avatar3D Mouth ──
        const mouthStyle = tailorConfig.mouth ?? 'smile'
        if (mouthStyle === 'open') {
          const m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), darkOutlineMat)
          m.position.set(0, bc.mouthY, bc.faceZ + 0.08)
          meshGroup.add(m)
        } else if (mouthStyle === 'cool') {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), darkOutlineMat)
          m.position.set(0, bc.mouthY, bc.faceZ + 0.08)
          meshGroup.add(m)
        } else if (mouthStyle === 'tongue') {
          const arc = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), darkOutlineMat)
          arc.position.set(0, bc.mouthY, bc.faceZ + 0.08); arc.rotation.z = Math.PI
          const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xff6b9d, roughness: 0.8, metalness: 0 }))
          tongue.position.set(0, bc.mouthY - 0.09, bc.faceZ + 0.06)
          meshGroup.add(arc, tongue)
        } else {
          // smile (default) — torus arc, rotation PI comme Avatar3D
          const m = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20, Math.PI), darkOutlineMat)
          m.position.set(0, bc.mouthY, bc.faceZ + 0.08); m.rotation.z = Math.PI
          meshGroup.add(m)
        }

        // ── Armor — copie Avatar3D Armor ──
        if (tailorConfig.armor && tailorConfig.armor !== 'none') {
          const armorMat = new THREE.MeshStandardMaterial({ color: 0x1c1c2e, metalness: 0.8, roughness: 0.3 })
          const armorGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 })

          if (tailorConfig.armor === 'space') {
            const pieces: Array<[number, number, number, number, number, number, import('three').MeshStandardMaterial]> = [
              [-1.1, -0.1, 0, 0.18, 0.55, 0.15, armorMat],
              [-0.95, -0.1, 0, 0.04, 0.55, 0.04, armorGoldMat],
              [1.1, -0.1, 0, 0.18, 0.55, 0.15, armorMat],
              [0.95, -0.1, 0, 0.04, 0.55, 0.04, armorGoldMat],
            ]
            pieces.forEach(([x, y, z, w, h, d, mat]) => {
              const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
              m.position.set(x, y, z); meshGroup.add(m)
            })
            const chest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.12), armorMat)
            chest.position.set(0, -0.62, 0.7); meshGroup.add(chest)
          } else if (tailorConfig.armor === 'knight') {
            ;[-1.1, 1.1].forEach((ax) => {
              const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.18), armorGoldMat)
              m.position.set(ax, -0.1, 0); meshGroup.add(m)
            })
            const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.14), armorGoldMat)
            chest.position.set(0, -0.55, 0.75); meshGroup.add(chest)
          } else if (tailorConfig.armor === 'casual') {
            const casualMat = new THREE.MeshStandardMaterial({ color: 0xe11f7b, roughness: 0.6, metalness: 0 })
            ;[-0.1, 0.1].forEach((cx) => {
              const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), casualMat)
              m.position.set(cx, -0.65, 0.75); m.scale.set(1.2, 0.7, 0.3); meshGroup.add(m)
            })
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), casualMat)
            center.position.set(0, -0.65, 0.75); meshGroup.add(center)
          } else if (tailorConfig.armor === 'wizard') {
            const wizMat = new THREE.MeshStandardMaterial({ color: 0x4b0082, metalness: 0.3, roughness: 0.5 })
            const arc1 = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 24, Math.PI), wizMat)
            arc1.position.set(0, -0.7, 0.5); arc1.rotation.x = 0.3; meshGroup.add(arc1)
            const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: new THREE.Color(0xffd700), emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.1 })
            const arc2 = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.02, 6, 24, Math.PI), goldTrimMat)
            arc2.position.set(0, -0.7, 0.5); arc2.rotation.x = 0.3; meshGroup.add(arc2)
          }
        }

        // ── Headgear — copie Avatar3D Headgear ──
        if (tailorConfig.headgear && tailorConfig.headgear !== 'none') {
          if (tailorConfig.headgear === 'crown') {
            // Base cylindrique + 5 spikes (Avatar3D exact)
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 32), goldMat)
            base.position.set(0, 0.95, 0); meshGroup.add(base)
            const crystalMat = new THREE.MeshStandardMaterial({
              color: 0xaaddff, emissive: new THREE.Color(0x88ccff), emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.1,
            })
            for (let i = 0; i < 5; i++) {
              const angle = (i / 4) * Math.PI - Math.PI / 2
              const cx = Math.sin(angle) * 0.45
              const heightBonus = Math.cos(angle) * 0.18
              const isCenter = i === 2
              const spike = new THREE.Mesh(
                new THREE.ConeGeometry(isCenter ? 0.09 : 0.075, isCenter ? 0.32 : 0.24, 4),
                isCenter ? crystalMat : goldMat
              )
              spike.position.set(cx, 1.05 + heightBonus, 0)
              meshGroup.add(spike)
            }
          } else if (tailorConfig.headgear === 'wizard-hat') {
            const wizMat = new THREE.MeshStandardMaterial({ color: 0x4b0082, roughness: 0.5, metalness: 0 })
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.1, 32), wizMat)
            brim.position.set(0, 1.0, 0); meshGroup.add(brim)
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 32), wizMat)
            hat.position.set(0, 1.45, 0); meshGroup.add(hat)
            const star = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8),
              new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: new THREE.Color(0xffd700), emissiveIntensity: 0.8, metalness: 0, roughness: 0 }))
            star.position.set(0, 1.65, 0.28); meshGroup.add(star)
          } else if (tailorConfig.headgear === 'halo') {
            const haloMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: new THREE.Color(0xffd700), emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.2 })
            const halo = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 32), haloMat)
            halo.position.set(0, 1.45, 0); halo.rotation.x = 0.3; meshGroup.add(halo)
          } else if (tailorConfig.headgear === 'antennae') {
            const antMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6, metalness: 0 })
            const ballMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: new THREE.Color(0xff4444), emissiveIntensity: 0.8, metalness: 0, roughness: 0 })
            // simplified straight sticks (CatmullRom tubes not available easily in vanilla)
            const cylGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.55, 8)
            ;[-0.45, 0.45].forEach((ax) => {
              const stick = new THREE.Mesh(cylGeo, antMat)
              stick.position.set(ax * 0.667, 1.25, 0.1); stick.rotation.z = ax < 0 ? 0.35 : -0.35
              meshGroup.add(stick)
              const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), ballMat)
              ball.position.set(ax, 1.5, 0); meshGroup.add(ball)
            })
          }
        }

        // ── Ear pieces — copie Avatar3D EarPieces ──
        if (tailorConfig.earPiece && tailorConfig.earPiece !== 'none') {
          if (tailorConfig.earPiece === 'tech') {
            // Exact copy from Avatar3D EarPieces 'tech': cylinder + torus ring + glowing sphere
            const techArmorMat = new THREE.MeshStandardMaterial({ color: 0x1c1c2e, metalness: 0.8, roughness: 0.3 })
            const techGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 })
            const techGlowMat = new THREE.MeshStandardMaterial({ color: 0x0066ff, emissive: new THREE.Color(0x0088ff), emissiveIntensity: 2.0, roughness: 0, metalness: 0.1 })
            ;[-1.05, 1.05].forEach((ex) => {
              const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 24), techArmorMat)
              disk.position.set(ex, 0.05, 0); disk.rotation.z = Math.PI / 2; meshGroup.add(disk)
              const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), techGoldMat)
              ring.position.set(ex, 0.05, 0); ring.rotation.y = Math.PI / 2; meshGroup.add(ring)
              const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), techGlowMat)
              glow.position.set(ex, 0.05, 0); meshGroup.add(glow)
            })
          } else if (tailorConfig.earPiece === 'headphones') {
            const hpMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 })
            const bandMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.3 })
            ;[-1.05, 1.05].forEach((ex) => {
              const cup = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), hpMat)
              cup.position.set(ex, 0.2, 0); meshGroup.add(cup)
            })
            const band = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 8, 24, Math.PI), bandMat)
            band.position.set(0, 0.2, 0); band.rotation.x = Math.PI / 2; meshGroup.add(band)
          } else if (tailorConfig.earPiece === 'cat-ears') {
            const catMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7, metalness: 0 })
            ;[-0.75, 0.75].forEach((cx) => {
              const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 3), catMat)
              ear.position.set(cx, 1.05, 0); ear.rotation.z = cx > 0 ? 0.3 : -0.3; meshGroup.add(ear)
            })
          }
        }

        // ── Animation loop — identique useFrame Avatar3D ──
        const animType = tailorConfig.animation ?? 'rotate'
        let t = 0
        const animate = () => {
          if (disposed) return
          frameId = requestAnimationFrame(animate)
          t += 0.016
          if (animType === 'rotate') {
            meshGroup.rotation.y += 0.005
          } else if (animType === 'bounce') {
            meshGroup.position.y = Math.sin(t * 2) * 0.15
          } else if (animType === 'float') {
            meshGroup.position.y = Math.sin(t * 0.8) * 0.1
            meshGroup.rotation.y += 0.001
          } else if (animType === 'wiggle') {
            meshGroup.rotation.z = Math.sin(t * 3) * 0.15
          } else {
            meshGroup.rotation.y += 0.005
          }
          // Holographic shimmer — pulsation emissiveIntensity (DM-018)
          if (isHolographic && bodyMat instanceof THREE.MeshStandardMaterial) {
            bodyMat.emissiveIntensity = 0.6 + Math.sin(Date.now() * 0.002) * 0.3
          }
          renderer.render(scene, camera)
        }
        animate()

        return () => {
          disposed = true
          cancelAnimationFrame(frameId)
          renderer.dispose()
        }
      } catch {
        // Three.js indisponible — canvas reste vide, le parent affichera le fallback
      }
    }

    const cleanup = init()
    return () => { disposed = true; cancelAnimationFrame(frameId); cleanup.then(fn => fn?.()) }
  }, [tailorConfig, fallbackColor])

  return (
    <canvas
      ref={canvasRef}
      width={112}
      height={112}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        pointerEvents: 'none',
      }}
    />
  )
}

/**
 * Avatar visuel pour les agents sur le canvas.
 * Priorité : TailorCanvas (Three.js) > img PNG > emoji > initiales
 */
function AgentBubble({
  name,
  isWorking,
  tailorUrl,
  tailorConfig,
}: {
  name: string
  isWorking: boolean
  tailorUrl?: string
  tailorConfig?: AvatarConfig | null
}) {
  const key = name.toLowerCase()
  const meta = AGENT_META[key] ?? { emoji: '🤖', color: '#fff', glow: 'rgba(255,255,255,0.2)' }

  const isMobile = typeof navigator !== 'undefined'
    && (navigator.maxTouchPoints > 0 || window.innerWidth < 768)

  // Priorité (intentionnelle) — DESIGN_DECISIONS.md :
  // 1. TailorCanvas 3D — si tailorConfig existe et desktop (rendu animé)
  // 2. tailorUrl PNG — fallback si pas de config ou mobile
  // 3. emoji — dernier recours
  const showTailor = !isMobile && !!tailorConfig
  const showPng = !showTailor && !!tailorUrl

  return (
    <motion.div
      animate={isWorking ? { boxShadow: [`0 0 0 0 ${meta.glow}`, `0 0 0 12px transparent`] } : {}}
      transition={isWorking ? { repeat: Infinity, duration: 1.2, ease: 'easeOut' } : {}}
      style={{
        width: 112, height: 112,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        background: (showTailor || showPng)
          ? 'transparent'
          : `radial-gradient(circle at 35% 35%, ${meta.color}55, ${meta.color}22)`,
        border: `2px solid ${meta.color}88`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36,
        boxShadow: isWorking ? `0 0 16px ${meta.glow}` : `0 2px 8px rgba(0,0,0,0.4)`,
      }}
    >
      {showTailor ? (
        <TailorCanvas tailorConfig={tailorConfig!} fallbackColor={meta.color} />
      ) : showPng ? (
        <img
          src={tailorUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        meta.emoji
      )}
    </motion.div>
  )
}

/**
 * Génère une config avatar déterministe basée sur le nom de l'agent.
 * Même nom → même avatar (pas aléatoire).
 *
 * @param name - Nom de l'agent
 * @returns AvatarConfig déterministe
 */

interface CanvasAgentAvatarProps {
  agent: CanvasAgent
  canvasScale: number
  onChat?: (agent: CanvasAgent) => void
  onEdit?: (agent: CanvasAgent) => void
  /** Si true, déclenche l'animation de spawn (nouvel agent recruté). */
  isNew?: boolean
  /** Pourcentage du budget mensuel consommé (0-100). Badge affiché si >= 70. */
  budgetPct?: number
}

/**
 * Avatar draggable d'un agent sur le canvas.
 *
 * Deux modes :
 * - **Idle** : l'agent est draggable, positionné sur le canvas selon `agent.position`.
 * - **Working** : quand `agent.working_on_project` est défini, l'agent se déplace
 *   automatiquement (style Warcraft 3) vers la ProjectCard correspondante, sous
 *   celle-ci, aligné avec les autres agents qui travaillent sur le même projet.
 *   Le drag est désactivé pendant ce mode.
 *
 * Le déplacement utilise une animation Framer Motion spring lente et fluide
 * (stiffness 60) pour l'aller, et plus rapide (stiffness 120) pour le retour.
 */
export function CanvasAgentAvatar({ agent, canvasScale, onChat, onEdit, isNew, budgetPct }: CanvasAgentAvatarProps) {
  const { projects, canvasAgents, updateAgentPosition, removeCanvasAgent, currentUser, pushOverlapping, setAgentWorkingOn, activeBuildTasks } = useLaunchpadStore()
  const [hovered, setHovered] = useState(false)
  const [showSpawnAnim, setShowSpawnAnim] = useState(!!isNew)
  const [showNewBadge, setShowNewBadge] = useState(!!isNew)

  // Auto-clear spawn animation and NEW badge
  useEffect(() => {
    if (isNew) {
      const t1 = setTimeout(() => setShowSpawnAnim(false), 800)
      const t2 = setTimeout(() => setShowNewBadge(false), 3000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [isNew])

  // Local drag state for smooth visual feedback (no Supabase on every frame)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, agentX: 0, agentY: 0 })

  const isAdmin = currentUser?.role === 'admin'
  const isOwner = currentUser?.username === agent.owner
  const canEdit = isAdmin || isOwner

  // ── Warcraft-style movement ────────────────────────────────────────────────

  /** Projet sur lequel l'agent travaille actuellement. */
  const targetProject = agent.working_on_project
    ? projects.find(p => p.id === agent.working_on_project)
    : null

  /** Agent a une build_task running même sans working_on_project */
  const hasRunningBuildTask = activeBuildTasks.some(
    t => t.agent_key === agent.agent_key && t.status === 'running'
  )

  const isWorking = !!targetProject || hasRunningBuildTask

  /**
   * Index de cet agent parmi tous ceux qui travaillent sur le même projet.
   * Permet de les aligner horizontalement sans chevauchement.
   */
  const workingAgentIndex = agent.working_on_project
    ? canvasAgents
        .filter(a => a.working_on_project === agent.working_on_project)
        .findIndex(a => a.id === agent.id)
    : 0

  /**
   * Position d'affichage calculée.
   * - En mode working : sous la ProjectCard, décalée selon l'index.
   * - En mode idle : position de drag ou position persistée.
   */
  const displayX = targetProject
    ? targetProject.position.x + 10 + (workingAgentIndex * 44)
    : (dragPos?.x ?? agent.position.x)

  const displayY = targetProject
    ? targetProject.position.y + 195  // juste sous la carte (hauteur ~180px + marge)
    : (dragPos?.y ?? agent.position.y)

  // ── Détection du mouvement pour l'effet "marche" ──────────────────────────

  /** Indique si l'agent est en cours de déplacement (pour l'animation de marche). */
  const [isMoving, setIsMoving] = useState(false)
  const prevPosRef = useRef({ x: displayX, y: displayY })

  useEffect(() => {
    const moved =
      Math.abs(displayX - prevPosRef.current.x) > 2 ||
      Math.abs(displayY - prevPosRef.current.y) > 2
    if (moved) {
      setIsMoving(true)
      prevPosRef.current = { x: displayX, y: displayY }
      const t = setTimeout(() => setIsMoving(false), 800)
      return () => clearTimeout(t)
    }
  }, [displayX, displayY])

  // ── Drag handler ──────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isWorking) return // ne pas drag un agent qui travaille
    e.stopPropagation()
    e.preventDefault()
    isDragging.current = true
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      agentX: agent.position.x,
      agentY: agent.position.y,
    }

    let rafId: number | null = null
    const lastPosRef = { x: agent.position.x, y: agent.position.y }

    const onUpMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
        const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
        lastPosRef.x = dragStart.current.agentX + dx
        lastPosRef.y = dragStart.current.agentY + dy
        setDragPos({ x: lastPosRef.x, y: lastPosRef.y })
      })
    }

    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setDragPos(null)
      updateAgentPosition(agent.id, lastPosRef.x, lastPosRef.y).then(() => {
        pushOverlapping(agent.id, lastPosRef.x, lastPosRef.y)
      })
      window.removeEventListener('mousemove', onUpMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onUpMove)
    window.addEventListener('mouseup', onUp)
  }, [agent.id, agent.position.x, agent.position.y, canvasScale, updateAgentPosition, pushOverlapping, isWorking])

  // Void reference to prevent unused variable warning
  void setAgentWorkingOn

  return (
    <motion.div
      data-no-drag
      className="canvas-agent-avatar"
      initial={false}
      animate={{
        x: displayX,
        y: displayY,
        scale: isWorking ? 0.85 : 1,
        rotate: isMoving ? [-2, 2, -2] : 0,
      }}
      transition={
        isMoving
          ? { rotate: { repeat: Infinity, duration: 0.3, ease: 'easeInOut' },
              x: { type: 'spring', stiffness: isWorking ? 60 : 120, damping: isWorking ? 18 : 20, mass: isWorking ? 1.2 : 1 },
              y: { type: 'spring', stiffness: isWorking ? 60 : 120, damping: isWorking ? 18 : 20, mass: isWorking ? 1.2 : 1 },
              scale: { type: 'spring', stiffness: 120, damping: 20 },
            }
          : {
              type: 'spring',
              stiffness: isWorking ? 60 : 120,
              damping: isWorking ? 18 : 20,
              mass: isWorking ? 1.2 : 1,
            }
      }
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: isWorking ? 'default' : (isDragging.current ? 'grabbing' : 'grab'),
        userSelect: 'none',
        filter: isWorking
          ? 'drop-shadow(0 0 8px rgba(225,31,123,0.6))'
          : hovered ? 'drop-shadow(0 4px 16px rgba(225,31,123,0.35))' : 'none',
        transition: isWorking ? 'filter 1s ease-in-out' : 'filter 0.2s',
        zIndex: isDragging.current ? 500 : 10,
      }}
    >
      {/* Avatar — screenshot Tailor si disponible, sinon emoji */}
      <div className="canvas-agent-avatar__figure" style={{ position: 'relative' }}>
        {/* Spawn animation ring — appears when isNew=true */}
        <AnimatePresence>
          {showSpawnAnim && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '2px solid #E11F7B',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />
          )}
        </AnimatePresence>
        {/* NEW badge */}
        <AnimatePresence>
          {showNewBadge && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                background: '#E11F7B',
                color: '#fff',
                fontSize: 8,
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: 4,
                pointerEvents: 'none',
                zIndex: 21,
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: '0.05em',
              }}
            >NEW</motion.div>
          )}
        </AnimatePresence>
        <AgentBubble name={agent.name} isWorking={isWorking} tailorUrl={agent.tailorUrl} tailorConfig={agent.tailor_config} />

        {/* TK-0156 — Badge budget (coin bas-gauche, visible si >= 70%) */}
        {budgetPct !== undefined && budgetPct >= 70 && (
          <motion.div
            animate={budgetPct >= 80 ? { scale: [1, 1.15, 1], opacity: [0.9, 1, 0.9] } : {}}
            transition={budgetPct >= 80 ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : {}}
            style={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: budgetPct >= 80 ? '#EF4444' : '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              pointerEvents: 'none',
              zIndex: 22,
              fontFamily: "'Poppins', sans-serif",
              border: '1.5px solid rgba(11,9,13,0.8)',
              boxShadow: budgetPct >= 80 ? '0 0 6px rgba(239,68,68,0.7)' : '0 0 4px rgba(245,158,11,0.5)',
            }}
          >
            {budgetPct >= 90 ? '💰' : `${budgetPct}%`}
          </motion.div>
        )}

        {/* TK-0019 — Bulle de pensée animée quand l'agent a une build_task running */}
        {hasRunningBuildTask && (
          <div style={{
            position: 'absolute',
            top: -22,
            right: -6,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
            {[0, 0.15, 0.30].map((delay, i) => {
              const key2 = agent.name.toLowerCase()
              const meta2 = AGENT_META[key2] ?? { color: '#fff' }
              return (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay, ease: 'easeInOut' }}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: meta2.color,
                    boxShadow: `0 0 4px ${meta2.color}`,
                  }}
                />
              )
            })}
          </div>
        )}



        {/* Indicateur visuel de déplacement */}
        {isMoving && isWorking && (
          <motion.div
            animate={{ opacity: [0.6, 0], scale: [1, 1.5] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(225,31,123,0.3)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Actions on hover — edit visible for admin or owner */}
        {hovered && canEdit && (
          <>
            <button
              className="canvas-agent-avatar__btn canvas-agent-avatar__btn--edit"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit?.(agent) }}
              title="Modifier l'agent"
              style={{
                position: 'absolute', top: -8, left: -8,
                width: 22, height: 22, borderRadius: '50%',
                background: '#6366F1', border: '2px solid #0B090D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', cursor: 'pointer', padding: 0,
              }}
            >
              ✏️
            </button>
            {/* Delete only for non-system agents */}
            {!agent.is_system && (
              <button
                className="canvas-agent-avatar__btn canvas-agent-avatar__btn--delete"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); removeCanvasAgent(agent.id) }}
                title="Supprimer l'agent"
                style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#EF4444', border: '2px solid #0B090D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#fff', cursor: 'pointer', lineHeight: 1, padding: 0,
                }}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>

      {/* Name tag + chat button */}
      <div className="canvas-agent-avatar__label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => onChat?.(agent)}
            title={`Discuter avec ${agent.name}`}
            style={{
              background: 'rgba(26,23,28,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
              cursor: onChat ? 'pointer' : 'default',
            }}
          >
            {agent.name}
          </div>

          {/* Badge modèle LLM */}
          {agent.agent_meta?.model && (
            <div style={{
              background: 'rgba(124,58,237,0.18)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(167,139,250,0.9)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {agent.agent_meta.model.includes('haiku') ? '⚡ Haiku' : agent.agent_meta.model.includes('sonnet') ? '🧠 Sonnet' : agent.agent_meta.model}
            </div>
          )}

          {onChat && (
            <button
              className="canvas-agent-avatar__chat-btn"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onChat(agent) }}
              title="Ouvrir le chat"
              style={{
                background: 'rgba(225,31,123,0.15)',
                border: '1px solid rgba(225,31,123,0.3)',
                borderRadius: 6,
                padding: '3px 7px',
                fontSize: 12,
                cursor: 'pointer',
                color: '#E11F7B',
              }}
            >
              💬
            </button>
          )}
        </div>

        {/* Working badge — ⚡ quand en mouvement, 🔨 quand arrivé */}
        {isWorking && (
          <motion.div
            animate={isMoving ? { opacity: [1, 0.5, 1] } : {}}
            transition={isMoving ? { repeat: Infinity, duration: 0.6 } : {}}
            style={{
              background: 'rgba(225,31,123,0.2)',
              border: '1px solid rgba(225,31,123,0.4)',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 700,
              color: '#E11F7B',
              whiteSpace: 'nowrap',
            }}
          >
            {isMoving ? '⚡ en route' : '🔨 en cours'}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
