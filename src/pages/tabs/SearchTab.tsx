import { useState, useEffect, type ReactNode } from 'react'
import { db } from '../../lib/data'

export function SearchTab({ user }: { user: any }) {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([db.projects.list(user.id), db.files.list(user.id)]).then(([p, f]) => {
      setProjects(p)
      setFiles(f)
      setLoading(false)
    })
  }, [user.id])

  const q = query.trim().toLowerCase()

  const projectResults = q
    ? projects.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
    : []

  const fileResults = q
    ? files.filter(f =>
        f.filename?.toLowerCase().includes(q) ||
        f.file_ext?.toLowerCase().includes(q)
      )
    : []

  if (loading) return <div className="text-surface-500">Loading search...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Smart Search</h1>
        <p className="text-sm text-surface-500">
          Search across projects, files, reports, locations, and clients.
        </p>
      </div>

      <div className="glass rounded-xl border border-white/[0.04] p-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search projects, files, clients, locations..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500/40"
          autoFocus
        />
      </div>

      {!q ? (
        <div className="text-center py-12 text-sm text-surface-500">
          <div className="text-4xl mb-3">🔍</div>
          <p>Start typing to search your project knowledge base.</p>
          <p className="text-xs mt-2 text-surface-600">
            Full-text search inside files and cross-project semantic search — coming with backend AI.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ResultSection title={`Projects (${projectResults.length})`} empty="No matching projects">
            {projectResults.map(p => (
              <div key={p.id} className="glass rounded-xl px-5 py-3 border border-white/[0.04]">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {[p.client_name, p.location, p.status].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))}
          </ResultSection>

          <ResultSection title={`Files (${fileResults.length})`} empty="No matching files">
            {fileResults.map(f => (
              <div key={f.id} className="glass rounded-xl px-5 py-3 border border-white/[0.04]">
                <div className="text-sm font-medium">{f.filename}</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {f.file_ext?.toUpperCase()} · {(f.file_size / 1024).toFixed(1)} KB
                </div>
              </div>
            ))}
          </ResultSection>

          {projectResults.length === 0 && fileResults.length === 0 && (
            <p className="text-center text-sm text-surface-500 py-8">No results for "{query}"</p>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({ title, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  if (!hasChildren) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}