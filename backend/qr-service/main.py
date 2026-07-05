from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

try:
    from prometheus_client import Counter
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:  # pragma: no cover - keeps local imports usable before pip install
    Counter = None
    Instrumentator = None


logger = logging.getLogger(__name__)

app = FastAPI(title="QR Attendance Service")


def configure_tracing() -> None:
    if not os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"):
        return
    try:
        from azure.monitor.opentelemetry import configure_azure_monitor
    except ImportError:
        logger.warning("Azure Monitor OpenTelemetry package is not installed")
        return
    configure_azure_monitor(logger_name=__name__)


def expose_metrics() -> None:
    if Instrumentator is None:
        return
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


class _NoopCounter:
    def labels(self, **_: str) -> "_NoopCounter":
        return self

    def inc(self) -> None:
        return None


def counter(name: str, documentation: str, labelnames: list[str] | None = None):
    if Counter is None:
        return _NoopCounter()
    return Counter(name, documentation, labelnames or [])


QR_PAYLOADS_CREATED = counter(
    "qr_payloads_created_total",
    "Teacher QR payloads created successfully.",
)
QR_SCAN_ATTEMPTS = counter(
    "qr_scan_attempts_total",
    "Student QR scan attempts.",
)
QR_SCAN_RESULTS = counter(
    "qr_scan_results_total",
    "Student QR scan results by outcome.",
    ["outcome"],
)


configure_tracing()
expose_metrics()


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value is not None and value.strip() else default


ATTENDANCE_SERVICE_URL = _env("ATTENDANCE_SERVICE_URL", "http://localhost:8083").rstrip("/")
INTERNAL_SERVICE_TOKEN = _env("INTERNAL_SERVICE_TOKEN", "")
QR_TOKEN_SECRET = _env("QR_TOKEN_SECRET", "dev-only-change-me")
QR_TOKEN_TTL_SECONDS = int(_env("QR_TOKEN_TTL_SECONDS", "30"))
QR_TOKEN_VERSION = b"AQR1"
QR_TOKEN_BODY_LENGTH = 44
QR_TOKEN_SIGNATURE_LENGTH = 32


class TeacherQrPayloadResponse(BaseModel):
    sessionId: int
    payload: str
    expiresAt: datetime
    refreshAfterSeconds: int


class StudentQrScanRequest(BaseModel):
    payload: str = Field(min_length=1)
    deviceId: str = Field(min_length=1)
    gpsLat: str | None = None
    gpsLon: str | None = None


class AttendanceUpdateResponse(BaseModel):
    sessionId: int
    studentId: int
    status: str
    markMethod: str
    markedAt: datetime | None
    presentCount: int
    absentCount: int
    unknownCount: int


@app.get("/qr/health")
def health() -> dict[str, str]:
    return {"status": "UP"}


@app.post("/qr/teacher/sessions/{session_id}/payload", response_model=TeacherQrPayloadResponse)
async def create_teacher_qr_payload(
    session_id: int,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_roles: str | None = Header(default=None, alias="X-User-Roles"),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> TeacherQrPayloadResponse:
    require_role(x_user_id, x_user_roles, "TEACHER")
    session = await fetch_teacher_session(session_id, x_user_id, x_user_roles, x_user_email)
    if session.get("status") != "ACTIVE":
        raise HTTPException(status.HTTP_409_CONFLICT, "Attendance session is not active")

    now = int(time.time())
    expires_at_epoch = now + QR_TOKEN_TTL_SECONDS
    payload = sign_payload(session_id, now, expires_at_epoch)
    QR_PAYLOADS_CREATED.inc()
    return TeacherQrPayloadResponse(
        sessionId=session_id,
        payload=payload,
        expiresAt=datetime.fromtimestamp(expires_at_epoch, tz=timezone.utc),
        refreshAfterSeconds=QR_TOKEN_TTL_SECONDS,
    )


@app.post("/qr/student/scan", response_model=AttendanceUpdateResponse)
async def scan_student_qr(

    request: StudentQrScanRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_roles: str | None = Header(default=None, alias="X-User-Roles"),
) -> Any:
    QR_SCAN_ATTEMPTS.inc()
    require_role(x_user_id, x_user_roles, "STUDENT")
    try:
        token_data = verify_payload(request.payload)
    except HTTPException:
        QR_SCAN_RESULTS.labels(outcome="invalid_payload").inc()
        raise
    session_id = token_data["sid"]

    try:
        student_id = int(x_user_id)
    except (TypeError, ValueError) as exc:
        QR_SCAN_RESULTS.labels(outcome="invalid_user").inc()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user ID") from exc

    body = {
        "studentId": student_id,
        "method": "QR_CODE",
        "deviceId": request.deviceId.strip(),
        "gpsLat": normalize_optional(request.gpsLat),
        "gpsLon": normalize_optional(request.gpsLon),
    }

    if not INTERNAL_SERVICE_TOKEN:
        QR_SCAN_RESULTS.labels(outcome="misconfigured").inc()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Internal attendance authentication is not configured",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        attendance_response = await client.post(
            f"{ATTENDANCE_SERVICE_URL}/attendance/internal/sessions/{session_id}/attendance",
            headers={
                "X-Request-Source": "qr-service",
                "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
            },
            json=body,
        )

    if attendance_response.status_code >= 400:
        QR_SCAN_RESULTS.labels(outcome="attendance_upstream_error").inc()
        raise HTTPException(attendance_response.status_code, extract_error_message(attendance_response))

    try:
        response_body = attendance_response.json()
    except ValueError:
        QR_SCAN_RESULTS.labels(outcome="invalid_upstream_response").inc()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Invalid attendance service response")
    QR_SCAN_RESULTS.labels(outcome="success").inc()
    return response_body


