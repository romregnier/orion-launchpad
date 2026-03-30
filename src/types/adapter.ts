/**
 * Adapter Types — TK-0171
 * Support multi-runtime pour les agents.
 * Inspiré Paperclip adapterType.
 */

export type AdapterType =
  | 'openclaw_gateway'   // Agent OpenClaw standard
  | 'http_webhook'       // POST vers une URL externe
  | 'bash_local'         // Script bash sur le VPS
  | 'claude_code'        // Claude Code / ACP
  | 'n8n_workflow'       // Déclencher un workflow n8n
  | 'custom'

export interface AdapterConfig {
  type: AdapterType
  // openclaw_gateway
  gatewayUrl?: string
  gatewayToken?: string
  // http_webhook
  webhookUrl?: string
  webhookMethod?: 'POST' | 'GET' | 'PUT'
  webhookHeaders?: Record<string, string>
  // bash_local
  scriptPath?: string
  scriptArgs?: string[]
  timeout?: number
  // claude_code
  acpSessionKey?: string
  acpAgentId?: string
  // n8n_workflow
  n8nUrl?: string
  n8nWebhookPath?: string
}

export interface AdapterRunResult {
  success: boolean
  output?: string
  error?: string
  durationMs: number
}
