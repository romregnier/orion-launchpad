export interface Project {
  id: string
  url: string
  title: string
  description?: string
  image?: string
  favicon?: string
  addedBy?: string // agent name or 'human'
  addedAt: number
  position: { x: number; y: number }
  color?: string // accent color
}

export interface CanvasState {
  offsetX: number
  offsetY: number
  scale: number
}
