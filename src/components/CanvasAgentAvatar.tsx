/**
 * CanvasAgentAvatar — backward compat re-export.
 * TK-0184: fichier scindé en AgentAvatar + AgentAvatarDraggable + AgentStatusBadge.
 * Cet import est conservé pour ne pas casser les imports existants.
 */
export { AgentAvatarDraggable as CanvasAgentAvatar } from './AgentAvatarDraggable'
export type { AgentAvatarProps } from './AgentAvatar'
