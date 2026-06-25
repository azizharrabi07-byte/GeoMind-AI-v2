/**
 * Local mock data store for MVP — persists to localStorage.
 * Swap to FastAPI + Supabase by setting VITE_USE_MOCK=false.
 */

export const MOCK_USER_ID = 'mock-user-001'

const STORAGE_KEY = 'geomind-v2-data'

type Store = {
  projects: any[]
  files: any[]
  file_versions: any[]
  analysis_results: any[]
  gis_features: any[]
  gis_snapshots: any[]
  chat_sessions: any[]
  chat_messages: any[]
  activities: any[]
  profiles: any[]
  reports: any[]
}

function uid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as Partial<Store>
      return {
        projects: data.projects || [],
        files: data.files || [],
        file_versions: data.file_versions || [],
        analysis_results: data.analysis_results || [],
        gis_features: data.gis_features || [],
        gis_snapshots: data.gis_snapshots || [],
        chat_sessions: data.chat_sessions || [],
        chat_messages: data.chat_messages || [],
        activities: data.activities || [],
        profiles: data.profiles || [],
        reports: data.reports || [],
      }
    }
  } catch {}
  return seed()
}

function save(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function seed(): Store {
  const t = now()
  const store: Store = {
    projects: [
      {
        id: uid(),
        user_id: MOCK_USER_ID,
        name: 'Tunis Coastal Boundary Survey',
        description: 'Property boundary survey along the La Marsa coastline for municipal cadastre update.',
        status: 'active',
        client_name: 'Municipality of Tunis',
        location: 'La Marsa, Tunis',
        coordinate_system: 'EPSG:32632',
        progress: 65,
        due_date: '2026-07-15',
        created_at: t,
        updated_at: t,
      },
      {
        id: uid(),
        user_id: MOCK_USER_ID,
        name: 'Sfax Industrial Parcel ALTA',
        description: 'ALTA/NSPS land title survey for industrial zone expansion.',
        status: 'review',
        client_name: 'Sfax Industrial Group',
        location: 'Sfax, Tunisia',
        coordinate_system: 'EPSG:32633',
        progress: 40,
        due_date: '2026-08-01',
        created_at: t,
        updated_at: t,
      },
    ],
    files: [],
    file_versions: [],
    analysis_results: [],
    gis_features: [],
    gis_snapshots: [],
    chat_sessions: [],
    chat_messages: [],
    activities: [],
    profiles: [{
      id: MOCK_USER_ID,
      email: 'demo@geomind.ai',
      full_name: 'Demo Surveyor',
      license_number: 'TN-SURV-2024-0847',
      firm_name: 'GeoMind Demo Firm',
      default_crs: 'EPSG:32632',
      report_template: 'boundary',
      created_at: t,
      updated_at: t,
    }],
    reports: [],
  }
  const p1 = store.projects[0].id
  const p2 = store.projects[1].id
  store.activities = [
    { id: uid(), user_id: MOCK_USER_ID, project_id: p1, action: 'general', description: 'Created project "Tunis Coastal Boundary Survey"', metadata: {}, created_at: t },
    { id: uid(), user_id: MOCK_USER_ID, project_id: p2, action: 'general', description: 'Created project "Sfax Industrial Parcel ALTA"', metadata: {}, created_at: t },
  ]
  save(store)
  return store
}

function logActivity(
  store: Store,
  description: string,
  projectId?: string | null,
  action = 'general',
  metadata: Record<string, unknown> = {},
) {
  store.activities.unshift({
    id: uid(),
    user_id: MOCK_USER_ID,
    project_id: projectId || null,
    action,
    description,
    metadata,
    created_at: now(),
  })
  if (store.activities.length > 200) store.activities.length = 200
}

function createFileVersion(store: Store, file: any, previewText?: string, previewImage?: string | null) {
  const existing = store.file_versions.filter(v => v.file_id === file.id)
  const version = {
    id: uid(),
    file_id: file.id,
    project_id: file.project_id,
    filename: file.filename,
    file_ext: file.file_ext,
    file_size: file.file_size,
    preview_text: previewText || file.preview_text || '',
    preview_image: previewImage || file.preview_image || null,
    version_number: existing.length + 1,
    created_at: now(),
  }
  store.file_versions.unshift(version)
  return version
}

function saveGisSnapshot(store: Store, userId: string, projectId: string | null | undefined, label: string) {
  const features = store.gis_features.filter(f =>
    f.user_id === userId && (!projectId || f.project_id === projectId)
  )
  const snapshot = {
    id: uid(),
    user_id: userId,
    project_id: projectId || null,
    label,
    features: JSON.parse(JSON.stringify(features)),
    feature_count: features.length,
    created_at: now(),
  }
  store.gis_snapshots.unshift(snapshot)
  if (store.gis_snapshots.length > 100) store.gis_snapshots.length = 100
  return snapshot
}

function mockFileAnalysis(filename: string, ext: string, size: number) {
  const warnings: string[] = []
  const insights: string[] = []
  const next_actions: string[] = []

  if (ext === 'csv') {
    insights.push('Coordinate columns detected (Easting, Northing, Elevation)')
    insights.push('342 survey points identified with consistent point numbering')
    warnings.push('3 points show elevation outliers (>2σ from mean) — verify field measurements')
    next_actions.push('Review flagged elevation outliers on GIS map')
    next_actions.push('Run traverse closure check before report generation')
  } else if (ext === 'dxf') {
    insights.push('12 drawing layers detected including BOUNDARY, CONTROL, TOPO')
    insights.push('Parcel boundary polygon closed with 4 corner monuments')
    warnings.push('Layer "TEMP" contains unreferenced geometry — may be draft work')
    next_actions.push('Verify monument callouts match field book records')
  } else if (ext === 'geojson' || ext === 'json') {
    insights.push('GeoJSON FeatureCollection with polygon geometry')
    insights.push('CRS appears to be WGS84 — confirm project datum')
    next_actions.push('Reproject to project CRS (EPSG:32632) for analysis')
  } else if (ext === 'pdf') {
    insights.push('Document appears to be a survey report (12 pages)')
    insights.push('Property legal description and metes-and-bounds found on page 3')
    next_actions.push('Extract boundary calls for cross-reference with CAD')
  } else {
    insights.push(`File "${filename}" uploaded successfully (${(size / 1024).toFixed(1)} KB)`)
    insights.push('Basic metadata extracted — full AI analysis available with backend')
    next_actions.push('Link file to a project for organized storage')
  }

  return {
    summary: `AI analysis of ${filename}: ${insights[0] || 'File processed successfully.'}`,
    warnings,
    insights,
    next_actions,
    confidence: 0.85,
  }
}

function mockChatReply(message: string, mapContext?: any): { reply: string; commands: any[] } {
  const lower = message.toLowerCase()
  const commands: any[] = []

  if (lower.includes('add') && (lower.includes('point') || lower.includes('control'))) {
    const lat = 36.8065 + (Math.random() - 0.5) * 0.1
    const lng = 10.1815 + (Math.random() - 0.5) * 0.1
    commands.push({ type: 'add_point', lat, lng, label: 'Control Point', description: 'AI-placed control point' })
    return {
      reply: `I've added a control point at approximately ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E. You can view it on the GIS Map tab.`,
      commands,
    }
  }

  if (lower.includes('clear') && lower.includes('map')) {
    commands.push({ type: 'clear_all' })
    return { reply: 'All map features have been cleared.', commands }
  }

  const pointCount = mapContext?.points?.length || 0
  const lineCount = mapContext?.lines?.length || 0
  const polyCount = mapContext?.polygons?.length || 0

  if (lower.includes('traverse') || lower.includes('adjustment')) {
    return {
      reply: `Traverse adjustment distributes angular and linear misclosures through the network.\n\nFor your current map (${pointCount} points, ${lineCount} lines):\n1. Compute angular misclosure and distribute by compass rule\n2. Compute linear misclosure ratio (should be < 1:5,000 for boundary)\n3. Apply Bowditch or Crandall method based on measurement precision\n\nWould you like me to flag potential blunders in your uploaded data?`,
      commands,
    }
  }

  if (lower.includes('report') || lower.includes('boundary')) {
    return {
      reply: `I can help generate a Boundary Survey Report. Your current project has:\n• ${pointCount} map features\n• Standard sections: legal description, field evidence, measurements, certification\n\nGo to the Reports tab to generate a PDF with your project data.`,
      commands,
    }
  }

  return {
    reply: `I'm your Survey AI Copilot. I can help with:\n• Project file analysis and anomaly detection\n• Traverse and boundary survey questions\n• Map commands ("add a control point", "clear the map")\n• Report generation guidance\n\nCurrent map: ${pointCount} points, ${lineCount} lines, ${polyCount} polygons.\nWhat would you like to explore?`,
    commands,
  }
}

// ─── Projects ───
export const mockProjects = {
  list(userId: string) {
    const store = load()
    return store.projects.filter(p => p.user_id === userId).sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  },
  get(id: string) {
    return load().projects.find(p => p.id === id) || null
  },
  count(userId: string) {
    return this.list(userId).length
  },
  create(data: any) {
    const store = load()
    const project = { id: uid(), ...data, created_at: now(), updated_at: now() }
    store.projects.push(project)
    logActivity(store, `Created project "${project.name}"`, project.id)
    save(store)
    return project
  },
  update(id: string, data: any) {
    const store = load()
    const idx = store.projects.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Project not found')
    store.projects[idx] = { ...store.projects[idx], ...data, updated_at: now() }
    logActivity(store, `Updated project "${store.projects[idx].name}"`, id)
    save(store)
    return store.projects[idx]
  },
  delete(id: string) {
    const store = load()
    const project = store.projects.find(p => p.id === id)
    store.projects = store.projects.filter(p => p.id !== id)
    store.files = store.files.filter(f => f.project_id !== id)
    if (project) logActivity(store, `Deleted project "${project.name}"`)
    save(store)
  },
}

// ─── Files ───
export const mockFiles = {
  list(userId: string, projectId?: string) {
    const store = load()
    return store.files
      .filter(f => f.user_id === userId && (!projectId || f.project_id === projectId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },
  count(userId: string, projectId?: string) {
    return this.list(userId, projectId).length
  },
  get(id: string) {
    const store = load()
    const file = store.files.find(f => f.id === id)
    if (!file) throw new Error('File not found')
    const analysis = store.analysis_results.find(a => a.file_id === id) || null
    return { file, analysis }
  },
  async upload(file: File, projectId?: string, previewText?: string, previewImage?: string) {
    const store = load()
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
    const record = {
      id: uid(),
      user_id: MOCK_USER_ID,
      project_id: projectId || null,
      filename: file.name,
      file_ext: ext,
      file_size: file.size,
      mime_type: file.type,
      storage_path: `mock/${file.name}`,
      preview_text: previewText?.slice(0, 8000) || '',
      preview_image: previewImage?.slice(0, 500000) || null,
      status: 'analyzed',
      created_at: now(),
    }
    store.files.unshift(record)
    const version = createFileVersion(store, record, previewText, previewImage || null)
    const analysis = {
      id: uid(),
      user_id: MOCK_USER_ID,
      file_id: record.id,
      ...mockFileAnalysis(file.name, ext, file.size),
      created_at: now(),
    }
    store.analysis_results.push(analysis)
    logActivity(store, `Uploaded and analyzed "${file.name}"`, projectId, 'file_uploaded', {
      file_id: record.id,
      version_id: version.id,
      filename: file.name,
      navigate_tab: 'files',
    })
    save(store)
    return { file: record, analysis }
  },
  delete(id: string) {
    const store = load()
    const file = store.files.find(f => f.id === id)
    if (file) createFileVersion(store, file, file.preview_text, file.preview_image)
    store.files = store.files.filter(f => f.id !== id)
    store.analysis_results = store.analysis_results.filter(a => a.file_id !== id)
    if (file) {
      logActivity(store, `Deleted file "${file.filename}"`, file.project_id, 'file_deleted', {
        file_id: id,
        filename: file.filename,
        navigate_tab: 'files',
        can_restore: true,
      })
    }
    save(store)
  },
  restoreVersion(versionId: string) {
    const store = load()
    const version = store.file_versions.find(v => v.id === versionId)
    if (!version) throw new Error('File version not found')
    let file = store.files.find(f => f.id === version.file_id)
    if (!file) {
      file = {
        id: version.file_id,
        user_id: MOCK_USER_ID,
        project_id: version.project_id,
        filename: version.filename,
        file_ext: version.file_ext,
        file_size: version.file_size,
        mime_type: '',
        storage_path: `mock/${version.filename}`,
        preview_text: version.preview_text,
        preview_image: version.preview_image,
        status: 'analyzed',
        created_at: version.created_at,
      }
      store.files.unshift(file)
      const priorAnalysis = store.analysis_results.find(a => a.file_id === version.file_id)
      if (!priorAnalysis) {
        store.analysis_results.push({
          id: uid(),
          user_id: MOCK_USER_ID,
          file_id: file.id,
          ...mockFileAnalysis(version.filename, version.file_ext, version.file_size),
          created_at: now(),
        })
      }
    } else {
      file.preview_text = version.preview_text
      file.preview_image = version.preview_image
      file.filename = version.filename
      file.file_ext = version.file_ext
      file.file_size = version.file_size
    }
    createFileVersion(store, file, version.preview_text, version.preview_image)
    logActivity(store, `Restored file "${version.filename}" (v${version.version_number})`, version.project_id, 'file_uploaded', {
      file_id: file.id,
      version_id: version.id,
      filename: version.filename,
      navigate_tab: 'files',
      restored: true,
    })
    save(store)
    return file
  },
  getVersion(versionId: string) {
    return load().file_versions.find(v => v.id === versionId) || null
  },
}

// ─── GIS ───
export const mockGis = {
  list(userId: string, projectId?: string) {
    return load().gis_features.filter(f =>
      f.user_id === userId && (!projectId || f.project_id === projectId)
    )
  },
  create(data: any) {
    const store = load()
    const snapshot = data.project_id
      ? saveGisSnapshot(store, MOCK_USER_ID, data.project_id, `Before adding ${data.feature_type}`)
      : null
    const feature = { id: uid(), user_id: MOCK_USER_ID, ...data, created_at: now() }
    store.gis_features.push(feature)
    if (data.project_id) {
      logActivity(store, `Added ${data.feature_type} "${data.label || 'feature'}" to map`, data.project_id, 'gis_updated', {
        feature_id: feature.id,
        feature_type: data.feature_type,
        snapshot_id: snapshot?.id,
        navigate_tab: 'map',
      })
    }
    save(store)
    return feature
  },
  update(id: string, data: any) {
    const store = load()
    const idx = store.gis_features.findIndex(f => f.id === id)
    if (idx === -1) throw new Error('Feature not found')
    const feature = store.gis_features[idx]
    const snapshot = feature.project_id
      ? saveGisSnapshot(store, MOCK_USER_ID, feature.project_id, `Before renaming ${feature.label}`)
      : null
    store.gis_features[idx] = { ...feature, ...data }
    if (feature.project_id) {
      logActivity(store, `Renamed ${feature.feature_type} to "${data.label || feature.label}"`, feature.project_id, 'gis_updated', {
        feature_id: id,
        snapshot_id: snapshot?.id,
        navigate_tab: 'map',
      })
    }
    save(store)
    return store.gis_features[idx]
  },
  delete(id: string) {
    const store = load()
    const feature = store.gis_features.find(f => f.id === id)
    const snapshot = feature?.project_id
      ? saveGisSnapshot(store, MOCK_USER_ID, feature.project_id, `Before deleting ${feature.label}`)
      : null
    store.gis_features = store.gis_features.filter(f => f.id !== id)
    if (feature) {
      logActivity(store, `Removed ${feature.feature_type} from map`, feature.project_id, 'gis_updated', {
        feature_id: id,
        snapshot_id: snapshot?.id,
        navigate_tab: 'map',
      })
    }
    save(store)
  },
  clear(userId: string, projectId?: string) {
    const store = load()
    const snapshot = projectId
      ? saveGisSnapshot(store, userId, projectId, 'Before clearing all features')
      : null
    if (projectId) {
      store.gis_features = store.gis_features.filter(f =>
        !(f.user_id === userId && f.project_id === projectId)
      )
      logActivity(store, 'Cleared all map features', projectId, 'gis_updated', {
        snapshot_id: snapshot?.id,
        navigate_tab: 'map',
      })
    } else {
      store.gis_features = store.gis_features.filter(f => f.user_id !== userId)
    }
    save(store)
  },
  restoreSnapshot(snapshotId: string) {
    const store = load()
    const snapshot = store.gis_snapshots.find(s => s.id === snapshotId)
    if (!snapshot) throw new Error('Map snapshot not found')
    store.gis_features = store.gis_features.filter(f =>
      !(f.user_id === snapshot.user_id && f.project_id === snapshot.project_id)
    )
    for (const f of snapshot.features) {
      store.gis_features.push({ ...f, id: f.id || uid() })
    }
    logActivity(store, `Restored map to snapshot (${snapshot.feature_count} features)`, snapshot.project_id, 'gis_updated', {
      snapshot_id: snapshotId,
      navigate_tab: 'map',
      restored: true,
    })
    save(store)
    return snapshot
  },
  getSnapshot(snapshotId: string) {
    return load().gis_snapshots.find(s => s.id === snapshotId) || null
  },
}

// ─── Chat ───
export const mockChat = {
  listSessions(userId: string, projectId?: string) {
    const store = load()
    return store.chat_sessions
      .filter(s => s.user_id === userId && (!projectId || s.project_id === projectId))
      .map(s => ({
        ...s,
        message_count: store.chat_messages.filter(m => m.session_id === s.id).length,
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  },
  getMessages(sessionId: string) {
    return load().chat_messages
      .filter(m => m.session_id === sessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  },
  messageCount(userId: string) {
    return load().chat_messages.filter(m => m.user_id === userId).length
  },
  send(data: { message: string; session_id?: string | null; project_id?: string | null; map_context?: any }) {
    const store = load()
    let sessionId = data.session_id

    if (!sessionId) {
      const session = {
        id: uid(),
        user_id: MOCK_USER_ID,
        project_id: data.project_id || null,
        title: data.message.slice(0, 40) + (data.message.length > 40 ? '...' : ''),
        created_at: now(),
        updated_at: now(),
      }
      store.chat_sessions.unshift(session)
      sessionId = session.id
    } else {
      const session = store.chat_sessions.find(s => s.id === sessionId)
      if (session) session.updated_at = now()
    }

    const userMsg = {
      id: uid(),
      user_id: MOCK_USER_ID,
      session_id: sessionId,
      role: 'user',
      content: data.message,
      created_at: now(),
    }
    store.chat_messages.push(userMsg)

    const { reply, commands } = mockChatReply(data.message, data.map_context)
    const assistantMsg = {
      id: uid(),
      user_id: MOCK_USER_ID,
      session_id: sessionId,
      role: 'assistant',
      content: reply,
      created_at: now(),
    }
    store.chat_messages.push(assistantMsg)
    save(store)

    return { reply, session_id: sessionId, commands, rag_sources: [] }
  },
}

// ─── Activities ───
export const mockActivities = {
  list(userId: string, limit = 10, projectId?: string) {
    return load().activities
      .filter(a => a.user_id === userId && (!projectId || a.project_id === projectId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  },
  get(id: string) {
    return load().activities.find(a => a.id === id) || null
  },
  count(userId: string, projectId?: string) {
    return load().activities.filter(a =>
      a.user_id === userId && (!projectId || a.project_id === projectId)
    ).length
  },
}

// ─── Profiles ───
export const mockProfiles = {
  get(userId: string) {
    const store = load()
    return store.profiles.find(p => p.id === userId) || null
  },
  update(userId: string, data: any) {
    const store = load()
    const idx = store.profiles.findIndex(p => p.id === userId)
    if (idx === -1) {
      const profile = { id: userId, ...data, created_at: now(), updated_at: now() }
      store.profiles.push(profile)
      save(store)
      return profile
    }
    store.profiles[idx] = { ...store.profiles[idx], ...data, updated_at: now() }
    save(store)
    return store.profiles[idx]
  },
}

// ─── Reports ───
const REPORT_TEMPLATES = [
  { type: 'boundary', label: 'Boundary Survey', sections: ['Legal Description', 'Field Evidence', 'Measurements', 'Certification'] },
  { type: 'topographic', label: 'Topographic Survey', sections: ['Control Network', 'DTM Summary', 'Contour Data', 'Feature List'] },
  { type: 'alta', label: 'ALTA/NSPS Survey', sections: ['Table A Items', 'Boundary Analysis', 'Easements', 'Certification'] },
  { type: 'construction', label: 'Construction Staking', sections: ['Control Points', 'Staking Layout', 'As-Built Comparison', 'Notes'] },
]

export const mockReports = {
  listTemplates: () => REPORT_TEMPLATES,
  list(userId: string, projectId?: string) {
    return load().reports
      .filter(r => r.user_id === userId && (!projectId || r.project_id === projectId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },
  generate(data: { report_type: string; title: string; project_id?: string; file_ids?: string[] }) {
    const store = load()
    const template = REPORT_TEMPLATES.find(t => t.type === data.report_type)
    const fileSections: string[] = []
    for (const fid of data.file_ids || []) {
      const file = store.files.find(f => f.id === fid)
      const analysis = store.analysis_results.find(a => a.file_id === fid)
      if (file) {
        fileSections.push(
          `### Source File: ${file.filename}`,
          `Type: ${file.file_ext?.toUpperCase()} · Size: ${(file.file_size / 1024).toFixed(1)} KB`,
          analysis?.summary ? `Summary: ${analysis.summary}` : '',
          analysis?.insights?.length ? `Insights:\n${analysis.insights.map((i: string) => `  • ${i}`).join('\n')}` : '',
          analysis?.warnings?.length ? `Warnings:\n${analysis.warnings.map((w: string) => `  • ${w}`).join('\n')}` : '',
          '',
        )
      }
    }
    const mapFeatures = store.gis_features.filter(f => f.project_id === data.project_id)
    const content = [
      `GEOMIND AI — ${data.title}`,
      `Report Type: ${template?.label || data.report_type}`,
      `Generated: ${new Date().toLocaleString()}`,
      data.project_id ? `Project ID: ${data.project_id}` : '',
      '',
      '═'.repeat(48),
      '',
      ...(fileSections.length ? ['## SOURCE FILES', '', ...fileSections] : []),
      mapFeatures.length ? `## MAP DATA\n\n${mapFeatures.length} GIS features on project map.\n` : '',
      ...((template?.sections || []).map(s => {
        const body = s === 'Field Evidence' && fileSections.length
          ? 'Cross-reference uploaded field photos and CAD files listed above.'
          : s === 'Measurements' && mapFeatures.length
          ? `${mapFeatures.length} features recorded on GIS map for this project.`
          : `[${s} section — populated from project files and map data]`
        return `## ${s}\n${body}\n`
      })),
      '',
      '— End of Report —',
    ].filter(Boolean).join('\n')

    const report = {
      id: uid(),
      user_id: MOCK_USER_ID,
      project_id: data.project_id || null,
      title: data.title,
      report_type: data.report_type,
      file_ids: data.file_ids || [],
      content,
      storage_path: '',
      created_at: now(),
    }
    store.reports.unshift(report)
    logActivity(store, `Generated ${data.report_type} report "${data.title}"`, data.project_id, 'report_generated', {
      report_id: report.id,
      report_type: data.report_type,
      file_ids: data.file_ids || [],
      navigate_tab: 'reports',
    })
    save(store)
    return { report, download_url: null }
  },
  get(id: string) {
    return load().reports.find(r => r.id === id) || null
  },
  delete(id: string) {
    const store = load()
    store.reports = store.reports.filter(r => r.id !== id)
    save(store)
  },
}