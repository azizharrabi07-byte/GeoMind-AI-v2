import { CircleMarker, Tooltip } from "react-leaflet";

// Fake anomalies centered around the boundary points
// coordinates: [lat, lng]
const dummyAnomalies = [
  { position: [39.7392 - 0.003, -104.9903 + 0.004], reason: "Coordinate Discrepancy" },
  { position: [39.7392 + 0.005, -104.9903 - 0.002], reason: "Missing Elevation Data" },
];

export default function AnomaliesLayer({ visible }) {
  if (!visible) return null;

  return (
    <>
      {dummyAnomalies.map((anom, i) => (
        <CircleMarker
          key={i}
          center={anom.position}
          radius={20}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.2,
            weight: 2,
            dashArray: "5, 5",
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={false}>
            <div className="bg-rose-500/90 text-rose-50 text-[10px] font-bold px-1 py-0.5 rounded shadow-lg shadow-rose-500/20 uppercase tracking-widest border border-rose-400">
              {anom.reason}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
