/**
 * DoraWidget — Tableau de bord DORA Metrics pour le Launchpad
 *
 * Affiche 5 métriques de performance d'ingénierie (4 DORA standard + Quality Score)
 * calculées depuis build_tasks Supabase sur les 7 derniers déploiements.
 *
 * @remarks
 * - S'intègre dans BuildStatusWidget en mode dépliable (toggle "Stats")
 * - Animations Framer Motion spring {stiffness:350, damping:28}
 * - Responsive : grid 2 col desktop, 1 col mobile, sparklines masquées mobile
 * - Refresh automatique toutes les 60s via useEffect interval
 *
 * @example
 * ```tsx
 * // Dans BuildStatusWidget
 * <AnimatePresence>
 *   {showDora && <DoraWidget />}
 * </AnimatePresence>
 * ```
 */

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

/** Niveau DORA pour colorisation et badge */
type DoraLevel = 'elite' | 'high' | 'medium' | 'low' | 'none'

/** Données d'une métrique DORA */
interface DoraMetric {
  value: number | null
  unit: string
  level: DoraLevel
  trend: number | null
  trendPositive: boolean
  sparkline: number[]
  sparklineRaw: number[]
}

/** État complet du DoraWidget */
interface DoraData {
  deployFrequency: DoraMetric
  leadTime: DoraMetric
  mttr: DoraMetric
  changeFailureRate: DoraMetric
  qualityScore: DoraMetric
  lastUpdated: Date | null
  isLoading: boolean
  error: string | null
}

interface BuildTaskRow {
  id: string
  status: 'running' | 'done' | 'failed'
  created_at: string
  finished_at: string | null
  project: string | null
  step_label: string | null
  agent_key: string | null
}

// ── Colors / Levels ──────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<DoraLevel, string> = {
  elite:  '#22c55e',
  high:   '#22c55e',
  medium: '#f97316',
  low:    '#ef4444',
  none:   '#6b7280',
}

const LEVEL_LABELS: Record<DoraLevel, string> = {
  elite:  'ELITE',
  high:   'HIGH',
  medium: 'MED',
  low:    'LOW',
  none:   '—',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalize(arr: number[]): number[] {
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  if (max === min) return arr.map(() => 0.5)
  return arr.map(v => (v - min) / (max - min))
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function deployLevel(perWeek: number): DoraLevel {
  if (perWeek >= 7) return 'elite'
  if (perWeek >= 1) return 'high'
  if (perWeek >= 0.25) return 'medium'
  return 'low'
}

function leadTimeLevel(minutes: number): DoraLevel {
  if (minutes < 60) return 'elite'
  if (minutes < 1440) return 'high'
  if (minutes < 10080) return 'medium'
  return 'low'
}

function mttrLevel(minutes: number): DoraLevel {
  if (minutes < 60) return 'elite'
  if (minutes < 1440) return 'high'
  if (minutes < 10080) return 'medium'
  return 'low'
}

function cfrLevel(pct: number): DoraLevel {
  if (pct <= 5) return 'elite'
  if (pct <= 10) return 'high'
  if (pct <= 15) return 'medium'
  return 'low'
}

function qualityLevel(score: number): DoraLevel {
  if (score >= 6) return 'elite'
  if (score >= 5) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

// ── Sparkline SVG ────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[]
  color: string
  height?: number
  width?: number
  inverted?: boolean
}

function Sparkline({ data, color, height = 24, width = 60, inverted = false }: SparklineProps) {
  if (data.length < 2) return null

  const normalized = normalize(data)
  const pts = normalized.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = inverted ? v * height : (1 - v) * height
    return `${x},${y}`
  })

  const pointsStr = pts.join(' ')
  const lastPt = pts[pts.length - 1].split(',')
  const lastX = parseFloat(lastPt[0])
  const lastY = parseFloat(lastPt[1])

  const fillPoints = `0,${height} ${pointsStr} ${width},${height}`

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polygon
        points={fillPoints}
        fill={color}
        fillOpacity={0.15}
      />
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  )
}

// ── MetricCard ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: string
  name: string
  metric: DoraMetric
  colSpan?: boolean
  index: number
}

