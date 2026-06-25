# GeoMind — Terms of Reference (TOR) v2

## Survey Project Operating System

**Version:** 2.0  
**Status:** Active — supersedes all v1 TOR documents

---

## Executive Summary

GeoMind is a centralized platform designed for surveying firms to organize, manage, search, and preserve project knowledge.

The platform does **not** replace AutoCAD, QGIS, Excel, or other professional tools. It acts as the central operating system connecting all project data, files, communications, reports, and engineering knowledge into one searchable workspace.

Artificial Intelligence is used as an assisting technology to automate analysis, reporting, and search, but it is **not** the core product.

---

## Problem Statement

Surveying projects generate large amounts of information distributed across multiple applications and file formats:

- AutoCAD drawings
- GIS layers
- Excel spreadsheets
- PDF reports
- Emails
- Cloud storage
- Site photographs

As projects grow, firms face difficulties finding files, tracking versions, locating historical information, managing progress, generating reports, and preserving institutional knowledge.

---

## Vision

To become the central knowledge and project management platform for surveying firms.

---

## Objectives

1. Centralize project information
2. Eliminate file fragmentation
3. Improve project visibility
4. Simplify report generation
5. Preserve project knowledge
6. Enable intelligent project search
7. Connect existing industry tools

---

## Core Value Proposition

GeoMind transforms disconnected survey projects into organized, searchable, and intelligent knowledge assets.

---

## Target Users

| User | Needs |
|------|-------|
| **Survey Engineers** | Organized files, faster reporting, easier search |
| **Survey Managers** | Project visibility, team coordination, historical access |
| **Survey Firms** | Knowledge retention, standardized workflows, reduced overhead |

---

## Core Modules

| Module | Description |
|--------|-------------|
| **Project Workspace** | Central hub for files, maps, reports, notes, timeline, team activity |
| **Smart Search** | Search across projects, files, reports, locations, clients |
| **Version Control** | File history, upload history, revisions, latest versions |
| **Project Timeline** | Survey uploaded → drawing updated → report generated → client feedback |
| **Report Generator** | Project summaries, technical reports, client deliverables |
| **GIS Viewer** | Boundaries, parcels, geographic layers, survey points |
| **Project Brain** | AI assists: answers questions, summarizes, finds related projects, generates reports |

> AI is a feature, not the product. The product is the project operating system.

---

## System Architecture

```
                   SURVEY PROJECT
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
      AutoCAD         QGIS           Excel
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                 Google Drive / OneDrive / Email
                         ▼
═══════════════════════════════════════
                GEOMIND
═══════════════════════════════════════
         Project Workspace → Version Control
         Project Timeline → Smart Search
         GIS Viewer → Report Generator → AI Project Brain
═══════════════════════════════════════
                 ▼
          Survey Engineers / Managers / Firms
```

---

## External Tool Integrations

| Tool | GeoMind Role | Users Still Need It? |
|------|-------------|---------------------|
| **AutoCAD** | Import DXF, read geometry, link drawings | ✅ Yes |
| **QGIS** | Import GeoJSON/Shapefile, visualize maps | ✅ Yes |
| **Excel** | Import spreadsheets, analyze points | ✅ Yes |
| **Google Drive** | Auto sync, centralized import | ✅ Yes |
| **OneDrive** | Enterprise document sync | ✅ Yes |
| **Outlook / Gmail** | Link emails to projects, build timelines | ✅ Yes |

---

## Product Definition (Investor Pitch)

> GeoMind is a Survey Project Operating System that centralizes files, maps, reports, communications, and project knowledge into one searchable workspace. AI is used as an assistant to automate search, reporting, and project understanding.

**Not:** "An AI platform for survey engineers."

---

## Technical Stack (v2)

- **Frontend:** React 19 + Vite + Tailwind v4
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Google Gemini (Project Brain feature only)
- **GIS:** Leaflet (viewer, not replacement for QGIS)

---

*Document version: TOR v2.0 — June 2026*