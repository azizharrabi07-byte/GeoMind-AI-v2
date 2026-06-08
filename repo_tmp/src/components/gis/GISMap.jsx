import { useRef, useEffect, useCallback, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_SERVERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; <a href='https://esri.com'>Esri</a>",
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; <a href='https://opentopomap.org'>OpenTopoMap</a>",
  },
};

function MapEventHandler({ onMove }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      const c = map.getCenter();
      onMove({ lat: c.lat.toFixed(6), lng: c.lng.toFixed(6), zoom: map.getZoom() });
    };
    map.on("moveend", handler);
    return () => map.off("moveend", handler);
  }, [map, onMove]);
  return null;
}

function CursorTracker({ onCoord }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e) => onCoord({ lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) });
    map.on("mousemove", handler);
    return () => map.off("mousemove", handler);
  }, [map, onCoord]);
  return null;
}

export default function GISMap({
  baseMap = "street",
  onMapMove,
  onCursorCoord,
  children,
}) {
  const tileServer = TILE_SERVERS[baseMap] || TILE_SERVERS.street;

  return (
    <MapContainer
      center={[39.7392, -104.9903]}
      zoom={15}
      zoomControl={false}
      className="w-full h-full"
      preferCanvas={true}
    >
      <ZoomControl position="bottomright" />
      <TileLayer url={tileServer.url} attribution={tileServer.attribution} />
      <MapEventHandler onMove={onMapMove} />
      <CursorTracker onCoord={onCursorCoord} />
      {children}
    </MapContainer>
  );
}
