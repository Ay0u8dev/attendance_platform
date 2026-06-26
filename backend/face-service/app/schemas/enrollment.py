from datetime import datetime

from pydantic import BaseModel


class FaceProfilePersistenceRequest(BaseModel):
    embedding: str
    dimension: int
    model: str
    format: str


class UserServiceFaceProfileResponse(BaseModel):
    studentId: int
    enrolled: bool
    firstLogin: bool
    faceEnrolledAt: datetime
    authenticationRefreshRequired: bool


class FaceEnrollmentResponse(UserServiceFaceProfileResponse):
    pass
