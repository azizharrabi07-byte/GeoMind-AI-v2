import { useState, useEffect } from 'react'
import { LandingPage } from './pages/LandingPage'
import { DashboardLayout } from './pages/DashboardLayout'
import { ProjectWorkspace } from './pages/ProjectWorkspace'
import { parseRoute } from './lib/routes'
import { fetchCurrentUser, FALLBACK_USER } from './lib/auth'
import { USE_MOCK } from './lib/data'

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#home')
  const [user, setUser] = useState(FALLBACK_USER)
  const [ready, setReady] = useState(USE_MOCK)
  const [apiOffline, setApiOffline] = useState(false)

  useEffect(() => {
    if (USE_MOCK) {
      setReady(true)
      return
    }
    fetchCurrentUser().then(u => {
      setUser(u)
      setApiOffline(!!u.apiOffline)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#home')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
      API offline — start backend with <code className="font-mono">npm run backend</code>. Showing limited mode.
    </div>
  ) : null

  if (parsed.page === 'project' && parsed.projectId) {
    return (
      <>
        {offlineBanner}
        <ProjectWorkspace
          user={user}
          projectId={parsed.projectId}
          initialTab={parsed.projectTab}
          resourceId={parsed.resourceId}
        />
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