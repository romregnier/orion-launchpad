import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { to: '/',        emoji: '🌌', label: 'Canvas' },
  { to: '/home',    emoji: '🏠', label: 'Home'   },
  { to: '/agents',  emoji: '💬', label: 'Agents' },
  { to: '/team',    emoji: '👥', label: 'Team'   },
  { to: '/decks',   emoji: '🃏', label: 'Decks'  },
]

export function MobileBottomNav() {
  const { pathname } = useLocation()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 56, zIndex: 50,
      background: 'rgba(11,9,13,0.95)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }} className="mobile-bottom-nav">
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to))
        return (
          <motion.div
            key={item.to}
            style={{ flex: 1 }}
            whileTap={{ scale: 0.88, opacity: 0.7 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Link
              to={item.to}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                textDecoration: 'none', minHeight: 44, height: '100%',
                color: isActive ? '#E11F7B' : 'rgba(255,255,255,0.4)',
                transition: 'color 0.15s',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              <span style={{ fontSize: isActive ? 22 : 20, transition: 'font-size 0.15s' }}>{item.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.04em' }}>
                {item.label}
              </span>
            </Link>
          </motion.div>
        )
      })}
    </nav>
  )
}
