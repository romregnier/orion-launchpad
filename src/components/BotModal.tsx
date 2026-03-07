import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { ModalShell } from './ModalShell'
import { Select } from './Select'
import type { CanvasAgent, AvatarConfig, AgentMeta } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  editAgent?: CanvasAgent | null
}

type Tab = 'identity' | 'orchestration' | 'projects'

const PERMISSION_OPTIONS = [
  { key: 'deploy', label: '🚀 Peut déployer' },
  { key: 'write_code', label: '💻 Peut écrire du code' },
  { key: 'review', label: '🔍 Peut faire des reviews' },
  { key: 'spawn_agents', label: '🤖 Peut spawner des agents' },
]

export function BotModal({ open, onClose, editAgent }: Props) {
  const { addCanvasAgent, updateCanvasAgent, projects, setAgentWorkingOn } = useLaunchpadStore()

  // Core fields
  const [name, setName] = useState('')
  const [botToken, setBotToken] = useState('')
  const [tailorUrl, setTailorUrl] = useState('')
  const [tailorConfigCapture, setTailorConfigCapture] = useState<AvatarConfig | null>(null)
  const [showTailor, setShowTailor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [workingOn, setWorkingOn] = useState<string | null>(null)

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>('identity')

  // AgentMeta fields
  const [role, setRole] = useState('')
  const [personality, setPersonality] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [authorizedProjects, setAuthorizedProjects] = useState<string[]>([])
  const [model, setModel] = useState('')

  const tailorRef = useRef<HTMLIFrameElement>(null)
  const pendingConfigRef = useRef<AvatarConfig | null>(null)

  const isEdit = !!editAgent

  useEffect(() => {
    if (editAgent) {
      setName(editAgent.name)
      setBotToken(editAgent.bot_token ?? '')
      setTailorUrl(editAgent.tailorUrl ?? '')
      setTailorConfigCapture(editAgent.tailor_config ?? null)
      setWorkingOn(editAgent.working_on_project ?? null)
      const meta = editAgent.agent_meta
      setRole(meta?.role ?? '')
      setPersonality(meta?.personality ?? '')
      setSystemPrompt(meta?.system_prompt ?? '')
      setPermissions(meta?.permissions ?? [])
      setAuthorizedProjects(meta?.authorized_projects ?? [])
      setModel(meta?.model ?? '')
    } else {
      setName('')
      setBotToken('')
      setTailorUrl('')
      setTailorConfigCapture(null)
      setWorkingOn(null)
      setRole('')
      setPersonality('')
      setSystemPrompt('')
      setPermissions([])
      setAuthorizedProjects([])
      setModel('')
    }
    setShowTailor(false)
    setConfigSaved(false)
    setActiveTab('identity')
  }, [editAgent, open])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'tailor-save' && e.data?.config) {
        const config = e.data.config as AvatarConfig
        const screenshot = e.data.screenshot as string | null | undefined
        setTailorConfigCapture(config)
        if (screenshot) setTailorUrl(screenshot)
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
        if (editAgent?.id) {
          updateCanvasAgent(editAgent.id, {
            tailor_config: config,
            ...(screenshot ? { tailorUrl: screenshot } : {}),
          })
        }
      }
      if (e.data?.type === 'tailor-config' && e.data?.configUrl) {
        setTailorUrl(e.data.configUrl)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [editAgent?.id, updateCanvasAgent])

  const buildMeta = (): AgentMeta | null => {
    const meta: AgentMeta = {}
    if (role.trim()) meta.role = role.trim()
    if (personality.trim()) meta.personality = personality.trim()
    if (systemPrompt.trim()) meta.system_prompt = systemPrompt.trim()
    if (permissions.length > 0) meta.permissions = permissions
    if (authorizedProjects.length > 0) meta.authorized_projects = authorizedProjects
    if (model.trim()) meta.model = model.trim()
    return Object.keys(meta).length > 0 ? meta : null
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const agent_meta = buildMeta()
    if (isEdit && editAgent) {
      await updateCanvasAgent(editAgent.id, {
        name: name.trim(),
        bot_token: botToken.trim() || undefined,
        tailorUrl: tailorUrl || undefined,
        tailor_config: tailorConfigCapture ?? editAgent.tailor_config,
        agent_meta,
      })
      await setAgentWorkingOn(editAgent.id, workingOn)
    } else {
      await addCanvasAgent(name.trim(), tailorUrl || undefined, botToken.trim() || undefined, tailorConfigCapture ?? undefined, agent_meta)
    }
    setSaving(false)
    onClose()
  }

  const handleOpenTailor = () => {
    pendingConfigRef.current = tailorConfigCapture ?? (editAgent?.tailor_config ?? null)
    setShowTailor(true)
  }

  const handleTailorLoad = () => {
    if (pendingConfigRef.current && tailorRef.current?.contentWindow) {
      setTimeout(() => {
        tailorRef.current?.contentWindow?.postMessage(
          { type: 'tailor-load-config', config: pendingConfigRef.current },
          'https://the-tailor.surge.sh'
        )
      }, 300)
    }
  }

  const togglePermission = (key: string) => {
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    )
  }

  const toggleProject = (id: string) => {
    setAuthorizedProjects(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const tailorSrc = 'https://the-tailor.surge.sh'

  const tailorFullscreen = (
    <AnimatePresence>
      {open && showTailor && (
        <motion.div
          key="tailor-fullscreen"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 510,
            background: '#1A171C',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {isEdit ? `Modifier — ${editAgent?.name}` : 'Ajouter un bot'}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
                · Personnalise l'avatar puis clique sur "Valider"
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setShowTailor(false)}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ← Retour au formulaire
              </button>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '2px 4px' }}
              >
                ×
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <iframe
              ref={tailorRef}
              src={tailorSrc}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="The Tailor — avatar editor"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              onLoad={handleTailorLoad}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {createPortal(tailorFullscreen, document.body)}
      <ModalShell
        open={open && !showTailor}
        emoji="🤖"
        title={isEdit ? `Modifier — ${editAgent?.name ?? ''}` : 'Ajouter un agent'}
        subtitle="Agent sur le canvas"
        onClose={onClose}
        zIndex={500}
        footer={
          <>
            <button onClick={onClose} style={{ ...btnSecondary, padding: '10px 16px' }}>Annuler</button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              style={{ ...btnPrimary, padding: '10px 20px', opacity: (!name.trim() || saving) ? 0.5 : 1 }}
            >
              {saving ? '…' : isEdit ? 'Enregistrer' : 'Ajouter Agent'}
            </button>
          </>
        }
      >
        <div className="bot-modal__form">
          {/* Tab pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {(['identity', 'orchestration', 'projects'] as Tab[]).map(tab => {
              const labels: Record<Tab, string> = {
                identity: '👤 Identité',
                orchestration: '⚙️ Orchestration',
                projects: '📁 Projets autorisés',
              }
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isActive ? '1px solid rgba(225,31,123,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    background: isActive ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? '#E11F7B' : 'rgba(255,255,255,0.45)',
                    transition: 'all 0.15s',
                  }}
                >
                  {labels[tab]}
                </button>
              )
            })}
          </div>

          {/* Tab: Identité */}
          {activeTab === 'identity' && (
            <>
              <label style={labelStyle}>NOM DU BOT</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: MonAssistant"
                style={{ ...inputStyle, marginBottom: 16 }}
              />

              <label style={labelStyle}>
                TOKEN BOT TELEGRAM <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="123456789:AAF..."
                type="password"
                style={{ ...inputStyle, marginBottom: 6 }}
              />
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 16, lineHeight: 1.5 }}>
                Obtenir via @BotFather sur Telegram.
              </p>

              <label style={labelStyle}>RÔLE <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optionnel)</span></label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="Ex: CPO, Dev Senior, QA..."
                style={{ ...inputStyle, marginBottom: 16 }}
              />

              <label style={labelStyle}>MODÈLE LLM <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optionnel)</span></label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{ ...inputStyle, marginBottom: 16, cursor: 'pointer' }}
              >
                <option value="">Défaut (Sonnet)</option>
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6 — Dev / Orchestration</option>
                <option value="claude-haiku-4-5">Claude Haiku 4.5 — QA / Audit (rapide)</option>
              </select>

              <label style={labelStyle}>PERSONNALITÉ <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optionnel)</span></label>
              <textarea
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                placeholder="Ex: Pragmatique, orienté résultats, aime les specs claires..."
                rows={3}
                style={{ ...inputStyle, marginBottom: 16, resize: 'vertical' }}
              />

              {/* Avatar Tailor */}
              <label style={labelStyle}>AVATAR</label>
              <button
                onClick={handleOpenTailor}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginBottom: 8,
                }}
              >
                ✂️ {tailorUrl ? 'Modifier l\'avatar' : 'Créer un avatar'}
              </button>

              {(tailorConfigCapture || configSaved) && (
                <p style={{ fontSize: 10, color: configSaved ? '#E11F7B' : '#10B981', textAlign: 'center', marginBottom: 8, transition: 'color 0.3s' }}>
                  {configSaved ? '✓ Config capturée ! Clique "Enregistrer" pour sauvegarder' : '✓ Avatar configuré'}
                </p>
              )}
            </>
          )}

          {/* Tab: Orchestration */}
          {activeTab === 'orchestration' && (
            <>
              <label style={labelStyle}>PERMISSIONS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {PERMISSION_OPTIONS.map(opt => (
                  <label
                    key={opt.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: permissions.includes(opt.key) ? 'rgba(225,31,123,0.1)' : 'rgba(255,255,255,0.04)',
                      border: permissions.includes(opt.key) ? '1px solid rgba(225,31,123,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(opt.key)}
                      onChange={() => togglePermission(opt.key)}
                      style={{ accentColor: '#E11F7B', width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 12, color: permissions.includes(opt.key) ? '#E11F7B' : 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              <label style={labelStyle}>INSTRUCTIONS SYSTÈME <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(system prompt)</span></label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Ex: Tu es un agent senior spécialisé en React. Toujours écrire des tests..."
                rows={4}
                style={{ ...inputStyle, marginBottom: 20, resize: 'vertical' }}
              />

              {isEdit && (
                <>
                  <label style={labelStyle}>TRAVAILLE SUR</label>
                  <Select
                    value={workingOn ?? ''}
                    onChange={v => setWorkingOn(v || null)}
                    options={[
                      { value: '', label: '— Aucun projet —' },
                      ...projects.map(p => ({ value: p.id, label: p.title })),
                    ]}
                  />
                </>
              )}
            </>
          )}

          {/* Tab: Projets autorisés */}
          {activeTab === 'projects' && (
            <>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 12, lineHeight: 1.5 }}>
                Sélectionne les projets sur lesquels cet agent peut être assigné. Si aucun projet n'est sélectionné, l'agent a accès à tous les projets.
              </p>
              {projects.length === 0 ? (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>
                  Aucun projet dans le workspace
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {projects.map(proj => {
                    const isChecked = authorizedProjects.includes(proj.id)
                    return (
                      <label
                        key={proj.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8,
                          background: isChecked ? 'rgba(225,31,123,0.1)' : 'rgba(255,255,255,0.04)',
                          border: isChecked ? '1px solid rgba(225,31,123,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProject(proj.id)}
                          style={{ accentColor: '#E11F7B', width: 14, height: 14 }}
                        />
                        <span style={{ fontSize: 12, color: isChecked ? '#E11F7B' : 'rgba(255,255,255,0.6)', fontWeight: 600, flex: 1 }}>
                          {proj.title}
                        </span>
                        {proj.color && (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
              {authorizedProjects.length > 0 && (
                <p style={{ fontSize: 10, color: '#E11F7B', marginTop: 12 }}>
                  ✓ {authorizedProjects.length} projet{authorizedProjects.length > 1 ? 's' : ''} autorisé{authorizedProjects.length > 1 ? 's' : ''}
                </p>
              )}
            </>
          )}
        </div>
      </ModalShell>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.08em',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  padding: '10px 12px', fontSize: 13, color: '#fff',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 0', borderRadius: 8,
  background: 'linear-gradient(135deg, #E11F7B, #c01569)',
  border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
}

const btnSecondary: React.CSSProperties = {
  padding: '10px 0', borderRadius: 8,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
}
