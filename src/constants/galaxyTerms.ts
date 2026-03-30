/**
 * galaxyTerms.ts — TK-0232 [DS-004]
 * Terminologie "Galaxy" pour l'identité visuelle du Launchpad
 */

export const GALAXY_TERMS = {
  workspace: 'Galaxy',
  capsule: 'Nébuleuse',
  capsule_plural: 'Nébuleuses',
  project: 'Étoile',
  project_plural: 'Étoiles',
  bridge: 'Pont Stellaire',
  agent: 'Agent',
  workflow: 'Constellation',
  knowledge: 'Savoir Cosmique',
} as const

export type GalaxyTermKey = keyof typeof GALAXY_TERMS

export const GALAXY_EMOJIS: Record<GalaxyTermKey, string> = {
  workspace: '🌌',
  capsule: '🌀',
  capsule_plural: '🌀',
  project: '⭐',
  project_plural: '⭐',
  bridge: '🌉',
  agent: '🤖',
  workflow: '✨',
  knowledge: '🔭',
}

/** Get the galaxy term for a key, with optional fallback */
export function getGalaxyTerm(key: GalaxyTermKey, galaxyMode: boolean, fallback: string): string {
  if (!galaxyMode) return fallback
  return GALAXY_TERMS[key]
}

/** Get emoji for a galaxy term */
export function getGalaxyEmoji(key: GalaxyTermKey): string {
  return GALAXY_EMOJIS[key]
}
