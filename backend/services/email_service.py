"""Email delivery for reports — SMTP when configured, mailto fallback otherwise."""
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_report_email(
    to_email: str,
    subject: str,
    body: str,
    pdf_bytes: bytes | None = None,
    filename: str = "survey_report.pdf",
) -> dict:
    if not to_email:
        raise ValueError("Recipient email is required")

    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM", smtp_user or "noreply@geomind.ai")

    if smtp_host and smtp_user and smtp_pass:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))
        if pdf_bytes:
            part = MIMEApplication(pdf_bytes, Name=filename)
            part["Content-Disposition"] = f'attachment; filename="{filename}"'
            msg.attach(part)
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
        return {"sent": True, "method": "smtp", "to": to_email}

    mailto = (
        f"mailto:{to_email}"
        f"?subject={subject.replace(' ', '%20')}"
        f"&body={body[:500].replace(' ', '%20')}"
    )
    return {"sent": False, "method": "mailto", "mailto_url": mailto, "to": to_email}