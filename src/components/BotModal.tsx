import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { ModalShell } from './ModalShell'
import { Select } from './Select'
import type { CanvasAgent, AvatarConfig } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  editAgent?: CanvasAgent | null  // si défini : mode édition, sinon : mode ajout
}

export function BotModal({ open, onClose, editAgent }: Props) {
  const { addCanvasAgent, updateCanvasAgent, projects, setAgentWorkingOn } = useLaunchpadStore()
  const [name, setName] = useState('')
  const [botToken, setBotToken] = useState('')
  const [tailorUrl, setTailorUrl] = useState('')
  const [tailorConfigCapture, setTailorConfigCapture] = useState<AvatarConfig | null>(null)
  const [showTailor, setShowTailor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [workingOn, setWorkingOn] = useState<string | null>(null)
  const tailorRef = useRef<HTMLIFrameElement>(null)
  // Config à injecter dans The Tailor une fois l'iframe chargée
  const pendingConfigRef = useRef<AvatarConfig | null>(null)

  const isEdit = !!editAgent

  // Pré-remplir en mode édition
  useEffect(() => {
    if (editAgent) {
      setName(editAgent.name)
      setBotToken(editAgent.bot_token ?? '')
      setTailorUrl(editAgent.tailorUrl ?? '')
      setTailorConfigCapture(editAgent.tailor_config ?? null)
      setWorkingOn(editAgent.working_on_project ?? null)
    } else {
      setName('')
      setBotToken('')
      setTailorUrl('')
      setTailorConfigCapture(null)
      setWorkingOn(null)
    }
    setShowTailor(false)
    setConfigSaved(false)
  }, [editAgent, open])

  // Capture de la config Tailor via postMessage (deux formats supportés)
  // FIX 4 — En mode édition, persister immédiatement la config en DB dès réception
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Format 1 : config JSON complète envoyée par le bouton "Sauvegarder" de The Tailor
      if (e.data?.type === 'tailor-save' && e.data?.config) {
        const config = e.data.config as AvatarConfig
        const screenshot = e.data.screenshot as string | null | undefined
        setTailorConfigCapture(config)
        if (screenshot) setTailorUrl(screenshot)
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
        // Persistance immédiate en DB si on est en mode édition
        if (editAgent?.id) {
          updateCanvasAgent(editAgent.id, {
            tailor_config: config,
            ...(screenshot ? { tailorUrl: screenshot } : {}),
          })
        }
      }
      // Format 2 : ancienne URL (rétro-compat)
      if (e.data?.type === 'tailor-config' && e.data?.configUrl) {
        setTailorUrl(e.data.configUrl)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [editAgent?.id, updateCanvasAgent])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    if (isEdit && editAgent) {
      await updateCanvasAgent(editAgent.id, {
        name: name.trim(),
        bot_token: botToken.trim() || undefined,
        tailorUrl: tailorUrl || undefined,
        tailor_config: tailorConfigCapture ?? editAgent.tailor_config,
      })
      await setAgentWorkingOn(editAgent.id, workingOn)
    } else {
      await addCanvasAgent(name.trim(), tailorUrl || undefined, botToken.trim() || undefined, tailorConfigCapture ?? undefined)
    }
    setSaving(false)
    onClose()
  }

  // Quand on ouvre The Tailor, mémoriser la config à injecter
  const handleOpenTailor = () => {
    pendingConfigRef.current = tailorConfigCapture ?? (editAgent?.tailor_config ?? null)
    setShowTailor(true)
  }

  // Injecter la config dans l'iframe après son chargement
  const handleTailorLoad = () => {
    if (pendingConfigRef.current && tailorRef.current?.contentWindow) {
      // Petit délai pour que le store Zustand de The Tailor soit prêt
      setTimeout(() => {
        tailorRef.current?.contentWindow?.postMessage(
          { type: 'tailor-load-config', config: pendingConfigRef.current },
          'https://the-tailor.surge.sh'
        )
      }, 300)
    }
  }

  const tailorSrc = 'https://the-tailor.surge.sh'

  // When showTailor is active, use a separate fullscreen overlay
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
          {/* Header */}
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
          {/* Tailor iframe */}
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
          {/* Nom */}
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.08em' }}>NOM DU BOT</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: MonAssistant"
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          {/* Token */}
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.08em' }}>
            TOKEN BOT TELEGRAM <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optionnel)</span>
          </label>
          <input
            value={botToken}
            onChange={e => setBotToken(e.target.value)}
            placeholder="123456789:AAF..."
            type="password"
            style={{ ...inputStyle, marginBottom: 6 }}
          />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 20, lineHeight: 1.5 }}>
            Obtenir via @BotFather sur Telegram. Permet d'envoyer des messages à ce bot depuis le chat.
          </p>

          {/* Travaille sur — visible uniquement en mode édition */}
          {isEdit && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.08em' }}>TRAVAILLE SUR</label>
              <Select
                value={workingOn ?? ''}
                onChange={v => setWorkingOn(v || null)}
                options={[
                  { value: '', label: '— Aucun projet —' },
                  ...projects.map(p => ({ value: p.id, label: p.title })),
                ]}
              />
            </div>
          )}

          {/* Avatar Tailor */}
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.08em' }}>AVATAR</label>
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
        </div>
      </ModalShell>
    </>
  )
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
