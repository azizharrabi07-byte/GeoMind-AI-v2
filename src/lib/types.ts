export type User = {
  id: string
  email: string
  user_metadata?: { full_name?: string }
}

export type Project = {
  id: string
  name: string
  description?: string
  status: string
  client_name?: string
  location?: string
  coordinate_system?: string
  progress?: number
  due_date?: string
  user_id: string
  created_at?: string
  updated_at?: string
}

export type TabProps = {
  user: User
  projectId?: string
  project?: Project | null
  resourceId?: string
  onNavigate?: (tab: import('./routes').ProjectTab, resourceId?: string) => void
}