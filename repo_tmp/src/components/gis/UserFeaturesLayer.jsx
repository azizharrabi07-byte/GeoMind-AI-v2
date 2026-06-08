import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapContext } from "./MapContext";

const pointIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;background:#818cf8;border:2px solid rgba(255,255,255,0.5);border-radius:50%;box-shadow:0 0 8px rgba(129,140,248,0.4)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const drawingPointIcon = L.divIcon({
  className: "",
  html: `<div style="width:8px;height:8px;background:#f59e0b;border:1px solid rgba(255,255,255,0.6);border-radius:50%"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

export default function UserFeaturesLayer() {
  const map = useMap();
  const {
    userPoints, userLines, userPolygons, drawMode, drawingPoints, setDrawingPoints,
    addPoint, removePoint, addLine, addPolygon, setDrawMode, updatePoint,
  } = useMapContext();

  const layerGroupRef = useRef(null);
  const drawingLayerRef = useRef(null);

  useEffect(() => {
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    userPoints.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: pointIcon, draggable: drawMode === "select" });
      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#818cf8">${p.label || "Survey Point"}</div>
          <div style="font-size:11px;color:#94a3b8;line-height:1.6">
            <div>ID: ${p.id}</div>
            <div>Lat: ${p.lat.toFixed(6)}</div>
            <div>Lng: ${p.lng.toFixed(6)}</div>
            <div>Elev: ${p.elevation.toFixed(2)}m</div>
            ${p.description ? `<div style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06)">${p.description}</div>` : ""}
          </div>
          <button id="del-${p.id}" style="margin-top:8px;font-size:10px;color:#ef4444;background:rgba(239,68,68,0.1);border:none;border-radius:4px;padding:2px 8px;cursor:pointer">Delete</button>
        </div>
      `);
      marker.on("popupopen", () => {
        setTimeout(() => {
          const btn = document.getElementById(`del-${p.id}`);
          if (btn) btn.onclick = () => { removePoint(p.id); map.closePopup(); };
        }, 50);
      });
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        updatePoint(p.id, { lat: pos.lat, lng: pos.lng });
      });
      group.addLayer(marker);
    });

    userLines.forEach((l) => {
      const ll = l.points.map((pt) => [pt.lat, pt.lng]);
      const polyline = L.polyline(ll, {
        color: "#f59e0b", weight: 2, opacity: 0.7, dashArray: "6 4",
      });
      polyline.bindPopup(`<div style="font-size:12px;color:#f59e0b;font-weight:600">${l.label || "Measured Line"}</div>`);
      group.addLayer(polyline);

      l.points.forEach((pt) => {
        const dot = L.circleMarker([pt.lat, pt.lng], {
          radius: 3, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.6,
        });
        group.addLayer(dot);
      });
    });

    userPolygons.forEach((p) => {
      const ll = p.points.map((pt) => [pt.lat, pt.lng]);
      const polygon = L.polygon(ll, {
        color: "#34d399", weight: 2, opacity: 0.6, fillColor: "#34d399", fillOpacity: 0.1,
      });
      polygon.bindPopup(`<div style="font-size:12px;color:#34d399;font-weight:600">${p.label || "Measured Area"}</div>`);
      group.addLayer(polygon);

      p.points.forEach((pt) => {
        const dot = L.circleMarker([pt.lat, pt.lng], {
          radius: 3, color: "#34d399", fillColor: "#34d399", fillOpacity: 0.6,
        });
        group.addLayer(dot);
      });
    });
  }, [map, userPoints, userLines, userPolygons, drawMode, removePoint, updatePoint]);

  useEffect(() => {
    if (!drawingLayerRef.current) {
      drawingLayerRef.current = L.layerGroup().addTo(map);
    }
    const dl = drawingLayerRef.current;
    dl.clearLayers();

    if (drawingPoints.length > 0) {
      if (drawMode === "polygon") {
        const pts = drawingPoints.map((p) => [p.lat, p.lng]);
        const poly = L.polygon(pts, {
          color: "#34d399", weight: 1.5, opacity: 0.5, fillColor: "#34d399", fillOpacity: 0.08, dashArray: "4 4",
        });
        dl.addLayer(poly);
      } else if (drawMode === "line") {
        const pts = drawingPoints.map((p) => [p.lat, p.lng]);
        const line = L.polyline(pts, {
          color: "#f59e0b", weight: 2, opacity: 0.5, dashArray: "6 4",
        });
        dl.addLayer(line);
      }

      drawingPoints.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon: drawingPointIcon });
        dl.addLayer(m);
      });

      const last = drawingPoints[drawingPoints.length - 1];
      const cursorRing = L.circleMarker([last.lat, last.lng], {
        radius: 10, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.08, weight: 1,
      });
      dl.addLayer(cursorRing);
    }

    return () => {
      if (drawingLayerRef.current) {
        map.removeLayer(drawingLayerRef.current);
        drawingLayerRef.current = null;
      }
    };
  }, [map, drawingPoints, drawMode]);

  useEffect(() => {
    if (drawMode === "pan" || drawMode === "select") {
      setDrawingPoints([]);
    }
  }, [drawMode, setDrawingPoints]);

  useEffect(() => {
    if (drawMode !== "point" && drawMode !== "line" && drawMode !== "polygon") return;

    const handlers = {
      click(e) {
        const { lat, lng } = e.latlng;
        if (drawMode === "point") {
          const label = prompt("Label for this point:", `Point ${userPoints.length + 1}`);
          const elev = parseFloat(prompt("Elevation (m):", "0")) || 0;
          addPoint(lat, lng, label || `Point ${userPoints.length + 1}`, elev, "");
          setDrawMode("pan");
          return;
        }
        if (drawMode === "line" || drawMode === "polygon") {
          setDrawingPoints((prev) => [...prev, { lat, lng }]);
        }
      },
      dblclick(e) {
        if ((drawMode === "line" || drawMode === "polygon") && drawingPoints.length >= 2) {
          const pts = [...drawingPoints];
          const label = prompt("Label:", `${drawMode === "line" ? "Line" : "Polygon"} ${(drawMode === "line" ? userLines.length : userPolygons.length) + 1}`);
          if (drawMode === "line") {
            addLine(pts, label || `Line ${userLines.length + 1}`);
          } else {
            addPolygon(pts, label || `Polygon ${userPolygons.length + 1}`);
          }
          setDrawingPoints([]);
          setDrawMode("pan");
          L.DomEvent.stop(e);
        }
      },
    };

    map.on("click", handlers.click);
    map.on("dblclick", handlers.dblclick);

    if (drawMode === "line" || drawMode === "polygon") {
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
    }

    return () => {
      map.off("click", handlers.click);
      map.off("dblclick", handlers.dblclick);
      map.getContainer().style.cursor = "";
    };
  }, [map, drawMode, drawingPoints, addPoint, addLine, addPolygon, setDrawMode, setDrawingPoints, userPoints.length, userLines.length, userPolygons.length]);

  return null;
}
