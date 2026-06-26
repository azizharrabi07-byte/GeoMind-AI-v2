# GeoMind AI v4.1

**Survey Project Operating System** — centralize files, maps, reports, and project knowledge for land surveying firms. AI (Gemini) assists analysis and reporting; the product is the workspace, not the chatbot.

**Repository:** https://github.com/azizharrabi07-byte/GeoMind-AI-v2

---

## Quick Start

```bash
cd GeoMind-AI-v2
npm install
npm start          # starts backend (3001) + frontend (5173)
```

Open **http://localhost:5173** — or double-click `start.bat` on Windows.

**Demo login:** `demo@geomind.ai` / `DemoSurvey2026!`

### Supabase setup (one-time)

Run in **Supabase → SQL Editor** in order:

1. `backend/schema.sql` — full database (first install)
2. `backend/RUN_IN_SUPABASE.sql` — Phase 2 timeline tables
3. `backend/RUN_IN_SUPABASE_PHASE3.sql` — Phase 3 preferences + search indexes

Then: `python backend/seed_demo.py`

### Environment

| File | Purpose |
|------|---------|
| `.env.local` | Frontend: Supabase URL, anon key, `VITE_USE_MOCK=false` |
| `backend/.env` | Backend: service role, Gemini key, `ALLOW_DEV_AUTH`, SMTP (optional) |

---

## Full Overview

### What GeoMind is

GeoMind is a **web-based project OS for survey engineers**. It does not replace AutoCAD, QGIS, or Excel — it connects them into one searchable workspace per project.

```
Landing → Firm Dashboard → Project Workspace
                              ├── Overview
                              ├── Files (upload, preview, AI analysis)
                              ├── Timeline (restore files & map states)
                              ├── GIS Viewer (draw, search, Map AI)
                              ├── Project Brain (Gemini chat)
                              └── Reports (PDF generate, email)
```

Firm dashboard adds **Smart Search**, **Analytics**, and **Settings** (profile, integrations, AI prefs).

### Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Tailwind v4, Leaflet |
| Backend | FastAPI, Python 3.12 |
| Database | Supabase PostgreSQL + Auth + Storage |
| AI | Google Gemini 2.5 Flash |
| Reports | ReportLab PDF → Supabase `reports` bucket |

### Phase completion

| Phase | Focus | Status |
|-------|--------|--------|
| **Phase 1** | UI shell, mock localStorage, project workspace | ✅ ~95% |
| **Phase 2** | Supabase API, login, timeline restore, Map AI | ✅ Complete |
| **Phase 3** | Search, analytics, PDF viewer, email reports, signup, preferences | ✅ Complete |
| **Phase 4** | Google Drive OAuth + file sync, offline UX polish | ✅ Complete |
| **Phase 4b** | OneDrive + Outlook OAuth (Microsoft Graph), backend connectivity | ✅ Complete |

### Phase 4b deliverables

- **OneDrive OAuth** — Microsoft Graph file sync from `GeoMind Imports` folder
- **Outlook OAuth** — links recent emails to integration + project timeline
- **Microsoft Graph service** — token exchange, refresh, OneDrive + Mail APIs
- **Startup fix** — `wait-on` ensures backend is ready before Vite starts (no false offline banner)
- **Offline detection** — banner only when `/api/health` fails (not auth errors)
- **Verify script** — `python backend/verify_phase4b.py`

#### Azure setup (OneDrive + Outlook)

