/**
 * AgentAvatar — Visuel de l'avatar d'un agent (emoji, tailor_url, TailorCanvas 3D).
 * Props : agent, size, onClick.
 * Pas de logique de drag ici — voir AgentAvatarDraggable.
 */
import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { CanvasAgent, AvatarConfig } from '../types'

// ── Couleurs et emojis par agent ──────────────────────────────────────────────
const AGENT_META: Record<string, { emoji: string; color: string; glow: string }> = {
  orion: { emoji: '🌟', color: '#4FC3F7', glow: 'rgba(79,195,247,0.4)' },
  nova:  { emoji: '✦',  color: 'var(--accent)', glow: 'rgba(225,31,123,0.4)' },
  aria:  { emoji: '🎨', color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)' },
  forge: { emoji: '🔧', color: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
  rex:   { emoji: '🛡️', color: '#10B981', glow: 'rgba(16,185,129,0.4)' },
}

// ── BODY_CONFIG — positions visage par shape ──────────────────────────────────
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
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2
        renderer.outputColorSpace = THREE.SRGBColorSpace

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
        camera.position.set(0, 0, 4)
        camera.lookAt(0, 0, 0)

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

        const PI = Math.PI
        const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity * PI)
        const pointLight1 = new THREE.PointLight(0xffffff, 1.5 * PI)
        pointLight1.position.set(3, 3, 3)
        const pointLight2 = new THREE.PointLight(new THREE.Color(pointColor), 0.5 * PI)
        pointLight2.position.set(-2, -1, 2)
        scene.add(ambient, pointLight1, pointLight2)

        const hsl = tailorConfig.color
        const colorCss = hsl ? `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)` : fallbackColor
        const bodyColor = new THREE.Color(colorCss)
        const bodyScale = tailorConfig.bodyScale ?? 1

        const isGlow = tailorConfig.skinPattern === 'glow'
        const isHolographic = tailorConfig.skinPattern === 'holographic'
        const isMetal = tailorConfig.skinPattern === 'metal'
        const celShading = !!(tailorConfig as AvatarConfig & { celShading?: boolean }).celShading
        const gradientMap = celShading ? createGradientMap(THREE) : null

        const bodyMat = isHolographic
          ? new THREE.MeshStandardMaterial({
              color: bodyColor, emissive: bodyColor, emissiveIntensity: 0.8,
              roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.85,
            })
          : isMetal
          ? new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.05, metalness: 0.9 })
          : celShading
          ? new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap! })
          : new THREE.MeshStandardMaterial({
              color: bodyColor, emissive: bodyColor,
              emissiveIntensity: isGlow ? 0.55 : 0.25, roughness: 0.5, metalness: 0.05,
            })
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.1, metalness: 0.1 })
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 })
        const darkOutlineMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, metalness: 0 })

        const eyeColorMap: Record<string, string> = {
          blue: '#00BFFF', green: '#00FF88', red: '#FF4444',
          gold: '#FFD700', rainbow: '#FF69B4',
        }
        const eyeColorHex = eyeColorMap[tailorConfig.eyeColor ?? 'blue'] ?? '#00BFFF'
        const eyeColor = new THREE.Color(eyeColorHex)
        const eyeGlowMat = new THREE.MeshStandardMaterial({
          color: eyeColor, emissive: eyeColor, emissiveIntensity: 2.0, roughness: 0, metalness: 0,
        })

        const meshGroup = new THREE.Group()
        meshGroup.scale.setScalar(bodyScale)
        scene.add(meshGroup)

        const bs = tailorConfig.bodyShape ?? 'blob'
        const bc = getBc(bs)

        if (bs === 'heart') {
          const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), bodyMat)
          s1.position.set(-0.28, 0.22, 0); s1.scale.set(0.85, 0.85, 0.8)
          const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), bodyMat)
          s2.position.set(0.28, 0.22, 0); s2.scale.set(0.85, 0.85, 0.8)
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.2, 32), bodyMat)
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
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.1, 32), bodyMat)
          const topSphere = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat)
          const botSphere = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bodyMat)
          topSphere.position.y = 0.55; botSphere.position.y = -0.55
          meshGroup.add(cyl, topSphere, botSphere)
        } else if (bs === 'organic') {
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
          const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), bodyMat)
          body.scale.set(1.0, 0.92, 0.88)
          meshGroup.add(body)
        }

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
            const outer = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), darkMat)
            outer.scale.set(1.0, 1.15, 1.0)
            const inner = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), eyeGlowMat)
            inner.position.set(0.06, 0.06, 0.15)
            eyeGroup.add(outer, inner)
          }
          return eyeGroup
        }

        meshGroup.add(buildKirbyEye([-bc.eyeSpread, bc.eyeY, bc.faceZ]))
        meshGroup.add(buildKirbyEye([bc.eyeSpread, bc.eyeY, bc.faceZ]))

        if (tailorConfig.blush && tailorConfig.blush !== 'none') {
          const blushMat = new THREE.MeshStandardMaterial({
            color: 0xff9999, transparent: true, opacity: 0.55, roughness: 1, metalness: 0,
            side: THREE.DoubleSide, depthWrite: false,
          })
          ;[-bc.blushSpread, bc.blushSpread].forEach((bx) => {
            const blush = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), blushMat)
            blush.position.set(bx, -0.05, bc.faceZ + 0.06)
            blush.rotation.x = -0.2
            meshGroup.add(blush)
          })
        }

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
          const m = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20, Math.PI), darkOutlineMat)
          m.position.set(0, bc.mouthY, bc.faceZ + 0.08); m.rotation.z = Math.PI
          meshGroup.add(m)
        }

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

        if (tailorConfig.headgear && tailorConfig.headgear !== 'none') {
          if (tailorConfig.headgear === 'crown') {
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

        if (tailorConfig.earPiece && tailorConfig.earPiece !== 'none') {
          if (tailorConfig.earPiece === 'tech') {
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
        // Three.js indisponible — canvas reste vide
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
 * AgentAvatar — Avatar visuel d'un agent (sans drag).
 * Props : agent, isWorking, onClick, size
 *
 * TK-0222 v2:
 *  - Colored ring border (agent color)
 *  - Pulsing glow halo via Framer Motion
 *  - Default size 80px (was 112px for TailorCanvas, now configurable)
 *  - Emoji badge for unknown agents without tailor_url
 */
export interface AgentAvatarProps {
  agent: CanvasAgent
  isWorking: boolean
  onClick?: () => void
  /** Avatar diameter in px. Defaults to 80. */
  size?: number
}

export function AgentAvatar({ agent, isWorking, onClick, size = 80 }: AgentAvatarProps) {
  const key = agent.name.toLowerCase()
  const knownAgent = AGENT_META[key]
  const meta = knownAgent ?? { emoji: '🤖', color: 'var(--accent)', glow: 'rgba(225,31,123,0.4)' }

  const isMobile = typeof navigator !== 'undefined'
    && (navigator.maxTouchPoints > 0 || window.innerWidth < 768)

  const showTailor = !isMobile && !!agent.tailor_config
  const showPng = !showTailor && !!agent.tailorUrl
  // Show emoji badge for unknown agents (not in AGENT_META) without tailor_url
  const showBadge = !knownAgent && !agent.tailorUrl

  // Pulsing glow: always on (subtle), stronger when working
  const glowBase = `0 0 16px ${meta.glow}`
  const glowWorking = `0 0 28px ${meta.glow}`

  const fontSize = Math.round(size * 0.4)
  const badgeSize = Math.round(size * 0.28)

  return (
    <motion.div
      animate={{
        boxShadow: isWorking
          ? [glowBase, glowWorking, glowBase]
          : [glowBase, `0 0 24px ${meta.glow}`, glowBase],
      }}
      transition={{ repeat: Infinity, duration: isWorking ? 1.0 : 2.8, ease: 'easeInOut' }}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'inherit',
        flexShrink: 0,
      }}
    >
      {/* Inner circle */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
          background: (showTailor || showPng)
            ? 'transparent'
            : `radial-gradient(circle at 35% 35%, ${meta.color}55, ${meta.color}22)`,
          border: `2px solid ${meta.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          boxShadow: `inset 0 1px 4px rgba(0,0,0,0.3)`,
        }}
      >
        {showTailor ? (
          <TailorCanvas tailorConfig={agent.tailor_config!} fallbackColor={meta.color} />
        ) : showPng ? (
          <img
            src={agent.tailorUrl}
            alt={agent.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          meta.emoji
        )}
      </div>

      {/* Badge — emoji for unknown agents without tailor_url */}
      {showBadge && (
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            background: 'var(--bg-card, #1a1a2e)',
            border: `1.5px solid ${meta.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.round(badgeSize * 0.55),
            zIndex: 1,
          }}
        >
          {meta.emoji}
        </div>
      )}
    </motion.div>
  )
}
