import { PRODUCT, MODULES, INTEGRATIONS, WORKFLOW_STEPS } from '../lib/product'

export function LandingPage({ onNavigate }: { onNavigate: (r: string) => void }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const goToDashboard = () => onNavigate('#dashboard')

  return (
    <div className="min-h-screen bg-surface-950 text-white selection:bg-brand-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">G</div>
            <span className="font-semibold text-sm sm:text-lg">{PRODUCT.name}</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {['Modules', 'Architecture', 'Integrations', 'FAQ'].map((item) => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="text-sm text-surface-400 hover:text-white transition-colors">{item}</button>
            ))}
            <button onClick={goToDashboard} className="px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg text-sm font-semibold transition-all hover:from-brand-400 hover:to-brand-600">Open Workspace</button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs text-brand-300 mb-6 border border-brand-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-glow" />
              {PRODUCT.name} v{PRODUCT.version} — {PRODUCT.tagline}
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-[0.95] tracking-tight mb-6">
              The Operating System<br /><span className="gradient-text">for Survey Projects</span>
            </h1>
            <p className="text-base sm:text-xl text-surface-400 max-w-2xl leading-relaxed mb-8 sm:mb-10">
              Centralize files, maps, reports, communications, and project knowledge into one searchable workspace.
              AI assists with analysis and reporting — the product is the project system itself.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={goToDashboard} className="px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl font-semibold text-center hover:from-brand-400 hover:to-brand-600 transition-all">Open Project Workspace →</button>
              <button onClick={() => scrollTo('modules')} className="px-8 py-4 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-medium border border-white/[0.06]">See Modules</button>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-x-10 mt-12 sm:mt-16">
              {[{ v: '9', l: 'Core Modules' }, { v: '6+', l: 'Integrations' }, { v: 'OS', l: 'Not a CAD/GIS Tool' }, { v: 'MVP', l: 'Live Preview' }].map(s => (
                <div key={s.l}>
                  <div className="text-2xl sm:text-3xl font-bold">{s.v}</div>
                  <div className="text-xs sm:text-sm text-surface-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-20 sm:py-36 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs text-brand-300 mb-4 border border-brand-500/10">Core Modules</div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">One workspace. Every project.</h2>
            <p className="text-surface-400">GeoMind does not replace AutoCAD, QGIS, or Excel. It connects them into a searchable project operating system.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map(m => (
              <div key={m.id} className={`glass-light rounded-2xl p-6 border transition-all hover:-translate-y-1 ${
                m.id === 'chat' ? 'border-violet-500/20 hover:border-violet-500/30' : 'border-white/[0.04] hover:border-brand-500/20'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-2xl">{m.icon}</div>
                  {m.id === 'chat' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">AI Feature</span>}
                </div>
                <h3 className="font-semibold mb-2">{m.title}</h3>
                <p className="text-xs text-surface-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture / Hydrogram */}
      <section id="architecture" className="py-20 sm:py-36 relative bg-gradient-to-b from-surface-950 via-surface-900/30 to-surface-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">System Architecture</h2>
            <p className="text-surface-400">Your existing tools feed into GeoMind. GeoMind feeds your team.</p>
          </div>

          <div className="glass rounded-2xl border border-white/[0.06] p-6 sm:p-10 font-mono text-xs sm:text-sm text-surface-400 leading-relaxed overflow-x-auto">
            <pre className="whitespace-pre text-center">{`                   SURVEY PROJECT
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
      AutoCAD         QGIS           Excel
      DXF Files     GeoJSON      Survey Data
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                 Google Drive
                 OneDrive
                 Email Systems
                         ▼
═══════════════════════════════════════
                GEOMIND
═══════════════════════════════════════
         Project Workspace
                 │
         Version Control
                 │
          Project Timeline
                 │
           Smart Search
                 │
            GIS Viewer
                 │
         Report Generator
                 │
         AI Project Brain
═══════════════════════════════════════
                 ▼
          Survey Engineers
          Project Managers
            Survey Firms`}</pre>
          </div>

          <div className="mt-12 space-y-6">
            {WORKFLOW_STEPS.map(step => (
              <div key={step.n} className="flex gap-4 sm:gap-8 items-start">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{step.n}</div>
                <div className="pt-1">
                  <h3 className="font-semibold text-base sm:text-lg mb-1">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-surface-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-20 sm:py-36 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">Works with your tools</h2>
            <p className="text-surface-400">GeoMind is the intelligence layer above your existing workflow. You keep AutoCAD, QGIS, and Excel.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATIONS.map(tool => (
              <div key={tool.name} className="glass-light rounded-2xl p-6 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{tool.name}</h3>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">You still need it ✓</span>
                </div>
                <p className="text-xs text-brand-300 mb-2">{tool.role}</p>
                <p className="text-xs text-surface-400 leading-relaxed">{tool.integration}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-36 relative bg-gradient-to-b from-surface-950 via-surface-900/20 to-surface-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-12 text-center">FAQ</h2>
          <div className="space-y-3">
            {[
              { q: 'What is GeoMind?', a: PRODUCT.elevator },
              { q: 'Does GeoMind replace AutoCAD or QGIS?', a: 'No. GeoMind is not CAD or GIS software. It connects your existing tools and centralizes project knowledge. You still use AutoCAD for drawings and QGIS for geographic analysis.' },
              { q: 'Is GeoMind an AI product?', a: 'AI is a feature inside GeoMind — called Project Brain. It helps with search, summaries, and reporting. The core product is the Survey Project Operating System: workspace, timeline, version control, and integrations.' },
              { q: 'Who is GeoMind for?', a: 'Survey engineers who need organized files and faster reporting. Survey managers who need project visibility and historical access. Survey firms who need knowledge retention and standardized workflows.' },
              { q: 'What file formats are supported?', a: 'PDF, CSV, XLSX, DXF, GeoJSON, Shapefile, PNG/JPG, TXT, and more. Files are imported into the Project Workspace with version tracking and AI-assisted analysis.' },
            ].map(item => (
              <details key={item.q} className="glass-light rounded-xl border border-white/[0.04] p-5 group">
                <summary className="font-medium cursor-pointer list-none flex justify-between items-center">
                  {item.q}
                  <span className="text-surface-500 transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="text-sm text-surface-400 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">Transform disconnected projects into organized knowledge assets</h2>
          <p className="text-surface-400 mb-8">{PRODUCT.vision}</p>
          <button onClick={goToDashboard} className="px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl font-semibold hover:from-brand-400 hover:to-brand-600 transition-all">
            Open Project Workspace →
          </button>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">G</div>
              <span className="font-semibold">{PRODUCT.name}</span>
            </div>
            <p className="text-xs text-surface-500">{PRODUCT.tagline}</p>
          </div>
          <div className="text-xs text-surface-600">© 2026 {PRODUCT.name} · v{PRODUCT.version} · MVP Preview</div>
        </div>
      </footer>
    </div>
  )
}