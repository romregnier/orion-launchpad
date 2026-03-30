/**
 * Knowledge Types — TK-0188
 * Types pour Knowledge Sources (extensions de Knowledge Spaces).
 */

export type KnowledgeSourceType = 'notion' | 'google_drive' | 'ga4' | 'url' | 'file' | 'api' | 'database'
export type KnowledgeSourceStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'paused'

export interface KnowledgeSource {
  id: string
  space_id: string
  name: string
  source_type: KnowledgeSourceType
  config: Record<string, unknown>
  status: KnowledgeSourceStatus
  last_sync_at?: string
  entry_count: number
  error_message?: string
  capsule_id: string
  created_at: string
}
