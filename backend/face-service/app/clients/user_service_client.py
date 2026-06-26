from typing import Any

import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.enrollment import (
    FaceProfilePersistenceRequest,
    UserServiceFaceProfileResponse,
)
from app.schemas.verification import StoredFaceProfileResponse


class UserServiceClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def persist_face_profile(
        self,
        student_id: int,
        request: FaceProfilePersistenceRequest,
    ) -> UserServiceFaceProfileResponse:
        service_token = settings.face_service_internal_token.strip()
        if not service_token:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Face enrollment persistence is not configured",
            )

        timeout = httpx.Timeout(
            settings.http_read_timeout_seconds,
            connect=settings.http_connect_timeout_seconds,
        )
        try:
            async with httpx.AsyncClient(
                timeout=timeout,
                transport=self._transport,
            ) as client:
                response = await client.put(
                    (
                        f"{settings.user_service_url.rstrip('/')}"
                        f"/users/internal/students/{student_id}/face-profile"
                    ),
                    headers={
                        "X-Request-Source": "face-service",
                        "X-Internal-Service-Token": service_token,
                    },
                    json=request.model_dump(),
                )
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="User service timed out while saving face enrollment",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="User service is unavailable",
            ) from exc

        self._raise_for_error(response)
        try:
            result = UserServiceFaceProfileResponse.model_validate(response.json())
        except (ValueError, ValidationError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid user service enrollment response",
            ) from exc

        if result.studentId != student_id or not result.enrolled or result.firstLogin:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Inconsistent user service enrollment response",
            )
        return result

    async def get_face_profile(self, student_id: int) -> StoredFaceProfileResponse:
        service_token = settings.face_service_internal_token.strip()
        if not service_token:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Face profile retrieval is not configured",
            )

        timeout = httpx.Timeout(
            settings.http_read_timeout_seconds,
            connect=settings.http_connect_timeout_seconds,
        )
        try:
            async with httpx.AsyncClient(
                timeout=timeout,
                transport=self._transport,
            ) as client:
                response = await client.get(
                    (
                        f"{settings.user_service_url.rstrip('/')}"
                        f"/users/internal/students/{student_id}/face-profile"
                    ),
                    headers={
                        "X-Request-Source": "face-service",
                        "X-Internal-Service-Token": service_token,
                    },
                )
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="User service timed out while loading the face profile",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="User service is unavailable",
            ) from exc

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Face profile not enrolled",
            )
        if response.status_code in {401, 403}:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="User service rejected internal authentication",
            )
        if response.status_code >= 500:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="User service could not load the face profile",
            )
        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unexpected user service response",
            )

        try:
            result = StoredFaceProfileResponse.model_validate(response.json())
        except (ValueError, ValidationError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid user service face profile response",
            ) from exc

        if result.studentId != student_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Inconsistent user service face profile response",
            )
        return result

    def _raise_for_error(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return

        if response.status_code in {400, 422}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=_extract_error_message(
                    response, "User service rejected the face profile"
                ),
            )
        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found",
            )
        if response.status_code in {401, 403}:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="User service rejected internal authentication",
            )
        if response.status_code >= 500:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="User service could not save face enrollment",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unexpected user service response",
        )


def _extract_error_message(response: httpx.Response, fallback: str) -> str:
    try:
        body: Any = response.json()
    except ValueError:
        return fallback

    if isinstance(body, dict):
        message = body.get("message") or body.get("detail")
        if isinstance(message, str) and message.strip():
            return message.strip()
    return fallback
