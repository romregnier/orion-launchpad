/**
 * useCanvasElements.ts — TK-0227
 * Hook unifié pour accéder et manipuler tous les éléments canvas.
 */
import { useLaunchpadStore } from '../store'
import type { CanvasObject } from '../store/sliceTypes'

export interface UseCanvasElementsReturn {
  elements: CanvasObject[]
  getElementById: (id: string) => CanvasObject | undefined
  moveElement: (id: string, x: number, y: number) => void
  deleteElement: (id: string) => void
  getElementsByType: (type: CanvasObject['type']) => CanvasObject[]
  totalCount: number
}

export function useCanvasElements(): UseCanvasElementsReturn {
  const store = useLaunchpadStore()
  const elements = store.getAllCanvasObjects()

  // Sort by type for consistent ordering
  const sorted = [...elements].sort((a, b) => a.type.localeCompare(b.type))

  const getElementById = (id: string): CanvasObject | undefined =>
    elements.find(el => el.id === id)

  const moveElement = (id: string, x: number, y: number): void => {
    const el = getElementById(id)
    if (!el) return
    if (el.type === 'project') {
      store.updatePosition(id, x, y)
    } else if (el.type === 'list') {
      store.updateListPosition(id, x, y)
    } else if (el.type === 'idea') {
      store.setIdeaWidgetPosition(x, y)
    } else if (el.type === 'agent') {
      store.updateAgentPosition(id, x, y)
    }
  }

  const deleteElement = (id: string): void => {
    const el = getElementById(id)
    if (!el) return
    if (el.type === 'project') {
      store.removeProject(id)
    } else if (el.type === 'list') {
      store.removeList(id)
    } else if (el.type === 'idea') {
      // idea widget is a singleton — no delete in current store
    } else if (el.type === 'agent') {
      store.removeCanvasAgent(id)
    }
  }

  const getElementsByType = (type: CanvasObject['type']): CanvasObject[] =>
    elements.filter(el => el.type === type)

  return {
    elements: sorted,
    getElementById,
    moveElement,
    deleteElement,
    getElementsByType,
    totalCount: elements.length,
  }
}
