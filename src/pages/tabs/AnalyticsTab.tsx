import { useState, useEffect } from 'react'
import { db } from '../../lib/data'

export function AnalyticsTab({ user }: { user: any }) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await db.files.list(user.id)
      setFiles(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const typeCounts: Record<string, number> = {}
  files.forEach(f => {
    const ext = f.file_ext || 'other'
    typeCounts[ext] = (typeCounts[ext] || 0) + 1
  })
  const total = files.length || 1
  const colors = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#14b8a6', '#a855f7']

  if (loading) return <div className="text-surface-500">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-surface-500">Data insights from your survey files.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <div className="text-xs text-surface-500 mb-1">Total Files</div>
          <div className="text-3xl font-bold text-brand-400">{files.length}</div>
        </div>
        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <div className="text-xs text-surface-500 mb-1">Analyzed Files</div>
          <div className="text-3xl font-bold text-emerald-400">{files.filter(f => f.status === 'analyzed').length}</div>
        </div>
        <div className="glass rounded-xl p-5 border border-white/[0.04]">
          <div className="text-xs text-surface-500 mb-1">Unique Formats</div>
          <div className="text-3xl font-bold text-amber-400">{Object.keys(typeCounts).length}</div>
        </div>
      </div>

      <div className="glass rounded-xl p-5 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">File Type Distribution</h3>
        {Object.keys(typeCounts).length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-8">Upload files to see analytics.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {Object.entries(typeCounts).map(([ext, count], i) => (
              <div key={ext} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="text-sm">{ext.toUpperCase()}</span>
                <span className="text-xs text-surface-500">({count})</span>
                <span className="text-xs text-surface-600">{((count / total) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-xl border border-white/[0.04] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold">File Details ({files.length})</h3>
        </div>
        <div className="divide-y divide-white/[0.02]">
          {files.slice(0, 20).map(f => (
            <div key={f.id} className="flex items-center justify-between px-5 py-3">
              <div className="text-sm truncate flex-1">{f.filename}</div>
              <div className="text-xs text-surface-500 flex-shrink-0 ml-3">{f.file_ext} · {(f.file_size / 1024).toFixed(0)} KB</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}