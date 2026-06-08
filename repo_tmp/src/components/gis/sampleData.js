const CENTER_LAT = 39.7392;
const CENTER_LNG = -104.9903;
const JITTER = 0.002;

function rand(min, max) { return Math.random() * (max - min) + min; }

const CODES = ["CP", "BM", "TOPO", "MON", "CK"];

export const surveyPoints = Array.from({ length: 250 }, (_, i) => {
  const code = CODES[Math.floor(Math.random() * CODES.length)];
  const lat = CENTER_LAT + rand(-JITTER, JITTER);
  const lng = CENTER_LNG + rand(-JITTER, JITTER);
  return {
    type: "Feature",
    id: `PT-${String(i + 1).padStart(4, "0")}`,
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      id: `PT-${String(i + 1).padStart(4, "0")}`,
      code,
      elevation: parseFloat(rand(1580, 1680).toFixed(2)),
      northing: lat * 111320,
      easting: lng * 111320 * Math.cos((lat * Math.PI) / 180),
      description: code === "CP" ? "Control Point" :
        code === "BM" ? "Bench Mark" :
        code === "MON" ? "Monument" :
        code === "CK" ? "Check Shot" : "Topographic Point",
      accuracy: code === "CP" ? "0.010m" : code === "BM" ? "0.015m" : "0.050m",
      date: `2026-0${Math.floor(Math.random() * 3) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    },
  };
});

export const boundaries = [
  {
    id: "parcel-1",
    name: "Oakwood Estates — Tract A",
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [CENTER_LNG - 0.008, CENTER_LAT - 0.005],
        [CENTER_LNG + 0.006, CENTER_LAT - 0.006],
        [CENTER_LNG + 0.008, CENTER_LAT + 0.004],
        [CENTER_LNG - 0.002, CENTER_LAT + 0.008],
        [CENTER_LNG - 0.009, CENTER_LAT + 0.003],
        [CENTER_LNG - 0.008, CENTER_LAT - 0.005],
      ]],
    },
    properties: { name: "Oakwood Estates — Tract A", area: "14.2 ha", zoning: "Residential R-1", parcel: "P-2024-001" },
  },
  {
    id: "parcel-2",
    name: "Oakwood Estates — Tract B",
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [CENTER_LNG + 0.006, CENTER_LAT - 0.006],
        [CENTER_LNG + 0.015, CENTER_LAT - 0.004],
        [CENTER_LNG + 0.014, CENTER_LAT + 0.005],
        [CENTER_LNG + 0.008, CENTER_LAT + 0.004],
        [CENTER_LNG + 0.006, CENTER_LAT - 0.006],
      ]],
    },
    properties: { name: "Oakwood Estates — Tract B", area: "8.7 ha", zoning: "Residential R-1", parcel: "P-2024-002" },
  },
  {
    id: "parcel-3",
    name: "Riverbend Commercial",
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [CENTER_LNG - 0.002, CENTER_LAT + 0.008],
        [CENTER_LNG + 0.008, CENTER_LAT + 0.004],
        [CENTER_LNG + 0.014, CENTER_LAT + 0.005],
        [CENTER_LNG + 0.012, CENTER_LAT + 0.012],
        [CENTER_LNG + 0.003, CENTER_LAT + 0.014],
        [CENTER_LNG - 0.002, CENTER_LAT + 0.008],
      ]],
    },
    properties: { name: "Riverbend Commercial", area: "6.3 ha", zoning: "Commercial C-2", parcel: "P-2024-003" },
  },
];

export const contours = Array.from({ length: 20 }, (_, i) => {
  const baseElev = 1600 + i * 5;
  const angle = (i / 20) * Math.PI * 2;
  const radius = 0.015 + Math.random() * 0.008;
  const points = Array.from({ length: 24 }, (_, j) => {
    const a = (j / 24) * Math.PI * 2;
    const r = radius * (1 + 0.3 * Math.sin(a * 3 + angle));
    return [
      CENTER_LNG + r * Math.cos(a + angle) + rand(-0.001, 0.001),
      CENTER_LAT + r * Math.sin(a + angle) * 0.7 + rand(-0.001, 0.001),
    ];
  });
  points.push(points[0]);
  return {
    type: "Feature",
    id: `contour-${i}`,
    geometry: { type: "LineString", coordinates: points },
    properties: { elevation: baseElev, interval: "5m", type: "intermediate" },
  };
});

export const codeColors = {
  CP: { color: "#6366f1", label: "Control Point" },
  BM: { color: "#34d399", label: "Bench Mark" },
  TOPO: { color: "#f59e0b", label: "Topographic" },
  MON: { color: "#ef4444", label: "Monument" },
  CK: { color: "#8b5cf6", label: "Check Shot" },
};

export const defaultView = { center: [CENTER_LAT, CENTER_LNG], zoom: 15 };
