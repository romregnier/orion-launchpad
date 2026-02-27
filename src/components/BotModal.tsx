import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import type { CanvasAgent } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  editAgent?: CanvasAgent | null  // si défini : mode édition, sinon : mode ajout
}

export function BotModal({ open, onClose, editAgent }: Props) {
  const { addCanvasAgent, updateCanvasAgent } = useLaunchpadStore()
  const [name, setName] = useState('')
  const [botToken, setBotToken] = useState('')
  const [tailorUrl, setTailorUrl] = useState('')
  const [showTailor, setShowTailor] = useState(false)
  const [saving, setSaving] = useState(false)
  const tailorRef = useRef<HTMLIFrameElement>(null)

  const isEdit = !!editAgent

  // Pré-remplir en mode édition
  useEffect(() => {
    if (editAgent) {
      setName(editAgent.name)
      setBotToken(editAgent.bot_token ?? '')
      setTailorUrl(editAgent.tailorUrl ?? '')
    } else {
      setName('')
      setBotToken('')
      setTailorUrl('')
    }
    setShowTailor(false)
  }, [editAgent, open])

  // Capture du config Tailor via postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== 'https://the-tailor.surge.sh') return
      if (e.data?.type === 'tailor-config' && e.data?.configUrl) {
        setTailorUrl(e.data.configUrl)
        setShowTailor(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    if (isEdit && editAgent) {
      await updateCanvasAgent(editAgent.id, {
        name: name.trim(),
        bot_token: botToken.trim() || undefined,
        tailorUrl: tailorUrl || undefined,
      })
    } else {
      await addCanvasAgent(name.trim(), tailorUrl || undefined, botToken.trim() || undefined)
    }
    setSaving(false)
    onClose()
  }

  const tailorSrc = tailorUrl
    ? `https://the-tailor.surge.sh?config=${encodeURIComponent(tailorUrl)}&embed=1`
    : 'https://the-tailor.surge.sh?embed=1'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 490 }}
          />

          {/* Modal — fullscreen quand Tailor est affiché */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed',
              inset: showTailor ? 0 : undefined,
              ...(showTailor ? {} : { top: 0, left: 0, right: 0, bottom: 0 }),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 500, pointerEvents: 'none',
            }}
          >
            <div
              className="bot-modal"
              style={{
                width: showTailor ? '100vw' : 'min(400px, calc(100vw - 32px))',
                height: showTailor ? '100vh' : 'auto',
                maxHeight: showTailor ? '100vh' : 'calc(100vh - 80px)',
                background: '#1A171C',
                borderRadius: showTailor ? 0 : 18,
                border: showTailor ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: showTailor ? 'none' : '0 24px 64px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                pointerEvents: 'all',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s ease, height 0.25s ease, border-radius 0.25s ease',
              }}
            >
              {/* Header */}
              <div
                className="bot-modal__header"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  flexShrink: 0,
                  background: '#1A171C',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🤖</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    {isEdit ? `Modifier — ${editAgent?.name}` : 'Ajouter un bot'}
                  </span>
                  {showTailor && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
                      · Personnalise l'avatar puis clique sur "Valider"
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {showTailor && (
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
                  )}
                  <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '2px 4px' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div
                className="bot-modal__body"
                style={{ display: 'flex', flex: showTailor ? 1 : undefined, overflow: 'hidden' }}
              >
                {/* Form — masqué en mode Tailor fullscreen sur mobile, visible en sidebar sinon */}
                <div
                  className="bot-modal__form"
                  style={{
                    padding: 20,
                    width: showTailor ? 'min(320px, 30vw)' : '100%',
                    minWidth: showTailor ? 260 : undefined,
                    flexShrink: 0,
                    overflowY: 'auto',
                    display: showTailor && window.innerWidth < 600 ? 'none' : 'block',
                  }}
                >
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

                  {/* Avatar Tailor */}
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.08em' }}>AVATAR</label>
                  <button
                    onClick={() => setShowTailor(t => !t)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: showTailor ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${showTailor ? 'rgba(225,31,123,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: showTailor ? '#E11F7B' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    ✂️ {tailorUrl ? 'Modifier l\'avatar' : 'Créer un avatar'}
                    {showTailor && <span style={{ fontSize: 10 }}>←</span>}
                  </button>

                  {tailorUrl && !showTailor && (
                    <p style={{ fontSize: 10, color: '#10B981', textAlign: 'center', marginBottom: 8 }}>✓ Avatar configuré</p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={onClose} style={{ flex: 1, ...btnSecondary }}>Annuler</button>
                    <button
                      onClick={handleSave}
                      disabled={!name.trim() || saving}
                      style={{ flex: 2, ...btnPrimary, opacity: (!name.trim() || saving) ? 0.5 : 1 }}
                    >
                      {saving ? '…' : isEdit ? 'Enregistrer' : 'Ajouter'}
                    </button>
                  </div>
                </div>

                {/* Tailor iframe — plein écran (sauf sidebar form) */}
                {showTailor && (
                  <div
                    className="bot-modal__tailor"
                    style={{
                      flex: 1,
                      borderLeft: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                    }}
                  >
                    <iframe
                      ref={tailorRef}
                      src={tailorSrc}
                      style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                      title="The Tailor — avatar editor"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
