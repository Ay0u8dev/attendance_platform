from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies import (
    AuthenticatedStudent,
    get_authenticated_student,
    get_face_verification_service,
    get_user_service_client,
)
from app.clients.user_service_client import UserServiceClient
from app.observability import FACE_ENROLLMENT_RESULTS
from app.schemas.enrollment import (
    FaceEnrollmentResponse,
    FaceProfilePersistenceRequest,
)
from app.services.face_verification_service import FaceVerificationService

router = APIRouter(prefix="/face", tags=["Face Enrollment"])


@router.post("/student/enrollment", response_model=FaceEnrollmentResponse)
async def enroll_student_face(
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
) -> FaceEnrollmentResponse:
    try:
        prepared = await verification_service.prepare_student_enrollment(image)
        persisted = await user_service_client.persist_face_profile(
            student.student_id,
            FaceProfilePersistenceRequest(
                embedding=prepared.encoded_embedding,
                dimension=prepared.dimension,
                model=prepared.model,
                format=prepared.format,
            ),
        )
    except Exception:
        FACE_ENROLLMENT_RESULTS.labels(outcome="failure").inc()
        raise
    FACE_ENROLLMENT_RESULTS.labels(outcome="success").inc()
    return FaceEnrollmentResponse(
        **persisted.model_dump(),
    )
