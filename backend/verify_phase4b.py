"""Phase 4b verification — Microsoft OneDrive/Outlook + connectivity."""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:3001"


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
    print("GeoMind Phase 4b Verification\n" + "=" * 40)
    results = []

    code, health = req("GET", "/api/health")
    results.append(ok(
        "Health 4b",
        code == 200 and health.get("status") == "ok",
        f"phase={health.get('phase')} msft={health.get('microsoft_oauth')}",
    ))

    for provider in ("google_drive", "onedrive", "outlook"):
        code, oauth = req("GET", f"/api/integrations/{provider}/oauth/url")
        results.append(ok(
            f"{provider} OAuth URL",
            code == 200 and "configured" in oauth,
            f"configured={oauth.get('configured')}",
        ))

    code, integrations = req("GET", "/api/integrations/")
    results.append(ok("Integrations list", code == 200 and isinstance(integrations, list), f"{len(integrations)} rows"))

    for provider in ("onedrive", "outlook"):
        code, sync_err = req("POST", f"/api/integrations/{provider}/sync", {})
        detail = str(sync_err.get("detail", "")).lower()
        results.append(ok(
            f"{provider} sync guard",
            code in (400, 503) and ("not connected" in detail or "not configured" in detail),
            sync_err.get("detail", ""),
        ))

    passed = sum(1 for r in results if r)
    print(f"\nResult: {passed}/{len(results)} passed")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()