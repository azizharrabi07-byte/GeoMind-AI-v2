"""End-to-end Phase 2 verification against live Supabase + API."""
import json
import sys
import tempfile
import urllib.request
import urllib.error

BASE = "http://localhost:3001"
USER_ID = "4a382943-631c-4693-99e7-7b367f19501a"


def req(method: str, path: str, body=None, headers=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", **(headers or {})}
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            detail = json.loads(raw)
        except Exception:
            detail = raw
        return e.code, detail


def ok(label, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {label}" + (f" — {detail}" if detail else ""))
    return passed


def main():
    print("GeoMind Phase 2 Verification\n" + "=" * 40)
    results = []

    code, data = req("GET", "/api/health")
    results.append(ok("Health check", code == 200 and data.get("status") == "ok", str(data)))

    code, data = req("GET", "/api/auth/me")
    results.append(ok("Auth / me (dev)", code == 200 and data.get("id") == USER_ID, data.get("email", "")))

    code, projects = req("GET", "/api/projects/")
    results.append(ok("Projects list", code == 200 and isinstance(projects, list), f"{len(projects or [])} projects"))
    project_id = projects[0]["id"] if projects else None

    code, files = req("GET", f"/api/files/?project_id={project_id}" if project_id else "/api/files/")
    results.append(ok("Files list", code == 200 and isinstance(files, list), f"{len(files or [])} files"))

    code, gis = req("GET", f"/api/gis/?project_id={project_id}" if project_id else "/api/gis/")
    results.append(ok("GIS list", code == 200 and isinstance(gis, list), f"{len(gis or [])} features"))

    code, acts = req("GET", f"/api/activities/?limit=20&project_id={project_id}" if project_id else "/api/activities/?limit=20")
    results.append(ok("Activities / timeline", code == 200 and isinstance(acts, list), f"{len(acts or [])} events"))

    code, templates = req("GET", "/api/reports/templates")
    results.append(ok("Report templates", code == 200, str(len(templates or [])) + " templates" if isinstance(templates, list) else ""))

    code, sessions = req("GET", f"/api/chat/sessions?project_id={project_id}" if project_id else "/api/chat/sessions")
    results.append(ok("Chat sessions", code == 200 and isinstance(sessions, list), f"{len(sessions or [])} sessions"))

    # Map AI
    code, map_ai = req("POST", "/api/map-ai/", {
        "message": "generate map report",
        "project_name": "Test Project",
        "changes": [{"action": "add_point", "detail": "Control point CP-1"}],
        "stats": {"points": 1, "lines": 0, "polygons": 0},
        "project_id": project_id,
    })
    has_reply = isinstance(map_ai, dict) and bool(map_ai.get("reply"))
    results.append(ok("Map AI (Gemini)", code == 200 and has_reply, (map_ai.get("reply") or "")[:80] if has_reply else str(map_ai)))

    if not project_id:
        print("\n  [SKIP] No project — cannot test GIS snapshot / file upload")
    else:
        # GIS create + snapshot tables
        code, feature = req("POST", "/api/gis/", {
            "project_id": project_id,
            "feature_type": "point",
            "label": "Phase2-Test-Point",
            "geometry": {"type": "Point", "coordinates": [10.18, 36.81]},
            "properties": {},
        })
        feat_ok = code in (200, 201) and isinstance(feature, dict) and feature.get("id")
        results.append(ok("GIS create feature", feat_ok, feature.get("id", "") if isinstance(feature, dict) else str(feature)))

        # Check activities have snapshot_id after GIS mutation
        code, acts2 = req("GET", f"/api/activities/?limit=5&project_id={project_id}")
        snap_in_meta = any((a.get("metadata") or {}).get("snapshot_id") for a in (acts2 or []))
        results.append(ok("GIS snapshot logged in timeline", code == 200 and snap_in_meta, "snapshot_id in activity metadata"))

        snapshot_id = None
        for a in acts2 or []:
            sid = (a.get("metadata") or {}).get("snapshot_id")
            if sid:
                snapshot_id = sid
                break

        if snapshot_id:
            code, snap = req("GET", f"/api/gis/snapshots/{snapshot_id}")
            results.append(ok("GIS snapshot table (read)", code == 200 and snap.get("id") == snapshot_id, f"{snap.get('feature_count', 0)} features"))

        # File upload (small CSV)
        csv_content = b"point_id,northing,easting\nCP1,100.0,200.0\n"
        boundary = "----GeoMindBoundary"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="phase2_test.csv"\r\n'
            f"Content-Type: text/csv\r\n\r\n"
        ).encode() + csv_content + f"\r\n--{boundary}\r\n".encode() + (
            f'Content-Disposition: form-data; name="project_id"\r\n\r\n{project_id}\r\n'
        ).encode() + f"--{boundary}--\r\n".encode()

        upload_req = urllib.request.Request(
            f"{BASE}/api/files/upload",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(upload_req, timeout=60) as resp:
                upload_data = json.loads(resp.read().decode())
            file_row = upload_data.get("file") or {}
            file_id = file_row.get("id")
            has_analysis = bool(upload_data.get("analysis"))
            results.append(ok("File upload + analysis", file_id and has_analysis, file_row.get("filename", "")))

            if file_id:
                code, detail = req("GET", f"/api/files/{file_id}")
                has_preview = bool((detail.get("file") or {}).get("preview_text"))
                results.append(ok("File preview_text", code == 200 and has_preview, (detail.get("file") or {}).get("preview_text", "")[:40]))

                # Delete file → creates version for restore
                code, _ = req("DELETE", f"/api/files/{file_id}")
                results.append(ok("File delete", code == 200))

                code, acts3 = req("GET", f"/api/activities/?limit=5&project_id={project_id}")
                version_id = None
                can_restore = False
                for a in acts3 or []:
                    if a.get("action") != "file_deleted":
                        continue
                    meta = a.get("metadata") or {}
                    if meta.get("can_restore") and meta.get("version_id"):
                        version_id = meta["version_id"]
                        can_restore = True
                        break
                results.append(ok("File version logged (timeline restore)", can_restore and version_id, version_id or "no version_id"))

                if version_id:
                    code, ver = req("GET", f"/api/files/versions/{version_id}")
                    results.append(ok("file_versions table (read)", code == 200 and ver.get("id") == version_id, ver.get("filename", "")))

                    code, restored = req("POST", f"/api/files/versions/{version_id}/restore")
                    results.append(ok("File restore from timeline", code == 200 and restored.get("filename"), restored.get("filename", "")))

                    # cleanup restored file
                    rid = restored.get("id")
                    if rid:
                        req("DELETE", f"/api/files/{rid}")
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            results.append(ok("File upload + analysis", False, f"HTTP {e.code}: {err[:120]}"))

        # Cleanup test GIS feature
        if feat_ok and feature.get("id"):
            req("DELETE", f"/api/gis/{feature['id']}")

    passed = sum(1 for r in results if r)
    total = len(results)
    print("\n" + "=" * 40)
    print(f"Result: {passed}/{total} passed")
    if passed < total:
        sys.exit(1)
    print("Phase 2 verification complete.")


if __name__ == "__main__":
    main()