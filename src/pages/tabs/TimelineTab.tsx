import { useState, useEffect } from 'react'
import { db } from '../../lib/data'
import type { TabProps } from '../../lib/types'
import type { ProjectTab } from '../../lib/routes'

const ACTION_ICONS: Record<string, string> = {
  file_uploaded: '📄',
  file_deleted: '🗑️',
  gis_updated: '🗺️',
  report_generated: '📋',
  general: '📌',
}

export function TimelineTab({ user, projectId, project, onNavigate }: TabProps) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    db.activities.list(user.id, 100, projectId).then(data => {
      setActivities(data)
      setLoading(false)
    })
  }, [user.id, projectId])

  const selected = activities.find(a => a.id === selectedId)
  const meta = selected?.metadata || {}

  async function goToEvent() {
    if (!selected || !onNavigate) return
    const tab = (meta.navigate_tab as ProjectTab) || 'overview'
    if (meta.file_id) onNavigate('files', meta.file_id)
    else if (meta.report_id) onNavigate('reports', meta.report_id)
    else onNavigate(tab)
    setMessage(`Opened ${tab} for this event`)
  }

  async function restoreEvent() {
    if (!selected) return
    setRestoring(true)
    setMessage('')
    try {
      if (meta.version_id && (meta.can_restore || meta.restored || meta.file_id)) {
        const file = await db.files.restoreVersion(meta.version_id)
        onNavigate?.('files', file.id)
        setMessage(`Restored file "${file.filename}" from timeline`)
      } else if (meta.snapshot_id) {
        await db.gis.restoreSnapshot(meta.snapshot_id)
        onNavigate?.('map')
        setMessage('Restored map to the state before this change')
      } else if (meta.file_id) {
        onNavigate?.('files', meta.file_id)
        setMessage('Opened the file linked to this event')
      } else if (meta.report_id) {
        onNavigate?.('reports', meta.report_id)
        setMessage('Opened the report from this event')
      } else {
        await goToEvent()
      }
      const data = await db.activities.list(user.id, 100, projectId)
      setActivities(data)
    } catch (e) {
      setMessage(`Could not restore: ${(e as Error).message}`)
    }
    setRestoring(false)
  }

  if (loading) return <div className="text-surface-500">Loading timeline...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Timeline</h1>
        <p className="text-sm text-surface-500">
          Click any event to go back — open files, restore map states, or view reports from that moment.
        </p>
      </div>

      {message && (
        <div className="px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm text-brand-200">
          {message}
        </div>
      )}

      {activities.length === 0 ? (
        <div className="glass rounded-xl p-12 border border-white/[0.04] text-center">
          <div className="text-4xl mb-3">🕐</div>
          <h3 className="text-lg font-semibold mb-1">No timeline events yet</h3>
          <p className="text-sm text-surface-500">Activity appears when you upload files, edit the map, or generate reports.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 glass rounded-xl border border-white/[0.04] p-5">
            <div className="relative">
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/[0.06]" />
              <div className="space-y-2">
                {activities.map(a => (
                  <button key={a.id} onClick={() => setSelectedId(a.id)}
                    className={`w-full flex gap-4 relative text-left rounded-xl p-2 transition-colors ${
                      selectedId === a.id ? 'bg-brand-500/10' : 'hover:bg-white/[0.03]'
                    }`}>
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-lg flex-shrink-0 z-10">
                      {ACTION_ICONS[a.action] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-surface-600 mt-1">
                        {new Date(a.created_at).toLocaleString()}
                        {a.action && a.action !== 'general' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-white/[0.04] text-surface-500">
                            {a.action.replace(/_/g, ' ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 glass rounded-xl border border-white/[0.04] p-5 min-h-[280px]">
            {!selected ? (
              <div className="h-full flex items-center justify-center text-sm text-surface-500 text-center p-4">
                Select a timeline event to go back to that moment
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase text-surface-600 font-semibold mb-1">Selected Event</p>
                  <p className="text-sm font-medium">{selected.description}</p>
                  <p className="text-xs text-surface-500 mt-1">{new Date(selected.created_at).toLocaleString()}</p>
                </div>

                {meta.filename && (
                  <div className="text-xs bg-white/[0.04] rounded-lg p-3">
                    <span className="text-surface-500">File:</span> {meta.filename}
                  </div>
                )}
                {meta.snapshot_id && (
                  <div className="text-xs bg-white/[0.04] rounded-lg p-3">
                    <span className="text-surface-500">Map snapshot available</span> — restore map to state before this change
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button onClick={goToEvent}
                    className="w-full py-3 bg-brand-500 hover:bg-brand-400 rounded-xl text-sm font-semibold">
                    Go to This Event →
                  </button>
                  {(meta.can_restore || meta.snapshot_id) && (
                    <button onClick={restoreEvent} disabled={restoring}
                      className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm font-semibold disabled:opacity-50">
                      {restoring ? 'Restoring...' : meta.snapshot_id ? 'Restore Map State' : 'Restore Deleted File'}
                    </button>
                  )}
                  {meta.report_id && (
                    <button onClick={() => onNavigate?.('reports', meta.report_id)}
                      className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-xs">
                      View Report
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}