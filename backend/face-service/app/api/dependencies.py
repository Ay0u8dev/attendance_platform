from dataclasses import dataclass
from functools import lru_cache
from secrets import compare_digest

from fastapi import Header, HTTPException, status

from app.clients.user_service_client import UserServiceClient
from app.clients.attendance_client import AttendanceServiceClient
from app.core.config import settings
from app.services.face_verification_service import FaceVerificationService


@dataclass(frozen=True)
class AuthenticatedStudent:
    student_id: int
    roles: set[str]
    email: str | None


@lru_cache
def get_face_verification_service() -> FaceVerificationService:
    return FaceVerificationService()


@lru_cache
def get_user_service_client() -> UserServiceClient:
    return UserServiceClient()


@lru_cache
def get_attendance_service_client() -> AttendanceServiceClient:
    return AttendanceServiceClient()


def get_authenticated_student(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_roles: str | None = Header(default=None, alias="X-User-Roles"),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> AuthenticatedStudent:
    if not x_user_id or not x_user_roles:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authenticated user headers",
        )

    roles = parse_roles(x_user_roles)

    if "STUDENT" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="STUDENT role is required",
        )

    try:
        student_id = int(x_user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID",
        ) from exc

    return AuthenticatedStudent(
        student_id=student_id,
        roles=roles,
        email=x_user_email,
    )


def parse_roles(roles_header: str) -> set[str]:
    roles: set[str] = set()
    for role in roles_header.split(","):
        normalized = role.strip().upper()
        if not normalized:
            continue
        roles.add(normalized)
        if normalized.startswith("ROLE_"):
            roles.add(normalized.removeprefix("ROLE_"))
    return roles


def verify_internal_service_token(
    x_internal_service_token: str | None = Header(
        default=None,
        alias="X-Internal-Service-Token",
    ),
) -> None:
    expected_token = settings.internal_service_token.strip()
    supplied_token = (x_internal_service_token or "").strip()

    if not expected_token or not compare_digest(expected_token, supplied_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service token",
        )
