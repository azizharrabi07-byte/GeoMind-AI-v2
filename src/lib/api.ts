/**
 * API client — backward-compatible re-exports from data layer.
 * Tabs should import from ./data directly; this file exists for legacy imports.
 */
import { db } from './data'
import { MOCK_USER_ID } from './mockStore'

export const projectsApi = db.projects
export const filesApi = db.files
export const chatApi = {
  listSessions: () => db.chat.listSessions(MOCK_USER_ID),
  getSession: (id: string) => db.chat.getMessages(id),
  send: db.chat.send,
  deleteSession: (_id: string) => Promise.resolve(),
}
export const gisApi = {
  list: () => db.gis.list(MOCK_USER_ID),
  create: db.gis.create,
  clear: () => db.gis.clear(MOCK_USER_ID),
}
export const reportsApi = {
  listTemplates: db.reports.listTemplates,
  list: () => db.reports.list(MOCK_USER_ID),
  generate: db.reports.generate,
  delete: db.reports.delete,
}
export const integrationsApi = {
  list: () => Promise.resolve([]),
  connect: (_data: any) => Promise.resolve({ status: 'connected' }),
  disconnect: (_id: string) => Promise.resolve({ status: 'disconnected' }),
  sync: (_provider: string) => Promise.resolve({ synced: 0 }),
}