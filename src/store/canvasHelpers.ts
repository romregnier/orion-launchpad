/**
 * findFreePosition — exported from both store.ts (backward compat) and here for slice use.
 */
import type { CanvasObject } from './sliceTypes'

/**
 * Trouve une position libre sur le canvas en évitant les objets existants.
 */
export function findFreePosition(
  objects: CanvasObject[],
  width = 280,
  height = 180,
  startX = 60,
  startY = 60,
  padding = 20
): { x: number; y: number } {
  const cellW = width + padding
  const cellH = height + padding
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 20; col++) {
      const x = startX + col * cellW
      const y = startY + row * cellH
      const overlaps = objects.some(
        o =>
          Math.abs(o.x - x) < width + padding &&
          Math.abs(o.y - y) < height + padding
      )
      if (!overlaps) return { x, y }
    }
  }
  return { x: startX + objects.length * 20, y: startY + objects.length * 20 }
}
