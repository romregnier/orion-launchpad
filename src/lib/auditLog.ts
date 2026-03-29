import { supabase } from './supabase'

export type AuditEventType =
  | 'agent_spawn'
  | 'agent_hired'
  | 'agent_message'
  | 'task_start'
  | 'task_done'
  | 'task_fail'
  | 'deploy'
  | 'budget_alert'
  | 'settings_change'
  | 'member_invite'
  | 'member_remove'

export async function logAuditEvent(params: {
  agent_key?: string
  capsule_id?: string
  event_type: AuditEventType
  event_data?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'error' | 'critical'
}) {
  // Fire and forget — ne pas bloquer l'UI sur l'audit
  supabase.from('agent_audit_log').insert({
    agent_key: params.agent_key ?? null,
    capsule_id: params.capsule_id ?? null,
    event_type: params.event_type,
    event_data: params.event_data ?? {},
    severity: params.severity ?? 'info',
  }).then(() => {
    // intentionally fire-and-forget
  })
}
