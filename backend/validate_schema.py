"""
Validate schema.sql against backend table/column expectations.
Run: python validate_schema.py
"""
import re
import sys
from pathlib import Path

SCHEMA_PATH = Path(__file__).parent / "schema.sql"

# Tables and columns the FastAPI backend reads/writes
REQUIRED = {
    "profiles": ["id", "email", "full_name", "license_number", "firm_name", "default_crs", "report_template", "updated_at"],
    "projects": ["id", "user_id", "name", "description", "status", "client_name", "location", "coordinate_system", "progress", "due_date", "updated_at"],
    "files": ["id", "user_id", "project_id", "filename", "file_ext", "file_size", "mime_type", "storage_path", "status", "error_message"],
    "analysis_results": ["id", "user_id", "file_id", "summary", "warnings", "insights", "next_actions", "knowledge_graph", "metadata", "extracted_text", "model_used"],
    "gis_features": ["id", "user_id", "project_id", "feature_type", "geometry", "label", "description", "elevation", "properties"],
    "chat_sessions": ["id", "user_id", "project_id", "title", "message_count", "updated_at"],
    "chat_messages": ["id", "user_id", "session_id", "role", "content", "commands", "file_ids"],
    "activities": ["id", "user_id", "project_id", "action", "description", "metadata"],
    "report_templates": ["id", "user_id", "name", "report_type", "is_default"],
    "generated_reports": ["id", "user_id", "project_id", "template_id", "title", "report_type", "storage_path", "file_ids"],
    "integrations": ["id", "user_id", "provider", "access_token", "refresh_token", "provider_email", "settings", "is_connected", "last_sync_at"],
}

REQUIRED_BUCKETS = ["user-files", "reports"]
REQUIRED_FUNCTIONS = ["set_updated_at", "handle_new_user", "increment_session_message_count"]
REQUIRED_TRIGGERS = ["on_auth_user_created", "trg_chat_messages_count"]


def main():
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    errors = []

    # Check all tables exist
    for table in REQUIRED:
        pattern = rf"CREATE TABLE public\.{table}\s*\("
        if not re.search(pattern, sql):
            errors.append(f"Missing table: {table}")

    # Check columns per table
    for table, columns in REQUIRED.items():
        block_match = re.search(
            rf"CREATE TABLE public\.{table}\s*\((.*?)\);",
            sql, re.DOTALL
        )
        if not block_match:
            continue
        block = block_match.group(1)
        for col in columns:
            if not re.search(rf"\b{col}\b", block):
                errors.append(f"Missing column '{col}' in table '{table}'")

    # Check storage buckets
    for bucket in REQUIRED_BUCKETS:
        if bucket not in sql:
            errors.append(f"Missing storage bucket: {bucket}")

    # Check functions
    for fn in REQUIRED_FUNCTIONS:
        if f"FUNCTION public.{fn}" not in sql:
            errors.append(f"Missing function: {fn}")

    # Check RLS enabled
    for table in REQUIRED:
        if f"ALTER TABLE public.{table}" not in sql or "ENABLE ROW LEVEL SECURITY" not in sql:
            errors.append(f"RLS may not be enabled for: {table}")

    # Check unique constraint for integrations upsert
    if "integrations_user_provider_unique" not in sql:
        errors.append("Missing UNIQUE(user_id, provider) on integrations")

    # Check syntax red flags
    if sql.count("CREATE TABLE") != len(REQUIRED):
        errors.append(f"Expected {len(REQUIRED)} CREATE TABLE statements")

    # Balanced parentheses in function bodies (basic check)
    if sql.count("$$") % 2 != 0:
        errors.append("Unbalanced $$ delimiters in SQL functions")

    print(f"Schema file: {SCHEMA_PATH}")
    print(f"Size: {len(sql)} chars, {sql.count(chr(10))+1} lines")
    print(f"Tables checked: {len(REQUIRED)}")
    print(f"Storage buckets: {REQUIRED_BUCKETS}")
    print()

    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print(f"  ✗ {e}")
        sys.exit(1)

    print("VALIDATION PASSED — no structural errors detected.")
    print()
    print("Tables:")
    for t in REQUIRED:
        print(f"  ✓ {t} ({len(REQUIRED[t])} required columns)")
    print()
    print("Next steps:")
    print("  1. Open Supabase Dashboard → SQL Editor")
    print("  2. Paste and run backend/schema.sql")
    print("  3. Get SERVICE ROLE key from Settings → API")
    print("  4. Configure backend/.env and restart FastAPI")


if __name__ == "__main__":
    main()