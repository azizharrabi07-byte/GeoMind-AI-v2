import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import GlobeScene from "./components/GlobeScene";

function useRevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("visible"); }); },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "glass border-b border-white/[0.04]" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm transition-transform group-hover:scale-105">G</div>
          <span className="font-display font-semibold text-sm sm:text-lg tracking-tight">GeoMind<span className="text-brand-400">AI</span></span>
        </a>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {["Features", "Workflow", "FAQ"].map((item) => (
            <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="text-sm text-surface-400 hover:text-white transition-colors duration-200">{item}</button>
          ))}
          <a href="#dashboard" className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-sm font-medium transition-all duration-200">Dashboard</a>
          <a href="#dashboard" className="px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-400 hover:to-brand-600 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-brand-500/20">Start</a>
        </nav>

        <button className="md:hidden text-white p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden glass border-b border-white/[0.04] px-4 py-4 space-y-3">
          {["Features", "Workflow", "FAQ"].map((item) => (
            <button key={item} onClick={() => { scrollTo(item.toLowerCase()); setMobileOpen(false); }} className="block w-full text-left text-sm text-surface-400 hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-all">{item}</button>
          ))}
          <div className="pt-2 space-y-2 border-t border-white/[0.04]">
            <a href="#dashboard" onClick={() => setMobileOpen(false)} className="block w-full text-center px-4 py-2.5 bg-white/[0.06] rounded-lg text-sm font-medium">Dashboard</a>
            <a href="#dashboard" onClick={() => setMobileOpen(false)} className="block text-center px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg text-sm font-semibold">Start</a>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroSection() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-950 pointer-events-none" />
      <div className="absolute inset-0 top-0 h-[50vh] sm:h-[70vh] opacity-20 sm:opacity-30">
        <Canvas camera={{ position: [0, 2, 6], fov: 45 }}>
          <GlobeScene scrollY={scrollY} />
        </Canvas>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16 sm:pb-20 w-full">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs sm:text-sm text-brand-300 mb-6 sm:mb-8 border border-brand-500/10 animate-float">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-400 animate-pulse-glow" />
            Introducing GeoMind AI v1.0
          </div>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-4 sm:mb-6">
            The AI Copilot<br /><span className="gradient-text">for Survey Engineers</span>
          </h1>
          <p className="text-base sm:text-xl text-surface-400 max-w-2xl leading-relaxed mb-8 sm:mb-10">
            Connect your total stations, GNSS rovers, and drones to an intelligent
            platform that organizes field data, detects anomalies, and generates
            client-ready reports in minutes — not hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a href="#dashboard" className="group px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-400 hover:to-brand-600 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 shadow-2xl shadow-brand-500/20 hover:shadow-brand-500/40 text-center inline-flex items-center">
              Start
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
            <button onClick={() => scrollTo("preview")} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-sm sm:text-base font-medium transition-all duration-200 border border-white/[0.06]">
              Watch Demo
            </button>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-x-10 sm:gap-y-4 mt-12 sm:mt-16">
            {[
              { value: "40+", label: "File Formats" },
              { value: "99.7%", label: "Detection Rate" },
              { value: "12x", label: "Faster Reports" },
              { value: "24/7", label: "AI Support" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-xl sm:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs sm:text-sm text-surface-500 mt-0.5 sm:mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-surface-950 to-transparent pointer-events-none" />
    </section>
  );
}

function FeaturesSection() {
  useRevealOnScroll();
  const features = [
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400"><path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" /></svg>, title: "AI Project Analysis", description: "Upload raw survey data and let AI extract metadata, detect anomalies, flag blunders, and suggest optimal processing workflows in seconds." },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" /></svg>, title: "Smart Report Generation", description: "Generate ALTA/NSPS, boundary, topographic, and construction staking reports with one click." },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>, title: "Survey Data Insights", description: "Visualize point clouds, traverse adjustments, GNSS baselines, and closure ratios. AI highlights outliers." },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400"><path d="M4 20h16" /><path d="M4 20V4" /><path d="M8 16V8" /><path d="M12 16v-4" /><path d="M16 16V6" /></svg>, title: "DXF / DWG Analysis", description: "Upload CAD files and AI extracts layers, blocks, coordinates, and annotations. No CAD software needed." },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /></svg>, title: "GIS Integration", description: "Seamlessly connect to MapLibre, Cesium, and your local CRS. Overlay data on aerial imagery and parcel maps." },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400"><path d="M12 2a10 10 0 1010 10" /><path d="M12 12l3.5-3.5" /><path d="M16 5h3v3" /></svg>, title: "Project Knowledge Base", description: "Every file, calculation, report, and AI conversation is indexed. Ask questions across your project history." },
  ];

  return (
    <section id="features" className="relative py-20 sm:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs text-brand-300 mb-4 sm:mb-6 border border-brand-500/10">Platform Features</div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-4 sm:mb-6">Everything a survey engineer needs</h2>
            <p className="text-sm sm:text-lg text-surface-400 leading-relaxed px-2">From raw field data to stamped deliverables — GeoMind AI connects every step of your workflow.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {features.map((feature, i) => (
            <div key={feature.title} className={`reveal ${["reveal-delay-1","reveal-delay-2","reveal-delay-3","reveal-delay-4","reveal-delay-1","reveal-delay-2"][i]}`}>
              <div className="group p-5 sm:p-8 rounded-2xl glass-light hover:glass transition-all duration-500 hover:-translate-y-1 hover:border-brand-500/20 border border-white/[0.04]">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-brand-500/20 transition-colors">{feature.icon}</div>
                <h3 className="font-display text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-white">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-surface-400 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  useRevealOnScroll();
  const steps = [
    { step: "01", title: "Upload Field Data", description: "Drag-and-drop raw files from any instrument. Auto-detected format, CRS, and point count.", color: "from-brand-500 to-brand-600" },
    { step: "02", title: "AI Analyzes & Organizes", description: "Anomalies flagged, metadata extracted, coordinates transformed. Ready for review in seconds.", color: "from-brand-400 to-brand-600" },
    { step: "03", title: "Review & Adjust", description: "Visual adjustment tools, traverse computation, QA/QC checks. AI suggests corrections.", color: "from-brand-400 to-brand-500" },
    { step: "04", title: "Generate Deliverables", description: "One-click report generation. Maps, tables, and certifications auto-populated and export-ready.", color: "from-brand-500 to-brand-700" },
  ];
  return (
    <section id="workflow" className="relative py-20 sm:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/30 to-surface-950" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs text-brand-300 mb-4 sm:mb-6 border border-brand-500/10">How It Works</div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-4 sm:mb-6">From field to finish in four steps</h2>
            <p className="text-sm sm:text-lg text-surface-400 leading-relaxed">Your existing workflow, supercharged. No new equipment. No new training.</p>
          </div>
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-brand-500/40 via-brand-400/20 to-transparent" />
          <div className="space-y-8 sm:space-y-16">
            {steps.map((step, i) => (
              <div key={step.step} className={`reveal ${["reveal-delay-1","reveal-delay-2","reveal-delay-3","reveal-delay-4"][i]}`}>
                <div className="flex flex-row md:flex-row gap-4 sm:gap-8 items-start">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center font-display font-bold text-sm sm:text-lg shadow-lg`}>{step.step}</div>
                  </div>
                  <div className="flex-1 pt-1 sm:pt-2">
                    <h3 className="font-display text-base sm:text-xl font-semibold mb-1 sm:mb-2">{step.title}</h3>
                    <p className="text-xs sm:text-base text-surface-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  useRevealOnScroll();
  return (
    <section id="preview" className="relative py-20 sm:py-36 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs text-brand-300 mb-4 sm:mb-6 border border-brand-500/10">Product Preview</div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-4 sm:mb-6">Built for the way you work</h2>
            <p className="text-sm sm:text-lg text-surface-400 leading-relaxed">A clean, intuitive interface. No clutter — just your data, intelligently organized.</p>
          </div>
        </div>
        <div className="reveal">
          <div className="relative mx-auto max-w-5xl">
            <div className="glass rounded-2xl overflow-hidden border border-white/[0.06] glow-primary">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.04]">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/50" /><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/50" /><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/50" />
                <div className="ml-2 sm:ml-4 text-[10px] sm:text-xs text-surface-500 font-mono truncate">GeoMind AI — Project: Oakwood Estates</div>
              </div>
              <div className="p-1 sm:p-2">
                <div className="bg-surface-900/50 rounded-xl overflow-hidden">
                  <div className="flex flex-col lg:grid lg:grid-cols-12 gap-px bg-white/[0.03]">
                    <div className="lg:col-span-3 p-3 sm:p-6 border-b lg:border-b-0 lg:border-r border-white/[0.03]">
                      <div className="flex lg:flex-col gap-2 sm:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                        <div className="hidden lg:flex items-center gap-2 text-xs text-surface-400 font-medium uppercase tracking-wider mb-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>Project Overview</div>
                        {["Control Points (32)", "Boundary (128)", "Topo (1,847)", "Monuments (14)", "Calculations (8)"].map((item) => (
                          <div key={item} className="flex-shrink-0 lg:w-full flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-white/[0.02] text-[11px] sm:text-sm"><span className="text-surface-300 whitespace-nowrap">{item}</span><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-400/60 flex-shrink-0" /></div>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-9 p-3 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                        <h3 className="font-display font-semibold text-[11px] sm:text-sm">Survey Network — Closure: 1:85,000</h3>
                        <span className="text-[10px] sm:text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />All checks passed</span>
                      </div>
                      <div className="bg-surface-800/50 rounded-xl p-3 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {[
                          { label: "Total Points", value: "2,021" },
                          { label: "Control", value: "32" },
                          { label: "Horiz. Accuracy", value: "±0.012m" },
                          { label: "Vert. Accuracy", value: "±0.018m" },
                        ].map((metric) => (
                          <div key={metric.label}>
                            <div className="text-[10px] sm:text-xs text-surface-500 mb-0.5 sm:mb-1">{metric.label}</div>
                            <div className="font-display text-sm sm:text-lg font-semibold">{metric.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {[
                          { color: "from-brand-400 to-brand-600", label: "Generate Report", desc: "Boundary Survey" },
                          { color: "from-surface-600 to-surface-500", label: "Run Adjustment", desc: "Least Squares" },
                          { color: "from-surface-600 to-surface-500", label: "Export DXF", desc: "CAD Ready" },
                          { color: "from-surface-600 to-surface-500", label: "Ask AI", desc: "Project Chat" },
                        ].map((btn) => (
                          <button key={btn.label} className={`flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl bg-gradient-to-b ${btn.color} transition-all duration-200 hover:scale-[1.02] text-[10px] sm:text-sm font-medium`}>
                            <span>{btn.label}</span>
                            <span className="text-[9px] sm:text-[10px] opacity-60 mt-0.5">{btn.desc}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 sm:mt-6 text-center">
                        <a href="#dashboard" className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-brand-400 hover:text-brand-300 transition-colors">
                          Open full dashboard →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  useRevealOnScroll();
  const testimonials = [
    { quote: "GeoMind AI cut our report generation time from 4 hours to 20 minutes. The anomaly detection caught a blunder in our GNSS baseline.", author: "James Mitchell, PLS", role: "Chief Surveyor, Mitchell Geomatics" },
    { quote: "We process 15+ projects a month. The AI knowledge base means I can ask 'what was the closure on the Johnson boundary?' and get the answer instantly.", author: "Sarah Chen", role: "Senior Survey Engineer, Chen & Associates" },
    { quote: "The DXF analysis feature alone is worth the subscription. Our field crews upload CAD files and AI extracts coordinates automatically.", author: "Michael Torres, PE", role: "Director of Surveying, Torres Engineering Group" },
  ];
  return (
    <section className="relative py-20 sm:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/3 blur-[100px] pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs text-brand-300 mb-4 sm:mb-6 border border-brand-500/10">Testimonials</div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-4 sm:mb-6">Trusted by survey firms nationwide</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          {testimonials.map((t, i) => (
            <div key={t.author} className={`reveal ${["reveal-delay-1","reveal-delay-2","reveal-delay-3"][i]}`}>
              <div className="glass-light rounded-2xl p-5 sm:p-8 h-full flex flex-col border border-white/[0.04]">
                <div className="flex gap-1 mb-3 sm:mb-5">{[...Array(5)].map((_, j) => <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#818cf8" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}</div>
                <blockquote className="text-xs sm:text-base text-surface-300 leading-relaxed flex-1 mb-4 sm:mb-6">&ldquo;{t.quote}&rdquo;</blockquote>
                <div className="border-t border-white/[0.04] pt-3 sm:pt-4">
                  <div className="font-semibold text-xs sm:text-sm">{t.author}</div>
                  <div className="text-[10px] sm:text-xs text-surface-500 mt-0.5">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  useRevealOnScroll();
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = [
    { q: "Do I need to replace my existing survey equipment?", a: "No. GeoMind AI works with whatever equipment you already own — Trimble, Leica, Sokkia, Topcon, or any instrument that exports data files. We support 40+ formats." },
    { q: "How does the AI handle coordinate systems and datums?", a: "GeoMind AI auto-detects the coordinate reference system from your file metadata. It supports 10,000+ CRS definitions and transforms on-the-fly between any pair." },
    { q: "Is my survey data secure?", a: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Files are stored in isolated S3 prefixes per tenant. SOC 2 compliant." },
    { q: "Can I use GeoMind AI offline in the field?", a: "Our mobile app (coming Q3 2026) supports offline data collection with sync. The web platform queues AI analysis for async completion." },
    { q: "What file formats do you support?", a: "We support 40+ formats including Trimble RAW, Leica GSI, Sokkia SDR, Topcon, CSV, DXF, DWG, LAS/LAZ, GeoJSON, Shapefile, KML, GPX, PDF, and more." },
    { q: "Can I generate ALTA/NSPS reports?", a: "Yes. GeoMind AI includes templates for ALTA/NSPS Land Title Surveys, boundary, topographic, construction staking, and control surveys." },
  ];
  return (
    <section id="faq" className="relative py-20 sm:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-light text-xs text-brand-300 mb-4 sm:mb-6 border border-brand-500/10">FAQ</div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-4 sm:mb-6">Frequently asked questions</h2>
          </div>
        </div>
        <div className="max-w-3xl mx-auto">
          <div className="reveal space-y-2 sm:space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-light rounded-xl border border-white/[0.04] overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 sm:p-5 text-left" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                  <span className="font-medium text-xs sm:text-base pr-3">{faq.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 text-surface-500 transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                  <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-surface-400 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  const links = { Product: ["Features", "Integrations", "Changelog", "API Docs"], Company: ["About", "Blog", "Careers", "Contact"], Resources: ["Documentation", "Tutorials", "Support"], Legal: ["Privacy", "Terms", "Cookies"] };
  return (
    <footer className="relative border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-12">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">G</div>
              <span className="font-display font-semibold text-sm sm:text-base">GeoMind<span className="text-brand-400">AI</span></span>
            </a>
            <p className="text-xs sm:text-sm text-surface-500 leading-relaxed max-w-xs mb-4 sm:mb-6">The AI Copilot for survey engineers.</p>
            <div className="flex gap-2 sm:gap-3">{["X", "In", "GH"].map((s) => (<a key={s} href="#" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-xs text-surface-400 hover:text-white transition-all">{s}</a>))}</div>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-[10px] sm:text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 sm:mb-4">{category}</h4>
              <ul className="space-y-2 sm:space-y-3">{items.map((item) => (<li key={item}><a href="#" className="text-xs sm:text-sm text-surface-400 hover:text-white transition-colors">{item}</a></li>))}</ul>
            </div>
          ))}
        </div>
        <div className="mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-surface-600">&copy; 2026 GeoMind AI. All rights reserved.</p>
          <p className="text-[10px] sm:text-xs text-surface-600">Built for survey engineers, by survey engineers.</p>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-white selection:bg-brand-500/30">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WorkflowSection />
        <DashboardPreview />
        <TestimonialsSection />
        <FAQSection />
      </main>
      <FooterSection />
    </div>
  );
}

import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

function DashboardWithAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="h-screen bg-surface-950 flex items-center justify-center text-surface-400">Loading...</div>;

  if (!user) {
    return (
      <div className="h-screen bg-surface-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl mb-6">G</div>
        <h2 className="text-2xl font-bold mb-2">Sign in to GeoMind AI</h2>
        <p className="text-surface-400 mb-8">Access your survey projects and AI copilot.</p>
        <button onClick={login} className="px-6 py-3 bg-white text-surface-950 rounded-lg font-semibold hover:bg-surface-200 transition-colors flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign In with Google
        </button>
      </div>
    );
  }

  const Dashboard = React.lazy(() => import("./Dashboard.jsx"));
  return (
    <React.Suspense fallback={<div className="h-screen bg-surface-950 flex items-center justify-center text-surface-400">Loading dashboard...</div>}>
      <Dashboard user={user} />
    </React.Suspense>
  );
}

function Router() {
  const [route, setRoute] = useState(() => window.location.hash || "#landing");
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || "#landing");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route === "#dashboard") {
    return <DashboardWithAuth />;
  }
  return <LandingPage />;
}

export default function App() {
  return <Router />;
}