function MetricCard({ icon, name, metric, colSpan = false, index }: MetricCardProps) {
  const color = LEVEL_COLORS[metric.level]
  const isLoading = metric.value === null && metric.level === 'none' && metric.sparkline.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, delay: index * 0.06 }}
      style={{
        background: 'rgba(62,55,66,0.5)',
        borderRadius: 10,
        padding: '10px 12px',
        gridColumn: colSpan ? 'span 2' : undefined,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {name}
        </span>
      </div>

      {isLoading ? (
        /* Skeleton */
        <div style={{ animation: 'pulse 1.5s infinite' }}>
          <div style={{ height: 24, width: 60, background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 10, width: 80, background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 24, width: 60, background: 'var(--bg-elevated)', borderRadius: 4 }} />
        </div>
      ) : metric.value === null ? (
        /* No data */
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#6b7280' }}>—</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Aucune donnée</div>
        </div>
      ) : (
        /* Data */
        <>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: color,
            lineHeight: 1.1,
            marginBottom: 4,
          }}>
            {metric.unit}
          </div>

          {/* Trend + Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            {metric.trend !== null && (
              <span style={{
                fontSize: 10,
                color: (() => {
                  const improving = metric.trendPositive
                    ? metric.trend > 0
                    : metric.trend < 0
                  return improving ? '#22c55e' : '#ef4444'
                })(),
              }}>
                {metric.trend > 0 ? '↑' : '↓'}{' '}
                {metric.trendPositive
                  ? `+${Math.abs(metric.trend).toFixed(1)}`
                  : `${metric.trend > 0 ? '+' : ''}${metric.trend.toFixed(1)}`}
              </span>
            )}
            {metric.level !== 'none' && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 999,
                background: `${color}20`,
                color: color,
                border: `1px solid ${color}40`,
                letterSpacing: '0.05em',
                animation: metric.level === 'low' ? 'pulse 1.5s infinite' : undefined,
              }}>
                {LEVEL_LABELS[metric.level]}
              </span>
            )}
          </div>

          {/* Sparkline — masquée mobile */}
          <div className="hidden sm:block">
            {metric.sparkline.length >= 2 && (
              <Sparkline
                data={metric.sparklineRaw}
                color={color}
                inverted={!metric.trendPositive}
              />
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

// ── Data fetching ─────────────────────────────────────────────────────────────

const EMPTY_METRIC: DoraMetric = {
  value: null,
  unit: '—',
  level: 'none',
  trend: null,
  trendPositive: true,
  sparkline: [],
  sparklineRaw: [],
}

const INITIAL_STATE: DoraData = {
  deployFrequency: EMPTY_METRIC,
  leadTime: EMPTY_METRIC,
  mttr: EMPTY_METRIC,
  changeFailureRate: EMPTY_METRIC,
  qualityScore: EMPTY_METRIC,
  lastUpdated: null,
  isLoading: true,
  error: null,
}

async function fetchDoraData(): Promise<DoraData> {
  const now = Date.now()
  const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString()

  // Fetch all recent tasks
  const { data: recent, error } = await supabase
    .from('build_tasks')
    .select('id,status,created_at,finished_at,project,step_label,agent_key')
    .gte('created_at', fourteenDaysAgo)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const tasks = (recent ?? []) as BuildTaskRow[]
  const thisWeekTasks = tasks.filter(t => new Date(t.created_at).getTime() >= now - 7 * 86400000)
  const lastWeekTasks = tasks.filter(t => {
    const ts = new Date(t.created_at).getTime()
    return ts < now - 7 * 86400000
  })

  // ── Deploy Frequency ─────────────────────────────────────────────────────
  const doneTasks7d = thisWeekTasks.filter(t => t.status === 'done' && t.finished_at)
  const doneTasksPrev = lastWeekTasks.filter(t => t.status === 'done' && t.finished_at)

  // Sparkline: deploys per day (7 days)
  const deployByDay = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * 86400000
    const dayEnd = dayStart + 86400000
    return tasks.filter(t =>
      t.status === 'done' &&
      t.finished_at &&
      new Date(t.finished_at).getTime() >= dayStart &&
      new Date(t.finished_at).getTime() < dayEnd
    ).length
  })

  const deployFreqValue = doneTasks7d.length
  const deployFreqPrev = doneTasksPrev.length
  const deployFreq: DoraMetric = doneTasks7d.length === 0 ? EMPTY_METRIC : {
    value: deployFreqValue,
    unit: `${deployFreqValue.toFixed(1)}/sem`,
    level: deployLevel(deployFreqValue),
    trend: deployFreqValue - deployFreqPrev,
    trendPositive: true,
    sparkline: normalize(deployByDay),
    sparklineRaw: deployByDay,
  }

  // ── Lead Time ────────────────────────────────────────────────────────────
  const doneLast7 = tasks
    .filter(t => t.status === 'done' && t.finished_at && t.created_at)
    .slice(-7)
  const leadTimes = doneLast7
    .map(t => (new Date(t.finished_at!).getTime() - new Date(t.created_at).getTime()) / 60000)
    .filter(v => v > 0)

  const prevDone = tasks
    .filter(t => t.status === 'done' && t.finished_at && new Date(t.created_at).getTime() < now - 7 * 86400000)
    .slice(-7)
  const prevLeadTimes = prevDone
    .map(t => (new Date(t.finished_at!).getTime() - new Date(t.created_at).getTime()) / 60000)
    .filter(v => v > 0)

  const avgLead = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null
  const avgLeadPrev = prevLeadTimes.length > 0 ? prevLeadTimes.reduce((a, b) => a + b, 0) / prevLeadTimes.length : null

  const leadTime: DoraMetric = avgLead === null ? EMPTY_METRIC : {
    value: avgLead,
    unit: formatMinutes(avgLead),
    level: leadTimeLevel(avgLead),
    trend: avgLeadPrev !== null ? avgLead - avgLeadPrev : null,
    trendPositive: false,
    sparkline: normalize(leadTimes),
    sparklineRaw: leadTimes,
  }

  // ── MTTR ─────────────────────────────────────────────────────────────────
  const failedTasks = tasks.filter(t => t.status === 'failed')
  const mttrValues: number[] = []

  for (const ft of failedTasks) {
    // Find next done task for same project after this failure
    const failTime = new Date(ft.created_at).getTime()
    const recovery = tasks.find(t =>
      t.status === 'done' &&
      t.project === ft.project &&
      new Date(t.created_at).getTime() > failTime
    )
    if (recovery?.finished_at) {
      const recoverTime = new Date(recovery.finished_at).getTime()
      mttrValues.push((recoverTime - failTime) / 60000)
    }
  }

  const recentMttr = mttrValues.slice(-7)
  const prevMttr = mttrValues.slice(-14, -7)
  const avgMttr = recentMttr.length > 0 ? recentMttr.reduce((a, b) => a + b, 0) / recentMttr.length : null
  const avgMttrPrev = prevMttr.length > 0 ? prevMttr.reduce((a, b) => a + b, 0) / prevMttr.length : null

  const mttr: DoraMetric = avgMttr === null ? EMPTY_METRIC : {
    value: avgMttr,
    unit: formatMinutes(avgMttr),
    level: mttrLevel(avgMttr),
    trend: avgMttrPrev !== null ? avgMttr - avgMttrPrev : null,
    trendPositive: false,
    sparkline: normalize(recentMttr),
    sparklineRaw: recentMttr,
  }

  // ── Change Failure Rate ───────────────────────────────────────────────────
  const cfrByDay = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * 86400000
    const dayEnd = dayStart + 86400000
    const dayTasks = tasks.filter(t => {
      const ts = new Date(t.created_at).getTime()
      return ts >= dayStart && ts < dayEnd
    })
    if (dayTasks.length === 0) return 0
    return (dayTasks.filter(t => t.status === 'failed').length / dayTasks.length) * 100
  })

  const totalThis = thisWeekTasks.length
  const failedThis = thisWeekTasks.filter(t => t.status === 'failed').length
  const totalPrev = lastWeekTasks.length
  const failedPrev = lastWeekTasks.filter(t => t.status === 'failed').length

  const cfrValue = totalThis > 0 ? (failedThis / totalThis) * 100 : null
  const cfrPrev = totalPrev > 0 ? (failedPrev / totalPrev) * 100 : null

  const cfr: DoraMetric = cfrValue === null ? EMPTY_METRIC : {
    value: cfrValue,
    unit: `${cfrValue.toFixed(1)}%`,
    level: cfrLevel(cfrValue),
    trend: cfrPrev !== null ? cfrValue - cfrPrev : null,
    trendPositive: false,
    sparkline: normalize(cfrByDay),
    sparklineRaw: cfrByDay,
  }

  // ── Quality Score ─────────────────────────────────────────────────────────
  const qaTasks = tasks
    .filter(t => t.status === 'done' && t.step_label && /QG \d+\/6/.test(t.step_label))
    .slice(-7)
  const qaScores = qaTasks.map(t => {
    const m = t.step_label!.match(/QG (\d+)\/6/)
    return m ? parseInt(m[1], 10) : 0
  })

  const prevQaTasks = tasks
    .filter(t =>
      t.status === 'done' &&
      t.step_label &&
      /QG \d+\/6/.test(t.step_label) &&
      new Date(t.created_at).getTime() < now - 7 * 86400000
    )
    .slice(-7)
  const prevQaScores = prevQaTasks.map(t => {
    const m = t.step_label!.match(/QG (\d+)\/6/)
    return m ? parseInt(m[1], 10) : 0
  })

  const avgQa = qaScores.length > 0 ? qaScores.reduce((a, b) => a + b, 0) / qaScores.length : null
  const avgQaPrev = prevQaScores.length > 0 ? prevQaScores.reduce((a, b) => a + b, 0) / prevQaScores.length : null

  const qualityScore: DoraMetric = avgQa === null ? EMPTY_METRIC : {
    value: avgQa,
    unit: `${avgQa.toFixed(1)}/6`,
    level: qualityLevel(avgQa),
    trend: avgQaPrev !== null ? avgQa - avgQaPrev : null,
    trendPositive: true,
    sparkline: normalize(qaScores),
    sparklineRaw: qaScores,
  }

  return {
    deployFrequency: deployFreq,
    leadTime,
    mttr,
    changeFailureRate: cfr,
    qualityScore,
    lastUpdated: new Date(),
    isLoading: false,
    error: null,
  }
}