async def fetch_teacher_session(
    session_id: int,
    user_id: str | None,
    roles: str | None,
    email: str | None,
) -> dict[str, Any]:
    headers = {
        "X-User-Id": user_id or "",
        "X-User-Roles": roles or "",
    }
    if email:
        headers["X-User-Email"] = email

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{ATTENDANCE_SERVICE_URL}/attendance/sessions/{session_id}",
            headers=headers,
        )

    if response.status_code >= 400:
        raise HTTPException(response.status_code, extract_error_message(response))
    return response.json()


def require_role(user_id: str | None, roles_header: str | None, role: str) -> None:
    if not user_id or not roles_header:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing authenticated user headers")

    roles = parse_roles(roles_header)
    if role not in roles:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"{role} role is required")


def parse_roles(roles_header: str) -> set[str]:
    roles: set[str] = set()
    for item in roles_header.split(","):
        normalized = item.strip().upper()
        if not normalized:
            continue
        roles.add(normalized)
        if normalized.startswith("ROLE_"):
            roles.add(normalized.removeprefix("ROLE_"))
    return roles


def sign_payload(session_id: int, issued_at_epoch: int, expires_at_epoch: int) -> str:
    body = b"".join(
        [
            QR_TOKEN_VERSION,
            session_id.to_bytes(8, "big", signed=False),
            issued_at_epoch.to_bytes(8, "big", signed=False),
            expires_at_epoch.to_bytes(8, "big", signed=False),
            os.urandom(16),
        ]
    )
    signature = hmac.new(QR_TOKEN_SECRET.encode(), body, hashlib.sha256).digest()
    return b64url_encode(body + signature)


def verify_payload(payload: str) -> dict[str, Any]:
    try:
        token = b64url_decode_bytes(payload)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid QR payload") from exc

    expected_length = QR_TOKEN_BODY_LENGTH + QR_TOKEN_SIGNATURE_LENGTH
    if len(token) != expected_length:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid QR payload")

    body = token[:QR_TOKEN_BODY_LENGTH]
    signature = token[QR_TOKEN_BODY_LENGTH:]
    expected_signature = hmac.new(QR_TOKEN_SECRET.encode(), body, hashlib.sha256).digest()
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid QR signature")

    if body[:4] != QR_TOKEN_VERSION:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported QR payload")

    session_id = int.from_bytes(body[4:12], "big", signed=False)
    issued_at_epoch = int.from_bytes(body[12:20], "big", signed=False)
    expires_at_epoch = int.from_bytes(body[20:28], "big", signed=False)
    if expires_at_epoch < int(time.time()):
        raise HTTPException(status.HTTP_410_GONE, "QR payload expired")

    return {"typ": "attendance.qr.v1", "sid": session_id, "iat": issued_at_epoch, "exp": expires_at_epoch}


def b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def b64url_decode_bytes(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode())


def normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def extract_error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text or "Upstream attendance service error"
    if isinstance(body, dict):
        detail = body.get("detail") or body.get("message") or body.get("error")
        if isinstance(detail, str) and detail:
            return detail
    return "Upstream attendance service error"
