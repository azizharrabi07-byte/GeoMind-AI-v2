import { useMapContext } from "./MapContext";

const MODES = [
  { id: "pan", label: "Pan", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { id: "point", label: "Point", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
  { id: "line", label: "Line", icon: "M3 3v18h18" },
  { id: "polygon", label: "Polygon", icon: "M3 3l18 0 0 18-18 0z" },
  { id: "select", label: "Select", icon: "M1 1v22l7-7h13z" },
];

export default function DrawingToolbar({ onClearAll, hasFeatures }) {
  const { drawMode, setDrawMode, drawingPoints } = useMapContext();

  const isDrawing = drawMode === "line" || drawMode === "polygon";

  return (
    <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
      {MODES.map((mode) => {
        const active = drawMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => setDrawMode(mode.id)}
            title={mode.label}
            className={`text-[11px] px-2 py-1.5 rounded-md transition-all flex items-center gap-1 ${
              active
                ? "bg-brand-500/20 text-brand-300 font-medium"
                : "text-surface-500 hover:text-surface-300 hover:bg-white/[0.03]"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
              <path d={mode.icon} />
            </svg>
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
      {isDrawing && drawingPoints.length > 0 && (
        <button
          onClick={() => setDrawMode("pan")}
          className="text-[11px] px-2 py-1.5 rounded-md text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all ml-1"
        >
          Finish ({drawingPoints.length} pts)
        </button>
      )}
      {hasFeatures && (
        <button
          onClick={onClearAll}
          className="text-[11px] px-2 py-1.5 rounded-md text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all ml-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}