// ── DoraWidget ────────────────────────────────────────────────────────────────

export const DoraWidget: React.FC = () => {
  const [data, setData] = useState<DoraData>(INITIAL_STATE)

  const load = () => {
    fetchDoraData()
      .then(d => setData(d))
      .catch(err => setData(prev => ({ ...prev, isLoading: false, error: String(err) })))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  const metrics = [
    { icon: '⚡', name: 'Deploy Freq', metric: data.deployFrequency, colSpan: false },
    { icon: '🛡', name: 'Quality Score', metric: data.qualityScore, colSpan: false },
    { icon: '⏱', name: 'Lead Time', metric: data.leadTime, colSpan: false },
    { icon: '🔧', name: 'MTTR', metric: data.mttr, colSpan: false },
    { icon: '⚠️', name: 'Change Failure Rate', metric: data.changeFailureRate, colSpan: true },
  ]

  return (
    <div
      data-no-drag
      style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        pointerEvents: 'all',
      }}
    >
      {/* Section header */}
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#6b7280',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        📊 DORA Metrics — 7 derniers deploys
      </div>

      {data.error ? (
        <div style={{ fontSize: 11, color: '#ef4444' }}>Erreur: {data.error}</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
        }}>
          {metrics.map((m, i) => (
            <MetricCard
              key={m.name}
              icon={m.icon}
              name={m.name}
              metric={m.metric}
              colSpan={m.colSpan}
              index={i}
            />
          ))}
        </div>
      )}

      {data.lastUpdated && (
        <div style={{ fontSize: 9, color: 'var(--bg-elevated)', marginTop: 6, textAlign: 'right' }}>
          Mis à jour {data.lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}


