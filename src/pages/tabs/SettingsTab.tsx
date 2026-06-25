import { useState, useEffect } from 'react'
import { db } from '../../lib/data'

const INTEGRATION_PROVIDERS = [
  { id: 'google_drive', label: 'Google Drive', desc: 'Sync survey files from Drive folders', icon: '📁' },
  { id: 'onedrive', label: 'OneDrive', desc: 'Enterprise document sync (Microsoft 365)', icon: '☁️' },
  { id: 'outlook', label: 'Outlook', desc: 'Link client emails to project timeline', icon: '📧' },
]

export function SettingsTab({ user }: { user: any }) {
  const [profile, setProfile] = useState<any>(null)
  const [prefs, setPrefs] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      db.profiles.get(user.id),
      db.preferences.get(),
      db.integrations.list(),
    ]).then(([p, pr, ints]) => {
      setProfile(p || {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        license_number: '',
        firm_name: '',
        default_crs: 'EPSG:32632',
        report_template: 'boundary',
      })
      setPrefs(pr)
      setIntegrations(ints || [])
    })
  }, [user.id])

  async function save() {
    if (!profile || !prefs) return
    setSaving(true)
    await Promise.all([
      db.profiles.update(user.id, {
        full_name: profile.full_name,
        license_number: profile.license_number,
        firm_name: profile.firm_name,
        default_crs: profile.default_crs,
        report_template: profile.report_template,
      }),
      db.preferences.update({
        auto_analyze_uploads: prefs.auto_analyze_uploads,
        proactive_flagging: prefs.proactive_flagging,
        report_suggestions: prefs.report_suggestions,
        notification_email: prefs.notification_email,
      }),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleIntegration(provider: string) {
    const existing = integrations.find(i => i.provider === provider)
    if (existing?.is_connected) {
      await db.integrations.disconnect(existing.id)
      setIntegrations(prev => prev.filter(i => i.id !== existing.id))
    } else {
      const result = await db.integrations.connect({
        provider,
        access_token: 'demo_token',
        provider_email: user.email,
        settings: { sync_folder: 'GeoMind Imports' },
      })
      setIntegrations(prev => [...prev, { ...result, provider, is_connected: true }])
    }
  }

  if (!profile || !prefs) return <div className="text-surface-500">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-surface-500">Profile, integrations, AI preferences, and notifications.</p>
      </div>

      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">Profile</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-lg font-bold">
            {(profile.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium">{profile.full_name || profile.email}</div>
            <div className="text-xs text-surface-500">{profile.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" value={profile.full_name || ''} onChange={v => setProfile({ ...profile, full_name: v })} />
          <Field label="License Number" value={profile.license_number || ''} onChange={v => setProfile({ ...profile, license_number: v })} />
          <Field label="Firm Name" value={profile.firm_name || ''} onChange={v => setProfile({ ...profile, firm_name: v })} />
          <Field label="Default CRS" value={profile.default_crs || ''} onChange={v => setProfile({ ...profile, default_crs: v })} />
          <Field label="Notification Email" value={prefs.notification_email || ''} onChange={v => setPrefs({ ...prefs, notification_email: v })} />
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">AI Preferences</h3>
        <div className="space-y-3">
          <Toggle label="Auto-analyze uploads" desc="Run AI analysis on new file uploads"
            on={prefs.auto_analyze_uploads} onChange={v => setPrefs({ ...prefs, auto_analyze_uploads: v })} />
          <Toggle label="Proactive error flagging" desc="Flag potential survey data issues"
            on={prefs.proactive_flagging} onChange={v => setPrefs({ ...prefs, proactive_flagging: v })} />
          <Toggle label="Report suggestions" desc="Suggest report content from project data"
            on={prefs.report_suggestions} onChange={v => setPrefs({ ...prefs, report_suggestions: v })} />
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">Integrations</h3>
        <div className="space-y-3">
          {INTEGRATION_PROVIDERS.map(p => {
            const connected = integrations.some(i => i.provider === p.id && i.is_connected)
            return (
              <div key={p.id} className="flex items-center justify-between py-2 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-surface-500">{p.desc}</div>
                  </div>
                </div>
                <button onClick={() => toggleIntegration(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${
                    connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-surface-300'
                  }`}>
                  {connected ? 'Connected' : 'Connect'}
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-surface-600 mt-3">OAuth flows for Drive/OneDrive ship in Phase 4. Demo connect stores integration record.</p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving}
          className="px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
      </div>

      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-2">Account</h3>
        <div className="text-xs text-surface-500 space-y-1">
          <div>User ID: {user.id}</div>
          <div>Mode: Supabase API (Phase 3)</div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-surface-500 mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500/40" />
    </div>
  )
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm">{label}</div>
        <div className="text-xs text-surface-500">{desc}</div>
      </div>
      <button onClick={() => onChange(!on)}
        className={`w-9 h-5 rounded-full relative transition-colors ${on ? 'bg-brand-500' : 'bg-white/[0.06]'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  )
}