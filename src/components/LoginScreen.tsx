import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useLaunchpadStore } from '../store'

export function LoginScreen() {
  const { login, boardName } = useLaunchpadStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(false)
    const ok = await login(email.trim(), password)
    setLoading(false)
    if (!ok) {
      setError(true)
    }
    // No reload needed — the overlay disappears automatically when currentUser is set
  }, [email, password, login])

  const borderColor = error ? '#ef4444' : 'rgba(255,255,255,0.1)'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0B090D',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{
          background: '#1A171C',
          borderRadius: 20,
          padding: 40,
          width: 'min(380px, calc(100vw - 32px))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>🌟</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 6, textAlign: 'center' }}>
          {boardName}
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 28px', textAlign: 'center' }}>
          Connexion requise
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(false) }}
            placeholder="Adresse email"
            autoComplete="email"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: '12px 16px',
              color: '#fff', fontSize: 14,
              outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            placeholder="Mot de passe"
            autoComplete="current-password"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: '12px 16px',
              color: '#fff', fontSize: 14,
              outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
          />

          {error && (
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0, textAlign: 'center' }}>
              Identifiants incorrects
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: 48, borderRadius: 12,
              background: loading ? 'rgba(225,31,123,0.5)' : '#E11F7B',
              color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(225,31,123,0.4)',
              transition: 'all 0.2s',
              marginTop: 4,
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 24, lineHeight: 1.5 }}>
          Accès restreint — contactez l'administrateur pour obtenir vos identifiants
        </p>
      </motion.div>
    </div>
  )
}
