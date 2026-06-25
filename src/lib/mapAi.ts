export type MapChangeEntry = {
  id: string
  action: string
  detail: string
  at: string
}

export function generateMapChangeReport(
  changes: MapChangeEntry[],
  stats: { points: number; lines: number; polygons: number },
  projectName?: string,
  userQuestion?: string,
): string {
  const scope = projectName ? `Project: ${projectName}\n` : ''
  const recent = changes.slice(0, 10)

  if (userQuestion?.toLowerCase().includes('report')) {
    return [
      `${scope}MAP CHANGE REPORT`,
      '═'.repeat(32),
      '',
      `Current features: ${stats.points} points, ${stats.lines} lines, ${stats.polygons} polygons`,
      '',
      'Recent modifications:',
      ...(recent.length
        ? recent.map(c => `• [${new Date(c.at).toLocaleTimeString()}] ${c.action}: ${c.detail}`)
        : ['• No changes recorded this session']),
      '',
      'Assessment:',
      stats.polygons > 0
        ? '— Boundary polygon(s) present. Verify closure and corner monument callouts against field notes.'
        : '— No closed boundary polygon yet. Consider completing parcel geometry before report generation.',
      stats.points > 0
        ? `— ${stats.points} control/survey point(s) on map. Cross-check coordinates with uploaded CSV/DXF.`
        : '— No control points placed. Add monuments or GPS shots for reference.',
      '',
      'Recommended next steps:',
      '1. Compare map geometry with project files (DXF/GeoJSON)',
      '2. Confirm CRS matches project settings',
      '3. Export map snapshot for client deliverable (Phase 2)',
    ].join('\n')
  }

  if (recent.length === 0) {
    return `${scope}No map changes yet. Draw points, lines, or polygons — I'll track and summarize modifications here.`
  }

  const summary = recent.map(c => `• ${c.action}: ${c.detail}`).join('\n')
  return `${scope}Map session summary (${stats.points}P / ${stats.lines}L / ${stats.polygons}Poly):\n\n${summary}\n\nAsk "generate map report" for a full change report.`
}