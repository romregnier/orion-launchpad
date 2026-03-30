/**
 * useAdapterRunner — TK-0171
 * Runner multi-runtime pour les adapters d'agents.
 * Supporte: openclaw_gateway, http_webhook, bash_local, claude_code, n8n_workflow, custom.
 */
import type { AdapterType, AdapterConfig, AdapterRunResult } from '../types/adapter'

const DEFAULT_TIMEOUT_MS = 30_000

export function useAdapterRunner() {
  /**
   * runAdapter — Exécute un adapter avec le payload donné.
   */
  async function runAdapter(
    _agentKey: string,
    config: AdapterConfig,
    payload: unknown,
  ): Promise<AdapterRunResult> {
    const start = Date.now()

    const withDuration = (result: Omit<AdapterRunResult, 'durationMs'>): AdapterRunResult => ({
      ...result,
      durationMs: Date.now() - start,
    })

    const timeoutPromise = new Promise<AdapterRunResult>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout after 30s')), DEFAULT_TIMEOUT_MS),
    )

    try {
      const runPromise = (async (): Promise<AdapterRunResult> => {
        switch (config.type) {
          case 'openclaw_gateway': {
            if (!config.gatewayUrl) {
              return withDuration({ success: false, error: 'gatewayUrl requis' })
            }
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (config.gatewayToken) headers['Authorization'] = `Bearer ${config.gatewayToken}`
            const res = await fetch(config.gatewayUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            })
            const text = await res.text()
            return withDuration({
              success: res.ok,
              output: text,
              error: res.ok ? undefined : `HTTP ${res.status}: ${text}`,
            })
          }

          case 'http_webhook': {
            if (!config.webhookUrl) {
              return withDuration({ success: false, error: 'webhookUrl requis' })
            }
            const method = config.webhookMethod ?? 'POST'
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              ...(config.webhookHeaders ?? {}),
            }
            const res = await fetch(config.webhookUrl, {
              method,
              headers,
              body: method !== 'GET' ? JSON.stringify(payload) : undefined,
            })
            const text = await res.text()
            return withDuration({
              success: res.ok,
              output: text,
              error: res.ok ? undefined : `HTTP ${res.status}: ${text}`,
            })
          }

          case 'bash_local': {
            // Simulated — VPS access not available from browser
            return withDuration({
              success: true,
              output: `[SIMULATED] bash_local: script=${config.scriptPath ?? '(none)'} args=${(config.scriptArgs ?? []).join(' ')} payload=${JSON.stringify(payload)}. Note: Exécution réelle nécessite accès VPS.`,
            })
          }

          case 'claude_code': {
            // ACP call — simulated
            return withDuration({
              success: true,
              output: `[SIMULATED] claude_code ACP call: sessionKey=${config.acpSessionKey ?? '(none)'} agentId=${config.acpAgentId ?? '(none)'} payload=${JSON.stringify(payload)}. Note: Intégration ACP directe en cours de développement.`,
            })
          }

          case 'n8n_workflow': {
            if (!config.n8nUrl || !config.n8nWebhookPath) {
              return withDuration({ success: false, error: 'n8nUrl et n8nWebhookPath requis' })
            }
            const url = `${config.n8nUrl.replace(/\/$/, '')}${config.n8nWebhookPath}`
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const text = await res.text()
            return withDuration({
              success: res.ok,
              output: text,
              error: res.ok ? undefined : `HTTP ${res.status}: ${text}`,
            })
          }

          case 'custom': {
            return withDuration({
              success: true,
              output: `[CUSTOM] Adapter personnalisé — payload: ${JSON.stringify(payload)}`,
            })
          }

          default: {
            return withDuration({ success: false, error: 'Type d\'adapter inconnu' })
          }
        }
      })()

      return await Promise.race([runPromise, timeoutPromise])
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      }
    }
  }

  function getAdapterIcon(type: AdapterType): string {
    const icons: Record<AdapterType, string> = {
      openclaw_gateway: '🌟',
      http_webhook: '🔗',
      bash_local: '💻',
      claude_code: '🤖',
      n8n_workflow: '⚡',
      custom: '🔧',
    }
    return icons[type] ?? '🔧'
  }

  function getAdapterLabel(type: AdapterType): string {
    const labels: Record<AdapterType, string> = {
      openclaw_gateway: 'OpenClaw Gateway',
      http_webhook: 'HTTP Webhook',
      bash_local: 'Script Bash Local',
      claude_code: 'Claude Code (ACP)',
      n8n_workflow: 'Workflow n8n',
      custom: 'Personnalisé',
    }
    return labels[type] ?? type
  }

  return { runAdapter, getAdapterIcon, getAdapterLabel }
}
