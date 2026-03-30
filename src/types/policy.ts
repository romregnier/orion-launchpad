/**
 * policy.ts — TK-0234: Policy Engine Gravity types
 */

export interface CapsulePolicy {
  id: string
  capsule_id: string
  version: number
  policy_yaml: string
  is_active: boolean
  created_by?: string
  created_at: string
}

export interface ParsedPolicy {
  budget_hard_stop?: number   // $ max par agent par mois
  budget_alert?: number       // $ threshold pour alerte
  network_egress?: string[]   // domains autorisés (whitelist)
  tool_whitelist?: string[]   // outils autorisés
  rollback_on_error?: boolean
}

export const DEFAULT_POLICY_YAML = `# Capsule Policy — version 1
budget_hard_stop: 100    # $ max/agent/mois
budget_alert: 80         # $ threshold alerte
network_egress:
  - api.openai.com
  - api.anthropic.com
  - supabase.co
tool_whitelist:
  - web_search
  - read_file
  - write_file
rollback_on_error: true
`
