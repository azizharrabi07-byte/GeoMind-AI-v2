import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { db } from '../../lib/data'
import type { TabProps } from '../../lib/types'
import { generateMapChangeReport, type MapChangeEntry } from '../../lib/mapAi'
import { Toast } from '../../components/Toast'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const BASE_MAPS = {
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
}

type DrawMode = 'none' | 'point' | 'line' | 'polygon'
type SidePanel = 'search' | 'layers' | 'ai'
type SearchMode = 'place' | 'coords'

function parseCoordinates(input: string): [number, number] | null {
  const cleaned = input.trim().replace(/[°'"NSEWnsew]/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = cleaned.split(/[, ]+/).filter(Boolean)
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lat, lng]
}

function MapFlyTo({ target, zoom }: { target: [number, number] | null; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, zoom, { duration: 1.2 })
  }, [target, zoom, map])
  return null
}

function MapFitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [bounds, map])
  return null
}

function MapClickHandler({ drawMode, onClick }: { drawMode: DrawMode; onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (drawMode !== 'none') onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function MapTab({ user, projectId, project }: TabProps) {
  const [baseMap, setBaseMap] = useState<'street' | 'satellite' | 'topo'>('street')
  const [drawMode, setDrawMode] = useState<DrawMode>('none')
  const [points, setPoints] = useState<any[]>([])
  const [lines, setLines] = useState<any[]>([])
  const [polygons, setPolygons] = useState<any[]>([])
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([])
  const [loading, setLoading] = useState(true)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [flyZoom, setFlyZoom] = useState(6)
  const [fitBounds, setFitBounds] = useState<L.LatLngBoundsExpression | null>(null)
  const [mapCenter] = useState<[number, number]>([36.8065, 10.1815])
  const [sidePanel, setSidePanel] = useState<SidePanel>('search')
  const [searchMode, setSearchMode] = useState<SearchMode>('place')
  const [locationQuery, setLocationQuery] = useState('')
  const [coordLat, setCoordLat] = useState('')
  const [coordLng, setCoordLng] = useState('')
  const [searching, setSearching] = useState(false)
  const [changes, setChanges] = useState<MapChangeEntry[]>([])
  const [mapAiInput, setMapAiInput] = useState('')
  const [mapAiMessages, setMapAiMessages] = useState<{ role: string; content: string }[]>([])
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [layerVisibility, setLayerVisibility] = useState({ points: true, lines: true, polygons: true })
  const [toast, setToast] = useState<string | null>(null)
  const geoInputRef = useRef<HTMLInputElement>(null)

  const allFeatures = [...points, ...lines, ...polygons]
  const selectedFeature = allFeatures.find(f => f.id === selectedFeatureId)

  function logChange(action: string, detail: string, notify = true) {
    setChanges(prev => [{
      id: crypto.randomUUID(),
      action,
      detail,
      at: new Date().toISOString(),
    }, ...prev].slice(0, 30))
    if (notify) {
      setToast(`${action}: ${detail}`)
      setSidePanel('ai')
      setMapAiMessages(m => [...m, {
        role: 'assistant',
        content: `🗺️ ${action} — ${detail}\n\nAsk "generate map report" for a full summary.`,
      }].slice(-20))
    }
  }

  async function reload() {
    const data = await db.gis.list(user.id, projectId)
    setPoints(data.filter(f => f.feature_type === 'point'))
    setLines(data.filter(f => f.feature_type === 'line'))
    setPolygons(data.filter(f => f.feature_type === 'polygon'))
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [user.id, projectId])

  useEffect(() => {
    if (selectedFeature) setRenameValue(selectedFeature.label || '')
    else setRenameValue('')
  }, [selectedFeatureId, selectedFeature?.label])

  async function savePoint(lat: number, lng: number) {
    const label = `Point ${points.length + 1}`
    const saved = await db.gis.create({
      user_id: user.id,
      project_id: projectId || null,
      feature_type: 'point',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      label,
    })
    setPoints(p => [...p, saved])
    logChange('Added point', `${label} at ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    setDrawMode('none')
  }

  async function saveLine(coords: [number, number][]) {
    const label = `Line ${lines.length + 1}`
    const saved = await db.gis.create({
      user_id: user.id,
      project_id: projectId || null,
      feature_type: 'line',
      geometry: { type: 'LineString', coordinates: coords.map(([lat, lng]) => [lng, lat]) },
      label,
    })
    setLines(l => [...l, saved])
    setDrawPoints([])
    logChange('Added line', `${label} with ${coords.length} vertices`)
    setDrawMode('none')
  }

  async function savePolygon(coords: [number, number][]) {
    const label = `Polygon ${polygons.length + 1}`
    const saved = await db.gis.create({
      user_id: user.id,
      project_id: projectId || null,
      feature_type: 'polygon',
      geometry: { type: 'Polygon', coordinates: [coords.map(([lat, lng]) => [lng, lat])] },
      label,
    })
    setPolygons(p => [...p, saved])
    setDrawPoints([])
    logChange('Added polygon', `${label} with ${coords.length} vertices`)
    setDrawMode('none')
  }

  function handleMapClick(lat: number, lng: number) {
    if (drawMode === 'point') savePoint(lat, lng)
    else if (drawMode === 'line' || drawMode === 'polygon') setDrawPoints(prev => [...prev, [lat, lng]])
  }

  async function deleteFeature(id: string, type: string, label: string) {
    await db.gis.delete(id)
    if (type === 'point') setPoints(p => p.filter(f => f.id !== id))
    if (type === 'line') setLines(l => l.filter(f => f.id !== id))
    if (type === 'polygon') setPolygons(p => p.filter(f => f.id !== id))
    logChange('Deleted', `${type} "${label}"`)
    if (selectedFeatureId === id) setSelectedFeatureId(null)
  }

  async function renameFeature() {
    if (!selectedFeature || !renameValue.trim()) return
    const updated = await db.gis.update(selectedFeature.id, { label: renameValue.trim() })
    const apply = (list: any[]) => list.map(f => f.id === updated.id ? updated : f)
    if (selectedFeature.feature_type === 'point') setPoints(apply)
    if (selectedFeature.feature_type === 'line') setLines(apply)
    if (selectedFeature.feature_type === 'polygon') setPolygons(apply)
    logChange('Renamed', `${selectedFeature.feature_type} → "${renameValue.trim()}"`)
  }

  async function clearAll() {
    if (!confirm('Clear all map features for this project?')) return
    await db.gis.clear(user.id, projectId)
    setPoints([]); setLines([]); setPolygons([]); setDrawPoints([])
    logChange('Cleared', 'All features removed')
  }

  function navigateTo(lat: number, lng: number, zoom = 14, label?: string) {
    setFlyTarget([lat, lng])
    setFlyZoom(zoom)
    logChange('Navigated', label || `Map moved to ${lat.toFixed(5)}, ${lng.toFixed(5)}`, false)
    setToast(label || `Moved to ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
  }

  async function searchPlace(query?: string) {
    const q = (query ?? locationQuery).trim()
    if (!q) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      if (data?.[0]) {
        navigateTo(parseFloat(data[0].lat), parseFloat(data[0].lon), 14, `Map moved to "${data[0].display_name}"`)
      } else {
        setToast('Location not found. Try "Tunis" or "La Marsa, Tunisia".')
      }
    } catch {
      setToast('Location search failed. Check your internet connection.')
    }
    setSearching(false)
  }

  function searchCoords() {
    const combined = coordLat && coordLng ? `${coordLat}, ${coordLng}` : locationQuery
    const parsed = parseCoordinates(combined)
    if (!parsed) {
      setToast('Invalid coordinates. Use format: 36.8065, 10.1815')
      return
    }
    navigateTo(parsed[0], parsed[1], 16, `Coordinates ${parsed[0].toFixed(5)}, ${parsed[1].toFixed(5)}`)
  }

  function handleSearch() {
    if (searchMode === 'place') searchPlace()
    else searchCoords()
  }

  async function importGeoJSON(file: File) {
    try {
      const text = await file.text()
      const geo = JSON.parse(text)
      const features = geo.type === 'FeatureCollection' ? geo.features : [geo]
      let count = 0
      for (const f of features) {
        if (!f.geometry) continue
        const type = f.geometry.type === 'Point' ? 'point'
          : f.geometry.type === 'LineString' ? 'line'
          : f.geometry.type === 'Polygon' ? 'polygon' : null
        if (!type) continue
        const saved = await db.gis.create({
          user_id: user.id,
          project_id: projectId || null,
          feature_type: type,
          geometry: f.geometry,
          label: f.properties?.name || `Imported ${type}`,
          properties: f.properties || {},
        })
        if (type === 'point') setPoints(p => [...p, saved])
        if (type === 'line') setLines(l => [...l, saved])
        if (type === 'polygon') setPolygons(p => [...p, saved])
        count++
      }
      logChange('Imported', `${count} features from ${file.name}`)
      fitAllFeatures()
    } catch {
      setToast('Invalid GeoJSON file')
    }
  }

  function exportGeoJSON() {
    const features = allFeatures.map(f => ({
      type: 'Feature',
      properties: { name: f.label, feature_type: f.feature_type, ...f.properties },
      geometry: f.geometry,
    }))
    const blob = new Blob([JSON.stringify({ type: 'FeatureCollection', features }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'project'}-map.geojson`
    a.click()
    URL.revokeObjectURL(url)
    logChange('Exported', `${features.length} features to GeoJSON`)
  }

  function fitAllFeatures() {
    const coords: [number, number][] = []
    for (const p of points) {
      const c = p.geometry.coordinates
      coords.push([c[1], c[0]])
    }
    for (const l of lines) {
      for (const c of l.geometry.coordinates) coords.push([c[1], c[0]])
    }
    for (const p of polygons) {
      for (const c of p.geometry.coordinates[0]) coords.push([c[1], c[0]])
    }
    if (coords.length === 0) {
      setToast('No features to fit')
      return
    }
    setFitBounds(coords)
    logChange('View', `Fit map to ${coords.length} coordinate(s)`)
  }

  function flyToFeature(f: any) {
    setSelectedFeatureId(f.id)
    const g = f.geometry
    if (g.type === 'Point') {
      setFlyTarget([g.coordinates[1], g.coordinates[0]])
      setFlyZoom(16)
    } else if (g.type === 'LineString' && g.coordinates[0]) {
      setFlyTarget([g.coordinates[0][1], g.coordinates[0][0]])
      setFlyZoom(15)
    } else if (g.type === 'Polygon' && g.coordinates[0]?.[0]) {
      setFlyTarget([g.coordinates[0][0][1], g.coordinates[0][0][0]])
      setFlyZoom(15)
    }
  }

  function sendMapAi(preset?: string) {
    const q = preset || mapAiInput.trim()
    if (!q) return
    setMapAiInput('')
    setMapAiMessages(m => [...m, { role: 'user', content: q }])
    const reply = generateMapChangeReport(
      changes,
      { points: points.length, lines: lines.length, polygons: polygons.length },
      project?.name,
      q,
    )
    setMapAiMessages(m => [...m, { role: 'assistant', content: reply }])
    setSidePanel('ai')
  }

  const sideTabs: { id: SidePanel; label: string }[] = [
    { id: 'search', label: 'Search' },
    { id: 'layers', label: 'Layers' },
    { id: 'ai', label: 'Map AI' },
  ]

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold">GIS Viewer</h1>
          <p className="text-xs text-surface-500 truncate">
            {project ? project.name : 'Project map'} · draw, search, export
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['none', 'point', 'line', 'polygon'] as DrawMode[]).map(mode => (
            <button key={mode} onClick={() => { setDrawMode(mode); setDrawPoints([]) }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${drawMode === mode ? 'bg-brand-500 text-white' : 'bg-white/[0.04] text-surface-300'}`}>
              {mode === 'none' ? 'Pan' : mode === 'point' ? 'Point' : mode === 'line' ? 'Line' : 'Polygon'}
            </button>
          ))}
          {drawMode === 'line' && drawPoints.length >= 2 && (
            <button onClick={() => saveLine(drawPoints)} className="px-2.5 py-1 bg-emerald-500 rounded-lg text-[11px]">Save Line</button>
          )}
          {drawMode === 'polygon' && drawPoints.length >= 3 && (
            <button onClick={() => savePolygon(drawPoints)} className="px-2.5 py-1 bg-emerald-500 rounded-lg text-[11px]">Save Poly</button>
          )}
          {drawPoints.length > 0 && (
            <button onClick={() => setDrawPoints([])} className="px-2.5 py-1 bg-white/[0.04] rounded-lg text-[11px]">Cancel</button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-2 overflow-hidden">
        {/* Map area — fixed within viewport, never blows out page */}
        <div className="min-h-0 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5 items-center flex-shrink-0">
            <select value={baseMap} onChange={e => setBaseMap(e.target.value as typeof baseMap)}
              className="bg-white/[0.06] border border-white/[0.06] rounded-lg px-2 py-1 text-[11px]">
              <option value="street">Street</option>
              <option value="satellite">Satellite</option>
              <option value="topo">Topo</option>
            </select>
            <button onClick={fitAllFeatures} className="px-2.5 py-1 bg-white/[0.04] rounded-lg text-[11px]">Fit All</button>
            <button onClick={() => geoInputRef.current?.click()} className="px-2.5 py-1 bg-white/[0.04] rounded-lg text-[11px]">Import</button>
            <button onClick={exportGeoJSON} className="px-2.5 py-1 bg-white/[0.04] rounded-lg text-[11px]">Export</button>
            <button onClick={clearAll} className="px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[11px]">Clear</button>
            <input ref={geoInputRef} type="file" accept=".geojson,.json" className="hidden"
              onChange={e => e.target.files?.[0] && importGeoJSON(e.target.files[0])} />
            <div className="ml-auto flex gap-2 text-[10px] text-surface-500">
              <span>{points.length}P</span>
              <span>{lines.length}L</span>
              <span>{polygons.length}Poly</span>
            </div>
          </div>

          <div className="flex-1 min-h-[240px] glass rounded-xl overflow-hidden border border-white/[0.04] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-surface-500 text-sm">Loading map...</div>
            ) : (
              <MapContainer center={mapCenter} zoom={6} className="absolute inset-0" style={{ height: '100%', width: '100%' }}>
                <TileLayer url={BASE_MAPS[baseMap]} attribution='&copy; OpenStreetMap' />
                <MapFlyTo target={flyTarget} zoom={flyZoom} />
                <MapFitBounds bounds={fitBounds} />
                <MapClickHandler drawMode={drawMode} onClick={handleMapClick} />
                {layerVisibility.points && points.map(p => {
                  const c = p.geometry.coordinates
                  return <Marker key={p.id} position={[c[1], c[0]]} eventHandlers={{ click: () => setSelectedFeatureId(p.id) }} />
                })}
                {layerVisibility.lines && lines.map(l => (
                  <Polyline key={l.id} positions={l.geometry.coordinates.map((c: number[]) => [c[1], c[0]])}
                    pathOptions={{ color: selectedFeatureId === l.id ? '#f59e0b' : '#6366f1', weight: 3 }}
                    eventHandlers={{ click: () => setSelectedFeatureId(l.id) }} />
                ))}
                {layerVisibility.polygons && polygons.map(p => {
                  const rings = p.geometry.coordinates[0]
                  return <Polygon key={p.id} positions={rings.map((c: number[]) => [c[1], c[0]])}
                    pathOptions={{ color: selectedFeatureId === p.id ? '#f59e0b' : '#818cf8', fillColor: '#6366f1', fillOpacity: 0.2 }}
                    eventHandlers={{ click: () => setSelectedFeatureId(p.id) }} />
                })}
                {drawPoints.length > 0 && drawMode === 'line' && (
                  <Polyline positions={drawPoints} pathOptions={{ color: '#22c55e', weight: 2, dashArray: '5,5' }} />
                )}
                {drawPoints.length > 0 && drawMode === 'polygon' && (
                  <Polygon positions={drawPoints} pathOptions={{ color: '#22c55e', fillOpacity: 0.1, dashArray: '5,5' }} />
                )}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Right panel with tabs */}
        <div className="min-h-[280px] max-h-[42vh] lg:max-h-none lg:min-h-0 flex flex-col glass rounded-xl border border-white/[0.04] overflow-hidden flex-shrink-0 lg:flex-shrink">
          <div className="flex border-b border-white/[0.04] flex-shrink-0">
            {sideTabs.map(t => (
              <button key={t.id} onClick={() => setSidePanel(t.id)}
                className={`flex-1 py-2.5 text-[11px] font-medium transition-colors relative ${
                  sidePanel === t.id
                    ? t.id === 'ai' ? 'text-violet-300 border-b-2 border-violet-500' : 'text-brand-300 border-b-2 border-brand-500'
                    : 'text-surface-500 hover:text-surface-300'
                }`}>
                {t.label}
                {t.id === 'ai' && changes.length > 0 && sidePanel !== 'ai' && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-violet-500" />
                )}
              </button>
            ))}
          </div>

          <div className={`flex-1 min-h-0 p-3 ${sidePanel === 'ai' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
            {sidePanel === 'search' && (
              <div className="space-y-3">
                <div className="flex gap-1">
                  {(['place', 'coords'] as SearchMode[]).map(m => (
                    <button key={m} onClick={() => setSearchMode(m)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium ${
                        searchMode === m ? 'bg-brand-500/20 text-brand-300' : 'bg-white/[0.04] text-surface-400'
                      }`}>
                      {m === 'place' ? 'Place Name' : 'Coordinates'}
                    </button>
                  ))}
                </div>

                {searchMode === 'place' ? (
                  <div className="space-y-2">
                    <input
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder='e.g. "La Marsa, Tunis"'
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-500/40"
                    />
                    <button onClick={handleSearch} disabled={searching}
                      className="w-full py-2 bg-brand-500 hover:bg-brand-400 rounded-lg text-xs font-medium disabled:opacity-50">
                      {searching ? 'Searching...' : 'Go to Location'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={coordLat} onChange={e => setCoordLat(e.target.value)}
                        placeholder="Latitude" className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-2 text-xs outline-none focus:border-brand-500/40" />
                      <input value={coordLng} onChange={e => setCoordLng(e.target.value)}
                        placeholder="Longitude" className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-2 text-xs outline-none focus:border-brand-500/40" />
                    </div>
                    <p className="text-[10px] text-surface-600">Or paste: 36.8065, 10.1815</p>
                    <input
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="36.8065, 10.1815"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-500/40"
                    />
                    <button onClick={handleSearch}
                      className="w-full py-2 bg-brand-500 hover:bg-brand-400 rounded-lg text-xs font-medium">
                      Go to Coordinates
                    </button>
                  </div>
                )}

                {project?.location && (
                  <button onClick={() => { setSearchMode('place'); setLocationQuery(project.location!); searchPlace(project.location) }}
                    className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg text-[11px] text-surface-400">
                    Jump to project location: {project.location}
                  </button>
                )}
              </div>
            )}

            {sidePanel === 'layers' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {([
                    { key: 'points' as const, label: 'Points', count: points.length },
                    { key: 'lines' as const, label: 'Lines', count: lines.length },
                    { key: 'polygons' as const, label: 'Polygons', count: polygons.length },
                  ]).map(layer => (
                    <label key={layer.key} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-white/[0.03] cursor-pointer">
                      <span className="text-surface-300">{layer.label} ({layer.count})</span>
                      <input type="checkbox" checked={layerVisibility[layer.key]}
                        onChange={e => setLayerVisibility(v => ({ ...v, [layer.key]: e.target.checked }))}
                        className="accent-brand-500" />
                    </label>
                  ))}
                </div>

                {selectedFeature && (
                  <div className="border-t border-white/[0.04] pt-3 space-y-2">
                    <p className="text-[10px] text-surface-500 uppercase font-semibold">Selected Feature</p>
                    <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs outline-none" />
                    <div className="flex gap-1">
                      <button onClick={renameFeature} className="flex-1 py-1.5 bg-brand-500/20 text-brand-300 rounded-lg text-[11px]">Rename</button>
                      <button onClick={() => flyToFeature(selectedFeature)} className="flex-1 py-1.5 bg-white/[0.04] rounded-lg text-[11px]">Zoom</button>
                      <button onClick={() => deleteFeature(selectedFeature.id, selectedFeature.feature_type, selectedFeature.label)}
                        className="px-2 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[11px]">✕</button>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/[0.04] pt-2 space-y-1 max-h-[140px] overflow-y-auto">
                  {allFeatures.length === 0 ? (
                    <p className="text-[11px] text-surface-600 text-center py-2">No features yet</p>
                  ) : allFeatures.map(f => (
                    <button key={f.id} onClick={() => flyToFeature(f)}
                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] truncate ${
                        selectedFeatureId === f.id ? 'bg-brand-500/10 text-brand-300' : 'hover:bg-white/[0.03] text-surface-400'
                      }`}>
                      {f.label || f.feature_type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sidePanel === 'ai' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-2">
                  {mapAiMessages.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-surface-500">Map AI tracks your edits and generates change reports.</p>
                      <button onClick={() => sendMapAi('generate map report')}
                        className="w-full py-2 bg-violet-500/20 text-violet-300 rounded-lg text-[11px] font-medium">
                        Generate Change Report
                      </button>
                    </div>
                  ) : mapAiMessages.map((m, i) => (
                    <div key={i} className={`text-[11px] whitespace-pre-wrap rounded-lg px-2 py-1.5 ${
                      m.role === 'user' ? 'bg-violet-500/10 text-violet-200' : 'bg-white/[0.04] text-surface-300'
                    }`}>{m.content}</div>
                  ))}
                </div>
                {changes.length > 0 && (
                  <div className="border-t border-white/[0.04] pt-2 mb-2 max-h-[80px] overflow-y-auto">
                    <p className="text-[10px] text-surface-600 mb-1">Recent changes ({changes.length})</p>
                    {changes.slice(0, 3).map(c => (
                      <div key={c.id} className="text-[10px] text-surface-500 truncate">{c.action}: {c.detail}</div>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 flex-shrink-0">
                  <input value={mapAiInput} onChange={e => setMapAiInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMapAi()}
                    placeholder="Ask about map changes..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs outline-none min-w-0"
                  />
                  <button onClick={() => sendMapAi()} className="px-2.5 py-1.5 bg-violet-600 rounded-lg text-xs">→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} variant="success" />}
    </div>
  )
}