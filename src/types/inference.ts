/**
 * Inference Proxy types — TK-0242 [ARCH-013]
 * PII redaction + logging + rate limiting
 */

export interface InferenceMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface InferenceRequest {
  model: string
  messages: InferenceMessage[]
  metadata?: Record<string, unknown>
}

export interface InferenceResponse {
  content: string
  model: string
  tokens_used: number
  redacted_count: number
  latency_ms: number
}

export type PIIType = 'email' | 'phone' | 'ssn' | 'credit_card' | 'ip' | 'name'

export interface PIIEntity {
  type: PIIType
  value: string
  start: number
  end: number
}

export type InferenceLogStatus = 'success' | 'error' | 'rate_limited'

export interface InferenceLog {
  id: string
  timestamp: string
  model: string
  input_tokens: number
  output_tokens: number
  redacted_pii_count: number
  duration_ms: number
  status: InferenceLogStatus
}

export interface RateLimitStatus {
  remaining: number
  resetAt: Date
}
