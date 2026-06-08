import { useEffect, useRef, useMemo, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const BOUNDARY_STYLES = {
  "parcel-1": { color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.08, weight: 2.5, dashArray: null },
  "parcel-2": { color: "#818cf8", fillColor: "#818cf8", fillOpacity: 0.06, weight: 2.5, dashArray: null },
  "parcel-3": { color: "#34d399", fillColor: "#34d399", fillOpacity: 0.06, weight: 2.5, dashArray: "6 4" },
};

export default function BoundaryLayer({ boundaries, visible, onBoundaryClick }) {
  const map = useMap();
  const layerRef = useRef(null);

  const geoJsonData = useMemo(() => {
    if (!boundaries?.length) return null;
    return {
      type: "FeatureCollection",
      features: boundaries,
    };
  }, [boundaries]);

  const pointToLabel = useCallback((latlng, text) => {
    return L.marker(latlng, {
      icon: L.divIcon({
        className: "",
        html: `<div style="
          font-size: 10px;
          font-weight: 600;
          color: #cbd5e1;
          background: rgba(15,23,42,0.75);
          backdrop-filter: blur(4px);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(148,163,184,0.15);
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
          pointer-events: none;
        ">${text}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
    });
  }, []);

  useEffect(() => {
    if (!map || !visible || !geoJsonData) {
      if (layerRef.current) {
        map?.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    const layer = L.geoJSON(geoJsonData, {
      style: (feature) => BOUNDARY_STYLES[feature.id] || { color: "#6366f1", fillOpacity: 0.06, weight: 2 },
      onEachFeature: (feature, leafletLayer) => {
        const props = feature.properties;
        leafletLayer.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; min-width: 200px;">
            <div style="font-weight: 700; font-size: 14px; color: #818cf8; margin-bottom: 6px;">
              ${props.name || "Boundary"}
            </div>
            <table style="width:100%; border-collapse: collapse;">
              ${[
                ['Parcel', props.parcel],
                ['Area', props.area],
                ['Zoning', props.zoning],
              ].filter(r => r[1]).map(r => `
                <tr>
                  <td style="color: #64748b; padding-right: 12px; white-space: nowrap;">${r[0]}</td>
                  <td style="color: #e2e8f0;">${r[1]}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `, { className: "survey-marker-popup", maxWidth: 260 });

        leafletLayer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({ fillOpacity: 0.15, weight: 3.5 });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront();
            }
          },
          mouseout: (e) => {
            const target = e.target;
            const def = BOUNDARY_STYLES[feature.id] || { color: "#6366f1", fillOpacity: 0.06, weight: 2 };
            target.setStyle({ fillOpacity: def.fillOpacity || 0.06, weight: def.weight || 2 });
          },
          click: () => onBoundaryClick?.(feature),
        });
      },
    });

    map.addLayer(layer);

    const labels = [];
    boundaries.forEach((b) => {
      if (b.geometry.type === "Polygon") {
        const coords = b.geometry.coordinates[0];
        const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
        const center = [sum[1] / coords.length, sum[0] / coords.length];
        const label = pointToLabel(center, b.properties?.name || "");
        label.addTo(map);
        labels.push(label);
      }
    });

    layerRef.current = layer;

    return () => {
      map.removeLayer(layer);
      labels.forEach((l) => map.removeLayer(l));
    };
  }, [map, geoJsonData, visible, boundaries, onBoundaryClick, pointToLabel]);

  return null;
}
