/**
 * Types Marketplace — TK-0190
 */

export interface MarketplaceAgent {
  id: string
  name: string
  emoji: string
  role: string
  description: string
  skills: string[]
  rating: number       // 0-5
  installs: number
  author: string
  tags: string[]
  tier: 'free' | 'pro' | 'enterprise'
  system_prompt: string
  model: string
}
