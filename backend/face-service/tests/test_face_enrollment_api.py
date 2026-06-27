from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.dependencies import (
    get_face_verification_service,
    get_user_service_client,
)
from app.core.config import settings
from app.main import app
from app.schemas.enrollment import UserServiceFaceProfileResponse
from app.services.face_verification_service import PreparedFaceEnrollment


@pytest.fixture
def client_and_dependencies():
    verification_service = AsyncMock()
    user_service_client = AsyncMock()
    app.dependency_overrides[get_face_verification_service] = (
        lambda: verification_service
    )
    app.dependency_overrides[get_user_service_client] = lambda: user_service_client
    with TestClient(app) as client:
        yield client, verification_service, user_service_client
    app.dependency_overrides.clear()


def test_authenticated_student_enrollment_uses_forwarded_identity(
    client_and_dependencies,
):
    client, verification_service, user_service_client = client_and_dependencies
    verification_service.prepare_student_enrollment.return_value = prepared_enrollment()
    user_service_client.persist_face_profile.return_value = persisted_response()

    response = client.post(
        "/face/student/enrollment",
        headers=student_headers(12),
        files={"image": ("face.jpg", b"image-bytes", "image/jpeg")},
        data={"studentId": "999"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "studentId": 12,
        "enrolled": True,
        "firstLogin": False,
        "faceEnrolledAt": "2026-06-21T10:00:00Z",
        "authenticationRefreshRequired": True,
    }
    request = user_service_client.persist_face_profile.await_args.args
    assert request[0] == 12
    assert request[1].embedding == "encoded-value"
    assert "embedding" not in response.json()


def test_reenrollment_does_not_require_authentication_refresh(
    client_and_dependencies,
):
    client, verification_service, user_service_client = client_and_dependencies
    verification_service.prepare_student_enrollment.return_value = prepared_enrollment()
    user_service_client.persist_face_profile.return_value = (
        persisted_response().model_copy(update={"authenticationRefreshRequired": False})
    )

    response = client.post(
        "/face/student/enrollment",
        headers=student_headers(12),
        files={"image": ("face.jpg", b"image-bytes", "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["authenticationRefreshRequired"] is False


@pytest.mark.parametrize(
    "detail",
    [
        "Invalid image file",
        "No face detected",
        "Multiple faces detected",
        "Face is too small",
        "A reliable face profile could not be generated",
    ],
)
def test_preparation_failure_never_calls_user_service(client_and_dependencies, detail):
    client, verification_service, user_service_client = client_and_dependencies
    verification_service.prepare_student_enrollment.side_effect = HTTPException(
        status_code=400,
        detail=detail,
    )

    response = client.post(
        "/face/student/enrollment",
        headers=student_headers(12),
        files={"image": ("face.jpg", b"invalid", "image/jpeg")},
    )

    assert response.status_code == 400
    user_service_client.persist_face_profile.assert_not_awaited()


@pytest.mark.parametrize("status_code", [404, 422, 503, 504])
def test_user_service_failure_never_reports_success(
    client_and_dependencies, status_code
):
    client, verification_service, user_service_client = client_and_dependencies
    verification_service.prepare_student_enrollment.return_value = prepared_enrollment()
    user_service_client.persist_face_profile.side_effect = HTTPException(
        status_code=status_code,
        detail="Persistence failed",
    )

    response = client.post(
        "/face/student/enrollment",
        headers=student_headers(12),
        files={"image": ("face.jpg", b"image-bytes", "image/jpeg")},
    )

    assert response.status_code == status_code
    assert response.json() == {"detail": "Persistence failed"}


def prepared_enrollment() -> PreparedFaceEnrollment:
    return PreparedFaceEnrollment(
        encoded_embedding="encoded-value",
        dimension=128,
        model="opencv_sface_2021dec",
        format="float32_little_endian_v1",
    )


def persisted_response() -> UserServiceFaceProfileResponse:
    return UserServiceFaceProfileResponse(
        studentId=12,
        enrolled=True,
        firstLogin=False,
        faceEnrolledAt=datetime(2026, 6, 21, 10, 0, tzinfo=timezone.utc),
        authenticationRefreshRequired=True,
    )


def student_headers(student_id: int) -> dict[str, str]:
    return {
        "X-Internal-Service-Token": settings.internal_service_token,
        "X-User-Id": str(student_id),
        "X-User-Roles": "STUDENT",
        "X-User-Email": "student@ump.ac.ma",
    }
