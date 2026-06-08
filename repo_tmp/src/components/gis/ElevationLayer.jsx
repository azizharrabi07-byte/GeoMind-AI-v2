import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

function elevationToColor(elev, min, max) {
  const t = Math.min(1, Math.max(0, (elev - min) / (max - min)));
  const r = Math.round(Math.min(255, t * 400));
  const g = Math.round(Math.min(255, (1 - Math.abs(t - 0.5) * 2) * 200 + 55));
  const b = Math.round(Math.min(255, (1 - t) * 200 + 55));
  return `rgb(${r},${g},${b})`;
}

export default function ElevationLayer({ contours, visible }) {
  const map = useMap();
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!map || !visible || !contours?.length) {
      if (overlayRef.current && map) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = L.canvas({ tolerance: 10 });
    }

    const elevations = contours.map((c) => c.properties.elevation);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);

    const overlay = L.geoJSON(
      { type: "FeatureCollection", features: contours },
      {
        renderer: canvasRef.current,
        style: (feature) => {
          const elev = feature.properties.elevation;
          const isIndex = elev % 25 === 0;
          return {
            color: elevationToColor(elev, minElev, maxElev),
            weight: isIndex ? 2.5 : 1,
            opacity: isIndex ? 0.8 : 0.4,
          };
        },
        onEachFeature: (feature, layer) => {
          const elev = feature.properties.elevation;
          layer.bindTooltip(`${elev} m`, {
            permanent: false,
            direction: "center",
            className: "elevation-tooltip",
          });
        },
      }
    );

    map.addLayer(overlay);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, contours, visible]);

  return null;
}
