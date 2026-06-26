from fastapi import FastAPI

from app.api.face_attendance import router as face_attendance_router
from app.api.face_enrollment import router as face_enrollment_router
from app.api.face_verification import router as face_verification_router

app = FastAPI(title="Face Attendance Service")


@app.get("/face/health")
def health() -> dict[str, str]:
    return {"status": "UP"}


app.include_router(face_attendance_router)
app.include_router(face_enrollment_router)
app.include_router(face_verification_router)
