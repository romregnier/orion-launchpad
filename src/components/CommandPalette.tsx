/**
 * CommandPalette — TK-0176 Cmd+K global overlay
 * Navigation + actions rapides, navigation clavier complète
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useLaunchpadStore } from '../store'
import { AGENT_META } from '../types'

interface Command {
  id: string
  group: string
  icon: string
  label: string
  description?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onHireAgent?: () => void
  onNewTicket?: () => void
  onAddProject?: () => void
}

export function CommandPalette({ open, onClose, onHireAgent, onNewTicket, onAddProject }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { canvasAgents } = useLaunchpadStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const STATIC_COMMANDS: Command[] = [
    // Navigation
    { id: 'nav-canvas',    group: 'Navigation', icon: '🌌', label: 'Canvas',    action: () => { navigate('/');          onClose() } },
    { id: 'nav-dashboard', group: 'Navigation', icon: '🏠', label: 'Dashboard', action: () => { navigate('/dashboard'); onClose() } },
    { id: 'nav-agents',    group: 'Navigation', icon: '🤖', label: 'Agents',    action: () => { navigate('/agents');    onClose() } },
    { id: 'nav-tickets',   group: 'Navigation', icon: '🎫', label: 'Tickets',   action: () => { navigate('/tickets');   onClose() } },
    { id: 'nav-activity',  group: 'Navigation', icon: '📊', label: 'Activity',  action: () => { navigate('/activity'); onClose() } },
    { id: 'nav-settings',  group: 'Navigation', icon: '⚙️', label: 'Settings',  action: () => { navigate('/settings'); onClose() } },
    // Actions
    { id: 'act-hire',      group: 'Actions',    icon: '🤖', label: 'Recruter un agent',  description: 'Hire Agent modal', action: () => { onHireAgent?.(); onClose() } },
    { id: 'act-ticket',    group: 'Actions',    icon: '🎫', label: 'Nouveau ticket',     description: 'Créer un ticket', action: () => { onNewTicket?.(); onClose() } },
    { id: 'act-project',   group: 'Actions',    icon: '📁', label: 'Ajouter un projet',  description: 'Ajouter au canvas', action: () => { onAddProject?.(); onClose() } },
  ]

  // Dynamic agent commands
  const agentCommands: Command[] = (canvasAgents ?? []).slice(0, 8).map(agent => ({
    id: `agent-${agent.id}`,
    group: 'Agents',
    icon: (agent.agent_key ? AGENT_META[agent.agent_key]?.emoji : null) ?? '🤖',
    label: agent.name,
    description: agent.role ?? '',
    action: () => { navigate('/agents'); onClose() }
  }))

  const allCommands = [...STATIC_COMMANDS, ...agentCommands]

  const filtered = query.trim()
    ? allCommands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands

  // Group filtered results
  const groups: Record<string, Command[]> = {}
  filtered.forEach(cmd => {
    if (!groups[cmd.group]) groups[cmd.group] = []
    groups[cmd.group].push(cmd)
  })

  const flatFiltered = filtered

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return

    if (e.key === 'Escape') {
      onClose()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatFiltered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = flatFiltered[activeIndex]
      if (cmd) cmd.action()
    }
  }, [open, flatFiltered, activeIndex, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  let flatIndex = 0

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 9999,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--bg-elevated)',
          border: 'var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderBottom: 'var(--glass-border)',
        }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une action, une page, un agent…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 18,
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
            }}
          />
          <kbd style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'var(--border-default)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-tertiary)',
            fontFamily: 'monospace',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            padding: '8px 0',
            scrollbarWidth: 'none',
          }}
        >
          {flatFiltered.length === 0 ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}>
              Aucun résultat pour « {query} »
            </div>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group}>
                {/* Group label */}
                <div style={{
                  padding: '6px 16px 4px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--font-display)',
                }}>
                  {group}
                </div>

                {/* Commands in group */}
                {cmds.map(cmd => {
                  const currentIndex = flatIndex++
                  const isActive = currentIndex === activeIndex

                  return (
                    <div
                      key={cmd.id}
                      data-index={currentIndex}
                      onClick={cmd.action}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        background: isActive ? 'var(--accent-subtle)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        transition: 'background 0.1s, border-color 0.1s',
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>
                        {cmd.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontFamily: 'var(--font-sans)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {cmd.label}
                        </div>
                        {cmd.description && (
                          <div style={{
                            fontSize: 11,
                            color: 'var(--text-tertiary)',
                            fontFamily: 'var(--font-sans)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <kbd style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'var(--border-default)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'var(--text-tertiary)',
                          fontFamily: 'monospace',
                          flexShrink: 0,
                        }}>
                          ↵
                        </kbd>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '8px 16px',
          borderTop: 'var(--glass-border)',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}>
          {[
            { keys: '↑↓', label: 'Naviguer' },
            { keys: '↵', label: 'Exécuter' },
            { keys: 'ESC', label: 'Fermer' },
          ].map(({ keys, label }) => (
            <div key={keys} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <kbd style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace',
              }}>{keys}</kbd>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
