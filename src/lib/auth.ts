import { API_BASE_URL, supabase } from './supabase'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID || '4a382943-631c-4693-99e7-7b367f19501a'

export const FALLBACK_USER = {
  id: DEV_USER_ID,
  email: 'demo@geomind.ai',
  user_metadata: { full_name: 'Demo Surveyor' },
}

const API_TIMEOUT_MS = 8000

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function fetchCurrentUser(): Promise<typeof FALLBACK_USER & { apiOffline?: boolean }> {
  if (USE_MOCK) return FALLBACK_USER

  try {
    const health = await fetchWithTimeout(`${API_BASE_URL}/api/health`)
    if (!health.ok) return { ...FALLBACK_USER, apiOffline: true }
  } catch {
    return { ...FALLBACK_USER, apiOffline: true }
  }

  const token = await getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, { headers })
    if (res.status === 401) return FALLBACK_USER
    if (!res.ok) return { ...FALLBACK_USER, apiOffline: true }
    const profile = await res.json()
    return {
      id: profile.id,
      email: profile.email || 'demo@geomind.ai',
      user_metadata: { full_name: profile.full_name || 'Demo Surveyor' },
    }
  } catch {
    return { ...FALLBACK_USER, apiOffline: true }
  }
}

export async function isApiReachable(): Promise<boolean> {
  if (USE_MOCK) return true
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function requireAuth(): Promise<boolean> {
  if (USE_MOCK) return true
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}