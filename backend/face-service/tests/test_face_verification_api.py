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
from app.schemas.verification import StoredFaceProfileResponse
from app.services.face_embedding_service import FaceComparisonResult


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


@pytest.mark.parametrize(
    ("matched", "similarity"),
    [(True, 0.82), (False, 0.12)],
)
def test_verification_returns_match_result_without_accepting_student_id(
    client_and_dependencies,
    matched,
    similarity,
):
    client, verification_service, user_service_client = client_and_dependencies
    user_service_client.get_face_profile.return_value = stored_profile()
    verification_service.verify_student_face.return_value = FaceComparisonResult(
        similarity=similarity,
        matched=matched,
    )

    response = client.post(
        "/face/student/verify",
        headers=student_headers(12),
        files={"image": ("face.jpg", b"image-bytes", "image/jpeg")},
        data={"studentId": "999"},
    )

    assert response.status_code == 200
    assert response.json() == {"verified": matched, "score": similarity}
    user_service_client.get_face_profile.assert_awaited_once_with(12)


@pytest.mark.parametrize("status_code", [404, 503, 504])
def test_profile_retrieval_failure_is_propagated(
    client_and_dependencies,
    status_code,
):
    client, verification_service, user_service_client = client_and_dependencies
    user_service_client.get_face_profile.side_effect = HTTPException(
        status_code=status_code,
        detail="Profile unavailable",
    )

    response = client.post(
        "/face/student/verify",
        headers=student_headers(12),
        files={"image": ("face.jpg", b"image-bytes", "image/jpeg")},
    )

    assert response.status_code == status_code
    assert response.json() == {"detail": "Profile unavailable"}
    verification_service.verify_student_face.assert_not_awaited()


def test_verification_rejects_forged_user_headers_without_internal_token(
    client_and_dependencies,
):
    client, verification_service, user_service_client = client_and_dependencies

    response = client.post(
        "/face/student/verify",
        headers={
            "X-User-Id": "12",
            "X-User-Roles": "STUDENT",
            "X-User-Email": "student@ump.ac.ma",
        },
        files={"image": ("face.jpg", b"image-bytes", "image/jpeg")},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid internal service token"}
    user_service_client.get_face_profile.assert_not_awaited()
    verification_service.verify_student_face.assert_not_awaited()


def test_verification_rejects_invalid_internal_token(client_and_dependencies):
    client, verification_service, user_service_client = client_and_dependencies

    response = client.post(
        "/face/student/verify",
        headers=student_headers(12) | {"X-Internal-Service-Token": "wrong-token"},
        files={"image": ("face.jpg", b"image-bytes", "image/jpeg")},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid internal service token"}
    user_service_client.get_face_profile.assert_not_awaited()
    verification_service.verify_student_face.assert_not_awaited()


def stored_profile() -> StoredFaceProfileResponse:
    return StoredFaceProfileResponse(
        studentId=12,
        embedding="encoded-value",
        dimension=128,
        model="opencv_sface_2021dec",
        format="float32_little_endian_v1",
        faceEnrolledAt=datetime(2026, 6, 22, tzinfo=timezone.utc),
    )


def student_headers(student_id: int) -> dict[str, str]:
    return {
        "X-Internal-Service-Token": settings.face_service_internal_token,
        "X-User-Id": str(student_id),
        "X-User-Roles": "STUDENT",
        "X-User-Email": "student@ump.ac.ma",
    }
