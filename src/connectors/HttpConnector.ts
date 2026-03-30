// TK-0236: [ARCH-009] BaseConnector SDK — HttpConnector
// Implémentation concrète d'un connecteur HTTP générique

import type {
  BaseConnector,
  ConnectorCapability,
  ConnectorConfig,
  ConnectorResult,
  ConnectorType,
  ValidationResult
} from '../types/connector'

export interface HttpConnectorOptions {
  id: string
  name: string
  description?: string
  version?: string
  knowledgeSpaceId?: string
  config: ConnectorConfig
}

export class HttpConnector implements BaseConnector {
  id: string
  name: string
  type: ConnectorType = 'api'
  description: string
  version: string
  knowledgeSpaceId?: string
  config: ConnectorConfig
  capabilities: ConnectorCapability[] = [
    {
      tool: 'get',
      description: 'HTTP GET request',
      params: [
        { name: 'path', type: 'string', required: false, description: 'URL path to append to baseUrl', default: '' },
        { name: 'query', type: 'object', required: false, description: 'Query parameters', default: {} },
        { name: 'headers', type: 'object', required: false, description: 'Additional headers', default: {} }
      ],
      outputSchema: { type: 'object', properties: { status: { type: 'number' }, data: {} } }
    },
    {
      tool: 'post',
      description: 'HTTP POST request',
      params: [
        { name: 'path', type: 'string', required: false, description: 'URL path', default: '' },
        { name: 'body', type: 'object', required: false, description: 'Request body', default: {} },
        { name: 'headers', type: 'object', required: false, description: 'Additional headers', default: {} }
      ],
      outputSchema: { type: 'object', properties: { status: { type: 'number' }, data: {} } }
    },
    {
      tool: 'put',
      description: 'HTTP PUT request',
      params: [
        { name: 'path', type: 'string', required: false, description: 'URL path', default: '' },
        { name: 'body', type: 'object', required: false, description: 'Request body', default: {} }
      ],
      outputSchema: { type: 'object', properties: { status: { type: 'number' }, data: {} } }
    },
    {
      tool: 'delete',
      description: 'HTTP DELETE request',
      params: [
        { name: 'path', type: 'string', required: false, description: 'URL path', default: '' }
      ],
      outputSchema: { type: 'object', properties: { status: { type: 'number' }, data: {} } }
    }
  ]

  constructor(options: HttpConnectorOptions) {
    this.id = options.id
    this.name = options.name
    this.description = options.description || `HTTP connector for ${options.name}`
    this.version = options.version || '1.0.0'
    this.knowledgeSpaceId = options.knowledgeSpaceId
    this.config = options.config
  }

  /**
   * Teste la connexion avec un GET vers baseUrl
   */
  async initialize(): Promise<void> {
    const validation = await this.validate()
    if (!validation.valid) {
      throw new Error(`HttpConnector validation failed: ${validation.issues.join(', ')}`)
    }

    try {
      const response = await fetch(this.config.baseUrl!, {
        method: 'GET',
        headers: this._buildHeaders(),
        signal: AbortSignal.timeout(this.config.timeout || 10000)
      })
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new Error('Connection timeout during initialize')
      }
      throw err
    }
  }

  /**
   * Dispatche selon le tool (get, post, put, delete)
   */
  async execute(tool: string, params: Record<string, unknown>): Promise<ConnectorResult> {
    const start = Date.now()
    const validation = await this.validate()
    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.issues.join(', ')}` }
    }

    const path = (params.path as string) || ''
    const url = `${this.config.baseUrl}${path}`
    const extraHeaders = (params.headers as Record<string, string>) || {}
    const timeout = this.config.timeout || 30000

    try {
      let response: Response
      switch (tool.toLowerCase()) {
        case 'get': {
          const query = params.query as Record<string, string> | undefined
          const queryString = query ? '?' + new URLSearchParams(query).toString() : ''
          response = await fetch(url + queryString, {
            method: 'GET',
            headers: { ...this._buildHeaders(), ...extraHeaders },
            signal: AbortSignal.timeout(timeout)
          })
          break
        }
        case 'post': {
          const body = params.body
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this._buildHeaders(), ...extraHeaders },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(timeout)
          })
          break
        }
        case 'put': {
          const body = params.body
          response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...this._buildHeaders(), ...extraHeaders },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(timeout)
          })
          break
        }
        case 'delete': {
          response = await fetch(url, {
            method: 'DELETE',
            headers: { ...this._buildHeaders(), ...extraHeaders },
            signal: AbortSignal.timeout(timeout)
          })
          break
        }
        default:
          return { success: false, error: `Unknown tool: ${tool}. Supported: get, post, put, delete` }
      }

      const latencyMs = Date.now() - start
      let data: unknown
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data,
          metadata: { latencyMs }
        }
      }

      return { success: true, data, metadata: { latencyMs } }
    } catch (err) {
      const latencyMs = Date.now() - start
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message, metadata: { latencyMs } }
    }
  }

  /**
   * Vérifie que baseUrl est valide + auth présente si configurée
   */
  async validate(): Promise<ValidationResult> {
    const issues: string[] = []

    if (!this.config.baseUrl) {
      issues.push('baseUrl is required')
    } else {
      try {
        new URL(this.config.baseUrl)
      } catch {
        issues.push(`baseUrl is not a valid URL: ${this.config.baseUrl}`)
      }
    }

    if (this.config.auth) {
      if (!this.config.auth.type) {
        issues.push('auth.type is required when auth is provided')
      }
      if (!this.config.auth.credentials || Object.keys(this.config.auth.credentials).length === 0) {
        issues.push('auth.credentials is required when auth is provided')
      }
    }

    return { valid: issues.length === 0, issues }
  }

  /**
   * No-op (stateless HTTP connector)
   */
  async disconnect(): Promise<void> {
    // Stateless — nothing to clean up
  }

  private _buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}

    if (!this.config.auth) return headers

    const { type, credentials } = this.config.auth
    switch (type) {
      case 'bearer':
        if (credentials.token) headers['Authorization'] = `Bearer ${credentials.token}`
        break
      case 'api_key':
        if (credentials.key && credentials.header) {
          headers[credentials.header] = credentials.key
        } else if (credentials.key) {
          headers['X-API-Key'] = credentials.key
        }
        break
      case 'basic':
        if (credentials.username && credentials.password) {
          headers['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
        }
        break
      case 'oauth2':
        if (credentials.access_token) {
          headers['Authorization'] = `Bearer ${credentials.access_token}`
        }
        break
    }

    return headers
  }
}
