import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (configured) return configured.replace(/\/$/, '')

  // Dev / preview: use same-origin so Vite proxy forwards /api → backend:3001
  if (import.meta.env.DEV || import.meta.env.MODE === 'preview') return ''

  // Production build served without proxy: hit backend on same host
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001`
  }
  return 'http://localhost:3001'
}

export const API_BASE_URL = resolveApiBaseUrl()