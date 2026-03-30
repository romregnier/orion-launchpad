// TK-0225 — Workspace type (conteneur multi-capsules)

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  owner_id: string
  plan: 'free' | 'pro' | 'enterprise'
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}
