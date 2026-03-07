// ── Deck Builder Types ────────────────────────────────────────────────────────

export type SlideType = 'hero' | 'content' | 'stats' | 'quote' | 'cta' | 'chart'
export type DeckTheme = 'dark_premium' | 'light_clean' | 'gradient_bold' | 'corporate'
export type DeckAudience = 'Investisseur' | 'Partenaire' | 'Équipe' | 'Client' | 'Public'
export type DeckTonality = 'Formel' | 'Neutre' | 'Dynamique' | 'Inspirant'
export type DeckLang = 'Français' | 'English'

export interface SlideContent {
  // hero
  eyebrow?: string
  title?: string
  subtitle?: string
  // content
  label?: string
  body?: string
  bullets?: string[]
  // stats
  metrics?: { value: string; label: string }[]
  // quote
  text?: string
  author?: string
  role?: string
  // cta
  buttonText?: string
  // chart
  chartType?: 'bar' | 'line' | 'pie'
  data?: { label: string; value: number }[]
}

export interface SlideJSON {
  type: SlideType
  position: number
  content: SlideContent
}

export interface DeckJSON {
  title: string
  theme: string
  slides: SlideJSON[]
}

export interface DeckBrief {
  title: string
  description: string
  audience: DeckAudience
  tonality: DeckTonality
  theme: DeckTheme
  slideCount: number
  lang: DeckLang
}

export interface DeckRecord {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
  slide_count: number
  theme_json: string | null
  created_at: string
  updated_at: string
  published_url: string | null
}

export interface SlideRecord {
  id: string
  deck_id: string
  position: number
  type: SlideType
  content_json: SlideContent
  created_at: string
}
