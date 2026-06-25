import { useState, useEffect } from 'react'
import { db } from '../../lib/data'
import type { TabProps } from '../../lib/types'

function downloadReportContent(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^a-z0-9-_ ]/gi, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsTab({ user, projectId, project, resourceId }: TabProps) {
  const [reports, setReports] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [viewReport, setViewReport] = useState<any | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [emailing, setEmailing] = useState(false)
  const [emailTo, setEmailTo] = useState('')

  async function load() {
    const [r, f] = await Promise.all([
      db.reports.list(user.id, projectId),
      db.files.list(user.id, projectId),
    ])
    setReports(r || [])
    setFiles(f || [])
    setLoading(false)
    if (resourceId) {
      const report = r?.find((x: any) => x.id === resourceId)
      if (report) setViewReport(report)
    }
  }

  useEffect(() => { load() }, [user.id, projectId, resourceId])

  function toggleFile(id: string) {
    setSelectedFileIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function generateReport(reportType: string) {
    setGenerating(true)
    try {
      const result = await db.reports.generate({
        report_type: reportType,
        title: project
          ? `${project.name} — ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`
          : `${reportType.toUpperCase()} Survey Report`,
        project_id: projectId,
        file_ids: selectedFileIds.length ? selectedFileIds : files.map(f => f.id),
      })
      if (result.report) {
        setReports(prev => [result.report, ...prev])
        setViewReport(result.report)
      }
    } catch (e) {
      alert('Failed to generate report: ' + (e as Error).message)
    }
    setGenerating(false)
  }

  async function openReport(r: any) {
    if (r.download_url && !r.content) {
      window.open(r.download_url, '_blank')
      return
    }
    if (r.content) {
      setViewReport(r)
      return
    }
    const full = await db.reports.get(r.id)
    if (full?.download_url && !full?.content) {
      window.open(full.download_url, '_blank')
      return
    }
    setViewReport(full || r)
  }

  async function emailReport(r: any) {
    const to = emailTo.trim() || prompt('Send report to email:') || ''
    if (!to) return
    setEmailing(true)
    try {
      const result = await db.reports.email(r.id, to)
      if (result.sent) {
        alert(`Report emailed to ${to}`)
      } else if (result.mailto_url) {
        window.open(result.mailto_url, '_blank')
      }
    } catch (e) {
      alert('Email failed: ' + (e as Error).message)
    }
    setEmailing(false)
  }

  async function deleteReport(id: string) {
    if (!confirm('Delete this report?')) return
    await db.reports.delete(id)
    setReports(prev => prev.filter(r => r.id !== id))
    if (viewReport?.id === id) setViewReport(null)
  }

  if (loading) return <div className="text-surface-500">Loading reports...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Report Generator</h1>
          <p className="text-sm text-surface-500">
            {project ? `Reports for ${project.name}.` : 'Project summaries and client deliverables.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="Client email for reports"
            className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs outline-none w-48" />
          <span className="text-xs text-surface-500 px-3 py-1 rounded-full bg-white/[0.04]">
            {files.length} source file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="glass rounded-xl border border-white/[0.04] p-4">
          <h3 className="text-sm font-semibold mb-3">Include files in report</h3>
          <div className="flex flex-wrap gap-2">
            {files.map(f => (
              <button key={f.id} onClick={() => toggleFile(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  selectedFileIds.includes(f.id) || selectedFileIds.length === 0
                    ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                    : 'bg-white/[0.04] border-white/[0.06] text-surface-400'
                }`}>
                {selectedFileIds.length === 0 ? '✓ ' : selectedFileIds.includes(f.id) ? '✓ ' : ''}{f.filename}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-surface-600 mt-2">
            {selectedFileIds.length === 0 ? 'All files included by default' : `${selectedFileIds.length} file(s) selected`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { type: 'boundary', label: 'Boundary Survey', icon: '📏', desc: 'Property lines, corners, evidence' },
          { type: 'topographic', label: 'Topographic', icon: '⛰️', desc: 'Contours, features, DTM' },
          { type: 'alta', label: 'ALTA/NSPS', icon: '📋', desc: 'Land title survey' },
          { type: 'construction', label: 'Construction', icon: '🏗️', desc: 'Staking, control, as-built' },
        ].map(t => (
          <button key={t.type} onClick={() => generateReport(t.type)} disabled={generating}
            className="glass rounded-xl p-5 border border-white/[0.04] hover:border-brand-500/20 transition-all text-left disabled:opacity-50">
            <div className="text-2xl mb-2">{t.icon}</div>
            <h3 className="font-semibold text-sm">{t.label}</h3>
            <p className="text-xs text-surface-500 mt-1">{t.desc}</p>
            {generating && <p className="text-[10px] text-brand-400 mt-2">Generating...</p>}
          </button>
        ))}
      </div>

      <div className="glass rounded-xl border border-white/[0.04] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold">Generated Reports ({reports.length})</h3>
        </div>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-sm text-surface-500">
            No reports yet. Select files above and click a report type to generate.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.02]">
            {reports.map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-xs text-surface-500">
                    {r.report_type} · {new Date(r.created_at).toLocaleString()}
                    {r.file_ids?.length ? ` · ${r.file_ids.length} file(s)` : ''}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openReport(r)} className="px-3 py-1.5 text-xs bg-brand-500/10 text-brand-300 rounded-lg">View</button>
                  <button onClick={() => emailReport(r)} disabled={emailing}
                    className="px-3 py-1.5 text-xs bg-violet-500/10 text-violet-300 rounded-lg disabled:opacity-50">Email</button>
                  <button onClick={() => downloadReportContent(r.title, r.content || '')}
                    disabled={!r.content}
                    className="px-3 py-1.5 text-xs bg-white/[0.04] rounded-lg disabled:opacity-40">Download</button>
                  <button onClick={() => deleteReport(r.id)} className="px-3 py-1.5 text-xs bg-rose-500/10 text-rose-400 rounded-lg">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setViewReport(null)}>
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-white/[0.04] flex justify-between items-start gap-3">
              <div>
                <h2 className="text-lg font-bold">{viewReport.title}</h2>
                <p className="text-xs text-surface-500 mt-1">{viewReport.report_type} · {new Date(viewReport.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setViewReport(null)} className="text-surface-400 hover:text-white">✕</button>
            </div>
            <pre className="flex-1 overflow-y-auto p-6 text-xs text-surface-300 whitespace-pre-wrap font-mono leading-relaxed">
              {viewReport.content || 'No content stored for this report.'}
            </pre>
            <div className="px-6 py-4 border-t border-white/[0.04] flex gap-2 flex-wrap">
              {viewReport.download_url && (
                <a href={viewReport.download_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl text-sm font-semibold text-center">
                  Open PDF
                </a>
              )}
              <button onClick={() => emailReport(viewReport)} disabled={emailing}
                className="flex-1 py-2.5 bg-violet-500/20 text-violet-300 rounded-xl text-sm font-semibold disabled:opacity-50">
                Email Report
              </button>
              <button onClick={() => downloadReportContent(viewReport.title, viewReport.content || '')}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 rounded-xl text-sm font-semibold">
                Download .txt
              </button>
              <button onClick={() => setViewReport(null)} className="px-4 py-2.5 bg-white/[0.04] rounded-xl text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}