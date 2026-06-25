import { useState, useEffect } from 'react'
import { OverviewTab } from './tabs/OverviewTab'
import { ProjectsTab } from './tabs/ProjectsTab'
import { SearchTab } from './tabs/SearchTab'
import { AnalyticsTab } from './tabs/AnalyticsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { PRODUCT } from '../lib/product'
import { signOut } from '../lib/auth'

type TabId = 'overview' | 'projects' | 'search' | 'analytics' | 'settings'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Workspace', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'projects', label: 'Projects', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { id: 'search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

function initialTabFromHash(): TabId {
  const hash = window.location.hash.replace(/^#/, '')
  const [, query] = hash.split('?')
  const tab = new URLSearchParams(query || '').get('tab')
  const valid: TabId[] = ['overview', 'projects', 'search', 'analytics', 'settings']
  return tab && valid.includes(tab as TabId) ? (tab as TabId) : 'overview'
}

export function DashboardLayout({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTabFromHash)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const onHash = () => {
      const tab = initialTabFromHash()
      if (tab !== 'overview' || window.location.hash.includes('tab=')) setActiveTab(tab)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab user={user} onNavigate={t => setActiveTab(t as TabId)} />
      case 'projects': return <ProjectsTab user={user} />
      case 'search': return <SearchTab user={user} />
      case 'analytics': return <AnalyticsTab user={user} />
      case 'settings': return <SettingsTab user={user} />
    }
  }

  return (
    <div className="h-screen bg-surface-950 text-white flex overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0 transition-all duration-300 border-r border-white/[0.04] bg-surface-950/80 backdrop-blur-xl hidden md:flex flex-col`}>
        <div className={`flex items-center ${sidebarOpen ? 'justify-between px-5' : 'justify-center'} h-16 border-b border-white/[0.04]`}>
          {sidebarOpen && (
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">G</div>
                <span className="font-semibold text-sm">{PRODUCT.name}</span>
              </div>
              <p className="text-[10px] text-surface-600 mt-0.5">Survey Project OS</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-surface-500 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? <path d="M11 5h2m-2 7h2m-2 7h2" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${activeTab === tab.id ? 'bg-brand-500/10 text-brand-300 font-medium' : 'text-surface-500 hover:text-surface-300 hover:bg-white/[0.03]'}`}
              title={!sidebarOpen ? tab.label : undefined}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={tab.icon} /></svg>
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>
        <div className={`p-3 border-t border-white/[0.04] text-[10px] text-surface-600 ${sidebarOpen ? 'px-4' : 'text-center'}`}>
          {sidebarOpen && 'Open a project for files, map, AI & reports'}
        </div>
        <div className={`p-3 border-t border-white/[0.04] ${sidebarOpen ? '' : 'flex justify-center'}`}>
          <a href="#home" className="flex items-center gap-2 text-surface-500 hover:text-surface-300 text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
            {sidebarOpen && 'Back to Site'}
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/[0.04] flex items-center justify-between px-4 md:px-6 bg-surface-950/80 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">G</div>
              <span className="font-semibold text-sm">{PRODUCT.name}</span>
            </div>
            <span className="text-xs text-surface-500">{TABS.find(t => t.id === activeTab)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold">
              {(user.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <button onClick={async () => { await signOut(); window.location.hash = '#home' }}
              className="text-xs text-surface-500 hover:text-white">Sign Out</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="p-4 md:p-6">{renderTab()}</div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-surface-950/95 backdrop-blur-xl border-t border-white/[0.06] z-50 flex justify-around">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-2 px-4 min-w-[64px] ${activeTab === tab.id ? 'text-brand-400' : 'text-surface-500'}`}>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}