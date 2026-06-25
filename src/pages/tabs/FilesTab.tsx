import { useState, useEffect, useRef } from 'react'
import { db } from '../../lib/data'
import type { TabProps } from '../../lib/types'
import { readFilePreview, fileTypeDescription } from '../../lib/filePreview'

const FILE_ICONS: Record<string, string> = {
  csv: '📊', dxf: '📐', geojson: '🗺️', json: '📋', pdf: '📄',
  xlsx: '📗', xls: '📗', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', txt: '📝',
}

export function FilesTab({ user, projectId, project, resourceId, onNavigate }: TabProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<any>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadFiles() {
    setLoading(true)
    const data = await db.files.list(user.id, projectId)
    setFiles(data || [])
    if (data?.length && !selectedId) {
      selectFile(data[0])
    }
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [user.id, projectId])

  useEffect(() => {
    if (resourceId && files.length) {
      const f = files.find(x => x.id === resourceId)
      if (f) selectFile(f)
    }
  }, [resourceId, files])

  async function selectFile(file: any) {
    setSelectedId(file.id)
    setPreviewImage(file.preview_image || null)
    const data = await db.files.get(file.id)
    setSelectedDetail(data)
    if (data?.file?.preview_image) setPreviewImage(data.file.preview_image)
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    for (const file of Array.from(fileList)) {
      try {
        const preview = await readFilePreview(file)
        const result = await db.files.upload(file, projectId, preview.text, preview.imageData)
        if (preview.imageUrl) setPreviewImage(preview.imageUrl)
        if (result?.file) {
          setSelectedId(result.file.id)
          setSelectedDetail({ file: result.file, analysis: result.analysis })
          if (result.file.preview_image) setPreviewImage(result.file.preview_image)
        }
      } catch (e) {
        alert(`Failed to upload ${file.name}: ${(e as Error).message}`)
      }
    }
    setUploading(false)
    loadFiles()
  }

  async function generateFileReport() {
    if (!sel) return
    setGeneratingReport(true)
    try {
      const result = await db.reports.generate({
        report_type: 'boundary',
        title: `${sel.filename} — File Analysis Report`,
        project_id: projectId,
        file_ids: [sel.id],
      })
      onNavigate?.('reports', result.report?.id)
    } catch (e) {
      alert('Failed to generate report: ' + (e as Error).message)
    }
    setGeneratingReport(false)
  }

  async function deleteFile(id: string) {
    if (!confirm('Delete this file?')) return
    await db.files.delete(id)
    if (selectedId === id) { setSelectedId(null); setSelectedDetail(null); setPreviewImage(null) }
    loadFiles()
  }

  const sel = selectedDetail?.file
  const ext = sel?.file_ext || ''
  const icon = FILE_ICONS[ext] || '📁'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Files</h1>
        <p className="text-sm text-surface-500">
          {project ? `Project files for ${project.name}` : 'Upload and preview survey files'}
        </p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
        onDrop={e => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files) }}
        className={`glass rounded-xl border-2 border-dashed p-6 text-center transition-all ${dragActive ? 'border-brand-500 bg-brand-500/5' : 'border-white/[0.08]'}`}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden"
          onChange={e => handleUpload(e.target.files)}
          accept=".pdf,.csv,.xlsx,.xls,.dxf,.geojson,.json,.png,.jpg,.jpeg,.tiff,.txt" />
        <p className="font-medium text-sm mb-2">{uploading ? 'Uploading & analyzing...' : 'Drag files here or click to browse'}</p>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 rounded-lg text-sm font-semibold disabled:opacity-50">
          {uploading ? 'Processing...' : 'Select Files'}
        </button>
      </div>

      {loading ? (
        <div className="text-surface-500">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-surface-500 text-sm">No files yet. Upload DXF, CSV, GeoJSON, PDF, or images.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
          <div className="lg:col-span-2 glass rounded-xl border border-white/[0.04] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.04] text-sm font-semibold">{files.length} Files</div>
            <div className="divide-y divide-white/[0.02] max-h-[480px] overflow-y-auto">
              {files.map(f => (
                <button key={f.id} onClick={() => selectFile(f)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${selectedId === f.id ? 'bg-brand-500/10 border-l-2 border-brand-400' : ''}`}>
                  <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center text-lg flex-shrink-0">
                    {FILE_ICONS[f.file_ext] || '📁'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate font-medium">{f.filename}</div>
                    <div className="text-xs text-surface-500 truncate">{fileTypeDescription(f.file_ext)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 glass rounded-xl border border-white/[0.04] overflow-hidden flex flex-col min-h-[360px]">
            {!sel ? (
              <div className="flex-1 flex items-center justify-center text-surface-500 text-sm p-8">
                Select a file to see what it is and preview its contents
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-white/[0.04] flex justify-between items-start gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center text-2xl flex-shrink-0">{icon}</div>
                    <div className="min-w-0">
                      <h2 className="font-bold truncate">{sel.filename}</h2>
                      <p className="text-sm text-surface-400 mt-1">{fileTypeDescription(sel.file_ext)}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-white/[0.06]">{sel.file_ext?.toUpperCase()}</span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.06]">{(sel.file_size / 1024).toFixed(1)} KB</span>
                        <span className={`px-2 py-0.5 rounded ${sel.status === 'analyzed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.06]'}`}>{sel.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={generateFileReport} disabled={generatingReport}
                      className="text-xs text-violet-300 px-3 py-1.5 bg-violet-500/10 rounded-lg disabled:opacity-50">
                      {generatingReport ? '...' : 'Report'}
                    </button>
                    <button onClick={() => deleteFile(sel.id)} className="text-xs text-rose-400 px-3 py-1.5 bg-rose-500/10 rounded-lg">Delete</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {(previewImage || sel.preview_image) && (
                    <div>
                      <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">Image Preview</h4>
                      <img src={previewImage || sel.preview_image} alt="preview"
                        className="max-h-56 rounded-lg border border-white/[0.06] object-contain bg-black/20" />
                    </div>
                  )}

                  {ext === 'pdf' && !previewImage && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <p className="text-sm text-surface-400">PDF document — survey report or legal description</p>
                      <p className="text-xs text-surface-600 mt-1">Full PDF viewer in Phase 2</p>
                    </div>
                  )}

                  {sel.preview_text && !sel.preview_text.startsWith('[Image') && (
                    <div>
                      <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">File Content Preview</h4>
                      <pre className="text-xs text-surface-300 bg-black/30 rounded-lg p-4 overflow-x-auto max-h-56 whitespace-pre-wrap font-mono">
                        {sel.preview_text}
                      </pre>
                    </div>
                  )}

                  {sel.preview_text?.startsWith('[Image') && !previewImage && !sel.preview_image && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                      <div className="text-3xl mb-2">🖼️</div>
                      <p className="text-sm text-surface-400">{sel.preview_text}</p>
                      <p className="text-xs text-surface-600 mt-1">Re-upload to refresh image preview</p>
                    </div>
                  )}

                  {selectedDetail?.analysis && (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">AI Summary</h4>
                        <p className="text-sm text-surface-300">{selectedDetail.analysis.summary}</p>
                      </div>
                      {selectedDetail.analysis.warnings?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-rose-400 uppercase mb-2">Anomalies</h4>
                          {selectedDetail.analysis.warnings.map((w: string, i: number) => (
                            <div key={i} className="text-xs bg-rose-500/10 border border-rose-500/20 rounded p-2 text-rose-300 mb-1">{w}</div>
                          ))}
                        </div>
                      )}
                      {selectedDetail.analysis.insights?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Insights</h4>
                          {selectedDetail.analysis.insights.map((ins: string, i: number) => (
                            <div key={i} className="text-xs bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-emerald-300 mb-1">{ins}</div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}