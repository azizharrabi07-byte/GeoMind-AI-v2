export async function readFilePreview(file: File): Promise<{ text: string; imageUrl?: string; imageData?: string }> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''

  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    const imageUrl = URL.createObjectURL(file)
    let imageData: string | undefined
    if (file.size < 400_000) {
      imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
    return { text: `[Image — ${file.name}, ${(file.size / 1024).toFixed(1)} KB]`, imageUrl, imageData }
  }

  if (['csv', 'txt', 'dxf', 'geojson', 'json'].includes(ext) || file.type.startsWith('text/')) {
    try {
      const text = await file.text()
      return { text: text.slice(0, 8000) }
    } catch {
      return { text: `[Could not read ${file.name} as text]` }
    }
  }

  return { text: `[Binary file — ${ext.toUpperCase() || 'unknown'} format, ${(file.size / 1024).toFixed(1)} KB]` }
}

export function fileTypeDescription(ext: string): string {
  const d: Record<string, string> = {
    csv: 'Survey coordinate spreadsheet — point data, elevations, point IDs',
    dxf: 'AutoCAD drawing — boundaries, layers, parcel geometry',
    geojson: 'GIS vector data — features, polygons, coordinate geometry',
    json: 'Structured data — may contain GeoJSON or project metadata',
    pdf: 'Document report — legal description, survey certification',
    xlsx: 'Excel workbook — field measurements, calculations',
    xls: 'Excel workbook — field measurements, calculations',
    png: 'Site photograph — field evidence, monument photos',
    jpg: 'Site photograph — field evidence, monument photos',
    jpeg: 'Site photograph — field evidence, monument photos',
    txt: 'Plain text — field notes, coordinates, metadata',
  }
  return d[ext] || `Survey file (${ext || 'unknown'})`
}