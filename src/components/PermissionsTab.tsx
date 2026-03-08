import { useEffect, useState, useCallback } from 'react'
import { useLaunchpadStore } from '../store'
import { PermissionToggle } from './PermissionToggle'
import { supabase } from '../lib/supabase'

interface Permission {
  can_create_project: boolean
  can_delete_project: boolean
  can_invite: boolean
  can_spawn_agents: boolean
  can_deploy: boolean
  can_admin: boolean
}

interface PermRow extends Permission {
  entity_id: string
  entity_type: 'human' | 'ai'
}

const PERM_COLS: Array<{ key: keyof Permission; label: string; icon: string }> = [
  { key: 'can_create_project', label: 'Créer projet', icon: '➕' },
  { key: 'can_delete_project', label: 'Suppr. projet', icon: '🗑️' },
  { key: 'can_invite', label: 'Inviter', icon: '📨' },
  { key: 'can_spawn_agents', label: 'Spawner agents', icon: '🤖' },
  { key: 'can_deploy', label: 'Déployer', icon: '🚀' },
  { key: 'can_admin', label: 'Admin panel', icon: '🛡️' },
]

const AGENT_COLORS: Record<string, string> = {
  orion: '#E11F7B',
  nova: '#7C3AED',
  aria: '#0EA5E9',
  forge: '#F59E0B',
  rex: '#22C55E',
}

function getAgentColor(key: string): string {
  return AGENT_COLORS[key.toLowerCase()] ?? '#6B7280'
}

async function ensurePermissionsTable() {
  // Attempt to create the table via RPC if it doesn't exist
  // (Supabase anon key won't have DDL rights — we just try upsert and handle errors)
}

