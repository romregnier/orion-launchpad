/**
 * BlueprintVerifier — TK-0241 [ARCH-010]
 * Blueprint verification UI: upload JSON, verify checks, export/import.
 */
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBlueprintVerification } from '../hooks/useBlueprintVerification'
import type { Blueprint, VerificationResult, CheckSeverity } from '../types/blueprint'

const SEVERITY_ICONS: Record<CheckSeverity, string> = {
  critical: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}

const SEVERITY_COLORS: Record<CheckSeverity, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#60A5FA',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '14px 16px',
}

const btnStyle: React.CSSProperties = {
  padding: '9px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "'Poppins', sans-serif",
  transition: 'all 0.15s',
}

const DEFAULT_BLUEPRINT: Blueprint = {
  id: 'blueprint-demo',
  name: 'Demo Agent Blueprint',
  version: '1.0.0',
  author: 'Orion',
  skills: ['code', 'review', 'deploy'],
  config: {
    system_prompt: 'Tu es un agent senior. Aide les utilisateurs à coder.',
    model: 'claude-sonnet-4-6',
    adapter: 'openclaw_gateway',
  },
  verified: false,
  created_at: new Date().toISOString(),
}

export function BlueprintVerifier() {
  const { verifyBlueprint, exportBlueprint, importBlueprint } = useBlueprintVerification()

  const [rawJson, setRawJson] = useState(JSON.stringify(DEFAULT_BLUEPRINT, null, 2))
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [currentBlueprint, setCurrentBlueprint] = useState<Blueprint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportedJson, setExportedJson] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleVerify = () => {
    setError(null)
    setExportedJson(null)
    try {
      const bp = JSON.parse(rawJson) as Blueprint
      setCurrentBlueprint(bp)
      const r = verifyBlueprint(bp)
      setResult(r)
    } catch (e) {
      setError(`JSON invalide: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleExport = async () => {
    if (!currentBlueprint) return
    setExporting(true)
    try {
      const json = await exportBlueprint(currentBlueprint)
      setExportedJson(json)
      // Also re-verify the exported blueprint
      const exported = JSON.parse(json) as Blueprint
      setResult(verifyBlueprint(exported))
      setCurrentBlueprint(exported)
      setRawJson(json)
    } catch (e) {
      setError(`Export échoué: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = () => {
    setError(null)
    try {
      const bp = importBlueprint(rawJson)
      setCurrentBlueprint(bp)
      const r = verifyBlueprint(bp)
      setResult(r)
    } catch (e) {
      setError(`Import échoué: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setRawJson(text)
      setResult(null)
      setError(null)
      setExportedJson(null)
    }
    reader.readAsText(file)
  }

  const badge = result
    ? result.score >= 80
      ? { label: 'VERIFIED', bg: 'rgba(16,185,129,0.15)', color: '#10B981', border: 'rgba(16,185,129,0.4)' }
      : result.score >= 50
      ? { label: 'WARNING', bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: 'rgba(245,158,11,0.4)' }
      : { label: 'FAILED', bg: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'rgba(239,68,68,0.4)' }
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input section */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: "'Poppins', sans-serif" }}>
            📋 Blueprint JSON
          </span>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              ...btnStyle,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              padding: '5px 10px',
            }}
          >
            📁 Charger fichier
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
        <textarea
          value={rawJson}
          onChange={e => { setRawJson(e.target.value); setResult(null) }}
          rows={10}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: '#A5F3FC',
            fontSize: 11,
            fontFamily: 'monospace',
            padding: '10px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 11, color: '#FCA5A5' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleVerify}
          style={{ ...btnStyle, flex: 2, background: 'var(--accent, #E11F7B)', color: '#fff' }}
        >
          🔍 Vérifier
        </button>
        <button
          onClick={handleImport}
          style={{ ...btnStyle, flex: 1, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818CF8' }}
        >
          📥 Importer
        </button>
        {currentBlueprint && (
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ ...btnStyle, flex: 1, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10B981', opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? '⏳' : '📤'} Exporter
          </button>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {/* Score header */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Score circle */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: `conic-gradient(${badge?.color ?? '#fff'} ${result.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#0F0D12',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: badge?.color,
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  {result.score}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Poppins', sans-serif", marginBottom: 4 }}>
                  Score de vérification
                </div>
                {badge && (
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Poppins', sans-serif",
                    letterSpacing: '0.05em',
                  }}>
                    {badge.label}
                  </span>
                )}
              </div>
            </div>

            {/* Checks */}
            <div style={{ ...cardStyle }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif", marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Checks de sécurité
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.checks.map(check => (
                  <div
                    key={check.name}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 7,
                      background: check.passed ? 'rgba(16,185,129,0.05)' : `${SEVERITY_COLORS[check.severity]}15`,
                      border: `1px solid ${check.passed ? 'rgba(16,185,129,0.15)' : `${SEVERITY_COLORS[check.severity]}30`}`,
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {check.passed ? '✅' : SEVERITY_ICONS[check.severity]}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: check.passed ? '#10B981' : SEVERITY_COLORS[check.severity], fontFamily: "'Poppins', sans-serif", marginBottom: 2 }}>
                        {check.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                        {check.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exported JSON preview */}
            {exportedJson && (
              <div style={cardStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>
                  ✅ Blueprint exporté (secrets scrubés + signé)
                </div>
                <pre style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'monospace',
                  maxHeight: 120,
                  overflowY: 'auto',
                  margin: 0,
                  padding: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 6,
                }}>
                  {exportedJson.slice(0, 500)}{exportedJson.length > 500 ? '\n...' : ''}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
