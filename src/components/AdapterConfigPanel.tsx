/**
 * AdapterConfigPanel — TK-0171
 * Panel de configuration d'un adaptateur agent.
 * Sélecteur de type + champs dynamiques + test.
 */
import { useState } from 'react'
import { useAdapterRunner } from '../hooks/useAdapterRunner'
import type { AdapterType, AdapterConfig, AdapterRunResult } from '../types/adapter'

const ADAPTER_TYPES: AdapterType[] = [
  'openclaw_gateway',
  'http_webhook',
  'bash_local',
  'claude_code',
  'n8n_workflow',
  'custom',
]

interface AdapterConfigPanelProps {
  initialConfig?: AdapterConfig
  agentKey?: string
  onSave?: (config: AdapterConfig) => Promise<void>
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 5,
  display: 'block',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function AdapterConfigPanel({
  initialConfig,
  agentKey = 'agent',
  onSave,
}: AdapterConfigPanelProps) {
  const { runAdapter, getAdapterIcon, getAdapterLabel } = useAdapterRunner()
  const [config, setConfig] = useState<AdapterConfig>(
    initialConfig ?? { type: 'openclaw_gateway' },
  )
  const [testResult, setTestResult] = useState<AdapterRunResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const update = (patch: Partial<AdapterConfig>) => setConfig(prev => ({ ...prev, ...patch }))

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await runAdapter(agentKey, config, { test: true })
    setTestResult(result)
    setTesting(false)
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    await onSave(config)
    setSaving(false)
  }

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Type selector */}
      <Field label="Type d'adapter">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ADAPTER_TYPES.map(type => (
            <button
              key={type}
              onClick={() => update({ type })}
              style={{
                padding: '6px 11px',
                borderRadius: 8,
                border: config.type === type
                  ? '1px solid var(--accent)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: config.type === type
                  ? 'rgba(var(--accent-rgb, 99,102,241), 0.15)'
                  : 'rgba(255,255,255,0.04)',
                color: config.type === type ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: config.type === type ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span>{getAdapterIcon(type)}</span>
              <span>{getAdapterLabel(type)}</span>
            </button>
          ))}
        </div>
      </Field>

      {/* Dynamic fields based on type */}
      {config.type === 'openclaw_gateway' && (
        <>
          <Field label="Gateway URL">
            <input
              style={inputStyle}
              placeholder="https://gateway.example.com/message"
              value={config.gatewayUrl ?? ''}
              onChange={e => update({ gatewayUrl: e.target.value })}
            />
          </Field>
          <Field label="Token d'authentification">
            <input
              style={inputStyle}
              type="password"
              placeholder="Bearer token…"
              value={config.gatewayToken ?? ''}
              onChange={e => update({ gatewayToken: e.target.value })}
            />
          </Field>
        </>
      )}

      {config.type === 'http_webhook' && (
        <>
          <Field label="URL du Webhook">
            <input
              style={inputStyle}
              placeholder="https://api.example.com/webhook"
              value={config.webhookUrl ?? ''}
              onChange={e => update({ webhookUrl: e.target.value })}
            />
          </Field>
          <Field label="Méthode HTTP">
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={config.webhookMethod ?? 'POST'}
              onChange={e => update({ webhookMethod: e.target.value as 'POST' | 'GET' | 'PUT' })}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
            </select>
          </Field>
        </>
      )}

      {config.type === 'bash_local' && (
        <>
          <Field label="Chemin du script">
            <input
              style={inputStyle}
              placeholder="/home/clawadmin/scripts/agent.sh"
              value={config.scriptPath ?? ''}
              onChange={e => update({ scriptPath: e.target.value })}
            />
          </Field>
          <Field label="Arguments (séparés par des espaces)">
            <input
              style={inputStyle}
              placeholder="--arg1 value --arg2"
              value={(config.scriptArgs ?? []).join(' ')}
              onChange={e => update({ scriptArgs: e.target.value.split(' ').filter(Boolean) })}
            />
          </Field>
          <Field label="Timeout (secondes)">
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={300}
              placeholder="30"
              value={config.timeout ?? ''}
              onChange={e => update({ timeout: parseInt(e.target.value) || undefined })}
            />
          </Field>
        </>
      )}

      {config.type === 'claude_code' && (
        <>
          <Field label="Session Key ACP">
            <input
              style={inputStyle}
              placeholder="agent:main:session:xxx"
              value={config.acpSessionKey ?? ''}
              onChange={e => update({ acpSessionKey: e.target.value })}
            />
          </Field>
          <Field label="Agent ID">
            <input
              style={inputStyle}
              placeholder="ID de l'agent cible"
              value={config.acpAgentId ?? ''}
              onChange={e => update({ acpAgentId: e.target.value })}
            />
          </Field>
        </>
      )}

      {config.type === 'n8n_workflow' && (
        <>
          <Field label="URL n8n">
            <input
              style={inputStyle}
              placeholder="http://localhost:5678"
              value={config.n8nUrl ?? ''}
              onChange={e => update({ n8nUrl: e.target.value })}
            />
          </Field>
          <Field label="Chemin webhook n8n">
            <input
              style={inputStyle}
              placeholder="/webhook/mon-workflow"
              value={config.n8nWebhookPath ?? ''}
              onChange={e => update({ n8nWebhookPath: e.target.value })}
            />
          </Field>
        </>
      )}

      {config.type === 'custom' && (
        <div style={{
          padding: '12px 14px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
        }}>
          Adapter personnalisé — configuration via code.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          onClick={handleTest}
          disabled={testing}
          style={{
            flex: 1,
            padding: '9px 16px',
            borderRadius: 9,
            background: 'rgba(96,165,250,0.15)',
            border: '1px solid rgba(96,165,250,0.3)',
            color: '#60a5fa',
            cursor: testing ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
            opacity: testing ? 0.6 : 1,
          }}
        >
          {testing ? '⟳ Test en cours…' : '🧪 Tester'}
        </button>
        {onSave && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '9px 16px',
              borderRadius: 9,
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '…' : '💾 Sauvegarder'}
          </button>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          marginTop: 14,
          padding: '12px 14px',
          borderRadius: 9,
          background: testResult.success
            ? 'rgba(52,211,153,0.08)'
            : 'rgba(248,113,113,0.08)',
          border: `1px solid ${testResult.success ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: testResult.success ? '#34d399' : '#f87171',
            marginBottom: 6,
          }}>
            {testResult.success ? '✅ Succès' : '❌ Échec'} — {testResult.durationMs}ms
          </div>
          {(testResult.output || testResult.error) && (
            <pre style={{
              fontSize: 11, color: 'rgba(255,255,255,0.6)',
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: 120, overflow: 'auto',
              fontFamily: 'monospace',
            }}>
              {testResult.output ?? testResult.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
