import { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";

const codeIconColors = {
  CP: "#6366f1",
  BM: "#34d399",
  TOPO: "#f59e0b",
  MON: "#ef4444",
  CK: "#8b5cf6",
};

function createIcon(code) {
  const color = codeIconColors[code] || "#94a3b8";
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2px solid rgba(15,23,42,0.9);
      border-radius: 50%;
      box-shadow: 0 0 0 2px ${color}44, 0 2px 8px rgba(0,0,0,0.4);
      transition: transform 0.15s;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function SurveyPointsLayer({ points, visible, onPointClick }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);
  const prevVisible = useRef(null);

  const clusteredPoints = useMemo(() => {
    if (!points?.length) return [];
    return points;
  }, [points]);

  useEffect(() => {
    if (!map) return;

    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 17,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let color = "#6366f1";
          if (count > 20) color = "#ef4444";
          else if (count > 10) color = "#f59e0b";
          return L.divIcon({
            className: "",
            html: `<div style="
              width: ${count > 20 ? 44 : count > 10 ? 38 : 32}px;
              height: ${count > 20 ? 44 : count > 10 ? 38 : 32}px;
              background: ${color}22;
              border: 2px solid ${color};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 11px;
              font-weight: 600;
              backdrop-filter: blur(4px);
              box-shadow: 0 2px 12px ${color}44;
            ">${count}</div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });
        },
      });
      map.addLayer(clusterGroupRef.current);
    }

    const group = clusterGroupRef.current;
    group.clearLayers();

    if (!visible) {
      prevVisible.current = false;
      return;
    }
    prevVisible.current = true;

    const markers = clusteredPoints.map((pt) => {
      const [lng, lat] = pt.geometry.coordinates;
      const p = pt.properties;
      const marker = L.marker([lat, lng], { icon: createIcon(p.code) });

      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; min-width: 180px; background: transparent;">
          <div style="font-weight: 700; font-size: 14px; color: ${codeIconColors[p.code] || '#94a3b8'}; margin-bottom: 6px;">
            ● ${p.id}
          </div>
          <table style="width:100%; border-collapse: collapse;">
            ${[
              ['Code', p.code],
              ['Easting', p.easting?.toFixed(3)],
              ['Northing', p.northing?.toFixed(3)],
              ['Elevation', `${p.elevation?.toFixed(2)} m`],
              ['Accuracy', p.accuracy],
              ['Date', p.date],
              ['Desc', p.description],
            ].filter(r => r[1]).map(r => `
              <tr>
                <td style="color: #64748b; padding-right: 12px; white-space: nowrap;">${r[0]}</td>
                <td style="color: #e2e8f0;">${r[1]}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `, { className: "survey-marker-popup", maxWidth: 260 });

      if (onPointClick) {
        marker.on("click", () => onPointClick(pt));
      }
      return marker;
    });

    group.addLayers(markers);

    return () => {
      if (group) group.clearLayers();
    };
  }, [map, clusteredPoints, visible, onPointClick]);

  useEffect(() => {
    if (!clusterGroupRef.current || !map) return;
    if (prevVisible.current === visible) return;
    prevVisible.current = visible;

    if (visible) {
      map.addLayer(clusterGroupRef.current);
    } else {
      map.removeLayer(clusterGroupRef.current);
    }
  }, [visible, map]);

  return null;
}
