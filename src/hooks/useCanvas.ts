/**
 * useCanvas — Hook extrayant la logique état/effets du canvas Launchpad.
 * TK-0183 : refacto LaunchpadCanvas → useCanvas
 *
 * Contient :
 * - State local canvas : scale, offset, isPanning
 * - Handlers pan/zoom : handleWheel, handleMouseDown, onTouchStart, onTouchMove, onTouchEnd
 * - Chargement des données (agents, projets, etc.)
 * - Refs nécessaires (canvasRef, touchState, etc.)
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'

const MIN_SCALE = 0.2
const MAX_SCALE = 2.5
const SCALE_STEP = 0.15

interface AgentBudget {
  agent_key: string
  monthly_token_limit: number
  monthly_usd_limit: number
  tokens_used_mtd: number
  usd_used_mtd: number
}

export function useCanvas() {
  const {
    fetchPublicSettings, subscribeToProjects, subscribeToAgents,
    subscribeToPositions, subscribeToBuildTasks, subscribeToIdeas, subscribeToLists,
    fetchProjectMetadata, fetchCapsules, tidyUp, remoteLoaded,
  } = useLaunchpadStore()

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [agentBudgetPcts, setAgentBudgetPcts] = useState<Record<string, number>>({})

  const canvasRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })
  const touchState = useRef<{ touches: React.Touch[]; lastDist: number; lastMid: { x: number; y: number } } | null>(null)
  const hasAutoFitted = useRef(false)

  // ── Initial offset centré ──────────────────────────────────────────────────
  useEffect(() => {
    setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 })
  }, [])

  // ── Auto-fit après chargement distant ─────────────────────────────────────
  useEffect(() => {
    if (remoteLoaded && !hasAutoFitted.current) {
      hasAutoFitted.current = true
      setOffset({ x: 40, y: 10 })
      setScale(0.75)
    }
  }, [remoteLoaded])

  // ── Subscriptions & data fetch ─────────────────────────────────────────────
  useEffect(() => {
    fetchPublicSettings()
    const unsubProjects = subscribeToProjects()
    const unsubAgents = subscribeToAgents()
    const unsubPos = subscribeToPositions()
    const unsubTasks = subscribeToBuildTasks()
    const unsubIdeas = subscribeToIdeas()
    const unsubLists = subscribeToLists()
    fetchProjectMetadata()
    fetchCapsules()
    return () => { unsubProjects(); unsubAgents(); unsubPos(); unsubTasks(); unsubIdeas(); unsubLists() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Agent budget percentages ───────────────────────────────────────────────
  useEffect(() => {
    supabase.from('agent_budgets').select('agent_key,monthly_token_limit,monthly_usd_limit,tokens_used_mtd,usd_used_mtd')
      .then(({ data }) => {
        if (!data) return
        const pcts: Record<string, number> = {}
        ;(data as AgentBudget[]).forEach(b => {
          const tokenPct = b.monthly_token_limit > 0 ? Math.round((b.tokens_used_mtd / b.monthly_token_limit) * 100) : 0
          const usdPct = b.monthly_usd_limit > 0 ? Math.round((b.usd_used_mtd / b.monthly_usd_limit) * 100) : 0
          pcts[b.agent_key] = Math.max(tokenPct, usdPct)
        })
        setAgentBudgetPcts(pcts)
      })
  }, [])

  // ── Touch handlers ─────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = { touches: Array.from(e.touches), lastDist: 0, lastMid: { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      touchState.current = { touches: Array.from(e.touches), lastDist: Math.hypot(dx, dy), lastMid: { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 } }
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!touchState.current) return
    if (e.touches.length === 1) {
      const prev = touchState.current.lastMid
      const cur = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setOffset(o => ({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }))
      touchState.current.lastMid = cur
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      const dist = Math.hypot(dx, dy)
      const mid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 }
      const prevDist = touchState.current.lastDist
      const prevMid = touchState.current.lastMid
      if (prevDist > 0) {
        const pinchRatio = dist / prevDist
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const mx = mid.x - rect.left
          const my = mid.y - rect.top
          setScale(s => {
            const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * pinchRatio))
            setOffset(o => ({ x: o.x - mx * (newScale / s - 1) + (mid.x - prevMid.x), y: o.y - my * (newScale / s - 1) + (mid.y - prevMid.y) }))
            return newScale
          })
        }
      }
      touchState.current.lastDist = dist
      touchState.current.lastMid = mid
    }
  }, [])

  const onTouchEnd = useCallback(() => { touchState.current = null }, [])

  // ── Mouse pan handler ──────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    if ((e.target as HTMLElement).closest('[data-no-drag], .project-card, button, a, input, textarea')) return
    e.preventDefault()
    setIsPanning(true)
    panStart.current = { mouseX: e.clientX, mouseY: e.clientY, offsetX: offset.x, offsetY: offset.y }
    const onMove = (ev: MouseEvent) => { setOffset({ x: panStart.current.offsetX + (ev.clientX - panStart.current.mouseX), y: panStart.current.offsetY + (ev.clientY - panStart.current.mouseY) }) }
    const onUp = () => { setIsPanning(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [offset])

  // ── Wheel zoom handler ─────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    setScale((s) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta))
      setOffset(o => ({ x: o.x - mouseX * (newScale / s - 1), y: o.y - mouseY * (newScale / s - 1) }))
      return newScale
    })
  }, [])

  // ── Zoom controls ──────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2))), [])
  const zoomOut = useCallback(() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2))), [])
  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 260 })
  }, [])

  const newCardPosition = {
    x: (window.innerWidth / 2 - offset.x) / scale - 130,
    y: (window.innerHeight / 2 - offset.y) / scale - 120,
  }

  return {
    // State
    scale,
    offset,
    isPanning,
    isMobile,
    agentBudgetPcts,
    newCardPosition,
    // Refs
    canvasRef,
    // Handlers
    handleWheel,
    handleMouseDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    // Zoom controls
    zoomIn,
    zoomOut,
    resetView,
    // Store access
    tidyUp,
  }
}
