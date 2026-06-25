import { useState, useEffect } from 'react'
import { db } from '../../lib/data'
import { projectRoute } from '../../lib/routes'

export function OverviewTab({ user, onNavigate }: { user: any; onNavigate: (t: string) => void }) {
  const [stats, setStats] = useState({ projects: 0, files: 0, activities: 0 })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [projects, files, activities, recent, projectList] = await Promise.all([
          db.projects.count(user.id),
          db.files.count(user.id),
          db.activities.count(user.id),
          db.activities.list(user.id, 8),
          db.projects.list(user.id),
        ])
        setStats({ projects, files, activities })
        setRecentActivity(recent)
        setRecentProjects(projectList.slice(0, 4))
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [user.id])

  if (loading) return <div className="text-surface-500">Loading overview...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Firm Workspace</h1>
        <p className="text-sm text-surface-500">Overview across all projects. Open a project for files, map, timeline, and Project Brain.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Projects', value: stats.projects, action: () => onNavigate('projects') },
          { label: 'Total Files', value: stats.files, action: () => onNavigate('projects') },
          { label: 'Activities', value: stats.activities, action: () => onNavigate('projects') },
        ].map(stat => (
          <button key={stat.label} onClick={stat.action}
            className="glass rounded-xl p-5 border border-white/[0.04] hover:border-white/[0.08] transition-all text-left">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-surface-500">{stat.label}</div>
          </button>
        ))}
      </div>

      <div className="glass rounded-xl p-5 border border-white/[0.04]">
        <button onClick={() => onNavigate('projects')}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl font-semibold text-sm hover:from-brand-400 hover:to-brand-600">
          + New Project / View All Projects
        </button>
      </div>

      {recentProjects.length > 0 && (
        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <h3 className="text-sm font-semibold mb-4">Recent Projects</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentProjects.map(p => (
              <div key={p.id} className="rounded-xl border border-white/[0.04] overflow-hidden">
                <a href={projectRoute(p.id)} className="flex items-center gap-3 p-4 hover:bg-white/[0.03]">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-xs font-bold text-brand-300">
                    {p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-surface-500 truncate">{p.client_name || p.location || p.status}</div>
                  </div>
                </a>
                <a href={projectRoute(p.id)}
                  className="block w-full py-4 text-center text-base font-bold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-400 hover:to-brand-600 border-t border-white/[0.04]">
                  Click Card to Open Workspace →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <h3 className="text-sm font-semibold mb-4">Firm-wide Activity</h3>
          <div className="space-y-2">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] text-sm">
                <span>{a.description}</span>
                <span className="text-xs text-surface-600">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}