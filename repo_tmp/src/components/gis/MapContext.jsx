import { createContext, useContext, useState, useCallback, useRef } from "react";

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [userPoints, setUserPoints] = useState([]);
  const [userLines, setUserLines] = useState([]);
  const [userPolygons, setUserPolygons] = useState([]);
  const [drawMode, setDrawMode] = useState("pan");
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [lastMeasureResult, setLastMeasureResult] = useState(null);
  const idCounter = useRef(0);

  const nextId = useCallback(() => {
    idCounter.current += 1;
    return `u${idCounter.current}`;
  }, []);

  const addPoint = useCallback((lat, lng, label = "", elevation = 0, description = "") => {
    const point = { id: nextId(), lat, lng, label, elevation, description, createdAt: Date.now() };
    setUserPoints((prev) => [...prev, point]);
    return point;
  }, [nextId]);

  const removePoint = useCallback((id) => {
    setUserPoints((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePoint = useCallback((id, updates) => {
    setUserPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const addLine = useCallback((points, label = "") => {
    const line = { id: nextId(), points, label, createdAt: Date.now() };
    setUserLines((prev) => [...prev, line]);
    return line;
  }, [nextId]);

  const removeLine = useCallback((id) => {
    setUserLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const addPolygon = useCallback((points, label = "") => {
    const polygon = { id: nextId(), points, label, createdAt: Date.now() };
    setUserPolygons((prev) => [...prev, polygon]);
    return polygon;
  }, [nextId]);

  const removePolygon = useCallback((id) => {
    setUserPolygons((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setUserPoints([]);
    setUserLines([]);
    setUserPolygons([]);
    setDrawingPoints([]);
  }, []);

  const getMapSnapshot = useCallback(() => {
    return {
      points: userPoints.map((p) => ({
        id: p.id, lat: p.lat, lng: p.lng, label: p.label, elevation: p.elevation, description: p.description,
      })),
      lines: userLines.map((l) => ({
        id: l.id, points: l.points, label: l.label,
      })),
      polygons: userPolygons.map((p) => ({
        id: p.id, points: p.points, label: p.label,
      })),
      measurements: lastMeasureResult ? {
        value: lastMeasureResult.value,
        unit: lastMeasureResult.unit,
        label: lastMeasureResult.label,
      } : null,
    };
  }, [userPoints, userLines, userPolygons, lastMeasureResult]);

  const value = {
    userPoints, setUserPoints,
    userLines, setUserLines,
    userPolygons, setUserPolygons,
    drawMode, setDrawMode,
    drawingPoints, setDrawingPoints,
    lastMeasureResult, setLastMeasureResult,
    addPoint, removePoint, updatePoint,
    addLine, removeLine,
    addPolygon, removePolygon,
    clearAll, getMapSnapshot, nextId,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapContext must be used within MapProvider");
  return ctx;
}
