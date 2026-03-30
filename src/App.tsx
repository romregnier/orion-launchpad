/**
 * App.tsx v2 — Architecture AppShell + React Router Outlet
 * TK-0160 / TK-0161 / TK-0167 / TK-0168
 * TK-0159 — Code splitting par route (React.lazy + Suspense)
 */
import React, { useEffect, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useLaunchpadStore } from './store'

// ── Shell & Layout (statiques — critiques au premier rendu) ───────────────────
import { AppShell } from './components/AppShell'
import { LoginScreen } from './components/LoginScreen'
import { BuildStatusFAB } from './components/BuildStatusFAB'

// ── Fallback Suspense ─────────────────────────────────────────────────────────
function PageFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.1)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

// ── Pages — lazy loaded (code splitting Vite) ─────────────────────────────────
// Pages dans le shell (nav)
const CanvasPage      = React.lazy(() => import('./pages/CanvasPage').then(m => ({ default: m.CanvasPage })))
const DashboardPage   = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AgentsTabPage   = React.lazy(() => import('./pages/AgentsTabPage').then(m => ({ default: m.AgentsTabPage })))
const TicketsPage     = React.lazy(() => import('./pages/TicketsPage').then(m => ({ default: m.TicketsPage })))
const ActivityPage    = React.lazy(() => import('./pages/ActivityPage').then(m => ({ default: m.ActivityPage })))
const AutomationsPage = React.lazy(() => import('./pages/AutomationsPage').then(m => ({ default: m.AutomationsPage })))
const SettingsPage    = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

// Pages sans nav
const DecksPage       = React.lazy(() => import('./pages/DecksPage').then(m => ({ default: m.DecksPage })))
const NewDeckPage     = React.lazy(() => import('./pages/NewDeckPage').then(m => ({ default: m.NewDeckPage })))
const DeckEditorPage  = React.lazy(() => import('./pages/DeckEditorPage').then(m => ({ default: m.DeckEditorPage })))
const DeckPresentPage = React.lazy(() => import('./pages/DeckPresentPage').then(m => ({ default: m.DeckPresentPage })))
const LandingsPage    = React.lazy(() => import('./pages/LandingsPage').then(m => ({ default: m.LandingsPage })))
const NewLandingPage  = React.lazy(() => import('./pages/NewLandingPage').then(m => ({ default: m.NewLandingPage })))
const TeamPage        = React.lazy(() => import('./pages/TeamPage').then(m => ({ default: m.TeamPage })))
const CapsuleHomePage = React.lazy(() => import('./pages/CapsuleHomePage').then(m => ({ default: m.CapsuleHomePage })))
const AgentInboxPage  = React.lazy(() => import('./pages/AgentInboxPage').then(m => ({ default: m.AgentInboxPage })))
const AgentDMThread   = React.lazy(() => import('./pages/AgentDMThread').then(m => ({ default: m.AgentDMThread })))
const AgentsPage      = React.lazy(() => import('./pages/AgentsPage').then(m => ({ default: m.AgentsPage })))

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
      <Suspense fallback={<PageFallback />}>
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
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>

      {/* BuildStatusFAB global (hors shell) */}
      {currentUser && <BuildStatusFAB currentUser={currentUser} />}

      {/* Login overlay */}
      {showLoginOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-base)' }}>
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
    </BrowserRouter>
  )
}
