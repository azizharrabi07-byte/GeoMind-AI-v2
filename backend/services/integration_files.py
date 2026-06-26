"""Shared file-type helpers for cloud integration sync."""

SUPPORTED_EXTENSIONS = {
    "dxf", "csv", "txt", "geojson", "json", "pdf", "xlsx", "xls",
    "png", "jpg", "jpeg", "tif", "tiff", "xml", "kml", "gpx",
}

MIME_MAP = {
    "pdf": "application/pdf",
    "csv": "text/csv",
    "txt": "text/plain",
    "json": "application/json",
    "geojson": "application/geo+json",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "dxf": "application/dxf",
    "xml": "application/xml",
    "kml": "application/vnd.google-earth.kml+xml",
    "gpx": "application/gpx+xml",
}


def is_importable_filename(name: str) -> bool:
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    return ext in SUPPORTED_EXTENSIONS


def guess_content_type(filename: str, remote_mime: str = "") -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in MIME_MAP:
        return MIME_MAP[ext]
    if remote_mime and remote_mime != "application/octet-stream":
        return remote_mime
    return "application/octet-stream"