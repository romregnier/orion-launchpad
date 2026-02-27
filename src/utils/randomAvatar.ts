import type { AvatarConfig } from '../types'

/**
 * Génère une config avatar aléatoire compatible avec The Tailor / OrionAvatar3D.
 * Utilisé lors de la création d'un agent canvas pour lui donner une apparence unique.
 */
export function randomAvatarConfig(): AvatarConfig {
  const bodyShapes = ['blob', 'star', 'heart', 'ghost', 'crystal', 'flame', 'cloud'] as const
  const eyeStyles = ['cute', 'star', 'sleepy', 'pixel', 'heart', 'cyclops'] as const
  const eyeColors = ['blue', 'green', 'red', 'gold', 'rainbow'] as const
  const blushStyles = ['none', 'soft', 'hearts'] as const
  const mouthStyles = ['smile', 'open', 'cool', 'tongue'] as const
  const headgearStyles = ['none', 'crown', 'antennae', 'halo', 'cat-ears'] as const
  const earPieceStyles = ['none', 'headphones', 'bow'] as const
  const animationStyles = ['float', 'bounce', 'rotate', 'wiggle', 'none'] as const
  const skinPatterns = ['none', 'glow', 'sparkle'] as const
  const ambianceStyles = ['space', 'sunset', 'forest', 'void'] as const

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const h = Math.floor(Math.random() * 360)
  const s = 60 + Math.floor(Math.random() * 30) // 60-90%
  const l = 50 + Math.floor(Math.random() * 20) // 50-70%

  return {
    bodyShape: pick(bodyShapes),
    color: { h, s, l },
    eyes: pick(eyeStyles),
    eyeColor: pick(eyeColors),
    blush: pick(blushStyles),
    mouth: pick(mouthStyles),
    armor: 'none',
    headgear: pick(headgearStyles),
    earPiece: pick(earPieceStyles),
    animation: pick(animationStyles),
    skinPattern: pick(skinPatterns),
    ambiance: pick(ambianceStyles),
    bodyScale: 0.85 + Math.random() * 0.3, // 0.85 - 1.15
  }
}
