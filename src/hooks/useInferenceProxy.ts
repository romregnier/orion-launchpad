/**
 * useInferenceProxy — TK-0242 [ARCH-013]
 * Inference proxy with PII detection/redaction, logging, rate limiting.
 */
import { useState, useCallback, useRef } from 'react'
import type {
  InferenceRequest,
  InferenceResponse,
  PIIEntity,
  PIIType,
  InferenceLog,
  RateLimitStatus,
} from '../types/inference'

// ─── PII Patterns ─────────────────────────────────────────────────────────────
const PII_PATTERNS: { type: PIIType; pattern: RegExp }[] = [
  {
    type: 'email',
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: 'phone',
    pattern: /(?:\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g,
  },
  {
    type: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    type: 'credit_card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  },
  {
    type: 'ip',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  },
  {
    type: 'name',
    pattern: /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g,
  },
]

const REDACT_LABELS: Record<PIIType, string> = {
  email: '[REDACTED_EMAIL]',
  phone: '[REDACTED_PHONE]',
  ssn: '[REDACTED_SSN]',
  credit_card: '[REDACTED_CREDIT_CARD]',
  ip: '[REDACTED_IP]',
  name: '[REDACTED_NAME]',
}

// ─── Mock LLM responses ───────────────────────────────────────────────────────
const MOCK_RESPONSES = [
  "Voici ma réponse basée sur les informations fournies. Toutes les données sensibles ont été protégées.",
  "J'ai analysé votre requête. Note: certaines informations personnelles ont été masquées pour la sécurité.",
  "Réponse générée avec succès. Le proxy d'inférence a sécurisé les données PII avant traitement.",
  "Analyse complète. Les informations personnellement identifiables ont été redactées conformément aux règles de confidentialité.",
]

// ─── Rate limit config ────────────────────────────────────────────────────────
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useInferenceProxy() {
  const [logs, setLogs] = useState<InferenceLog[]>([])
  const requestCount = useRef(0)
  const windowStart = useRef(Date.now())

  const detectPII = useCallback((text: string): PIIEntity[] => {
    const entities: PIIEntity[] = []
    for (const { type, pattern } of PII_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
        })
      }
    }
    // Sort by start position
    return entities.sort((a, b) => a.start - b.start)
  }, [])

  const redactPII = useCallback((text: string): { redacted: string; count: number } => {
    const entities = detectPII(text)
    if (entities.length === 0) return { redacted: text, count: 0 }

    // Process from end to start to preserve indices
    let result = text
    const processedRanges: { start: number; end: number }[] = []

    // Sort by start desc to process from end
    const sorted = [...entities].sort((a, b) => b.start - a.start)
    for (const entity of sorted) {
      // Skip if range overlaps with already processed range
      const overlaps = processedRanges.some(
        r => entity.start < r.end && entity.end > r.start
      )
      if (!overlaps) {
        result =
          result.slice(0, entity.start) +
          REDACT_LABELS[entity.type] +
          result.slice(entity.end)
        processedRanges.push({ start: entity.start, end: entity.end })
      }
    }

    return { redacted: result, count: entities.length }
  }, [detectPII])

  const getRateLimitStatus = useCallback((): RateLimitStatus => {
    const now = Date.now()
    if (now - windowStart.current > RATE_LIMIT_WINDOW_MS) {
      requestCount.current = 0
      windowStart.current = now
    }
    return {
      remaining: Math.max(0, RATE_LIMIT_MAX - requestCount.current),
      resetAt: new Date(windowStart.current + RATE_LIMIT_WINDOW_MS),
    }
  }, [])

  const sendRequest = useCallback(async (request: InferenceRequest): Promise<InferenceResponse> => {
    const start = Date.now()

    // Check rate limit
    const status = getRateLimitStatus()
    if (status.remaining === 0) {
      const log: InferenceLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        model: request.model,
        input_tokens: 0,
        output_tokens: 0,
        redacted_pii_count: 0,
        duration_ms: 0,
        status: 'rate_limited',
      }
      setLogs(prev => [log, ...prev.slice(0, 49)])
      throw new Error('Rate limit exceeded. Réessayez dans quelques secondes.')
    }

    requestCount.current++

    // Redact PII from all messages
    let totalRedacted = 0
    const redactedMessages = request.messages.map(msg => {
      const { redacted, count } = redactPII(msg.content)
      totalRedacted += count
      return { ...msg, content: redacted }
    })

    // Simulate LLM call
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600))

    const mockResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
    const inputTokens = redactedMessages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0)
    const outputTokens = Math.ceil(mockResponse.length / 4)
    const latency = Date.now() - start

    const log: InferenceLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      model: request.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      redacted_pii_count: totalRedacted,
      duration_ms: latency,
      status: 'success',
    }

    setLogs(prev => [log, ...prev.slice(0, 49)])

    return {
      content: mockResponse,
      model: request.model,
      tokens_used: inputTokens + outputTokens,
      redacted_count: totalRedacted,
      latency_ms: latency,
    }
  }, [redactPII, getRateLimitStatus])

  const getLogs = useCallback((limit = 20): InferenceLog[] => {
    return logs.slice(0, limit)
  }, [logs])

  return {
    detectPII,
    redactPII,
    sendRequest,
    getLogs,
    getRateLimitStatus,
    logs,
  }
}
