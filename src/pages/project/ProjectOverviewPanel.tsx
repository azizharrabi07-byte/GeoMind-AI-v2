import { useState, useEffect } from 'react'
import { db } from '../../lib/data'
import type { TabProps } from '../../lib/types'
import type { ProjectTab } from '../../lib/routes'

export function ProjectOverviewPanel({
  user,
  project,
  onNavigate,
}: TabProps & { project: NonNullable<TabProps['project']>; onNavigate: (tab: ProjectTab) => void }) {
  const [stats, setStats] = useState({ files: 0, events: 0, mapFeatures: 0, reports: 0 })
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pid = project.id
    Promise.all([
      db.files.count(user.id, pid),
      db.activities.count(user.id, pid),
      db.gis.list(user.id, pid),
      db.reports.list(user.id, pid),
      db.activities.list(user.id, 8, pid),
    ]).then(([files, events, gis, reports, activities]) => {
      setStats({ files, events, mapFeatures: gis.length, reports: reports.length })
      setRecent(activities)
      setLoading(false)
    })
  }, [user.id, project.id])

  if (loading) return <div className="text-surface-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-5 border border-white/[0.04]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                project.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' :
                project.status === 'review' ? 'text-amber-400 bg-amber-500/10' :
                'text-surface-400 bg-white/[0.06]'
              }`}>{project.status}</span>
              {project.coordinate_system && (
                <span className="text-[11px] text-surface-500">{project.coordinate_system}</span>
              )}
            </div>
            <p className="text-sm text-surface-400 max-w-2xl">{project.description || 'No description'}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-surface-500">
              {project.client_name && <span>👤 {project.client_name}</span>}
              {project.location && <span>📍 {project.location}</span>}
              {project.due_date && <span>📅 Due {new Date(project.due_date).toLocaleDateString()}</span>}
            </div>
          </div>
          {(project.progress ?? 0) > 0 && (
            <div className="w-40">
              <div className="text-xs text-surface-500 mb-1">Progress {project.progress}%</div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${project.progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Files', value: stats.files, tab: 'files' as ProjectTab },
          { label: 'Timeline', value: stats.events, tab: 'timeline' as ProjectTab },
          { label: 'Map Features', value: stats.mapFeatures, tab: 'map' as ProjectTab },
          { label: 'Reports', value: stats.reports, tab: 'reports' as ProjectTab },
        ].map(s => (
          <button key={s.label} onClick={() => onNavigate(s.tab)}
            className="glass rounded-xl p-4 border border-white/[0.04] hover:border-brand-500/20 transition-all text-left">
            <div className="text-2xl font-bold text-brand-400">{s.value}</div>
            <div className="text-xs text-surface-500">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Upload File', tab: 'files' as ProjectTab, icon: '📄' },
          { label: 'GIS Viewer', tab: 'map' as ProjectTab, icon: '🗺️' },
          { label: 'Project Brain', tab: 'brain' as ProjectTab, icon: '🧠' },
        ].map(a => (
          <button key={a.label} onClick={() => onNavigate(a.tab)}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04]">
            <span className="text-2xl mb-1">{a.icon}</span>
            <span className="text-xs">{a.label}</span>
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recent.map(a => (
              <div key={a.id} className="flex justify-between text-sm py-1.5 border-b border-white/[0.02] last:border-0">
                <span className="text-surface-300">{a.description}</span>
                <span className="text-xs text-surface-600 flex-shrink-0 ml-3">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}