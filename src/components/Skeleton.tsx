/**
 * Skeleton loaders — TK-0220
 * Animation shimmer CSS keyframes. CSS variables uniquement.
 */

const shimmerStyle = `
@keyframes skeletonShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`

// Inject shimmer keyframes once
if (typeof document !== 'undefined') {
  const styleId = '__skeleton_shimmer__'
  if (!document.getElementById(styleId)) {
    const tag = document.createElement('style')
    tag.id = styleId
    tag.textContent = shimmerStyle
    document.head.appendChild(tag)
  }
}

const shimmerCSS: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%)',
  backgroundSize: '800px 100%',
  animation: 'skeletonShimmer 1.5s infinite linear',
}

interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  className?: string
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'var(--radius-md)',
  className,
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        ...shimmerCSS,
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius,
        flexShrink: 0,
      }}
    />
  )
}

export function SkeletonLine({ width = '100%' }: { width?: string | number }) {
  return <Skeleton width={width} height={14} radius="var(--radius-sm)" />
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius="50%" />
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '65%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div
      style={{
        width: 200,
        height: 120,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <Skeleton width="100%" height={48} radius="var(--radius-md)" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="55%" />
    </div>
  )
}
