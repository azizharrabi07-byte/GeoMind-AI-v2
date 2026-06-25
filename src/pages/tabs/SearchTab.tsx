import { useState, type ReactNode } from 'react'
import { db } from '../../lib/data'
import { projectRoute } from '../../lib/routes'

export function SearchTab({ user }: { user: any }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function runSearch(q: string) {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults(null)
      return
    }
    setLoading(true)
    try {
      const data = await db.search.query(trimmed)
      setResults(data)
    } catch {
      setResults({ query: trimmed, projects: [], files: [], reports: [], activities: [], total: 0 })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Smart Search</h1>
        <p className="text-sm text-surface-500">
          Search across projects, files, reports, and timeline events firm-wide.
        </p>
      </div>

      <div className="glass rounded-xl border border-white/[0.04] p-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch(query)}
          placeholder="Search projects, files, clients, locations, reports..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500/40"
          autoFocus
        />
        <button onClick={() => runSearch(query)} disabled={loading || !query.trim()}
          className="mt-3 px-4 py-2 bg-brand-500 hover:bg-brand-400 rounded-lg text-sm font-semibold disabled:opacity-50">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {!results && !loading && (
        <div className="text-center py-12 text-sm text-surface-500">
          <div className="text-4xl mb-3">🔍</div>
          <p>Search your entire survey knowledge base — projects, files, and reports.</p>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <p className="text-xs text-surface-500">{results.total} result(s) for "{results.query}"</p>

          <ResultSection title={`Projects (${results.projects?.length || 0})`}>
            {(results.projects || []).map((p: any) => (
              <a key={p.id} href={`#${projectRoute(p.id, 'overview')}`}
                className="block glass rounded-xl px-5 py-3 border border-white/[0.04] hover:border-brand-500/20">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {[p.client_name, p.location, p.status].filter(Boolean).join(' · ')}
                </div>
              </a>
            ))}
          </ResultSection>

          <ResultSection title={`Files (${results.files?.length || 0})`}>
            {(results.files || []).map((f: any) => (
              <a key={f.id} href={f.project_id ? `#${projectRoute(f.project_id, 'files', f.id)}` : '#dashboard'}
                className="block glass rounded-xl px-5 py-3 border border-white/[0.04] hover:border-brand-500/20">
                <div className="text-sm font-medium">{f.filename}</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {f.file_ext?.toUpperCase()} · {(f.file_size / 1024).toFixed(1)} KB
                </div>
              </a>
            ))}
          </ResultSection>

          <ResultSection title={`Reports (${results.reports?.length || 0})`}>
            {(results.reports || []).map((r: any) => (
              <a key={r.id} href={r.project_id ? `#${projectRoute(r.project_id, 'reports', r.id)}` : '#dashboard'}
                className="block glass rounded-xl px-5 py-3 border border-white/[0.04] hover:border-brand-500/20">
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-xs text-surface-500 mt-0.5">{r.report_type}</div>
              </a>
            ))}
          </ResultSection>

          <ResultSection title={`Timeline (${results.activities?.length || 0})`}>
            {(results.activities || []).map((a: any) => (
              <div key={a.id} className="glass rounded-xl px-5 py-3 border border-white/[0.04]">
                <div className="text-sm">{a.description}</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </ResultSection>

          {results.total === 0 && (
            <p className="text-center text-sm text-surface-500 py-8">No results found.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}