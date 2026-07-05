import asyncio
from datetime import datetime, timezone

import httpx
import pytest
from fastapi import HTTPException

from app.clients.user_service_client import UserServiceClient
from app.core.config import settings
from app.schemas.enrollment import FaceProfilePersistenceRequest


def test_success_response_is_validated(monkeypatch):
    configure(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["X-Request-Source"] == "face-service"
        assert request.headers["X-Internal-Service-Token"] == "test-token"
        assert request.url.path == "/users/internal/students/12/face-profile"
        return httpx.Response(
            200,
            json={
                "studentId": 12,
                "enrolled": True,
                "firstLogin": False,
                "faceEnrolledAt": datetime(
                    2026, 6, 21, tzinfo=timezone.utc
                ).isoformat(),
                "authenticationRefreshRequired": False,
            },
        )

    result = run_client(httpx.MockTransport(handler))

    assert result.studentId == 12
    assert result.enrolled is True
    assert result.firstLogin is False
    assert result.authenticationRefreshRequired is False


def test_stored_face_profile_is_loaded_with_internal_authentication(monkeypatch):
    configure(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/users/internal/students/12/face-profile"
        assert request.headers["X-Request-Source"] == "face-service"
        assert request.headers["X-Internal-Service-Token"] == "test-token"
        return httpx.Response(
            200,
            json={
                "studentId": 12,
                "embedding": "encoded-value",
                "dimension": 128,
                "model": "opencv_sface_2021dec",
                "format": "float32_little_endian_v1",
                "faceEnrolledAt": "2026-06-22T10:00:00Z",
            },
        )

    result = run_profile_client(httpx.MockTransport(handler))

    assert result.studentId == 12
    assert result.embedding == "encoded-value"


@pytest.mark.parametrize(
    ("upstream_status", "expected_status"),
    [(404, 404), (401, 502), (403, 502), (500, 503)],
)
def test_stored_profile_errors_are_mapped(
    monkeypatch,
    upstream_status,
    expected_status,
):
    configure(monkeypatch)
    transport = httpx.MockTransport(
        lambda request: httpx.Response(upstream_status, json={"message": "error"})
    )

    with pytest.raises(HTTPException) as error:
        run_profile_client(transport)

    assert error.value.status_code == expected_status


def test_stored_profile_timeout_is_mapped(monkeypatch):
    configure(monkeypatch)

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    with pytest.raises(HTTPException) as error:
        run_profile_client(httpx.MockTransport(timeout))

    assert error.value.status_code == 504


def test_stored_profile_unavailable_is_mapped(monkeypatch):
    configure(monkeypatch)

    def unavailable(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unavailable", request=request)

    with pytest.raises(HTTPException) as error:
        run_profile_client(httpx.MockTransport(unavailable))

    assert error.value.status_code == 503


@pytest.mark.parametrize(
    ("upstream_status", "expected_status"),
    [(400, 422), (422, 422), (404, 404), (401, 502), (403, 502), (500, 503)],
)
def test_upstream_errors_are_mapped(monkeypatch, upstream_status, expected_status):
    configure(monkeypatch)
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            upstream_status, json={"message": "upstream error"}
        )
    )

    with pytest.raises(HTTPException) as error:
        run_client(transport)

    assert error.value.status_code == expected_status


def test_timeout_is_mapped(monkeypatch):
    configure(monkeypatch)

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    with pytest.raises(HTTPException) as error:
        run_client(httpx.MockTransport(timeout))

    assert error.value.status_code == 504


def test_unavailable_service_is_mapped(monkeypatch):
    configure(monkeypatch)

    def unavailable(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unavailable", request=request)

    with pytest.raises(HTTPException) as error:
        run_client(httpx.MockTransport(unavailable))

    assert error.value.status_code == 503


def test_inconsistent_success_response_is_rejected(monkeypatch):
    configure(monkeypatch)
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "studentId": 99,
                "enrolled": True,
                "firstLogin": False,
                "faceEnrolledAt": "2026-06-21T10:00:00Z",
                "authenticationRefreshRequired": False,
            },
        )
    )

    with pytest.raises(HTTPException) as error:
        run_client(transport)

    assert error.value.status_code == 502


def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_service_token", "test-token")
    monkeypatch.setattr(settings, "user_service_url", "http://user-service:8080")


def run_client(transport: httpx.AsyncBaseTransport):
    request = FaceProfilePersistenceRequest(
        embedding="encoded-value",
        dimension=128,
        model="opencv_sface_2021dec",
        format="float32_little_endian_v1",
    )
    return asyncio.run(UserServiceClient(transport).persist_face_profile(12, request))


def run_profile_client(transport: httpx.AsyncBaseTransport):
    return asyncio.run(UserServiceClient(transport).get_face_profile(12))
