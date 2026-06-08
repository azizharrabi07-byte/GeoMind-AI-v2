import { useMemo } from "react";

function toDMS(deg, isLat) {
  const d = Math.abs(deg);
  const dir = deg >= 0 ? (isLat ? "N" : "E") : (isLat ? "S" : "W");
  const degs = Math.floor(d);
  const mins = Math.floor((d - degs) * 60);
  const secs = ((d - degs - mins / 60) * 3600).toFixed(2);
  return `${dir} ${degs}° ${mins}' ${secs}"`;
}

function toUTM(lat, lng) {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const hem = lat >= 0 ? "N" : "S";
  const easting = 500000 + (lng * 0.00001 * 111320 * Math.cos((lat * Math.PI) / 180));
  const northing = lat * 110540;
  return { zone: `${zone}${hem}`, easting: easting.toFixed(2), northing: northing.toFixed(2) };
}

export default function CoordinateDisplay({ coord, visible }) {
  const data = useMemo(() => {
    if (!coord) return null;
    const lat = parseFloat(coord.lat);
    const lng = parseFloat(coord.lng);
    const utm = toUTM(lat, lng);
    return {
      dd: `${coord.lat}, ${coord.lng}`,
      dms: `${toDMS(lat, true)}  ${toDMS(lng, false)}`,
      utm: `UTM ${utm.zone}  E: ${utm.easting}  N: ${utm.northing}`,
    };
  }, [coord]);

  if (!visible || !data) return null;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-900/85 backdrop-blur-sm border border-white/[0.06] rounded-lg max-w-[90vw]">
      <span className="text-[10px] font-mono text-brand-300 whitespace-nowrap">{data.dd}</span>
      <span className="text-[8px] text-surface-600">|</span>
      <span className="text-[10px] font-mono text-surface-300 hidden sm:inline whitespace-nowrap">{data.dms}</span>
      <span className="text-[8px] text-surface-600 hidden sm:inline">|</span>
      <span className="text-[10px] font-mono text-surface-400 hidden lg:inline whitespace-nowrap">{data.utm}</span>
    </div>
  );
}
