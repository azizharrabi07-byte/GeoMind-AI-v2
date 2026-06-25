"""
Report generation endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase
from services.report_service import generate_report_pdf
from services.email_service import send_report_email

router = APIRouter()


class ReportGenerateRequest(BaseModel):
    project_id: Optional[str] = None
    template_id: Optional[str] = None
    report_type: str = "boundary"  # boundary, topographic, alta, construction, control
    title: str = ""
    file_ids: list[str] = []


class ReportEmailRequest(BaseModel):
    to_email: str
    message: str = ""


@router.get("/templates")
async def list_templates(user: dict = Depends(get_current_user)):
    """List available report templates."""
    supabase = get_supabase()
    result = supabase.table("report_templates") \
        .select("*") \
        .or_(f"user_id.eq.{user['id']},is_default.eq.true") \
        .execute()
    return result.data


@router.get("/")
async def list_reports(
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """List generated reports."""
    supabase = get_supabase()
    query = supabase.table("generated_reports").select("*").eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/{report_id}")
async def get_report(report_id: str, user: dict = Depends(get_current_user)):
    """Get a single report record."""
    supabase = get_supabase()
    result = supabase.table("generated_reports") \
        .select("*") \
        .eq("id", report_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    report = result.data[0]
    if report.get("storage_path"):
        report["download_url"] = supabase.storage.from_("reports").get_public_url(report["storage_path"])
    return report


@router.post("/generate")
async def generate_report(req: ReportGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate a professional survey report as PDF."""
    supabase = get_supabase()

    # Get file analysis data
    file_data = []
    for fid in req.file_ids:
        analysis = supabase.table("analysis_results") \
            .select("*") \
            .eq("file_id", fid) \
            .execute()
        if analysis.data:
            file_data.append(analysis.data[0])

    # Get template
    template = None
    if req.template_id:
        t = supabase.table("report_templates") \
            .select("*") \
            .eq("id", req.template_id) \
            .execute()
        if t.data:
            template = t.data[0]

    # Generate PDF
    pdf_bytes = generate_report_pdf(
        report_type=req.report_type,
        title=req.title or f"{req.report_type.title()} Survey Report",
        file_data=file_data,
        template=template,
        user=user,
    )

    # Upload to storage
    import uuid
    storage_path = f"{user['id']}/reports/{uuid.uuid4()}.pdf"
    supabase.storage.from_("reports").upload(storage_path, pdf_bytes, {"content-type": "application/pdf"})

    # Save report record
    report_data = {
        "user_id": user["id"],
        "project_id": req.project_id,
        "template_id": req.template_id,
        "title": req.title or f"{req.report_type.title()} Survey Report",
        "report_type": req.report_type,
        "storage_path": storage_path,
        "file_ids": req.file_ids,
    }
    result = supabase.table("generated_reports").insert(report_data).execute()

    if req.project_id and result.data:
        supabase.table("activities").insert({
            "user_id": user["id"],
            "project_id": req.project_id,
            "action": "report_generated",
            "description": f"Generated {req.report_type} report \"{report_data['title']}\"",
            "metadata": {
                "report_id": result.data[0]["id"],
                "navigate_tab": "reports",
                "file_ids": req.file_ids,
            },
        }).execute()

    url = supabase.storage.from_("reports").get_public_url(storage_path)

    return {
        "report": result.data[0] if result.data else None,
        "download_url": url,
    }


@router.post("/{report_id}/email")
async def email_report(report_id: str, req: ReportEmailRequest, user: dict = Depends(get_current_user)):
    """Email a generated report (SMTP if configured, otherwise returns mailto link)."""
    supabase = get_supabase()
    result = supabase.table("generated_reports") \
        .select("*") \
        .eq("id", report_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    report = result.data[0]

    pdf_bytes = None
    if report.get("storage_path"):
        try:
            pdf_bytes = supabase.storage.from_("reports").download(report["storage_path"])
        except Exception:
            pdf_bytes = None

    body = req.message or f"Please find attached the survey report: {report.get('title', 'Report')}"
    outcome = send_report_email(
        to_email=req.to_email,
        subject=f"GeoMind Report — {report.get('title', 'Survey Report')}",
        body=body,
        pdf_bytes=pdf_bytes,
        filename=f"{report.get('report_type', 'report')}_report.pdf",
    )

    if report.get("project_id"):
        supabase.table("activities").insert({
            "user_id": user["id"],
            "project_id": report["project_id"],
            "action": "general",
            "description": f'Emailed report "{report.get("title", "")}" to {req.to_email}',
            "metadata": {"report_id": report_id, "navigate_tab": "reports"},
        }).execute()

    return outcome


@router.delete("/{report_id}")
async def delete_report_endpoint(report_id: str, user: dict = Depends(get_current_user)):
    """Delete a generated report."""
    supabase = get_supabase()
    supabase.table("generated_reports") \
        .delete() \
        .eq("id", report_id) \
        .eq("user_id", user["id"]) \
        .execute()
    return {"ok": True}