1. [Azure Portal](https://portal.azure.com/) → App registrations → New registration
2. Redirect URIs (Web):
   - `http://localhost:3001/api/integrations/onedrive/oauth/callback`
   - `http://localhost:3001/api/integrations/outlook/oauth/callback`
3. API permissions: `Files.Read`, `Mail.Read`, `User.Read`, `offline_access`
4. Create client secret → add to `backend/.env`:
   ```
   MICROSOFT_CLIENT_ID=your-app-id
   MICROSOFT_CLIENT_SECRET=your-secret
   ```

### Phase 4 deliverables

- **Google Drive OAuth** — real OAuth 2.0 flow via `/api/integrations/google_drive/oauth/url`
- **Drive file sync** — imports from `GeoMind Imports` folder → parse + AI analyze + timeline
- **Token refresh** — automatic access token refresh via refresh_token
- **Integrations UI** — Connect / Disconnect / Sync in Settings (no more demo_token)
- **Offline UX** — banner only on dashboard/project routes, 3s grace period, Retry button
- **Verify script** — `python backend/verify_phase4.py`

#### Google Cloud setup (one-time)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** (Web application)
3. Authorized redirect URI: `http://localhost:3001/api/integrations/google_drive/oauth/callback`
4. Enable **Google Drive API**
5. Add to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/google_drive/oauth/callback
   ```
6. In Google Drive, create folder **GeoMind Imports** and add survey files (DXF, CSV, PDF, etc.)
7. Settings → Connect Google Drive → Sync

### Phase 3 deliverables

- **Smart Search** — `/api/search` across projects, files, reports, timeline
- **Firm Analytics** — real counts from Supabase (no fake stats)
- **PDF viewer** — inline iframe for uploaded PDFs
- **Email reports** — SMTP when configured, mailto fallback
- **Sign up / sign out** — Supabase Auth UI
- **User preferences** — AI toggles + notification email in DB
- **Integrations panel** — connect Google Drive / OneDrive / Outlook (record stored; OAuth in Phase 4)
- **Production polish** — `npm start`, `start.bat`, Vite API proxy

---

## Resume (Product Summary)

GeoMind AI transforms scattered survey data into an organized, AI-assisted workspace.

### Core capabilities

1. **Intelligent file analysis** — Upload DXF, CSV, GeoJSON, PDF, images; Gemini extracts insights, warnings, and next actions.
2. **Project workspace** — Per-project files, map, timeline, brain, and reports.
3. **GIS viewer** — Draw points/lines/polygons; location search; Map AI change reports.
4. **Timeline restore** — Revert deleted files or map snapshots from activity history.
5. **Report generator** — Boundary, topo, ALTA, construction PDFs; email to clients.
6. **Smart search** — Firm-wide search across projects, files, reports, events.
7. **Analytics** — File types, project status, storage usage from live data.

### Who it's for

| User | Benefit |
|------|---------|
| Field surveyor | Faster QA, organized files, AI technical assistant |
| Survey manager | Cross-project visibility, timeline audit trail |
| Small firm | One platform vs. scattered drives and email |

### Differentiators

| Traditional | GeoMind |
|-------------|---------|
| Files in email/Drive folders | Project-scoped workspace |
| Manual report assembly | PDF in minutes from analyzed files |
| Knowledge lost when staff leave | Timeline + search preserve context |
| Multiple disconnected tools | Single OS layer over CAD/GIS/Excel |

---

## Book of Terms

Glossary for survey engineering and GeoMind-specific concepts.

### Survey & geospatial

| Term | Definition |
|------|------------|
| **ALTA/NSPS** | Standard for commercial land title surveys in the US |
| **Boundary survey** | Locating property corners and lines per deed/plat |
| **Control point** | Known coordinate monument used to orient a survey |
| **CRS** | Coordinate Reference System (e.g. EPSG:32632 UTM Tunisia) |
| **DXF** | CAD exchange format; layers, points, lines from AutoCAD |
| **FGCS** | Federal Geodetic Control Standards — accuracy classifications |
| **GeoJSON** | JSON format for geographic features (points, lines, polygons) |
| **GNSS/GPS** | Satellite positioning; RTK, PPK, static baselines |
| **Monument** | Physical marker at a survey corner |
| **Topographic survey** | Elevation and feature mapping (contours, breaklines) |
| **Traverse** | Series of connected survey legs between control points |
| **UTM** | Universal Transverse Mercator projected coordinate system |

### GeoMind platform

| Term | Definition |
|------|------------|
| **Activity / Timeline** | Chronological log of uploads, map edits, reports |
| **Firm Dashboard** | Top-level view: workspace, projects, search, analytics |
| **File version** | Snapshot of a file before delete — used for restore |
| **GIS snapshot** | Saved map state before edits — used for timeline restore |
| **Map AI** | Gemini-powered summary of map changes and survey recommendations |
| **Project Brain** | AI chat scoped to a project with survey knowledge base |
| **Project OS** | GeoMind's positioning: operating system for survey projects |
| **Project Workspace** | Per-project hub: files, map, timeline, brain, reports |
| **RLS** | Row Level Security — Supabase policy isolating each user's data |
| **Smart Search** | Cross-entity search (projects, files, reports, activities) |
| **TOR** | Terms of Reference — product vision document (`docs/tor.md`) |
| **VITE_USE_MOCK** | Env flag; `false` = live API, `true` = browser localStorage demo |

### Integrations (current & planned)

| Term | Definition |
|------|------------|
| **Google Drive** | OAuth-connected sync from `GeoMind Imports` folder into projects |
| **OneDrive** | Enterprise file sync (Microsoft 365) |
| **QGIS** | Open GIS; GeoMind imports GeoJSON, does not replace QGIS |
| **AutoCAD** | CAD platform; GeoMind analyzes DXF imports |
| **SMTP** | Email delivery for reports (`SMTP_HOST`, `SMTP_USER` in backend `.env`) |

### Report types

| Type | Use |
|------|-----|
| **boundary** | Property lines, corners, evidence |
| **topographic** | Contours, spot shots, features |
| **alta** | ALTA/NSPS land title package |
| **construction** | Staking, control, as-built |

---

## API reference (main routes)

| Route | Description |
|-------|-------------|
| `GET /api/health` | Health check |
| `GET /api/auth/me` | Current user profile |
| `GET/POST /api/projects` | Project CRUD |
| `POST /api/files/upload` | Upload + analyze |
| `POST /api/files/versions/{id}/restore` | Restore deleted file |
| `GET/POST /api/gis` | Map features |
| `POST /api/gis/snapshots/{id}/restore` | Restore map state |
| `POST /api/map-ai` | Map change AI |
| `POST /api/chat` | Project Brain |
| `POST /api/reports/generate` | PDF report |
| `POST /api/reports/{id}/email` | Email report |
| `GET /api/search?q=` | Smart search |
| `GET /api/analytics` | Firm stats |
| `GET/PUT /api/preferences` | User AI prefs |
| `GET /api/integrations/google_drive/oauth/url` | Start Drive OAuth |
| `POST /api/integrations/google_drive/sync` | Import files from Drive |

---

## Verification

```bash
cd backend
python verify_phase2.py   # core API + timeline
python verify_phase3.py   # search, analytics, preferences, email
python verify_phase4.py   # Google Drive OAuth + integrations
python verify_phase4b.py  # OneDrive + Outlook + connectivity
npm run lint              # TypeScript check
```

---

## Project structure

```
GeoMind-AI-v2/
├── src/                 # React frontend
│   ├── pages/           # Landing, dashboard, project workspace
│   └── lib/             # data.ts API layer, auth, routes
├── backend/
│   ├── routers/         # FastAPI endpoints
│   ├── services/        # AI, reports, timeline, email
│   ├── schema.sql       # Full DB schema
│   └── RUN_IN_SUPABASE*.sql
├── docs/                # TOR, integrations, resume
├── start.bat            # Windows one-click start
└── package.json         # npm start = backend + frontend
```

---

## License & credits

Built for survey engineering firms. See `docs/tor.md` for product vision and `docs/integrations.md` for CAD/GIS tool compatibility matrix.

**Version:** 4.1.0 · **June 2026**