export function PermissionsTab() {
  const { canvasAgents, boardMembers, currentUser } = useLaunchpadStore()
  const [permissions, setPermissions] = useState<Record<string, Permission>>({})
  const [loading, setLoading] = useState(true)

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('member_permissions').select('*')
      if (data) {
        const map: Record<string, Permission> = {}
        for (const row of data as PermRow[]) {
          map[row.entity_id] = {
            can_create_project: row.can_create_project,
            can_delete_project: row.can_delete_project,
            can_invite: row.can_invite,
            can_spawn_agents: row.can_spawn_agents,
            can_deploy: row.can_deploy,
            can_admin: row.can_admin,
          }
        }
        setPermissions(map)
      }
    } catch {
      // Table may not exist yet
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void ensurePermissionsTable()
    fetchPermissions()
  }, [fetchPermissions])

  const patchPermission = async (
    entityId: string,
    entityType: 'human' | 'ai',
    key: keyof Permission,
    value: boolean
  ) => {
    const prev = permissions[entityId] ?? {
      can_create_project: false,
      can_delete_project: false,
      can_invite: false,
      can_spawn_agents: false,
      can_deploy: false,
      can_admin: false,
    }
    const updated = { ...prev, [key]: value }
    setPermissions(p => ({ ...p, [entityId]: updated }))

    try {
      await supabase.from('member_permissions').upsert({
        entity_id: entityId,
        entity_type: entityType,
        ...updated,
        updated_by: currentUser?.username ?? 'admin',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'entity_id,entity_type' })
    } catch {
      // Revert on error
      setPermissions(p => ({ ...p, [entityId]: prev }))
    }
  }

  // Build entity list: admin first (locked), ai agents, human members
  const adminMember = boardMembers.find(m => m.role === 'admin')
  const aiAgents = canvasAgents.filter(a => a.entity_type === 'ai' || !a.entity_type)
  const otherMembers = boardMembers.filter(m => m.role !== 'admin')

  const entityRows = [
    ...(adminMember ? [{ id: adminMember.email, label: adminMember.email, type: 'human' as const, isAdmin: true }] : []),
    ...aiAgents.map(a => ({ id: a.agent_key ?? a.id, label: a.name, type: 'ai' as const, isAdmin: false, agentKey: a.agent_key })),
    ...otherMembers.map(m => ({ id: m.email, label: m.email, type: 'human' as const, isAdmin: false })),
  ]

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
        fontFamily: "'Poppins', sans-serif",
      }}>
        Chargement des permissions...
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', minWidth: 0 }}>
      {/* SQL note if table not accessible */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 8,
        background: 'rgba(14,165,233,0.08)',
        border: '1px solid rgba(14,165,233,0.20)',
        marginBottom: 16,
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
        fontFamily: "'Poppins', sans-serif",
      }}>
        💡 Table <code style={{ color: '#0EA5E9' }}>member_permissions</code> requise en Supabase.
        {' '}SQL disponible dans <code>NOVA_SPEC_ADMIN_PANEL.md</code> section 7.
      </div>

      <div style={{
        overflowX: 'auto',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <table style={{
          width: '100%',
          minWidth: 820,
          borderCollapse: 'collapse' as const,
        }}>
          {/* Header */}
          <thead>
            <tr style={{
              background: 'rgba(255,255,255,0.03)',
            }}>
              <th style={{
                width: 220,
                minWidth: 220,
                padding: '0 18px',
                height: 40,
                textAlign: 'left' as const,
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                fontFamily: "'Poppins', sans-serif",
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}>
                Membre
              </th>
              {PERM_COLS.map(col => (
                <th key={col.key} style={{
                  width: 120,
                  minWidth: 100,
                  padding: '0 8px',
                  height: 40,
                  textAlign: 'center' as const,
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                  fontFamily: "'Poppins', sans-serif",
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  whiteSpace: 'nowrap' as const,
                }}>
                  <div>{col.icon}</div>
                  <div style={{ fontSize: 9 }}>{col.label}</div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {entityRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 13,
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  Aucun membre à afficher
                </td>
              </tr>
            )}
            {entityRows.map(entity => {
              const perm = entity.isAdmin
                ? { can_create_project: true, can_delete_project: true, can_invite: true, can_spawn_agents: true, can_deploy: true, can_admin: true }
                : permissions[entity.id] ?? {
                    can_create_project: false,
                    can_delete_project: false,
                    can_invite: false,
                    can_spawn_agents: false,
                    can_deploy: false,
                    can_admin: false,
                  }

              const isAI = entity.type === 'ai'
              const agentColor = isAI ? getAgentColor(entity.agentKey ?? '') : '#F59E0B'

              return (
                <tr
                  key={entity.id}
                  style={{
                    height: 52,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: entity.isAdmin ? 'rgba(225,31,123,0.04)' : 'transparent',
                    borderLeft: entity.isAdmin ? '2px solid rgba(225,31,123,0.25)' : 'none',
                    cursor: 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!entity.isAdmin) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = entity.isAdmin ? 'rgba(225,31,123,0.04)' : 'transparent'
                  }}
                >
                  {/* Entity cell */}
                  <td style={{ padding: '0 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Mini avatar */}
                      <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: isAI ? `${agentColor}33` : 'rgba(245,158,11,0.20)',
                        border: `1.5px solid ${agentColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        flexShrink: 0,
                        fontFamily: "'Poppins', sans-serif",
                      }}>
                        {isAI ? (entity.label.substring(0, 1).toUpperCase()) : '👤'}
                      </div>
                      {/* Name */}
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                        maxWidth: 140,
                        fontFamily: "'Poppins', sans-serif",
                      }}>
                        {entity.label}
                      </span>
                      {/* Admin badge */}
                      {entity.isAdmin && (
                        <span style={{
                          fontSize: 8,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.30)',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.05em',
                          fontFamily: "'Poppins', sans-serif",
                          opacity: 0.5,
                        }}>
                          ADMIN
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Permission toggles */}
                  {PERM_COLS.map(col => (
                    <td key={col.key} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PermissionToggle
                          isOn={perm[col.key]}
                          isDisabled={entity.isAdmin}
                          onChange={v => patchPermission(entity.id, entity.type, col.key, v)}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
