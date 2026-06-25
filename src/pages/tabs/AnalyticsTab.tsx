import { useState, useEffect } from 'react'
import { db } from '../../lib/data'

export function AnalyticsTab({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.analytics.get().then(data => {
      setStats(data)
      setLoading(false)
    })
  }, [user.id])

  const typeCounts = stats?.file_types || {}
  const total = stats?.files || 1
  const colors = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#14b8a6', '#a855f7']

  if (loading) return <div className="text-surface-500">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Firm Analytics</h1>
        <p className="text-sm text-surface-500">Real metrics from your Supabase workspace — no mock numbers.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Projects', value: stats?.projects ?? 0, color: 'text-brand-400' },
          { label: 'Files', value: stats?.files ?? 0, color: 'text-emerald-400' },
          { label: 'Analyzed', value: stats?.analyzed_files ?? 0, color: 'text-violet-400' },
          { label: 'Reports', value: stats?.reports ?? 0, color: 'text-amber-400' },
          { label: 'Map Features', value: stats?.gis_features ?? 0, color: 'text-cyan-400' },
          { label: 'Storage (MB)', value: stats?.total_storage_mb ?? 0, color: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 border border-white/[0.04]">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-surface-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <h3 className="text-sm font-semibold mb-4">File Type Distribution</h3>
          {Object.keys(typeCounts).length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">Upload files to see distribution.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(typeCounts).map(([ext, count], i) => (
                <div key={ext} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-sm flex-1">{ext.toUpperCase()}</span>
                  <span className="text-xs text-surface-500">{count as number}</span>
                  <span className="text-xs text-surface-600 w-10 text-right">
                    {(((count as number) / total) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <h3 className="text-sm font-semibold mb-4">Projects by Status</h3>
          {Object.keys(stats?.project_status || {}).length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">No projects yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.project_status).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span className="capitalize">{status}</span>
                  <span className="text-surface-500">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}