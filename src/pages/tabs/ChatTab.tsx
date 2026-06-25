import { useState, useEffect, useRef } from 'react'
import { db } from '../../lib/data'
import type { TabProps } from '../../lib/types'

export function ChatTab({ user, projectId, project }: TabProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [mapFeatures, setMapFeatures] = useState<any[]>([])

  useEffect(() => {
    db.chat.listSessions(user.id, projectId).then(setSessions).catch(() => {})
    db.gis.list(user.id, projectId).then(setMapFeatures).catch(() => {})
  }, [user.id, projectId])

  useEffect(() => {
    if (!activeSession) return
    db.chat.getMessages(activeSession).then(setMessages)
  }, [activeSession])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const text = input
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text, created_at: new Date().toISOString() }])
    setLoading(true)
    try {
      const mapContext = {
        points: mapFeatures.filter(f => f.feature_type === 'point'),
        lines: mapFeatures.filter(f => f.feature_type === 'line'),
        polygons: mapFeatures.filter(f => f.feature_type === 'polygon'),
      }
      const res = await db.chat.send({
        message: text,
        session_id: activeSession,
        project_id: projectId || null,
        map_context: mapContext,
      })
      setMessages(m => [...m, { role: 'assistant', content: res.reply, commands: res.commands, created_at: new Date().toISOString() }])
      if (!activeSession) {
        setActiveSession(res.session_id)
        db.chat.listSessions(user.id, projectId).then(setSessions)
      }

      if (res.commands && res.commands.length > 0) {
        for (const cmd of res.commands) {
          try {
            if (cmd.type === 'add_point') {
              const saved = await db.gis.create({
                user_id: user.id,
                project_id: projectId || null,
                feature_type: 'point',
                geometry: { type: 'Point', coordinates: [cmd.lng, cmd.lat] },
                label: cmd.label || 'AI Point',
                description: cmd.description || '',
                elevation: cmd.elevation || null,
              })
              setMapFeatures(p => [...p, saved])
            } else if (cmd.type === 'clear_all') {
              await db.gis.clear(user.id, projectId)
              setMapFeatures([])
            }
          } catch {}
        }
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Sorry, I couldn't reach the AI engine.", created_at: new Date().toISOString() }])
    }
    setLoading(false)
  }

  function newSession() {
    setActiveSession(null)
    setMessages([])
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      <div className="w-56 flex-shrink-0 hidden md:block">
        <div className="glass rounded-xl border border-white/[0.04] h-full flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sessions</h3>
            <button onClick={newSession} className="text-xs text-brand-400">+ New</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <button key={s.id} onClick={() => setActiveSession(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${activeSession === s.id ? 'bg-brand-500/10 text-brand-300' : 'text-surface-400 hover:bg-white/[0.03]'}`}>
                <div className="truncate font-medium">{s.title || 'New Chat'}</div>
                <div className="text-[10px] text-surface-600">{s.message_count} messages</div>
              </button>
            ))}
            {sessions.length === 0 && <p className="text-xs text-surface-600 text-center py-4">No sessions yet</p>}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="glass rounded-xl border border-white/[0.04] flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[10px] font-bold">AI</div>
              <h3 className="text-sm font-semibold">Project Brain</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[10px] text-surface-500">{mapFeatures.length} map features</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-12 text-sm text-surface-500">
                <div className="text-4xl mb-3">🤖</div>
                <p className="font-medium mb-1">Project Brain</p>
                <p className="text-xs">
                  {project
                    ? `AI assistant for "${project.name}" — scoped to this project's files and map.`
                    : 'AI assists your project OS — open a project for scoped context.'}
                </p>
                <p className="text-xs mt-3 text-violet-400">Try: "Summarize uploaded files" or "What should I check on the map?"</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-surface-700 text-surface-300' : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                }`}>{msg.role === 'user' ? 'U' : 'AI'}</div>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-brand-500/20 text-brand-200' : 'bg-white/[0.04] text-surface-300'
                }`}>{msg.content}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-white/[0.04]">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about your project, map, or survey data..."
                className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/40"
              />
              <button onClick={sendMessage} disabled={loading}
                className="px-3 py-2 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg hover:from-brand-400 hover:to-brand-600 disabled:opacity-40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}