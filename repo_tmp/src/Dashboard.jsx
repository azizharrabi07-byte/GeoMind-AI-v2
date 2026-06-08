import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { MapProvider, useMapContext } from "./components/gis/MapContext";
const GISModule = lazy(() => import("./components/gis/GISModule"));

const navItems = [
  { id: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "projects", label: "Projects", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { id: "files", label: "Files", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "map", label: "GIS Map", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { id: "ai", label: "AI Assist", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { id: "analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

const mobileTabs = navItems.filter((n) => !["files", "analytics"].includes(n.id));

/* ─── Shared State Components ─── */

function StatCard({ icon, label, value, trend, accent }) {
  return (
    <div className="glass rounded-xl p-5 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d={icon} /></svg>
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${trend > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points={trend > 0 ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} /></svg>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="font-display text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-surface-500">{label}</div>
    </div>
  );
}

function ProjectItem({ name, status, progress, points, due }) {
  const statusStyles = { active: "text-emerald-400 bg-emerald-500/10", review: "text-amber-400 bg-amber-500/10", draft: "text-surface-400 bg-white/[0.06]" };
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/[0.03] transition-colors group cursor-pointer">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400/20 to-brand-600/20 flex items-center justify-center text-xs font-semibold text-brand-300 flex-shrink-0">
          {name.split(" ").map(w => w[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{name}</div>
          <div className="text-xs text-surface-500 mt-0.5">{points} points · due {due}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden hidden sm:block">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${progress}%` }} />
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    </div>
  );
}

function UploadItem({ name, type, size, date, status }) {
  const typeColors = { raw: "from-amber-500/20 to-amber-600/20 text-amber-400", dxf: "from-blue-500/20 to-blue-600/20 text-blue-400", csv: "from-emerald-500/20 to-emerald-600/20 text-emerald-400", las: "from-violet-500/20 to-violet-600/20 text-violet-400", pdf: "from-rose-500/20 to-rose-600/20 text-rose-400" };
  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${typeColors[type] || "from-surface-600 to-surface-500"} flex items-center justify-center text-[10px] font-bold uppercase flex-shrink-0`}>{type}</div>
        <div className="min-w-0"><div className="text-sm text-white truncate">{name}</div><div className="text-xs text-surface-500 mt-0.5">{size} · {date}</div></div>
      </div>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status === "processed" ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"} flex-shrink-0`}>{status}</span>
    </div>
  );
}

function ActivityItem({ icon, text, time, accent }) {
  return (
    <div className="flex gap-3 py-2.5 group cursor-pointer">
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center flex-shrink-0`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d={icon} /></svg>
        </div>
        <div className="w-px flex-1 bg-white/[0.04] mt-2" />
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <p className="text-sm text-surface-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
        <p className="text-xs text-surface-600 mt-1">{time}</p>
      </div>
    </div>
  );
}

function BarChart({ data, height = 120 }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height: `${height}px` }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <span className="text-[10px] text-surface-500 font-medium">{d.value}</span>
          <div className="w-full rounded-sm bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-500 hover:from-brand-500 hover:to-brand-300 cursor-pointer" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "4px" : "0" }} />
          <span className="text-[10px] text-surface-600">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function PieChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumulative = 0;
  const paths = segments.map((seg) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += seg.value;
    const endAngle = (cumulative / total) * 360;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const r = 60;
    const x1 = 80 + r * Math.cos(startRad);
    const y1 = 80 + r * Math.sin(startRad);
    const x2 = 80 + r * Math.cos(endRad);
    const y2 = 80 + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return { path: `M 80 80 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: seg.color, label: seg.label, value: seg.value, percent: ((seg.value / total) * 100).toFixed(0) };
  });
  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        {paths.map((p, i) => <path key={i} d={p.path} fill={p.color} className="hover:opacity-80 transition-opacity cursor-pointer" />)}
        <circle cx="80" cy="80" r="35" fill="#0f172a" />
      </svg>
      <div className="space-y-2">{segments.map((seg, i) => (<div key={i} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} /><span className="text-xs text-surface-400">{seg.label}</span><span className="text-xs text-surface-500 ml-auto">{((seg.value / total) * 100).toFixed(0)}%</span></div>))}</div>
    </div>
  );
}

/* ─── AI Chat Panel with Map Awareness ─── */

function AIChatPanel({ fileIds = [], attachedFiles = [] }) {
  const { getMapSnapshot, addPoint, addLine, addPolygon, removePoint, clearAll, userPoints, userLines, userPolygons } = useMapContext();
  const [messages, setMessages] = useState([
    { role: "ai", text: "I'm your survey AI copilot. I can see your map — ask me about points, measurements, or tell me what to draw. Try: \"Add a control point at this location\" or \"Generate a survey report\"." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const executeCommands = (commands) => {
    if (!commands || !Array.isArray(commands)) return;
    commands.forEach((cmd) => {
      switch (cmd.type) {
        case "add_point":
          addPoint(cmd.lat, cmd.lng, cmd.label || "", cmd.elevation || 0, cmd.description || "");
          break;
        case "remove_point":
          removePoint(cmd.id);
          break;
        case "add_line":
          addLine(cmd.points, cmd.label || "");
          break;
        case "add_polygon":
          addPolygon(cmd.points, cmd.label || "");
          break;
        case "clear_all":
          clearAll();
          break;
      }
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const mapSnapshot = getMapSnapshot();
      const body = { message: userMsg, mapContext: mapSnapshot };
      if (fileIds.length > 0) body.fileIds = fileIds;
      if (sessionId) body.sessionId = sessionId;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      if (data.commands && Array.isArray(data.commands)) {
        executeCommands(data.commands);
      }

      let replyText = data.reply || "I couldn't process that request.";

      if (data.commands && data.commands.length > 0) {
        const cmdDesc = data.commands.map((c) => {
          switch (c.type) {
            case "add_point": return `📍 Added point "${c.label || "Unlabeled"}" at (${c.lat?.toFixed(4)}, ${c.lng?.toFixed(4)})`;
            case "remove_point": return `🗑️ Removed point ${c.id}`;
            case "add_line": return `📏 Added line "${c.label || "Unlabeled"}" (${c.points?.length || 0} vertices)`;
            case "add_polygon": return `🔲 Added polygon "${c.label || "Unlabeled"}" (${c.points?.length || 0} vertices)`;
            case "clear_all": return `🗑️ Cleared all features`;
            default: return null;
          }
        }).filter(Boolean).join("\n");
        if (cmdDesc) replyText += "\n\n" + cmdDesc;
      }

      setMessages((prev) => [...prev, { role: "ai", text: replyText }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "I'm sorry, I couldn't reach the AI backend." }]);
    }
    setLoading(false);
  };

  const totalFeatures = userPoints.length + userLines.length + userPolygons.length;

  return (
    <div className="glass rounded-xl border border-white/[0.04] flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[10px] font-bold">AI</div>
          <h3 className="text-sm font-semibold">AI Copilot</h3>
          {totalFeatures > 0 && (
            <span className="text-[10px] text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-full">
              {totalFeatures} map feature{totalFeatures > 1 ? "s" : ""}
            </span>
          )}
          {attachedFiles.length > 0 && (
            <span className="text-[10px] text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-full">
              {attachedFiles.length} file{attachedFiles.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalFeatures > 0 && (
            <button onClick={clearAll} className="text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded-md transition-colors">
              Clear Map
            </button>
          )}
          <span className={`w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-pulse-glow" : "bg-emerald-400"}`} />
        </div>
      </div>
      <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: "360px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${msg.role === "user" ? "bg-surface-700 text-surface-300" : "bg-gradient-to-br from-brand-400 to-brand-600 text-white"}`}>
              {msg.role === "user" ? "U" : "AI"}
            </div>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-brand-500/20 text-brand-200" : "bg-white/[0.04] text-surface-300"}`}>
              {msg.text}
              {msg.role === "ai" && i === messages.length - 1 && loading && (
                <span className="inline-flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/[0.04]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about your map, add points, generate reports..."
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/40 focus:bg-white/[0.06] transition-all"
          />
          <button onClick={sendMessage} disabled={loading} className="px-3 py-2 bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg hover:from-brand-400 hover:to-brand-600 transition-all disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
        <div className="flex gap-3 mt-2 text-[10px] text-surface-600">
          <span>Map: {userPoints.length} pts · {userLines.length} lines · {userPolygons.length} polygons</span>
          {sessionId && <span>Session active</span>}
        </div>
      </div>
    </div>
  );
}

function SurveyStats() {
  const monthlyData = [
    { label: "Jan", value: 8400 }, { label: "Feb", value: 9200 }, { label: "Mar", value: 7800 },
    { label: "Apr", value: 10300 }, { label: "May", value: 11500 }, { label: "Jun", value: 9800 },
    { label: "Jul", value: 12400 }, { label: "Aug", value: 13800 }, { label: "Sep", value: 12100 },
    { label: "Oct", value: 14500 }, { label: "Nov", value: 15200 }, { label: "Dec", value: 16800 },
  ];
  const pointTypes = [
    { label: "Control", value: 342, color: "#6366f1" },
    { label: "Boundary", value: 1256, color: "#818cf8" },
    { label: "Topographic", value: 8432, color: "#34d399" },
    { label: "Monuments", value: 89, color: "#f59e0b" },
    { label: "Check", value: 234, color: "#ef4444" },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass rounded-xl p-5 border border-white/[0.04]">
        <div className="flex items-center justify-between mb-5"><h3 className="text-sm font-semibold">Points Collected</h3><span className="text-[11px] text-surface-500">2026</span></div>
        <BarChart data={monthlyData} height={140} />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
          <div><div className="text-xs text-surface-500">Total YTD</div><div className="font-display text-lg font-bold text-white">143,700</div></div>
          <div className="text-right"><div className="text-xs text-surface-500">vs Last Year</div><div className="text-sm font-semibold text-emerald-400">+18.3%</div></div>
        </div>
      </div>
      <div className="glass rounded-xl p-5 border border-white/[0.04]">
        <div className="flex items-center justify-between mb-5"><h3 className="text-sm font-semibold">Point Classification</h3><span className="text-[11px] text-surface-500">10,353 total</span></div>
        <PieChart segments={pointTypes} />
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">Profile</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-lg font-bold">JD</div>
          <div><div className="text-sm font-medium text-white">John Davis</div><div className="text-xs text-surface-500">PLS · jdavis@geomind.ai</div></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{ label: "License #", value: "PLS-48291" }, { label: "Firm", value: "Davis Surveying LLC" }, { label: "Default CRS", value: "NAD83(2011) / UTM 17N" }, { label: "Report Template", value: "ALTA Standard" }].map((f) => (
            <div key={f.label} className="bg-white/[0.03] rounded-lg px-4 py-3"><div className="text-xs text-surface-500">{f.label}</div><div className="text-sm text-white mt-0.5">{f.value}</div></div>
          ))}
        </div>
      </div>
      <div className="glass rounded-xl p-6 border border-white/[0.04]">
        <h3 className="text-sm font-semibold mb-4">AI Preferences</h3>
        <div className="space-y-3">
          {[{ label: "Auto-analyze uploads", desc: "Run AI analysis on new file uploads", on: true }, { label: "Error flagging", desc: "Proactively flag potential survey blunders", on: true }, { label: "Report suggestions", desc: "Suggest report content based on project data", on: false }].map((s) => (
            <div key={s.label} className="flex items-center justify-between py-2">
              <div><div className="text-sm text-white">{s.label}</div><div className="text-xs text-surface-500">{s.desc}</div></div>
              <div className="w-9 h-5 rounded-full bg-brand-500 relative cursor-pointer"><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.on ? "left-4" : "left-0.5"}`} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── File Ingestion ─── */
const SUPPORTED_FORMATS = [
  { ext: "pdf", label: "PDF", desc: "Reports, plats, deeds" },
  { ext: "csv", label: "CSV", desc: "Point data, coordinates" },
  { ext: "xlsx", label: "XLSX", desc: "Survey spreadsheets" },
  { ext: "dxf", label: "DXF", desc: "CAD drawings" },
  { ext: "img", label: "Images", desc: "Site photos, scans" },
  { ext: "geojson", label: "GeoJSON", desc: "GIS data" },
];

function FileIngestionPanel({ onFilesChange, attachedFileIds = [] }) {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    setProcessing(true);
    for (const file of selected) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        const analysis = await res.json();
        setResults((prev) => [...prev, analysis]);
        if (analysis.fileId && onFilesChange) onFilesChange((prev) => [...prev, { fileId: analysis.fileId, ext: analysis.ext, filename: analysis.filename }]);
      } catch { setResults((prev) => [...prev, { filename: file.name, error: "Analysis failed" }]); }
    }
    setProcessing(false);
  };

  const removeFile = (fileId) => {
    setResults((prev) => prev.filter((r) => r.fileId !== fileId));
    setFiles((prev) => prev.filter((_, i) => results[i]?.fileId !== fileId));
    if (onFilesChange) onFilesChange((prev) => prev.filter((f) => f.fileId !== fileId));
  };

  return (
    <div className="glass rounded-xl border border-white/[0.04] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">File Ingestion</h3>
        <button onClick={() => fileInputRef.current?.click()} disabled={processing} className="text-xs bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
          {processing ? "Processing..." : "+ Upload"}
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {SUPPORTED_FORMATS.map((f) => (
          <span key={f.ext} className="text-[11px] text-surface-400 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.04]">{f.label}</span>
        ))}
      </div>
      {results.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {results.map((r, i) => (
            <div key={r.fileId || i} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-white truncate">{r.filename || r.name}</span>
                  <span className="text-[10px] text-surface-500 bg-white/[0.04] px-2 py-0.5 rounded-full flex-shrink-0">{r.ext}</span>
                </div>
                {r.fileId && (
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${attachedFileIds.includes(r.fileId) ? "text-brand-400 bg-brand-500/10" : "text-surface-500"}`}>
                      {attachedFileIds.includes(r.fileId) ? "AI" : "—"}
                    </span>
                    <button onClick={() => removeFile(r.fileId)} className="text-[10px] text-rose-400 hover:text-rose-300">Remove</button>
                  </div>
                )}
              </div>
              {r.error && <p className="text-xs text-rose-400">{r.error}</p>}
              {r.summary && <p className="text-xs text-surface-400 mb-1">{r.summary}</p>}
              {r.insights?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1.5">{r.insights.map((ins, j) => (<span key={j} className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{ins}</span>))}</div>}
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && !processing && (
        <div className="text-center py-8 text-surface-500">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-40"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          <p className="text-sm">Upload survey files to analyze</p>
          <p className="text-xs mt-1">PDF, CSV, XLSX, DXF, Images, GeoJSON</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main Dashboard ─── */
const scrollToSection = (id) => {
  setTimeout(() => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
};

function DashboardInner() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("overview");
  const [activeFiles, setActiveFiles] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const activeFileIds = activeFiles.map((f) => f.fileId);
  const isSettings = activeNav === "settings";

  const stats = [
    { id: "projects", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", label: "Total Projects", value: "24", trend: 12, accent: "from-brand-500 to-brand-700" },
    { id: "files", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Uploaded Files", value: "186", trend: 8, accent: "from-violet-500 to-violet-700" },
    { id: "points", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", label: "Survey Points", value: "10,353", trend: 23, accent: "from-emerald-500 to-emerald-700" },
    { id: "reports", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Generated Reports", value: "47", trend: -3, accent: "from-amber-500 to-amber-700" },
    { id: "insights", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", label: "AI Insights", value: "1,247", trend: 34, accent: "from-rose-500 to-rose-700" },
  ];

  const projects = [
    { name: "Oakwood Estates Boundary", status: "active", progress: 85, points: 421, due: "Mar 15" },
    { name: "SR-52 Corridor Topo", status: "review", progress: 62, points: 2184, due: "Mar 28" },
    { name: "Riverbend Subdivision", status: "active", progress: 45, points: 847, due: "Apr 10" },
    { name: "City Center ALTA Survey", status: "draft", progress: 20, points: 156, due: "Apr 22" },
  ];

  const uploads = [
    { name: "field_notes_240301.raw", type: "raw", size: "2.4 MB", date: "2 hours ago", status: "processed" },
    { name: "oakwood_boundary.dxf", type: "dxf", size: "4.1 MB", date: "5 hours ago", status: "processed" },
    { name: "topo_points_north.csv", type: "csv", size: "856 KB", date: "1 day ago", status: "processed" },
    { name: "lidar_east_quadrant.las", type: "las", size: "128 MB", date: "2 days ago", status: "processing" },
    { name: "preliminary_report.pdf", type: "pdf", size: "3.2 MB", date: "3 days ago", status: "processed" },
  ];

  const activities = [
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "AI analysis completed for <strong>field_notes_240301.raw</strong> — 3 anomalies flagged", time: "12 min ago", accent: "from-brand-500 to-brand-700" },
    { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12", text: "Report <strong>Oakwood Estates Boundary</strong> exported to PDF", time: "1 hour ago", accent: "from-emerald-500 to-emerald-700" },
    { icon: "M12 6v6l4 2", text: "Least-squares adjustment completed — network: 24 control points, RMS: 0.008m", time: "3 hours ago", accent: "from-violet-500 to-violet-700" },
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "Traverse <strong>Loop C-42</strong> computed — closure: 1:85,000", time: "5 hours ago", accent: "from-amber-500 to-amber-700" },
    { icon: "M3 3h18v18H3z", text: "New project created: <strong>Riverbend Subdivision</strong>", time: "1 day ago", accent: "from-brand-500 to-brand-700" },
    { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", text: "DXF file <strong>oakwood_boundary.dxf</strong> processed", time: "1 day ago", accent: "from-blue-500 to-blue-700" },
  ];

  return (
    <div className="h-screen bg-surface-950 text-white flex overflow-hidden">
      <aside className={`${sidebarOpen ? "w-56" : "w-16"} flex-shrink-0 transition-all duration-300 border-r border-white/[0.04] bg-surface-950/80 backdrop-blur-xl hidden md:flex flex-col`}>
        <div className={`flex items-center ${sidebarOpen ? "justify-between px-5" : "justify-center"} h-16 border-b border-white/[0.04]`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">G</div>
              <span className="font-display font-semibold text-sm">GeoMind<span className="text-brand-400">AI</span></span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-surface-500 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{sidebarOpen ? <path d="M11 5h2m-2 7h2m-2 7h2" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
          </button>
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveNav(item.id); if (item.id !== "settings") scrollToSection(item.id); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${activeNav === item.id ? "bg-brand-500/10 text-brand-300 font-medium" : "text-surface-500 hover:text-surface-300 hover:bg-white/[0.03]"}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0"><path d={item.icon} /></svg>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className={`p-3 border-t border-white/[0.04] ${sidebarOpen ? "" : "flex justify-center"}`}>
          <a href="#landing" className="flex items-center gap-2 text-surface-500 hover:text-surface-300 transition-colors text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7" /></svg>
            {sidebarOpen && "Back to Site"}
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/[0.04] flex items-center justify-between px-4 md:px-6 bg-surface-950/80 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">G</div>
              <span className="font-display font-semibold text-sm">GeoMind<span className="text-brand-400">AI</span></span>
            </div>
            <span className="text-xs text-surface-500">{navItems.find((n) => n.id === activeNav)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-surface-400 transition-all relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-400" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold cursor-pointer">JD</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-24 md:pb-6">
          {isSettings ? (
            <div className="p-4 md:p-6"><h2 className="font-display text-xl font-bold mb-4">Settings</h2><SettingsView /></div>
          ) : (
            <div className="p-4 md:p-6 space-y-6">
              <div id="section-overview" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 scroll-mt-20">
                {stats.map((stat) => <StatCard key={stat.id} {...stat} />)}
              </div>

              <div id="section-projects" className="glass rounded-xl border border-white/[0.04] overflow-hidden scroll-mt-20">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                  <h3 className="text-sm font-semibold">Project Overview</h3>
                  <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View All</button>
                </div>
                <div className="p-2">{projects.map((p) => <ProjectItem key={p.name} {...p} />)}</div>
              </div>

              <div id="section-files" className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-20">
                <div className="glass rounded-xl border border-white/[0.04] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                    <h3 className="text-sm font-semibold">Recent Uploads</h3>
                    <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View All</button>
                  </div>
                  <div className="p-2">{uploads.map((u) => <UploadItem key={u.name} {...u} />)}</div>
                </div>
                <FileIngestionPanel onFilesChange={setActiveFiles} attachedFileIds={activeFileIds} />
              </div>

              <div id="section-map" className="scroll-mt-20">
                <Suspense fallback={<div className="glass rounded-xl h-[400px] flex items-center justify-center text-surface-500 text-sm">Loading GIS module...</div>}>
                  <GISModule />
                </Suspense>
              </div>

              <div id="section-ai" className="scroll-mt-20">
                <AIChatPanel fileIds={activeFileIds} attachedFiles={activeFiles} />
              </div>

              <div id="section-analytics" className="scroll-mt-20">
                <SurveyStats />
              </div>

              <div className="glass rounded-xl border border-white/[0.04] p-5">
                <h3 className="text-sm font-semibold mb-4">Activity Timeline</h3>
                <div className="max-h-[360px] overflow-y-auto">{activities.map((a, i) => <ActivityItem key={i} {...a} />)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-surface-950/95 backdrop-blur-xl border-t border-white/[0.06] z-50 flex items-center justify-around">
        {mobileTabs.map((tab) => (
          <button key={tab.id} onClick={() => { setActiveNav(tab.id); if (tab.id !== "settings") scrollToSection(tab.id); }}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] px-3 py-2 transition-all duration-200 ${activeNav === tab.id ? "text-brand-400" : "text-surface-500 hover:text-surface-300"}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={tab.icon} /></svg>
            <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function Dashboard() {
  return (
    <MapProvider>
      <DashboardInner />
    </MapProvider>
  );
}
