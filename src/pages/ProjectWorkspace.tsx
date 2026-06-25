import { useState, useEffect } from 'react'
import { db } from '../lib/data'
import { PRODUCT } from '../lib/product'
import { projectRoute, type ProjectTab } from '../lib/routes'
import type { User, Project } from '../lib/types'
import { ProjectOverviewPanel } from './project/ProjectOverviewPanel'
import { FilesTab } from './tabs/FilesTab'
import { TimelineTab } from './tabs/TimelineTab'
import { MapTab } from './tabs/MapTab'
import { ChatTab } from './tabs/ChatTab'
import { ReportsTab } from './tabs/ReportsTab'

const PROJECT_TABS: { id: ProjectTab; label: string; icon: string; ai?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'files', label: 'Files', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'timeline', label: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'map', label: 'GIS Viewer', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'brain', label: 'Project Brain', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', ai: true },
  { id: 'reports', label: 'Reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]

export function ProjectWorkspace({
  user,
  projectId,
  initialTab = 'overview',
  resourceId,
}: {
  user: User
  projectId: string
  initialTab?: ProjectTab
  resourceId?: string
}) {
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { setActiveTab(initialTab) }, [initialTab, projectId])

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    db.projects.get(projectId).then(p => {
      if (!p) setNotFound(true)
      else setProject(p)
      setLoading(false)
    })
  }, [projectId])

  const navigateTab = (tab: ProjectTab, resId?: string) => {
    setActiveTab(tab)
    window.location.hash = projectRoute(projectId, tab, resId)
  }

  if (loading) {
    return <div className="h-screen bg-surface-950 flex items-center justify-center text-surface-500">Loading project...</div>
  }

  if (notFound || !project) {
    return (
      <div className="h-screen bg-surface-950 flex flex-col items-center justify-center gap-4">
        <p className="text-surface-400">Project not found</p>
        <a href="#dashboard" className="text-brand-400 text-sm hover:underline">← Back to dashboard</a>
      </div>
    )
  }

  const tabProps = { user, projectId: project.id, project, resourceId, onNavigate: navigateTab }

  const renderPanel = () => {
    switch (activeTab) {
      case 'overview': return <ProjectOverviewPanel {...tabProps} project={project} onNavigate={navigateTab} />
      case 'files': return <FilesTab {...tabProps} />
      case 'timeline': return <TimelineTab {...tabProps} />
      case 'map': return <MapTab {...tabProps} />
      case 'brain': return <ChatTab {...tabProps} />
      case 'reports': return <ReportsTab {...tabProps} />
      default: return null
    }
  }

  return (
    <div className="h-screen bg-surface-950 text-white flex overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0 transition-all duration-300 border-r border-white/[0.04] bg-surface-950/80 backdrop-blur-xl hidden md:flex flex-col`}>
        <div className={`${sidebarOpen ? 'px-4' : 'px-2'} py-4 border-b border-white/[0.04]`}>
          <a href="#dashboard" className="text-surface-500 hover:text-white text-xs flex items-center gap-1 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
            {sidebarOpen && 'All Projects'}
          </a>
          {sidebarOpen && (
            <>
              <h2 className="font-semibold text-sm truncate" title={project.name}>{project.name}</h2>
              <p className="text-[10px] text-surface-600 mt-0.5">{PRODUCT.name} · Project</p>
            </>
          )}
        </div>
        <nav className="flex-1 py-2 space-y-1 px-2 overflow-y-auto">
          {PROJECT_TABS.map(tab => (
            <button key={tab.id} onClick={() => navigateTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                activeTab === tab.id
                  ? tab.ai ? 'bg-violet-500/10 text-violet-300 font-medium' : 'bg-brand-500/10 text-brand-300 font-medium'
                  : 'text-surface-500 hover:text-surface-300 hover:bg-white/[0.03]'
              }`}
              title={!sidebarOpen ? tab.label : undefined}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={tab.icon} /></svg>
              {sidebarOpen && (
                <span className="flex items-center gap-1.5 truncate">
                  {tab.label}
                  {tab.ai && <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-400">AI</span>}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-white/[0.04]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex justify-center py-2 text-surface-500 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? <path d="M11 5h2m-2 7h2m-2 7h2" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-white/[0.04] flex items-center justify-between px-4 md:px-6 bg-surface-950/90 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 md:hidden">
            <a href="#dashboard" className="text-surface-500">←</a>
            <span className="font-semibold text-sm truncate">{project.name}</span>
          </div>
          <span className="hidden md:block text-xs text-surface-500">
            {PROJECT_TABS.find(t => t.id === activeTab)?.label}
          </span>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold">
            {(user.email || 'U').slice(0, 2).toUpperCase()}
          </div>
        </header>

        <main className={`flex-1 min-h-0 min-w-0 ${
          activeTab === 'map'
            ? 'overflow-hidden p-2 md:p-3 pb-16 md:pb-3'
            : 'overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-20 md:pb-6'
        }`}>
          {renderPanel()}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-surface-950/95 backdrop-blur-xl border-t border-white/[0.06] z-50 flex justify-around">
        {PROJECT_TABS.filter(t => ['overview', 'files', 'map', 'brain'].includes(t.id)).map(tab => (
          <button key={tab.id} onClick={() => navigateTab(tab.id)}
            className={`py-2 px-2 text-[10px] ${activeTab === tab.id ? 'text-brand-400' : 'text-surface-500'}`}>
            {tab.id === 'brain' ? 'Brain' : tab.label.split(' ')[0]}
          </button>
        ))}
      </nav>
    </div>
  )
}