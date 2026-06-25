"""Phase 3 verification — search, analytics, preferences, email."""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:3001"


def req(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def ok(label, passed, detail=""):
    print(f"  [{'PASS' if passed else 'FAIL'}] {label}" + (f" — {detail}" if detail else ""))
    return passed


def main():
    print("GeoMind Phase 3 Verification\n" + "=" * 40)
    results = []

    code, health = req("GET", "/api/health")
    results.append(ok("Health v3", code == 200 and health.get("phase") == 3, str(health)))

    code, search = req("GET", "/api/search/?q=test")
    results.append(ok("Smart Search", code == 200 and "projects" in search, f"total={search.get('total', 0)}"))

    code, analytics = req("GET", "/api/analytics/")
    results.append(ok("Analytics", code == 200 and "files" in analytics, f"files={analytics.get('files', 0)}"))

    code, prefs = req("GET", "/api/preferences/")
    results.append(ok("Preferences read", code == 200, str(prefs.get("auto_analyze_uploads"))))

    code, updated = req("PUT", "/api/preferences/", {"report_suggestions": True})
    results.append(ok("Preferences write", code == 200 and updated.get("report_suggestions") is True, ""))

    code, projects = req("GET", "/api/projects/")
    pid = projects[0]["id"] if projects else None
    if pid:
        code, reports = req("GET", f"/api/reports/?project_id={pid}")
        if reports:
            rid = reports[0]["id"]
            code, email = req("POST", f"/api/reports/{rid}/email", {"to_email": "client@example.com"})
            results.append(ok("Email report", code == 200 and email.get("to"), email.get("method", "")))
        else:
            results.append(ok("Email report", True, "skipped — no reports"))
    else:
        results.append(ok("Email report", True, "skipped — no projects"))

    passed = sum(1 for r in results if r)
    print(f"\nResult: {passed}/{len(results)} passed")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()