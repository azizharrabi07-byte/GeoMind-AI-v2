import { useState, useEffect } from 'react'
import { db } from '../../lib/data'

export function SettingsTab({ user }: { user: any }) {
  const [profile, setProfile] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    db.profiles.get(user.id).then(data => {
      setProfile(data || {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        license_number: '',
        firm_name: '',
        default_crs: 'EPSG:32632',
        report_template: 'boundary',
      })
    })
  }, [user.id])

  async function save() {
    if (!profile) return
    setSaving(true)
    await db.profiles.update(user.id, {
      full_name: profile.full_name,
      license_number: profile.license_number,
      firm_name: profile.firm_name,
      default_crs: profile.default_crs,
      report_template: profile.report_template,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!profile) return <div className="text-surface-500">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-surface-500">Profile, integrations (AutoCAD, QGIS, Drive, Email), and workspace preferences.</p>
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
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-xs text-emerald-400">✓ Saved</span>}
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">AI Preferences</h3>
        <div className="space-y-3">
          {[
            { label: 'Auto-analyze uploads', desc: 'Run AI analysis automatically on new files', on: true },
            { label: 'Proactive error flagging', desc: 'Flag potential survey blunders', on: true },
            { label: 'Report suggestions', desc: 'Suggest report content based on project data', on: false },
          ].map(p => (
            <div key={p.label} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm">{p.label}</div>
                <div className="text-xs text-surface-500">{p.desc}</div>
              </div>
              <div className={`w-9 h-5 rounded-full relative ${p.on ? 'bg-brand-500' : 'bg-white/[0.06]'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${p.on ? 'left-4' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-600 mt-3">Preference toggles will be functional when the backend is connected.</p>
      </div>

      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">Account</h3>
        <div className="text-xs text-surface-500 space-y-1">
          <div>User ID: {user.id}</div>
          <div>Email: {user.email}</div>
          <div>Mode: MVP Preview (local storage)</div>
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