from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.attendance import AttendanceUpdateResponse


class AttendanceServiceClient:
    async def mark_face_attendance(
        self,
        session_id: int,
        student_id: int,
        device_id: str,
        gps_lat: str | None,
        gps_lon: str | None,
    ) -> AttendanceUpdateResponse:
        body = {
            "studentId": student_id,
            "method": "FACE_ID",
            "deviceId": device_id.strip(),
            "gpsLat": normalize_optional(gps_lat),
            "gpsLon": normalize_optional(gps_lon),
        }

        try:
            async with httpx.AsyncClient(timeout=settings.http_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.attendance_service_url.rstrip('/')}/attendance/internal/sessions/{session_id}/attendance",
                    headers={
                        "X-Request-Source": "face-service",
                        "X-Internal-Service-Token": settings.face_attendance_internal_token,
                    },
                    json=body,
                )
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Attendance service timed out",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Attendance service is unavailable",
            ) from exc
        if response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Attendance service authentication failed",
            )
        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=extract_error_message(response),
            )

        try:
            parsed = AttendanceUpdateResponse.model_validate(response.json())
        except (ValueError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid attendance service response",
            ) from exc

        if (
            parsed.sessionId != session_id
            or parsed.studentId != student_id
            or parsed.status != "PRESENT"
            or parsed.markMethod != "FACE_ID"
        ):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid attendance service response",
            )
        return parsed


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
