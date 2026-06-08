const LAYERS = [
  { id: "points", label: "Survey Points", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", color: "from-indigo-500 to-indigo-600" },
  { id: "boundaries", label: "Boundaries", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", color: "from-violet-500 to-violet-600" },
  { id: "elevation", label: "Elevation", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4", color: "from-emerald-500 to-emerald-600" },
  { id: "labels", label: "Labels", icon: "M7 21h10M9 3h6m-1 0l2 10M8 3L6 13m2-3h8", color: "from-amber-500 to-amber-600" },
  { id: "anomalies", label: "AI Anomalies", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", color: "from-rose-500 to-rose-600" },
];

export default function LayerPanel({ activeLayers, onToggle, collapsed, onToggleCollapse }) {
  return (
    <div className={`${collapsed ? "w-10" : "w-44"} transition-all duration-300 relative`}>
      <div className="bg-surface-900/90 backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
        >
          {!collapsed && <span className="text-[11px] font-semibold text-surface-300">Layers</span>}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-surface-500 transition-transform ${collapsed ? "" : "rotate-180"}`}>
            <path d={collapsed ? "M9 18l6-6-6-6" : "M15 6l-6 6 6 6"} />
          </svg>
        </button>
        {!collapsed && (
          <div className="p-1.5 space-y-0.5">
            {LAYERS.map((layer) => (
              <button
                key={layer.id}
                onClick={() => onToggle(layer.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all ${
                  activeLayers[layer.id]
                    ? "bg-white/[0.06] text-surface-200"
                    : "text-surface-500 hover:text-surface-400 hover:bg-white/[0.03]"
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center bg-gradient-to-br ${layer.color} ${
                  activeLayers[layer.id] ? "opacity-100" : "opacity-30"
                }`}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d={layer.icon} />
                  </svg>
                </div>
                <span className="truncate">{layer.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
