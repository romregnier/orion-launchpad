// TK-0236: [ARCH-009] BaseConnector SDK — Connector Registry
// Registre singleton des connecteurs

import type { BaseConnector } from '../types/connector'

class ConnectorRegistry {
  private connectors: Map<string, BaseConnector> = new Map()

  /**
   * Enregistre un connecteur dans le registre
   */
  register(connector: BaseConnector): void {
    if (this.connectors.has(connector.id)) {
      console.warn(`[ConnectorRegistry] Connector '${connector.id}' already registered. Overwriting.`)
    }
    this.connectors.set(connector.id, connector)
  }

  /**
   * Récupère un connecteur par son ID
   */
  get(id: string): BaseConnector | undefined {
    return this.connectors.get(id)
  }

  /**
   * Liste tous les connecteurs enregistrés
   */
  list(): BaseConnector[] {
    return Array.from(this.connectors.values())
  }

  /**
   * Liste les connecteurs scoped à un Knowledge Space
   */
  listByKnowledgeSpace(spaceId: string): BaseConnector[] {
    return Array.from(this.connectors.values()).filter(
      c => c.knowledgeSpaceId === spaceId
    )
  }

  /**
   * Supprime un connecteur du registre
   */
  unregister(id: string): void {
    const connector = this.connectors.get(id)
    if (connector) {
      // Graceful disconnect
      connector.disconnect().catch(err => {
        console.warn(`[ConnectorRegistry] Error disconnecting '${id}':`, err)
      })
      this.connectors.delete(id)
    } else {
      console.warn(`[ConnectorRegistry] Connector '${id}' not found.`)
    }
  }

  /**
   * Vérifie si un connecteur est enregistré
   */
  has(id: string): boolean {
    return this.connectors.has(id)
  }

  /**
   * Retourne le nombre de connecteurs enregistrés
   */
  get size(): number {
    return this.connectors.size
  }

  /**
   * Supprime tous les connecteurs (cleanup)
   */
  clear(): void {
    for (const [id] of this.connectors) {
      this.unregister(id)
    }
  }
}

export const connectorRegistry = new ConnectorRegistry()
