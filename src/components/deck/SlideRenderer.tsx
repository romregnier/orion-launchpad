/**
 * SlideRenderer.tsx — Template engine pour les slides
 * TK-0034-0039
 *
 * Rend une slide selon son type en utilisant les classes CSS d'Aria.
 */
import './aria-deck.css'
import type { SlideJSON, DeckTheme } from '../../types/deck'

// Map theme key → data-theme attribute
const THEME_MAP: Record<string, string> = {
  dark_premium: 'DARK_PREMIUM',
  light_clean: 'LIGHT_CLEAN',
  gradient_bold: 'GRADIENT_BOLD',
  corporate: 'CORPORATE',
  DARK_PREMIUM: 'DARK_PREMIUM',
  LIGHT_CLEAN: 'LIGHT_CLEAN',
  GRADIENT_BOLD: 'GRADIENT_BOLD',
  CORPORATE: 'CORPORATE',
}

interface SlideRendererProps {
  slide: SlideJSON
  theme: DeckTheme | string
  /** Si true, affiche en mode miniature (désactive les animations) */
  thumbnail?: boolean
}

export function SlideRenderer({ slide, theme, thumbnail = false }: SlideRendererProps) {
  const dataTheme = THEME_MAP[theme] || 'DARK_PREMIUM'

  return (
    <div
      data-theme={dataTheme}
      style={{
        width: '100%',
        height: '100%',
        fontFamily: 'Poppins, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {renderSlide(slide, thumbnail)}
    </div>
  )
}

function renderSlide(slide: SlideJSON, thumbnail: boolean) {
  const { type, content } = slide

  switch (type) {
    case 'hero':
      return (
        <div className="tpl-hero" style={{ height: '100%' }}>
          {content.eyebrow && (
            <div className="tpl-hero__eyebrow">{content.eyebrow}</div>
          )}
          {content.title && (
            <h1 className="tpl-hero__title">{content.title}</h1>
          )}
          {content.subtitle && (
            <p className="tpl-hero__sub">{content.subtitle}</p>
          )}
        </div>
      )

    case 'content':
      return (
        <div className="tpl-content" style={{ height: '100%' }}>
          <div className="tpl-content__left">
            {content.label && (
              <div className="tpl-content__label">{content.label}</div>
            )}
            {content.title && (
              <h2 className="tpl-content__title">{content.title}</h2>
            )}
            {content.body && (
              <p className="tpl-content__body">{content.body}</p>
            )}
            {content.bullets && content.bullets.length > 0 && (
              <ul className="tpl-content__bullets">
                {content.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="tpl-content__right">
            <div style={{
              width: '60%',
              height: '60%',
              borderRadius: 16,
              background: 'var(--accent)',
              opacity: 0.15,
              transform: 'rotate(-8deg)',
            }} />
          </div>
        </div>
      )

    case 'stats':
      return (
        <div className="tpl-stats" style={{ height: '100%' }}>
          <div className="tpl-stats__header">
            {content.title && (
              <h2 className="tpl-stats__title">{content.title}</h2>
            )}
          </div>
          <div className="tpl-stats__grid">
            {(content.metrics || []).slice(0, 4).map((metric, i) => (
              <div key={i} className="tpl-stat-card">
                <div
                  className="tpl-stat-card__value"
                  style={thumbnail ? { animation: 'none' } : undefined}
                >
                  {metric.value}
                </div>
                <div className="tpl-stat-card__label">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'quote':
      return (
        <div className="tpl-quote" style={{ height: '100%' }}>
          {content.text && (
            <blockquote className="tpl-quote__text">
              &ldquo;{content.text}&rdquo;
            </blockquote>
          )}
          {content.author && (
            <div className="tpl-quote__author">{content.author}</div>
          )}
          {content.role && (
            <div className="tpl-quote__role">{content.role}</div>
          )}
        </div>
      )

    case 'cta':
      return (
        <div className="tpl-cta" style={{ height: '100%' }}>
          {content.title && (
            <h2 className="tpl-cta__title">{content.title}</h2>
          )}
          {content.subtitle && (
            <p className="tpl-cta__sub">{content.subtitle}</p>
          )}
          <button className="tpl-cta__btn">
            {content.buttonText || 'Commencer'}
          </button>
        </div>
      )

    case 'chart':
      return (
        <div
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', padding: '6% 8%',
            background: 'var(--surface)',
          }}
        >
          {content.title && (
            <h2 style={{
              fontSize: 'clamp(20px, 2.8vw, 36px)', fontWeight: 700,
              color: 'var(--text-pri)', marginBottom: 32, textAlign: 'center',
            }}>
              {content.title}
            </h2>
          )}
          {content.data && content.data.length > 0 && (
            <SimpleBarChart data={content.data} />
          )}
        </div>
      )

    default:
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: 'var(--text-sec)',
        }}>
          Slide type inconnu: {type}
        </div>
      )
  }
}

// Minimal bar chart component (no external deps)
function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, width: '100%', maxWidth: 600 }}>
      {data.map((item, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: '100%',
            height: `${(item.value / max) * 180}px`,
            background: 'var(--accent)',
            borderRadius: '4px 4px 0 0',
            opacity: 0.8 + (i / data.length) * 0.2,
            transition: 'height 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }} />
          <span style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: 'var(--text-sec)', textAlign: 'center' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default SlideRenderer
