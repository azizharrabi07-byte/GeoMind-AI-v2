/** GeoMind v2 — Product definition constants */

export const PRODUCT = {
  name: 'GeoMind',
  tagline: 'Survey Project Operating System',
  version: '2.0',
  elevator:
    'GeoMind is a Survey Project Operating System that centralizes files, maps, reports, communications, and project knowledge into one searchable workspace. AI assists with search, reporting, and project understanding.',
  vision: 'The central knowledge and project management platform for surveying firms.',
} as const

export const MODULES = [
  { id: 'overview',  icon: '🏠', title: 'Project Workspace', desc: 'Central hub for files, maps, reports, notes, and team activity' },
  { id: 'projects',  icon: '📁', title: 'Projects',          desc: 'Organize survey projects with status, clients, and metadata' },
  { id: 'files',     icon: '📄', title: 'Files',             desc: 'Upload DXF, CSV, PDF, GeoJSON — with version tracking' },
  { id: 'timeline',  icon: '🕐', title: 'Project Timeline',  desc: 'Track uploads, drawing updates, reports, and client feedback' },
  { id: 'search',    icon: '🔍', title: 'Smart Search',      desc: 'Search across projects, files, reports, locations, and clients' },
  { id: 'map',       icon: '🗺️', title: 'GIS Viewer',        desc: 'Visualize boundaries, parcels, layers, and survey points' },
  { id: 'reports',   icon: '📋', title: 'Report Generator',  desc: 'Project summaries, technical reports, and client deliverables' },
  { id: 'chat',      icon: '🧠', title: 'Project Brain',     desc: 'AI assistant — answers questions, summarizes, finds related projects' },
  { id: 'settings',  icon: '⚙️', title: 'Settings',          desc: 'Profile, integrations, and preferences' },
] as const

export const INTEGRATIONS = [
  {
    name: 'AutoCAD',
    role: 'Engineering drawings',
    keeps: true,
    integration: 'Import DXF files, read geometry, extract parcels, link drawings to projects',
  },
  {
    name: 'QGIS',
    role: 'GIS & mapping',
    keeps: true,
    integration: 'Import GeoJSON & Shapefile, visualize maps, connect geographic data to projects',
  },
  {
    name: 'Excel',
    role: 'Survey coordinates',
    keeps: true,
    integration: 'Import spreadsheets, analyze survey points, extract project statistics',
  },
  {
    name: 'Google Drive',
    role: 'Cloud storage',
    keeps: true,
    integration: 'Automatic file sync, centralized project import, continuous updates',
  },
  {
    name: 'OneDrive',
    role: 'Microsoft cloud',
    keeps: true,
    integration: 'Enterprise document sync and team collaboration',
  },
  {
    name: 'Outlook / Gmail',
    role: 'Project communication',
    keeps: true,
    integration: 'Link emails to projects, preserve communication history, build timelines',
  },
] as const

export const WORKFLOW_STEPS = [
  { n: '01', title: 'Connect your tools', desc: 'AutoCAD, QGIS, Excel, Google Drive, OneDrive — keep using what you have.' },
  { n: '02', title: 'Centralize in GeoMind', desc: 'Import files into the Project Workspace. Every drawing, spreadsheet, and report in one place.' },
  { n: '03', title: 'Track & search', desc: 'Version history, project timeline, and smart search across all project knowledge.' },
  { n: '04', title: 'Deliver', desc: 'Generate reports, visualize on GIS Viewer, and let Project Brain assist when needed.' },
] as const