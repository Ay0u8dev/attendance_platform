from datetime import datetime, timezone
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.api.dependencies import (
    get_attendance_service_client,
    get_face_verification_service,
    get_user_service_client,
)
from app.core.config import settings
from app.main import app
from app.schemas.attendance import AttendanceUpdateResponse
from app.schemas.verification import StoredFaceProfileResponse
from app.services.face_embedding_service import FaceComparisonResult


def test_face_attendance_matches_before_recording():
    verification, users, attendance = AsyncMock(), AsyncMock(), AsyncMock()
    app.dependency_overrides[get_face_verification_service] = lambda: verification
    app.dependency_overrides[get_user_service_client] = lambda: users
    app.dependency_overrides[get_attendance_service_client] = lambda: attendance
    users.get_face_profile.return_value = StoredFaceProfileResponse(
        studentId=12,
        embedding="encoded",
        dimension=128,
        model="opencv_sface_2021dec",
        format="float32_little_endian_v1",
        faceEnrolledAt=datetime.now(timezone.utc),
    )
    verification.verify_student_face.return_value = FaceComparisonResult(0.82, True)
    attendance.mark_face_attendance.return_value = AttendanceUpdateResponse(
        sessionId=4,
        studentId=12,
        status="PRESENT",
        markMethod="FACE_ID",
        markedAt=None,
        presentCount=1,
        absentCount=0,
        unknownCount=2,
    )
    try:
        with TestClient(app) as client:
            response = client.post(
                "/face/student/attendance",
                headers={
                    "X-Internal-Service-Token": settings.internal_service_token,
                    "X-User-Id": "12",
                    "X-User-Roles": "STUDENT",
                },
                data={
                    "sessionId": "4",
                    "deviceId": "phone-1",
                    "gpsLat": "34",
                    "gpsLon": "-6",
                },
                files={"image": ("face.jpg", b"image", "image/jpeg")},
            )
        assert response.status_code == 200
        attendance.mark_face_attendance.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_face_attendance_accepts_prefixed_student_role():
    verification, users, attendance = AsyncMock(), AsyncMock(), AsyncMock()
    app.dependency_overrides[get_face_verification_service] = lambda: verification
    app.dependency_overrides[get_user_service_client] = lambda: users
    app.dependency_overrides[get_attendance_service_client] = lambda: attendance
    users.get_face_profile.return_value = StoredFaceProfileResponse(
        studentId=12,
        embedding="encoded",
        dimension=128,
        model="opencv_sface_2021dec",
        format="float32_little_endian_v1",
        faceEnrolledAt=datetime.now(timezone.utc),
    )
    verification.verify_student_face.return_value = FaceComparisonResult(0.82, True)
    attendance.mark_face_attendance.return_value = AttendanceUpdateResponse(
        sessionId=4,
        studentId=12,
        status="PRESENT",
        markMethod="FACE_ID",
        markedAt=None,
        presentCount=1,
        absentCount=0,
        unknownCount=2,
    )
    try:
        with TestClient(app) as client:
            response = client.post(
                "/face/student/attendance",
                headers={
                    "X-Internal-Service-Token": settings.internal_service_token,
                    "X-User-Id": "12",
                    "X-User-Roles": "ROLE_STUDENT",
                },
                data={
                    "sessionId": "4",
                    "deviceId": "phone-1",
                    "gpsLat": "34",
                    "gpsLon": "-6",
                },
                files={"image": ("face.jpg", b"image", "image/jpeg")},
            )
        assert response.status_code == 200
        attendance.mark_face_attendance.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()
