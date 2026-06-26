import { useState, useEffect, useCallback } from 'react'
import { LandingPage } from './pages/LandingPage'
import { DashboardLayout } from './pages/DashboardLayout'
import { ProjectWorkspace } from './pages/ProjectWorkspace'
import { LoginPage } from './pages/LoginPage'
import { parseRoute } from './lib/routes'
import { fetchCurrentUser, FALLBACK_USER, requireAuth, isApiReachable } from './lib/auth'
import { USE_MOCK } from './lib/data'
import { supabase } from './lib/supabase'

const OFFLINE_GRACE_MS = 3000

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#home')
  const [user, setUser] = useState(FALLBACK_USER)
  const [ready, setReady] = useState(USE_MOCK)
  const [apiOffline, setApiOffline] = useState(false)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)
  const [authenticated, setAuthenticated] = useState(USE_MOCK)
  const [retrying, setRetrying] = useState(false)

  const parsed = parseRoute(route)
  const isAppRoute = parsed.page === 'dashboard' || parsed.page === 'project'

  const loadUser = useCallback(async () => {
    const [u, online] = await Promise.all([fetchCurrentUser(), isApiReachable()])
    setUser(u)
    setApiOffline(!online)
    setReady(true)
    return { ...u, apiOffline: !online }
  }, [])

  useEffect(() => {
    if (USE_MOCK) {
      setAuthenticated(true)
      setReady(true)
      return
    }
    requireAuth().then(ok => {
      setAuthenticated(ok)
      if (ok && isAppRoute) loadUser()
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
      if (session && isAppRoute) loadUser()
    })
    return () => sub.subscription.unsubscribe()
  }, [loadUser, isAppRoute])

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#home')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (USE_MOCK || !authenticated || !isAppRoute) return
    if (!ready) loadUser()
  }, [isAppRoute, authenticated, USE_MOCK, ready, loadUser])

  useEffect(() => {
    if (!apiOffline || USE_MOCK) {
      setShowOfflineBanner(false)
      return
    }
    const timer = setTimeout(() => setShowOfflineBanner(true), OFFLINE_GRACE_MS)
    return () => clearTimeout(timer)
  }, [apiOffline])

  useEffect(() => {
    if (!apiOffline || USE_MOCK || !isAppRoute) return
    const retry = setInterval(async () => {
      if (await isApiReachable()) loadUser()
    }, 5000)
    return () => clearInterval(retry)
  }, [apiOffline, isAppRoute, loadUser])

  async function handleRetry() {
    setRetrying(true)
    const u = await loadUser()
    setRetrying(false)
    if (!u.apiOffline) setShowOfflineBanner(false)
  }

  if (!ready) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center text-surface-500">
        Connecting to GeoMind API...
      </div>
    )
  }

  const offlineBanner = showOfflineBanner && isAppRoute && !USE_MOCK ? (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 text-black text-xs text-center py-1.5 px-4 flex items-center justify-center gap-3">
      <span>
        Backend offline — open a terminal in GeoMind-AI-v2 and run{' '}
        <code className="font-mono">npm start</code>
      </span>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="px-2 py-0.5 rounded bg-black/20 hover:bg-black/30 font-medium disabled:opacity-50"
      >
        {retrying ? 'Checking...' : 'Retry'}
      </button>
    </div>
  ) : null

  if (!USE_MOCK && !authenticated && isAppRoute) {
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

  return <LandingPage onNavigate={(r) => { window.location.hash = r }} />
}