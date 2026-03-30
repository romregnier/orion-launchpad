/**
 * InferenceProxyPanel — TK-0242 [ARCH-013]
 * Inference proxy panel with PII detection, redaction, logs, rate limit counter.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInferenceProxy } from '../hooks/useInferenceProxy'
import type { PIIEntity } from '../types/inference'

const PII_COLORS: Record<string, string> = {
  email: '#F59E0B',
  phone: '#10B981',
  ssn: '#EF4444',
  credit_card: '#8B5CF6',
  ip: '#60A5FA',
  name: '#EC4899',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '14px 16px',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: "'Poppins', sans-serif",
  marginBottom: 6,
  display: 'block',
}

interface HighlightedTextProps {
  text: string
  entities: PIIEntity[]
}

function HighlightedText({ text, entities }: HighlightedTextProps) {
  if (entities.length === 0) {
    return <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{text}</span>
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const sorted = [...entities].sort((a, b) => a.start - b.start)

  for (const entity of sorted) {
    if (entity.start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          {text.slice(lastIndex, entity.start)}
        </span>
      )
    }
    const color = PII_COLORS[entity.type] ?? '#F59E0B'
    parts.push(
      <span
        key={`pii-${entity.start}`}
        title={`PII Type: ${entity.type}`}
        style={{
          fontSize: 12,
          background: `${color}25`,
          border: `1px solid ${color}60`,
          borderRadius: 3,
          padding: '0 3px',
          color: color,
          fontWeight: 600,
          fontFamily: 'monospace',
        }}
      >
        {entity.value}
        <sup style={{ fontSize: 8, marginLeft: 2, opacity: 0.7 }}>{entity.type}</sup>
      </span>
    )
    lastIndex = entity.end
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
        {text.slice(lastIndex)}
      </span>
    )
  }

  return <div style={{ lineHeight: 1.6 }}>{parts}</div>
}

export function InferenceProxyPanel() {
  const { detectPII, redactPII, sendRequest, getLogs, getRateLimitStatus } = useInferenceProxy()

  const [inputText, setInputText] = useState(
    'Mon email est john.doe@example.com et mon téléphone est 555-123-4567. Ma carte de crédit: 4111111111111111'
  )
  const [detectedPII, setDetectedPII] = useState<PIIEntity[]>([])
  const [redactedText, setRedactedText] = useState('')
  const [sending, setSending] = useState(false)
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6')
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  const logs = getLogs(10)
  const rateLimitStatus = getRateLimitStatus()

  const handleAnalyze = () => {
    const entities = detectPII(inputText)
    const { redacted } = redactPII(inputText)
    setDetectedPII(entities)
    setRedactedText(redacted)
    setHasAnalyzed(true)
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const resp = await sendRequest({
        model: selectedModel,
        messages: [{ role: 'user', content: inputText }],
      })
      setLastResponse(resp.content)
      // Re-analyze for updated state
      const entities = detectPII(inputText)
      const { redacted } = redactPII(inputText)
      setDetectedPII(entities)
      setRedactedText(redacted)
      setHasAnalyzed(true)
    } catch (e) {
      setLastResponse(`❌ Erreur: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSending(false)
    }
  }

  const ratePct = (rateLimitStatus.remaining / 20) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Rate limit bar */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif" }}>
              🚦 Rate Limit
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: rateLimitStatus.remaining > 5 ? '#10B981' : '#F59E0B', fontFamily: "'Poppins', sans-serif" }}>
              {rateLimitStatus.remaining}/20 restantes
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${ratePct}%`,
              background: rateLimitStatus.remaining > 5 ? '#10B981' : '#F59E0B',
              borderRadius: 999,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, fontFamily: 'monospace' }}>
            Reset: {rateLimitStatus.resetAt.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Input */}
      <div style={cardStyle}>
        <label style={labelStyle}>Texte à analyser</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {['claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-4o-mini'].map(m => (
            <button
              key={m}
              onClick={() => setSelectedModel(m)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: `1px solid ${selectedModel === m ? 'rgba(225,31,123,0.5)' : 'rgba(255,255,255,0.1)'}`,
                background: selectedModel === m ? 'rgba(225,31,123,0.1)' : 'transparent',
                color: selectedModel === m ? 'var(--accent, #E11F7B)' : 'rgba(255,255,255,0.4)',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <textarea
          value={inputText}
          onChange={e => { setInputText(e.target.value); setHasAnalyzed(false) }}
          rows={4}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 12,
            fontFamily: "'Poppins', sans-serif",
            padding: '10px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            lineHeight: 1.5,
          }}
          placeholder="Entrez un texte contenant des données sensibles..."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={handleAnalyze}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 7,
              border: '1px solid rgba(245,158,11,0.4)',
              background: 'rgba(245,158,11,0.1)',
              color: '#F59E0B',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            🔍 Détecter PII
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 7,
              border: 'none',
              background: sending ? 'rgba(225,31,123,0.5)' : 'var(--accent, #E11F7B)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {sending ? '⏳ Envoi...' : '📡 Envoyer via Proxy'}
          </button>
        </div>
      </div>

      {/* PII Detection Results */}
      <AnimatePresence>
        {hasAnalyzed && (
          <motion.div
            key="pii-results"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {/* Detected PII badges */}
            <div style={cardStyle}>
              <label style={labelStyle}>PII Détectées ({detectedPII.length})</label>
              {detectedPII.length === 0 ? (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '10px 0' }}>
                  ✅ Aucune PII détectée
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {detectedPII.map((entity, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: `${PII_COLORS[entity.type] ?? '#F59E0B'}20`,
                          border: `1px solid ${PII_COLORS[entity.type] ?? '#F59E0B'}50`,
                          color: PII_COLORS[entity.type] ?? '#F59E0B',
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        [{entity.type}] {entity.value.slice(0, 20)}{entity.value.length > 20 ? '...' : ''}
                      </span>
                    ))}
                  </div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Texte avec highlights</label>
                  <div style={{
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.06)',
                    lineHeight: 1.6,
                  }}>
                    <HighlightedText text={inputText} entities={detectedPII} />
                  </div>
                </>
              )}
            </div>

            {/* Redacted text */}
            {redactedText && detectedPII.length > 0 && (
              <div style={cardStyle}>
                <label style={labelStyle}>Texte Redacté (envoyé au LLM)</label>
                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.6,
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  {redactedText}
                </div>
              </div>
            )}

            {/* LLM Response */}
            {lastResponse && (
              <div style={{ ...cardStyle, borderColor: 'rgba(16,185,129,0.2)' }}>
                <label style={{ ...labelStyle, color: '#10B981' }}>Réponse LLM (simulée)</label>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  {lastResponse}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Logs */}
      <div style={cardStyle}>
        <label style={labelStyle}>Logs de requêtes ({logs.length})</label>
        {logs.length === 0 ? (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '12px 0' }}>
            Aucune requête encore
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 7,
                  background: log.status === 'success'
                    ? 'rgba(16,185,129,0.05)'
                    : log.status === 'rate_limited'
                    ? 'rgba(245,158,11,0.05)'
                    : 'rgba(239,68,68,0.05)',
                  border: `1px solid ${log.status === 'success' ? 'rgba(16,185,129,0.15)' : log.status === 'rate_limited' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}
              >
                <span style={{ fontSize: 12 }}>
                  {log.status === 'success' ? '✅' : log.status === 'rate_limited' ? '🚦' : '❌'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: "'Poppins', sans-serif" }}>
                      {log.model.slice(0, 20)}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                      {log.input_tokens + log.output_tokens} tok
                    </span>
                    {log.redacted_pii_count > 0 && (
                      <span style={{ fontSize: 10, color: '#F59E0B', fontFamily: "'Poppins', sans-serif" }}>
                        🛡️ {log.redacted_pii_count} PII
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                      {log.duration_ms}ms
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
