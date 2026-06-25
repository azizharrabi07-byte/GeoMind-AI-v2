import { useState, useEffect } from 'react'
import { db } from '../../lib/data'
import { projectRoute } from '../../lib/routes'
import type { TabProps } from '../../lib/types'

export function ProjectsTab({ user }: TabProps) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editProject, setEditProject] = useState<any>(null)

  async function loadProjects() {
    setLoading(true)
    const data = await db.projects.list(user.id)
    setProjects(data || [])
    setLoading(false)
  }

  useEffect(() => { loadProjects() }, [user.id])

  async function deleteProject(id: string) {
    if (!confirm('Delete this project and all its files?')) return
    await db.projects.delete(id)
    loadProjects()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-surface-500">Create and manage your survey projects.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg text-sm font-semibold">
          + New Project
        </button>
      </div>

      {loading ? (
        <div className="text-surface-500">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-xl p-12 border border-white/[0.04] text-center">
          <div className="text-4xl mb-3">📁</div>
          <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-surface-500 mb-4">Create your first survey project to get started.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-brand-500 rounded-lg text-sm font-semibold">Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id}
              onClick={() => { window.location.hash = projectRoute(p.id) }}
              className="glass rounded-xl border border-white/[0.04] hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 transition-all cursor-pointer overflow-hidden group">
              <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-400/20 to-brand-600/20 flex items-center justify-center text-sm font-semibold text-brand-300">
                  {p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  p.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' :
                  p.status === 'review' ? 'text-amber-400 bg-amber-500/10' :
                  p.status === 'completed' ? 'text-blue-400 bg-blue-500/10' :
                  'text-surface-400 bg-white/[0.06]'
                }`}>{p.status}</span>
              </div>
              <h3 className="font-semibold mb-1">{p.name}</h3>
              <p className="text-xs text-surface-500 mb-3 line-clamp-2">{p.description || 'No description'}</p>
              <div className="flex items-center gap-3 text-xs text-surface-500 mb-4">
                {p.client_name && <span>👤 {p.client_name}</span>}
                {p.location && <span>📍 {p.location}</span>}
              </div>
              {p.progress > 0 && (
                <div className="mb-3">
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              )}
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditProject(p)} className="flex-1 px-3 py-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] rounded-lg">Edit</button>
                <button onClick={() => deleteProject(p.id)} className="px-3 py-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg">Delete</button>
              </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); window.location.hash = projectRoute(p.id) }}
                className="w-full px-5 py-5 bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-400 hover:to-brand-600 text-white text-base font-bold transition-all group-hover:brightness-110"
              >
                Click Card to Open Workspace →
              </button>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editProject) && (
        <ProjectModal
          project={editProject}
          userId={user.id}
          onClose={() => { setShowCreate(false); setEditProject(null) }}
          onSaved={(saved, wasCreate) => {
            setShowCreate(false)
            setEditProject(null)
            loadProjects()
            if (saved && wasCreate) {
              window.location.hash = projectRoute(saved.id)
            }
          }}
        />
      )}
    </div>
  )
}

function ProjectModal({ project, userId, onClose, onSaved }: { project: any; userId: string; onClose: () => void; onSaved: (saved?: any, wasCreate?: boolean) => void }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'active',
    client_name: project?.client_name || '',
    location: project?.location || '',
    coordinate_system: project?.coordinate_system || '',
    progress: project?.progress || 0,
    due_date: project?.due_date || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      let saved
      if (project) {
        saved = await db.projects.update(project.id, form)
      } else {
        saved = await db.projects.create({ ...form, user_id: userId })
      }
      onSaved(saved, !project)
    } catch (e) {
      alert('Error saving project: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white">✕</button>
        </div>
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Project Name *"
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500/40" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description"
            rows={2} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500/40" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Client Name"
              className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500/40" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location"
              className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500/40" />
            <input value={form.coordinate_system} onChange={e => setForm({ ...form, coordinate_system: e.target.value })} placeholder="CRS (e.g., NAD83 / UTM 17N)"
              className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500">Progress: {form.progress}%</label>
              <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm({ ...form, progress: parseInt(e.target.value) })}
                className="w-full accent-brand-500" />
            </div>
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
              className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-white/[0.04] rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}