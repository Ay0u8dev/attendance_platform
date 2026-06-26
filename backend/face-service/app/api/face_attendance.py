from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.dependencies import (
    AuthenticatedStudent,
    get_attendance_service_client,
    get_authenticated_student,
    get_face_verification_service,
    get_user_service_client,
)
from app.clients.attendance_client import AttendanceServiceClient
from app.clients.user_service_client import UserServiceClient
from app.schemas.attendance import AttendanceUpdateResponse
from app.services.face_verification_service import FaceVerificationService

router = APIRouter(prefix="/face", tags=["Face Attendance"])


@router.post("/student/attendance", response_model=AttendanceUpdateResponse)
async def mark_attendance_by_face(
    session_id: Annotated[int, Form(alias="sessionId")],
    device_id: Annotated[str, Form(alias="deviceId")],
    gps_lat: Annotated[str | None, Form(alias="gpsLat")] = None,
    gps_lon: Annotated[str | None, Form(alias="gpsLon")] = None,
    image: UploadFile = File(...),
    student: AuthenticatedStudent = Depends(get_authenticated_student),
    verification_service: FaceVerificationService = Depends(
        get_face_verification_service
    ),
    user_service_client: UserServiceClient = Depends(get_user_service_client),
    attendance_client: AttendanceServiceClient = Depends(get_attendance_service_client),
) -> AttendanceUpdateResponse:
    profile = await user_service_client.get_face_profile(student.student_id)
    result = await verification_service.verify_student_face(
        image=image,
        encoded_embedding=profile.embedding,
        dimension=profile.dimension,
        model=profile.model,
        format=profile.format,
    )
    if not result.matched:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Face does not match the enrolled profile. Please try again.",
        )
    return await attendance_client.mark_face_attendance(
        session_id=session_id,
        student_id=student.student_id,
        device_id=device_id,
        gps_lat=gps_lat,
        gps_lon=gps_lon,
    )
