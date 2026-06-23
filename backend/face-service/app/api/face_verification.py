from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies import (
    AuthenticatedStudent,
    get_authenticated_student,
    get_face_verification_service,
    get_user_service_client,
)
from app.clients.user_service_client import UserServiceClient
from app.schemas.verification import FaceVerificationResponse
from app.services.face_verification_service import FaceVerificationService

router = APIRouter(prefix="/face", tags=["Face Verification"])


@router.post("/student/verify", response_model=FaceVerificationResponse)
async def verify_student_face(
    image: Annotated[UploadFile, File(...)],
    student: Annotated[AuthenticatedStudent, Depends(get_authenticated_student)],
    verification_service: Annotated[
        FaceVerificationService,
        Depends(get_face_verification_service),
    ],
    user_service_client: Annotated[
        UserServiceClient,
        Depends(get_user_service_client),
    ],
) -> FaceVerificationResponse:
    stored_profile = await user_service_client.get_face_profile(student.student_id)
    result = await verification_service.verify_student_face(
        image=image,
        encoded_embedding=stored_profile.embedding,
        dimension=stored_profile.dimension,
        model=stored_profile.model,
        format=stored_profile.format,
    )
    return FaceVerificationResponse(
        verified=result.matched,
        score=result.similarity,
    )
