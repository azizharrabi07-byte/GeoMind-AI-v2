import { useState, useRef, useCallback, useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";

const MEASURE_ICON = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;background:#f59e0b;border:2px solid rgba(255,255,255,0.8);border-radius:50%;box-shadow:0 0 8px rgba(245,158,11,0.5);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export default function MeasurementLayer({ mode, onResult }) {
  const map = useMap();
  const [points, setPoints] = useState([]);
  const layersRef = useRef([]);
  const lineRef = useRef(null);
  const polyRef = useRef(null);
  const labelRef = useRef(null);
  const prevModeRef = useRef(mode);

  const clear = useCallback(() => {
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null; }
    if (polyRef.current) { map.removeLayer(polyRef.current); polyRef.current = null; }
    if (labelRef.current) { map.removeLayer(labelRef.current); labelRef.current = null; }
    setPoints([]);
  }, [map]);

  useEffect(() => {
    if (prevModeRef.current !== mode) {
      clear();
      prevModeRef.current = mode;
    }
  }, [mode, clear]);

  useEffect(() => {
    if (!mode || !map) return;

    const onClick = (e) => {
      const latlng = e.latlng;
      const newPoints = [...points, latlng];
      setPoints(newPoints);

      const marker = L.marker(latlng, { icon: MEASURE_ICON }).addTo(map);
      layersRef.current.push(marker);

      if (newPoints.length > 1) {
        const prev = newPoints[newPoints.length - 2];
        const seg = L.polyline([prev, latlng], {
          color: "#f59e0b", weight: 2, opacity: 0.7, dashArray: "4 4",
        }).addTo(map);
        layersRef.current.push(seg);
      }

      if (newPoints.length >= 2) {
        const coords = newPoints.map((p) => [p.lng, p.lat]);
        if (mode === "distance") {
          const line = turf.lineString(coords);
          let val = turf.length(line, { units: "meters" });
          let unit = "m";
          if (val > 1000) { val /= 1000; unit = "km"; }
          const display = `${val.toFixed(val > 100 ? 1 : val > 1 ? 2 : 4)} ${unit}`;
          if (labelRef.current) map.removeLayer(labelRef.current);
          labelRef.current = L.tooltip({ permanent: true, direction: "top", offset: [0, -10], className: "measurement-tooltip" })
            .setLatLng(latlng)
            .setContent(display)
            .addTo(map);
          onResult?.({ value: val, unit, label: display });
        } else if (mode === "area" && newPoints.length >= 3) {
          if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null; }
          const coordsClosed = [...coords, coords[0]];
          const poly = turf.polygon([coordsClosed]);
          let val = turf.area(poly);
          let unit = "m²";
          if (val > 10000) { val /= 10000; unit = "ha"; }
          const display = `${val.toFixed(val > 100 ? 1 : val > 1 ? 2 : 4)} ${unit}`;
          if (polyRef.current) map.removeLayer(polyRef.current);
          polyRef.current = L.polygon(newPoints, {
            color: "#f59e0b", weight: 2, opacity: 0.6, fillColor: "#f59e0b", fillOpacity: 0.08,
          }).addTo(map);
          if (labelRef.current) map.removeLayer(labelRef.current);
          labelRef.current = L.tooltip({ permanent: true, direction: "top", offset: [0, -10], className: "measurement-tooltip" })
            .setLatLng(newPoints[Math.floor(newPoints.length / 2)])
            .setContent(display)
            .addTo(map);
          onResult?.({ value: val, unit, label: display });
        }
      }
    };

    const onDblClick = () => {
      if (points.length >= 2) {
        setTimeout(() => clear(), 100);
      }
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    map.getContainer().style.cursor = "crosshair";

    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      map.getContainer().style.cursor = "";
    };
  }, [map, mode, points, onResult, clear]);

  return null;
}
