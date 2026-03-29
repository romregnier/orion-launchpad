/**
 * App.tsx v2 — Architecture AppShell + React Router Outlet
 * TK-0160 / TK-0161 / TK-0167 / TK-0168
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useLaunchpadStore } from './store'

// ── Shell & Layout ────────────────────────────────────────────────────────────
import { AppShell } from './components/AppShell'
import { MobileBottomNav } from './components/MobileBottomNav'
import { LoginScreen } from './components/LoginScreen'
import { BuildStatusFAB } from './components/BuildStatusFAB'

// ── Pages dans le shell (nav) ─────────────────────────────────────────────────
import { CanvasPage } from './pages/CanvasPage'
import { DashboardPage } from './pages/DashboardPage'
import { AgentsTabPage } from './pages/AgentsTabPage'
import { TicketsPage } from './pages/TicketsPage'
import { ActivityPage } from './pages/ActivityPage'
import { SettingsPage } from './pages/SettingsPage'

// ── Pages sans nav ─────────────────────────────────────────────────────────────
import { DecksPage } from './pages/DecksPage'
import { NewDeckPage } from './pages/NewDeckPage'
import { DeckEditorPage } from './pages/DeckEditorPage'
import { DeckPresentPage } from './pages/DeckPresentPage'
import { LandingsPage } from './pages/LandingsPage'
import { NewLandingPage } from './pages/NewLandingPage'
import { TeamPage } from './pages/TeamPage'
import { CapsuleHomePage } from './pages/CapsuleHomePage'
import { AgentInboxPage } from './pages/AgentInboxPage'
import { AgentDMThread } from './pages/AgentDMThread'
import { AgentsPage } from './pages/AgentsPage'

// ── AppInner — auth + routing ──────────────────────────────────────────────────
function AppInner() {
  const { isPrivate, currentUser } = useLaunchpadStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const _adminEmails = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? '')
          .split(',').map((e: string) => e.trim()).filter(Boolean)
        const role = _adminEmails.includes(session.user.email ?? '') ? 'admin' : 'member'
        useLaunchpadStore.setState({ currentUser: { username: session.user.email ?? '', role } })
        useLaunchpadStore.getState().fetchProjects()
        if (event === 'SIGNED_IN') {
          useLaunchpadStore.getState().fetchBoardMembers()
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const showLoginOverlay = isPrivate && !currentUser

  return (
    <>
      <Routes>
        {/* ── Pages sans nav ──────────────────────────────────────────────── */}
        <Route path="/decks" element={<DecksPage />} />
        <Route path="/decks/new" element={<NewDeckPage />} />
        <Route path="/decks/:id/edit" element={<DeckEditorPage />} />
        <Route path="/decks/:id/present" element={<DeckPresentPage />} />
        <Route path="/landings" element={<LandingsPage />} />
        <Route path="/landings/new" element={<NewLandingPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/home" element={<CapsuleHomePage />} />
        {/* Legacy agents DM routes */}
        <Route path="/agents/inbox-v1" element={<AgentsPage />} />
        <Route path="/agents/:agentKey" element={<AgentDMThread />} />
        <Route path="/agents/inbox" element={<AgentInboxPage />} />

        {/* ── Shell avec nav ──────────────────────────────────────────────── */}
        <Route element={<AppShell />}>
          <Route path="/" element={<CanvasPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agents" element={<AgentsTabPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>

      {/* BuildStatusFAB global (hors shell) */}
      {currentUser && <BuildStatusFAB currentUser={currentUser} />}

      {/* Login overlay */}
      {showLoginOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#080612' }}>
          <LoginScreen />
        </div>
      )}
    </>
  )
}

// ── App root ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
      <MobileBottomNav />
    </BrowserRouter>
  )
}
