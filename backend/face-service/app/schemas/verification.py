from datetime import datetime

from pydantic import BaseModel


class StoredFaceProfileResponse(BaseModel):
    studentId: int
    embedding: str
    dimension: int
    model: str
    format: str
    faceEnrolledAt: datetime


class FaceVerificationResponse(BaseModel):
    verified: bool
    score: float
