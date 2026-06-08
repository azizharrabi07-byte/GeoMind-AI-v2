export default function MeasurementTool({ mode, onModeChange, result, onClear }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onModeChange(mode === "distance" ? null : "distance")}
        className={`text-[11px] px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
          mode === "distance"
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            : "bg-white/[0.04] text-surface-400 hover:text-surface-200 border border-white/[0.06]"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="20" x2="22" y2="4" /><circle cx="4" cy="20" r="2" /><circle cx="22" cy="4" r="2" /></svg>
        Distance
      </button>
      <button
        onClick={() => onModeChange(mode === "area" ? null : "area")}
        className={`text-[11px] px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
          mode === "area"
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            : "bg-white/[0.04] text-surface-400 hover:text-surface-200 border border-white/[0.06]"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M3 21l18-18" /><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" /></svg>
        Area
      </button>
      {mode && (
        <button
          onClick={onClear}
          className="text-[11px] px-2.5 py-1.5 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
        >
          Clear
        </button>
      )}
      {result && (
        <span className="text-[11px] text-amber-300 font-mono bg-amber-500/10 px-2.5 py-1.5 rounded-md">
          {result.label}
        </span>
      )}
    </div>
  );
}
