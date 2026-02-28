import type { AvatarConfig } from '../types'

/**
 * Génère une config avatar compatible avec The Tailor / OrionAvatar3D.
 *
 * @param seed - Seed optionnel pour un résultat déterministe (même seed → même avatar).
 *               Si omis, génère un avatar aléatoire.
 * @returns AvatarConfig
 */
export function randomAvatarConfig(seed?: number): AvatarConfig {
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

  /** LCG pseudo-random generator seeded by an integer */
  let s = seed ?? Math.floor(Math.random() * 2147483647)
  const rng = (): number => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

  const h = Math.floor(rng() * 360)
  const sat = 60 + Math.floor(rng() * 30) // 60-90%
  const l = 50 + Math.floor(rng() * 20) // 50-70%

  return {
    bodyShape: pick(bodyShapes),
    color: { h, s: sat, l },
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
    bodyScale: 0.85 + rng() * 0.3, // 0.85 - 1.15
  }
}
