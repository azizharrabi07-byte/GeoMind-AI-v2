import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { PRODUCT } from '../lib/product'

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('demo@geomind.ai')
  const [password, setPassword] = useState('DemoSurvey2026!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    onSuccess()
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-2xl border border-white/[0.08] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold">G</div>
          <div>
            <h1 className="text-xl font-bold">{PRODUCT.name}</h1>
            <p className="text-xs text-surface-500">Sign in to your workspace</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="Email" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500/40" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            placeholder="Password" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500/40" />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-[10px] text-surface-600 mt-4 text-center">
          Demo: demo@geomind.ai / DemoSurvey2026!
        </p>
        <button onClick={() => { window.location.hash = '#home' }} className="w-full mt-3 text-xs text-surface-500 hover:text-white">
          ← Back to site
        </button>
      </div>
    </div>
  )
}