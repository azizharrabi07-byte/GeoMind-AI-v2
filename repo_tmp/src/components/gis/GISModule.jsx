import { useState, useCallback } from "react";
import GISMap from "./GISMap";
import SurveyPointsLayer from "./SurveyPointsLayer";
import BoundaryLayer from "./BoundaryLayer";
import ElevationLayer from "./ElevationLayer";
import MeasurementLayer from "./MeasurementLayer";
import MeasurementTool from "./MeasurementTool";
import CoordinateDisplay from "./CoordinateDisplay";
import LayerPanel from "./LayerPanel";
import GeoJSONManager from "./GeoJSONManager";
import DrawingToolbar from "./DrawingToolbar";
import UserFeaturesLayer from "./UserFeaturesLayer";
import { useMapContext } from "./MapContext";
import { surveyPoints, boundaries, contours, defaultView } from "./sampleData";

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
  });
  const [layerCollapsed, setLayerCollapsed] = useState(false);
  const [cursorCoord, setCursorCoord] = useState(null);
  const [showCoord, setShowCoord] = useState(true);
  const [importedData, setImportedData] = useState(null);
  const [mapState, setMapState] = useState({ lat: defaultView.center[0], lng: defaultView.center[1], zoom: defaultView.zoom });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mobilePanel, setMobilePanel] = useState(false);

  const toggleLayer = useCallback((id) => {
    setActiveLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleImport = useCallback((data) => {
    setImportedData(data);
  }, []);

  const handleExport = useCallback(() => {
    const features = [];
    if (activeLayers.points) surveyPoints.forEach((p) => features.push(p));
    if (activeLayers.boundaries) boundaries.forEach((b) => features.push(b));
    if (activeLayers.elevation) contours.forEach((c) => features.push(c));
    return { type: "FeatureCollection", features };
  }, [activeLayers]);

  const allBoundaries = importedData
    ? [...boundaries, ...importedData.features.filter((f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")]
    : boundaries;

  const allPoints = importedData
    ? [...surveyPoints, ...importedData.features.filter((f) => f.geometry.type === "Point")]
    : surveyPoints;

  const allContours = importedData
    ? [...contours, ...importedData.features.filter((f) => f.geometry.type === "LineString")]
    : contours;

  const hasUserFeatures = userPoints.length > 0 || userLines.length > 0 || userPolygons.length > 0;

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/[0.04]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">GIS Map</h3>
          <div className="hidden sm:flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
            {BASE_MAPS.map((bm) => (
              <button
                key={bm.id}
                onClick={() => setBaseMap(bm.id)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                  baseMap === bm.id ? "bg-brand-500/20 text-brand-300 font-medium" : "text-surface-500 hover:text-surface-300"
                }`}
              >
                {bm.label}
              </button>
            ))}
          </div>
          <select
            value={baseMap}
            onChange={(e) => setBaseMap(e.target.value)}
            className="sm:hidden text-[11px] bg-white/[0.06] border border-white/[0.06] rounded-lg px-2 py-1 text-surface-300 outline-none"
          >
            {BASE_MAPS.map((bm) => (
              <option key={bm.id} value={bm.id}>{bm.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <DrawingToolbar onClearAll={() => { if (confirm("Clear all your drawn features?")) clearAll(); }} hasFeatures={hasUserFeatures} />
          <GeoJSONManager onImport={handleImport} onExport={handleExport} currentData={handleExport()} />
          <button
            onClick={() => setShowCoord((p) => !p)}
            className={`text-[11px] px-2.5 py-1.5 rounded-md transition-all ${showCoord ? "bg-brand-500/10 text-brand-300" : "bg-white/[0.04] text-surface-500"}`}
            title="Toggle coordinates"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span className="hidden sm:inline">Coords</span>
          </button>
          <button onClick={() => setMobilePanel((p) => !p)} className="md:hidden text-[11px] px-2.5 py-1.5 rounded-md bg-white/[0.04] text-surface-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      <div className="relative" style={{ height: "min(65vh, 520px)" }}>
        <GISMap baseMap={baseMap} onMapMove={setMapState} onCursorCoord={setCursorCoord}>
          <SurveyPointsLayer points={allPoints} visible={activeLayers.points} onPointClick={setSelectedPoint} />
          <BoundaryLayer boundaries={allBoundaries} visible={activeLayers.boundaries} />
          <ElevationLayer contours={allContours} visible={activeLayers.elevation} />
          <MeasurementLayer mode={drawMode === "pan" ? lastMeasureResult?.mode : null} onResult={(r) => setLastMeasureResult({ ...r, mode: drawMode })} />
          <UserFeaturesLayer />
        </GISMap>

        <CoordinateDisplay coord={cursorCoord} visible={showCoord} />

        {(drawMode === "line" || drawMode === "polygon") && (
          <div className="absolute top-3 left-3 bg-surface-900/90 backdrop-blur-sm border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-amber-300 z-[1000]">
            Click to place vertices · Double-click to finish
          </div>
        )}

        {lastMeasureResult && (
          <div className="absolute bottom-16 left-3 bg-surface-900/90 backdrop-blur-sm border border-white/[0.06] rounded-lg px-3 py-2 text-xs font-mono text-amber-300 z-[1000]">
            {lastMeasureResult.value.toFixed(lastMeasureResult.precision || 2)} {lastMeasureResult.unit}
          </div>
        )}

        <div className="absolute top-3 right-3 z-[1000] hidden md:block">
          <LayerPanel activeLayers={activeLayers} onToggle={toggleLayer} collapsed={layerCollapsed} onToggleCollapse={() => setLayerCollapsed((p) => !p)} />
        </div>

        {mobilePanel && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000] md:hidden bg-surface-900/95 backdrop-blur-md border-t border-white/[0.06] p-3 animate-slide-up">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-[10px] font-semibold text-surface-400 w-full">Layers</span>
              {Object.entries(activeLayers).map(([key, val]) => (
                <button key={key} onClick={() => toggleLayer(key)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${val ? "bg-brand-500/20 text-brand-300" : "bg-white/[0.04] text-surface-500"}`}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => setMobilePanel(false)} className="absolute top-2 right-2 text-surface-500 hover:text-surface-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[10px] text-surface-500 font-mono">
          <span>Zoom: 1:{Math.round(40000 / (mapState.zoom || 15) ** 2 * 1000)}</span>
          <span className="hidden xs:inline">CRS: WGS84</span>
          {hasUserFeatures && (
            <span className="text-brand-300">{userPoints.length} pts · {userLines.length} lines · {userPolygons.length} polygons</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MeasurementTool mode={drawMode === "pan" ? lastMeasureResult?.mode : null} onModeChange={(m) => setDrawMode(m === lastMeasureResult?.mode ? "pan" : "pan")} result={lastMeasureResult} onClear={() => setLastMeasureResult(null)} />
        </div>
      </div>
    </div>
  );
}
