import { useRef, useState, useCallback } from "react";

export default function GeoJSONManager({ onImport, onExport, currentData }) {
  const fileRef = useRef(null);
  const [imported, setImported] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.type || !data.features) {
        throw new Error("Invalid GeoJSON: must contain 'type' and 'features'");
      }
      const count = data.features.length;
      setImported({ name: file.name, count, types: [...new Set(data.features.map((f) => f.geometry?.type).filter(Boolean))] });
      onImport(data);
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  }, [onImport]);

  const handleExport = useCallback(() => {
    if (!currentData?.features?.length) return;
    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "survey_export.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }, [currentData]);

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".geojson,.json" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        className="text-[11px] px-2.5 py-1.5 rounded-md bg-white/[0.04] text-surface-400 hover:text-surface-200 border border-white/[0.06] transition-all flex items-center gap-1.5"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
        Import
      </button>
      <button
        onClick={handleExport}
        disabled={!currentData?.features?.length}
        className="text-[11px] px-2.5 py-1.5 rounded-md bg-white/[0.04] text-surface-400 hover:text-surface-200 border border-white/[0.06] transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export
      </button>
      {imported && (
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
          {imported.count} features ({imported.types.join(", ")})
        </span>
      )}
      {error && (
        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md">{error}</span>
      )}
    </div>
  );
}
