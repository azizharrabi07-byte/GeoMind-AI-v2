/**
 * Unified data access layer.
 * MVP uses localStorage mock; set VITE_USE_MOCK=false to use FastAPI backend.
 */
import {
  mockProjects, mockFiles, mockGis, mockChat,
  mockActivities, mockProfiles, mockReports,
} from './mockStore'
import { API_BASE_URL } from './supabase'
import { getAccessToken } from './auth'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** Mock data lives in browser localStorage under this key (see mockStore.ts) */
export const MOCK_STORAGE_KEY = 'geomind-v2-data'

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  const token = await getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

function apiListPath(base: string, projectId?: string) {
  return projectId ? `${base}/?project_id=${projectId}` : `${base}/`
}

export const db = {
  projects: {
    list: (userId: string) => USE_MOCK
      ? Promise.resolve(mockProjects.list(userId))
      : apiFetch('/api/projects/'),
    get: (id: string) => USE_MOCK
      ? Promise.resolve(mockProjects.get(id))
      : apiFetch(`/api/projects/${id}`),
    count: (userId: string) => USE_MOCK
      ? Promise.resolve(mockProjects.count(userId))
      : apiFetch('/api/projects/').then((d: any[]) => d.length),
    create: (data: any) => USE_MOCK
      ? Promise.resolve(mockProjects.create(data))
      : apiFetch('/api/projects/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => USE_MOCK
      ? Promise.resolve(mockProjects.update(id, data))
      : apiFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => USE_MOCK
      ? Promise.resolve(mockProjects.delete(id))
      : apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
  },

  files: {
    list: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockFiles.list(userId, projectId))
      : apiFetch(apiListPath('/api/files', projectId)),
    count: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockFiles.count(userId, projectId))
      : apiFetch(apiListPath('/api/files', projectId)).then((d: any[]) => d.length),
    get: (id: string) => USE_MOCK
      ? Promise.resolve(mockFiles.get(id))
      : apiFetch(`/api/files/${id}`),
    upload: (file: File, projectId?: string, previewText?: string, previewImage?: string) => USE_MOCK
      ? mockFiles.upload(file, projectId, previewText, previewImage)
      : (() => {
          const formData = new FormData()
          formData.append('file', file)
          if (projectId) formData.append('project_id', projectId)
          return apiFetch('/api/files/upload', { method: 'POST', body: formData }).then((r: any) => ({
            file: r.file || r,
            analysis: r.analysis || null,
          }))
        })(),
    delete: (id: string) => USE_MOCK
      ? Promise.resolve(mockFiles.delete(id))
      : apiFetch(`/api/files/${id}`, { method: 'DELETE' }),
    restoreVersion: (versionId: string) => USE_MOCK
      ? Promise.resolve(mockFiles.restoreVersion(versionId))
      : apiFetch(`/api/files/versions/${versionId}/restore`, { method: 'POST' }),
    getVersion: (versionId: string) => USE_MOCK
      ? Promise.resolve(mockFiles.getVersion(versionId))
      : apiFetch(`/api/files/versions/${versionId}`),
  },

  gis: {
    list: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockGis.list(userId, projectId))
      : apiFetch(apiListPath('/api/gis', projectId)),
    create: (data: any) => USE_MOCK
      ? Promise.resolve(mockGis.create(data))
      : apiFetch('/api/gis/', { method: 'POST', body: JSON.stringify(data) }),
    clear: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockGis.clear(userId, projectId))
      : apiFetch(apiListPath('/api/gis', projectId), { method: 'DELETE' }),
    update: (id: string, data: any) => USE_MOCK
      ? Promise.resolve(mockGis.update(id, data))
      : apiFetch(`/api/gis/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => USE_MOCK
      ? Promise.resolve(mockGis.delete(id))
      : apiFetch(`/api/gis/${id}`, { method: 'DELETE' }),
    restoreSnapshot: (snapshotId: string) => USE_MOCK
      ? Promise.resolve(mockGis.restoreSnapshot(snapshotId))
      : apiFetch(`/api/gis/snapshots/${snapshotId}/restore`, { method: 'POST' }),
    getSnapshot: (snapshotId: string) => USE_MOCK
      ? Promise.resolve(mockGis.getSnapshot(snapshotId))
      : apiFetch(`/api/gis/snapshots/${snapshotId}`),
  },

  chat: {
    listSessions: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockChat.listSessions(userId, projectId))
      : apiFetch(projectId ? `/api/chat/sessions?project_id=${projectId}` : '/api/chat/sessions'),
    getMessages: (sessionId: string) => USE_MOCK
      ? Promise.resolve(mockChat.getMessages(sessionId))
      : apiFetch(`/api/chat/sessions/${sessionId}`).then((r: any) => r.messages),
    messageCount: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(
          projectId
            ? mockChat.listSessions(userId, projectId).reduce((n, s) => n + (s.message_count || 0), 0)
            : mockChat.messageCount(userId)
        )
      : apiFetch('/api/chat/sessions').then((s: any[]) =>
          s.reduce((n, sess) => n + (sess.message_count || 0), 0)
        ),
    send: (data: any) => USE_MOCK
      ? Promise.resolve(mockChat.send(data))
      : apiFetch('/api/chat/', { method: 'POST', body: JSON.stringify(data) }),
  },

  activities: {
    list: (userId: string, limit = 10, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockActivities.list(userId, limit, projectId))
      : apiFetch(`/api/activities/?limit=${limit}${projectId ? `&project_id=${projectId}` : ''}`),
    get: (id: string) => USE_MOCK
      ? Promise.resolve(mockActivities.get(id))
      : apiFetch(`/api/activities/${id}`),
    count: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockActivities.count(userId, projectId))
      : apiFetch(`/api/activities/count${projectId ? `?project_id=${projectId}` : ''}`).then((r: any) => r.count ?? 0),
  },

  profiles: {
    get: (userId: string) => USE_MOCK
      ? Promise.resolve(mockProfiles.get(userId))
      : apiFetch('/api/auth/me'),
    update: (userId: string, data: any) => USE_MOCK
      ? Promise.resolve(mockProfiles.update(userId, data))
      : apiFetch('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  },

  reports: {
    listTemplates: () => USE_MOCK
      ? Promise.resolve(mockReports.listTemplates())
      : apiFetch('/api/reports/templates'),
    list: (userId: string, projectId?: string) => USE_MOCK
      ? Promise.resolve(mockReports.list(userId, projectId))
      : apiFetch(apiListPath('/api/reports', projectId)),
    generate: (data: any) => USE_MOCK
      ? Promise.resolve(mockReports.generate(data))
      : apiFetch('/api/reports/generate', { method: 'POST', body: JSON.stringify(data) }).then((r: any) => ({
        report: { ...r.report, download_url: r.download_url },
        download_url: r.download_url,
      })),
    get: (id: string) => USE_MOCK
      ? Promise.resolve(mockReports.get(id))
      : apiFetch(`/api/reports/${id}`),
    delete: (id: string) => USE_MOCK
      ? Promise.resolve(mockReports.delete(id))
      : apiFetch(`/api/reports/${id}`, { method: 'DELETE' }),
    email: (id: string, toEmail: string, message?: string) => USE_MOCK
      ? Promise.resolve({ sent: false, method: 'mailto', mailto_url: `mailto:${toEmail}` })
      : apiFetch(`/api/reports/${id}/email`, {
          method: 'POST',
          body: JSON.stringify({ to_email: toEmail, message: message || '' }),
        }),
  },

  mapAi: {
    send: (data: {
      message: string
      project_name?: string
      changes: any[]
      stats: { points: number; lines: number; polygons: number }
      project_id?: string
    }) => USE_MOCK
      ? Promise.resolve({ reply: 'Map AI requires API mode (VITE_USE_MOCK=false)' })
      : apiFetch('/api/map-ai/', { method: 'POST', body: JSON.stringify(data) }),
  },

  search: {
    query: (q: string, projectId?: string) => USE_MOCK
      ? Promise.resolve({
          query: q,
          projects: mockProjects.list('').filter((p: any) =>
            JSON.stringify(p).toLowerCase().includes(q.toLowerCase())
          ),
          files: mockFiles.list('').filter((f: any) =>
            (f.filename || '').toLowerCase().includes(q.toLowerCase())
          ),
          reports: [],
          activities: [],
          total: 0,
        })
      : apiFetch(`/api/search/?q=${encodeURIComponent(q)}${projectId ? `&project_id=${projectId}` : ''}`),
  },

  analytics: {
    get: (projectId?: string) => USE_MOCK
      ? Promise.resolve({
          projects: mockProjects.count(''),
          files: mockFiles.count(''),
          reports: 0,
          gis_features: 0,
          activities: 0,
          analyzed_files: 0,
          total_storage_mb: 0,
          file_types: {},
          project_status: {},
        })
      : apiFetch(projectId ? `/api/analytics/?project_id=${projectId}` : '/api/analytics/'),
  },

  preferences: {
    get: () => USE_MOCK
      ? Promise.resolve({
          auto_analyze_uploads: true,
          proactive_flagging: true,
          report_suggestions: false,
          notification_email: '',
        })
      : apiFetch('/api/preferences/'),
    update: (data: any) => USE_MOCK
      ? Promise.resolve(data)
      : apiFetch('/api/preferences/', { method: 'PUT', body: JSON.stringify(data) }),
  },

  integrations: {
    list: () => USE_MOCK
      ? Promise.resolve([])
      : apiFetch('/api/integrations/'),
    connect: (data: any) => USE_MOCK
      ? Promise.resolve({ ok: true })
      : apiFetch('/api/integrations/', { method: 'POST', body: JSON.stringify(data) }),
    disconnect: (id: string) => USE_MOCK
      ? Promise.resolve({ ok: true })
      : apiFetch(`/api/integrations/${id}`, { method: 'DELETE' }),
    sync: (provider: string) => USE_MOCK
      ? Promise.resolve({ ok: true, message: `Sync initiated for ${provider}` })
      : apiFetch(`/api/integrations/${provider}/sync`, { method: 'POST' }),
  },
}