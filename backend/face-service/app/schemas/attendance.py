from datetime import datetime

from pydantic import BaseModel


class AttendanceUpdateResponse(BaseModel):
    sessionId: int
    studentId: int
    status: str
    markMethod: str
    markedAt: datetime | None
    presentCount: int
    absentCount: int
    unknownCount: int
