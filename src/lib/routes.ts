export type ProjectTab = 'overview' | 'files' | 'timeline' | 'map' | 'brain' | 'reports'

export function projectRoute(projectId: string, tab?: ProjectTab, resourceId?: string) {
  if (!tab || tab === 'overview') return `#project/${projectId}`
  if (resourceId) return `#project/${projectId}/${tab}/${resourceId}`
  return `#project/${projectId}/${tab}`
}

export function parseRoute(hash: string): {
  page: 'home' | 'dashboard' | 'project'
  projectId?: string
  projectTab?: ProjectTab
  resourceId?: string
} {
  const route = hash || '#home'
  const dashboardPath = route.split('?')[0]
  if (dashboardPath === '#dashboard') return { page: 'dashboard' }
  const match = route.match(/^#project\/([^/]+)(?:\/(\w+))?(?:\/([^/?]+))?$/)
  if (match) {
    const tab = match[2] as ProjectTab | undefined
    const valid: ProjectTab[] = ['overview', 'files', 'timeline', 'map', 'brain', 'reports']
    return {
      page: 'project',
      projectId: match[1],
      projectTab: tab && valid.includes(tab) ? tab : 'overview',
      resourceId: match[3] || undefined,
    }
  }
  return { page: 'home' }
}