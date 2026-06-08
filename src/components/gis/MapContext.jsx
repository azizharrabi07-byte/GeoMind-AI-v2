import React, { createContext, useContext, useState, useCallback } from 'react';

const MapContext = createContext();

export function MapProvider({ children }) {
  const [drawMode, setDrawMode] = useState('pan');
  const [lastMeasureResult, setLastMeasureResult] = useState(null);
  const [userPoints, setUserPoints] = useState([]);
  const [userLines, setUserLines] = useState([]);
  const [userPolygons, setUserPolygons] = useState([]);
  const [drawingPoints, setDrawingPoints] = useState([]);

  const addPoint = useCallback((coords) => {
    setUserPoints(prev => [...prev, { id: Date.now(), coords }]);
  }, []);

  const removePoint = useCallback((id) => {
    setUserPoints(prev => prev.filter(p => p.id !== id));
  }, []);

  const addLine = useCallback((line) => {
    setUserLines(prev => [...prev, line]);
  }, []);

  const addPolygon = useCallback((polygon) => {
    setUserPolygons(prev => [...prev, polygon]);
  }, []);

  const clearAll = useCallback(() => {
    setUserPoints([]);
    setUserLines([]);
    setUserPolygons([]);
    setDrawingPoints([]);
    setLastMeasureResult(null);
  }, []);

  const getMapSnapshot = useCallback(() => {
    return {
      userPoints,
      userLines,
      userPolygons,
      view: { center: [0, 0], zoom: 15 } // Dummy view
    };
  }, [userPoints, userLines, userPolygons]);

  return (
    <MapContext.Provider value={{
      drawMode, setDrawMode,
      lastMeasureResult, setLastMeasureResult,
      userPoints, setUserPoints, addPoint, removePoint,
      userLines, setUserLines, addLine,
      userPolygons, setUserPolygons, addPolygon,
      drawingPoints, setDrawingPoints,
      clearAll, getMapSnapshot
    }}>
      {children}
    </MapContext.Provider>
  );
}

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};
