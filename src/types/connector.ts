// TK-0236: [ARCH-009] BaseConnector SDK
// Interface TypeScript standardisée pour tous les connecteurs du Launchpad
// Inspiré du connector SDK de Dust.tt

export interface BaseConnector {
  id: string
  name: string
  type: ConnectorType
  description: string
  version: string
  knowledgeSpaceId?: string  // Tool scoping par Knowledge Space
  config: ConnectorConfig
  capabilities: ConnectorCapability[]
  // Méthodes du lifecycle
  initialize(): Promise<void>
  execute(tool: string, params: Record<string, unknown>): Promise<ConnectorResult>
  validate(): Promise<ValidationResult>
  disconnect(): Promise<void>
}

export type ConnectorType = 'api' | 'database' | 'file' | 'webhook' | 'agent' | 'service'

export interface ConnectorConfig {
  baseUrl?: string
  auth?: AuthConfig
  rateLimit?: RateLimitConfig
  timeout?: number
  retries?: number
}

export interface AuthConfig {
  type: 'bearer' | 'api_key' | 'oauth2' | 'basic'
  credentials: Record<string, string>  // chiffré en prod
}

export interface RateLimitConfig {
  requestsPerMinute: number
  burstLimit?: number
}

export interface ConnectorCapability {
  tool: string          // ex: "search", "read", "write", "execute"
  description: string
  params: ToolParam[]
  outputSchema: Record<string, unknown>
}

export interface ToolParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  default?: unknown
}

export interface ConnectorResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: {
    latencyMs: number
    tokens?: number
    cost?: number
  }
}

export interface ValidationResult {
  valid: boolean
  issues: string[]
}
