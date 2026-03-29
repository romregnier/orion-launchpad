/**
 * CanvasPage — Route "/"
 * Enveloppe le LaunchpadCanvas.
 */
import { LaunchpadCanvas } from '../components/LaunchpadCanvas'

export function CanvasPage() {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <LaunchpadCanvas />
    </div>
  )
}
