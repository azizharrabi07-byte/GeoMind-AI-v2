"""Timeline helpers — file versions and GIS snapshots for restore."""
from __future__ import annotations
from typing import Any, Optional


def log_activity(
    supabase,
    user_id: str,
    project_id: Optional[str],
    action: str,
    description: str,
    metadata: Optional[dict] = None,
):
    if not project_id:
        return
    supabase.table("activities").insert({
        "user_id": user_id,
        "project_id": project_id,
        "action": action,
        "description": description,
        "metadata": metadata or {},
    }).execute()


def create_file_version(supabase, user_id: str, file_row: dict, preview_text: str = "") -> dict:
    existing = supabase.table("file_versions") \
        .select("id") \
        .eq("file_id", file_row["id"]) \
        .execute()
    version_number = len(existing.data or []) + 1
    row = {
        "file_id": file_row["id"],
        "user_id": user_id,
        "project_id": file_row.get("project_id"),
        "filename": file_row.get("filename", ""),
        "file_ext": file_row.get("file_ext", ""),
        "file_size": file_row.get("file_size", 0),
        "preview_text": preview_text or file_row.get("preview_text", ""),
        "storage_path": file_row.get("storage_path", ""),
        "version_number": version_number,
    }
    result = supabase.table("file_versions").insert(row).execute()
    return result.data[0] if result.data else row


def save_gis_snapshot(
    supabase,
    user_id: str,
    project_id: Optional[str],
    label: str,
) -> Optional[dict]:
    if not project_id:
        return None
    query = supabase.table("gis_features").select("*").eq("user_id", user_id).eq("project_id", project_id)
    result = query.execute()
    features = result.data or []
    snap = supabase.table("gis_snapshots").insert({
        "user_id": user_id,
        "project_id": project_id,
        "label": label,
        "features": features,
        "feature_count": len(features),
    }).execute()
    return snap.data[0] if snap.data else None


def restore_file_version(supabase, user_id: str, version_id: str) -> dict:
    ver = supabase.table("file_versions") \
        .select("*") \
        .eq("id", version_id) \
        .eq("user_id", user_id) \
        .execute()
    if not ver.data:
        raise ValueError("File version not found")
    version = ver.data[0]

    existing = supabase.table("files") \
        .select("*") \
        .eq("id", version["file_id"]) \
        .eq("user_id", user_id) \
        .execute()

    if existing.data:
        file_row = existing.data[0]
        supabase.table("files").update({
            "filename": version["filename"],
            "file_ext": version["file_ext"],
            "file_size": version["file_size"],
            "preview_text": version.get("preview_text", ""),
            "storage_path": version.get("storage_path") or file_row.get("storage_path"),
            "status": "analyzed",
        }).eq("id", version["file_id"]).execute()
        restored = supabase.table("files").select("*").eq("id", version["file_id"]).execute().data[0]
    else:
        restored_row = {
            "id": version["file_id"],
            "user_id": user_id,
            "project_id": version.get("project_id"),
            "filename": version["filename"],
            "file_ext": version["file_ext"],
            "file_size": version["file_size"],
            "mime_type": "",
            "storage_path": version.get("storage_path") or f"restored/{version['filename']}",
            "preview_text": version.get("preview_text", ""),
            "status": "analyzed",
        }
        result = supabase.table("files").insert(restored_row).execute()
        restored = result.data[0]

    create_file_version(supabase, user_id, restored, restored.get("preview_text", ""))
    log_activity(
        supabase, user_id, version.get("project_id"), "file_uploaded",
        f'Restored file "{version["filename"]}" (v{version["version_number"]})',
        {
            "file_id": restored["id"],
            "version_id": version_id,
            "filename": version["filename"],
            "navigate_tab": "files",
            "restored": True,
        },
    )
    return restored


def restore_gis_snapshot(supabase, user_id: str, snapshot_id: str) -> dict:
    snap = supabase.table("gis_snapshots") \
        .select("*") \
        .eq("id", snapshot_id) \
        .eq("user_id", user_id) \
        .execute()
    if not snap.data:
        raise ValueError("GIS snapshot not found")
    snapshot = snap.data[0]
    project_id = snapshot.get("project_id")

    if project_id:
        supabase.table("gis_features") \
            .delete() \
            .eq("user_id", user_id) \
            .eq("project_id", project_id) \
            .execute()

    for f in snapshot.get("features") or []:
        row = {k: v for k, v in f.items() if k not in ("created_at",)}
        row["user_id"] = user_id
        if not row.get("project_id"):
            row["project_id"] = project_id
        supabase.table("gis_features").insert(row).execute()

    log_activity(
        supabase, user_id, project_id, "gis_updated",
        f'Restored map snapshot ({snapshot.get("feature_count", 0)} features)',
        {"snapshot_id": snapshot_id, "navigate_tab": "map", "restored": True},
    )
    return snapshot