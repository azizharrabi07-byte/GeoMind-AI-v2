import { useState, useCallback } from "react";
import { useMapContext } from "./MapContext";
import LayerPanel from "./LayerPanel";
import AnomaliesLayer from "./AnomaliesLayer";

const BASE_MAPS = [
  { id: "street", label: "Street" },
  { id: "satellite", label: "Satellite" },
  { id: "topo", label: "Topo" },
];

export default function GISModule() {
  const {
    drawMode, setDrawMode,
    lastMeasureResult, setLastMeasureResult,
    userPoints, userLines, userPolygons,
    clearAll, setDrawingPoints,
  } = useMapContext();

  const [baseMap, setBaseMap] = useState("street");
  const [activeLayers, setActiveLayers] = useState({
    points: true,
    boundaries: true,
    elevation: true,
    labels: true,
    anomalies: true,
  });

  const toggleLayer = useCallback((id) => {
    setActiveLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/[0.04]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] flex-wrap gap-2">
        <h3 className="text-sm font-semibold">GIS Map</h3>
        <select
          value={baseMap}
          onChange={(e) => setBaseMap(e.target.value)}
          className="text-[11px] bg-white/[0.06] border border-white/[0.06] rounded-lg px-2 py-1 text-surface-300 outline-none"
        >
          {BASE_MAPS.map((bm) => (
            <option key={bm.id} value={bm.id}>{bm.label}</option>
          ))}
        </select>
        <button onClick={clearAll} className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded">Clear Drawings</button>
      </div>

      <div className="relative flex items-center justify-center bg-surface-900 border border-white/[0.1] rounded-lg m-4" style={{ height: "min(40vh, 320px)" }}>
        <p className="text-surface-400 text-sm">Interactive Map View Placeholder</p>
        
        {/* We keep LayerPanel and AnomaliesLayer rendered or hidden for compatibility if needed */}
        <div className="absolute top-3 right-3 hidden">
          <LayerPanel activeLayers={activeLayers} onToggle={toggleLayer} collapsed={false} onToggleCollapse={() => {}} />
          <AnomaliesLayer visible={activeLayers.anomalies} />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[10px] text-surface-500 font-mono">
          <span>{userPoints.length} point(s) drawn</span>
        </div>
      </div>
    </div>
  );
}

