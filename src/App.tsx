import { useState, useEffect } from 'react'
import { LandingPage } from './pages/LandingPage'
import { DashboardLayout } from './pages/DashboardLayout'
import { ProjectWorkspace } from './pages/ProjectWorkspace'
import { LoginPage } from './pages/LoginPage'
import { parseRoute } from './lib/routes'
import { fetchCurrentUser, FALLBACK_USER, requireAuth, isApiReachable } from './lib/auth'
import { USE_MOCK } from './lib/data'
import { supabase } from './lib/supabase'

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#home')
  const [user, setUser] = useState(FALLBACK_USER)
  const [ready, setReady] = useState(USE_MOCK)
  const [apiOffline, setApiOffline] = useState(false)
  const [authenticated, setAuthenticated] = useState(USE_MOCK)

  async function loadUser() {
    const u = await fetchCurrentUser()
    setUser(u)
    setApiOffline(!!u.apiOffline)
    setReady(true)
  }

  useEffect(() => {
    if (USE_MOCK) {
      setAuthenticated(true)
      setReady(true)
      return
    }
    requireAuth().then(ok => {
      setAuthenticated(ok)
      if (ok) loadUser()
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
      if (session) loadUser()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#home')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!apiOffline || USE_MOCK) return
    const retry = setInterval(async () => {
      if (await isApiReachable()) loadUser()
    }, 5000)
    return () => clearInterval(retry)
  }, [apiOffline])

  const parsed = parseRoute(route)

  if (!ready) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center text-surface-500">
        Connecting to GeoMind API...
      </div>
    )
  }

  const offlineBanner = apiOffline && !USE_MOCK ? (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 text-black text-xs text-center py-1.5 px-4">
      Backend offline — open a terminal in GeoMind-AI-v2 and run{' '}
      <code className="font-mono">npm start</code> (starts API + UI together)
    </div>
  ) : null

  if (!USE_MOCK && !authenticated && (parsed.page === 'dashboard' || parsed.page === 'project')) {
    return <LoginPage onSuccess={() => { setAuthenticated(true); loadUser(); window.location.hash = '#dashboard' }} />
  }

  if (parsed.page === 'project' && parsed.projectId) {
    return (
      <>
        {offlineBanner}
        <ProjectWorkspace user={user} projectId={parsed.projectId} initialTab={parsed.projectTab} resourceId={parsed.resourceId} />
      </>
    )
  }

  if (parsed.page === 'dashboard') {
    return (
      <>
        {offlineBanner}
        <DashboardLayout user={user} />
      </>
    )
  }

  return (
    <>
      {offlineBanner}
      <LandingPage onNavigate={(r) => { window.location.hash = r }} />
    </>
  )
}