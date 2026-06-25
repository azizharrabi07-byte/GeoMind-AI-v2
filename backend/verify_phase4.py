"""Phase 4 verification — Google Drive OAuth endpoints + integrations."""
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
    print("GeoMind Phase 4 Verification\n" + "=" * 40)
    results = []

    code, health = req("GET", "/api/health")
    results.append(ok(
        "Health v4",
        code == 200 and health.get("phase") == 4,
        f"phase={health.get('phase')} oauth={health.get('google_drive_oauth')}",
    ))

    code, oauth = req("GET", "/api/integrations/google_drive/oauth/url")
    results.append(ok(
        "Drive OAuth URL endpoint",
        code == 200 and "configured" in oauth,
        f"configured={oauth.get('configured')}",
    ))

    code, integrations = req("GET", "/api/integrations/")
    results.append(ok("Integrations list", code == 200 and isinstance(integrations, list), f"{len(integrations)} rows"))

    code, sync_err = req("POST", "/api/integrations/google_drive/sync", {})
    detail = str(sync_err.get("detail", "")).lower()
    results.append(ok(
        "Drive sync guard",
        code in (400, 503) and ("not connected" in detail or "not configured" in detail),
        sync_err.get("detail", ""),
    ))

    code, scaffold = req("POST", "/api/integrations/onedrive/sync", {})
    results.append(ok(
        "OneDrive scaffold",
        code == 400,
        scaffold.get("detail", "not connected"),
    ))

    passed = sum(1 for r in results if r)
    print(f"\nResult: {passed}/{len(results)} passed")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()