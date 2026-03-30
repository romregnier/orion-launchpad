/**
 * PresenceBar
 *
 * Rôle : Barre de présence en temps réel — affiche les avatars des utilisateurs connectés via Supabase Realtime.
 * Utilisé dans : App.tsx
 * Props : currentUser
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceUser {
  username: string
  role: string
}

interface PresenceState {
  [key: string]: PresenceUser[]
}

function hashUsername(username: string): number {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash)
}

const AVATAR_COLORS = [
  'var(--accent)', '#8B5CF6', '#F59E0B', '#10B981',
  '#3B82F6', '#EF4444', '#06B6D4', '#EC4899',
]

const MAX_VISIBLE = 3

function getAvatarColor(username: string): string {
  return AVATAR_COLORS[hashUsername(username) % AVATAR_COLORS.length]
}

interface PresenceBarProps {
  currentUser: { username: string; role: string } | null
}

export function PresenceBar({ currentUser }: PresenceBarProps) {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([])
  const [tooltipUser, setTooltipUser] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return
    let channel: RealtimeChannel | null = null

    const userKey = currentUser?.username ?? `anon-${Math.random().toString(36).slice(2, 8)}`
    const userInfo: PresenceUser = {
      username: currentUser?.username ?? 'Visiteur',
      role: currentUser?.role ?? 'member',
    }

    channel = supabase.channel('launchpad-presence', {
      config: { presence: { key: userKey } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!channel) return
        const state = channel.presenceState() as PresenceState
        const users: PresenceUser[] = []
        const seen = new Set<string>()
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            // Filtrer les entrées anonymes/placeholder sans username valide
            if (!p.username || p.username === 'Visiteur' || p.username.startsWith('anon-')) continue
            if (!seen.has(p.username)) {
              seen.add(p.username)
              users.push(p)
            }
          }
        }
        setPresentUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && channel) {
          await channel.track(userInfo)
        }
      })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [currentUser])

  if (presentUsers.length === 0) return null

  const visibleUsers = presentUsers.slice(0, MAX_VISIBLE)
  const overflowCount = Math.max(0, presentUsers.length - MAX_VISIBLE)

  return (
    <div
      className="presence-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {visibleUsers.map((user, i) => {
        const color = getAvatarColor(user.username)
        const initials = user.username.slice(0, 2).toUpperCase()
        const isTooltipOpen = tooltipUser === user.username
        return (
          <div
            key={user.username}
            style={{ position: 'relative' }}
            onMouseEnter={() => setTooltipUser(user.username)}
            onMouseLeave={() => setTooltipUser(null)}
          >
            {/* Tooltip */}
            {isTooltipOpen && (
              <div style={{
                position: 'absolute',
                bottom: '110%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(26,23,28,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                backdropFilter: 'blur(8px)',
                zIndex: 60,
              }}>
                {user.username}
                {user.role === 'admin' && <span style={{ color, marginLeft: 4 }}>★</span>}
              </div>
            )}
            {/* Avatar circle */}
            <div
              className="presence-bar__avatar"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `${color}33`,
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: color,
                cursor: 'default',
                marginLeft: i > 0 ? -8 : 0,
                boxShadow: `0 0 0 2px var(--bg-base)`,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15) translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              {initials}
            </div>
          </div>
        )
      })}

      {/* Badge +N pour les utilisateurs en overflow */}
      {overflowCount > 0 && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--border-default)',
            border: '2px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: "'Poppins', sans-serif",
            marginLeft: -8,
            boxShadow: '0 0 0 2px var(--bg-base)',
            cursor: 'default',
            flexShrink: 0,
          }}
          title={`${overflowCount} autre${overflowCount > 1 ? 's' : ''} connecté${overflowCount > 1 ? 's' : ''}`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  )
}
