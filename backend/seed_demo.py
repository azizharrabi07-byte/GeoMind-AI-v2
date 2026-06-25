"""
Create or fetch the demo surveyor account for ALLOW_DEV_AUTH mode.
Run: python seed_demo.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from database import get_supabase

DEMO_EMAIL = "demo@geomind.ai"
DEMO_PASSWORD = "DemoSurvey2026!"


def main():
    sb = get_supabase()
    user_id = None

    try:
        result = sb.auth.admin.create_user({
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Demo Surveyor"},
        })
        if result.user:
            user_id = result.user.id
            print(f"Created demo user: {user_id}")
    except Exception as e:
        msg = str(e).lower()
        if "already" in msg or "registered" in msg or "exists" in msg:
            print("Demo user already exists — looking up by email...")
        else:
            print(f"create_user note: {e}")

    if not user_id:
        users = sb.auth.admin.list_users()
        for u in users:
            if getattr(u, "email", None) == DEMO_EMAIL:
                user_id = u.id
                break

    if not user_id:
        print("ERROR: Could not create or find demo user.", file=sys.stderr)
        sys.exit(1)

    sb.table("profiles").upsert({
        "id": user_id,
        "email": DEMO_EMAIL,
        "full_name": "Demo Surveyor",
        "firm_name": "GeoMind Demo Firm",
        "license_number": "TN-SURV-2024-0847",
        "default_crs": "EPSG:32632",
        "report_template": "boundary",
    }).execute()

    projects = sb.table("projects").select("id").eq("user_id", user_id).execute()
    if not projects.data:
        sb.table("projects").insert([
            {
                "user_id": user_id,
                "name": "Tunis Coastal Boundary Survey",
                "description": "Property boundary survey along the La Marsa coastline for municipal cadastre update.",
                "status": "active",
                "client_name": "Municipality of Tunis",
                "location": "La Marsa, Tunis",
                "coordinate_system": "EPSG:32632",
                "progress": 65,
                "due_date": "2026-07-15",
            },
            {
                "user_id": user_id,
                "name": "Sfax Industrial Parcel ALTA",
                "description": "ALTA/NSPS land title survey for industrial zone expansion.",
                "status": "review",
                "client_name": "Sfax Industrial Group",
                "location": "Sfax, Tunisia",
                "coordinate_system": "EPSG:32633",
                "progress": 40,
                "due_date": "2026-08-01",
            },
        ]).execute()
        print("Seeded demo projects")

    print(f"\nDEV_USER_ID={user_id}")
    print(f"Add to backend/.env:\n  ALLOW_DEV_AUTH=true\n  DEV_USER_ID={user_id}")
    print(f"\nDemo login: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()