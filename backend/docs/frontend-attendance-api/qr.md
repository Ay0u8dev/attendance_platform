# QR Service API

Base path:

- `/api/qr`

These routes are exposed through Traefik and require the normal gateway JWT. The frontend must not call `/api/attendance/internal/**`; QR service is the public QR proof validator and attendance-service remains the attendance authority.

## `GET /api/qr/health`

Purpose:

- Basic service health check.

Success response:

```json
{
  "status": "UP"
}
```

## `POST /api/qr/teacher/sessions/{sessionId}/payload`

Purpose:

- Generate the currently valid QR payload for an active teacher-owned session.
- Used by the temporary public Angular QR display page with a pasted teacher JWT.

Rules:

- caller must be `TEACHER`
- session must belong to the teacher
- session must be `ACTIVE`
- payload is an opaque signed value and expires after 30 seconds

Success response:

```json
{
  "sessionId": 5,
  "payload": "QVFSMQAAAAAAAAAFAAAAAGxXk4AAAAAAbFeTnrLO9kEu8cQ7xraKs1uCGsGuGCO4k2qvAq3b2R0jvSE_XYHapQ",
  "expiresAt": "2026-06-01T18:00:30Z",
  "refreshAfterSeconds": 30
}
```

## `POST /api/qr/student/scan`

Purpose:

- Validate a scanned QR payload and mark the authenticated student as present.

Request body:

```json
{
  "payload": "QVFSMQAAAAAAAAAFAAAAAGxXk4AAAAAAbFeTnrLO9kEu8cQ7xraKs1uCGsGuGCO4k2qvAq3b2R0jvSE_XYHapQ",
  "deviceId": "browser-device-uuid",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086"
}
```

Rules:

- caller must be `STUDENT`
- QR payload signature and expiry must be valid
- `deviceId` is required for active-session device locking
- `gpsLat` and `gpsLon` are required for QR attendance
- QR service calls attendance-service internally with `X-Request-Source: qr-service` and `method = QR_CODE`
- attendance-service enforces roster membership, active session state, duplicate self-mark prevention, one-device-per-active-session rules, and the shared student self-mark distance rule from the teacher session GPS
- `deviceId` and GPS are transient and are not persisted to finalized attendance records

Success response:

```json
{
  "sessionId": 5,
  "studentId": 12,
  "status": "PRESENT",
  "markMethod": "QR_CODE",
  "markedAt": "2026-06-01T18:00:12",
  "presentCount": 1,
  "absentCount": 0,
  "unknownCount": 41
}
```

## Local QR service setup

From the repo root:

```powershell
cd backend/qr-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:ATTENDANCE_SERVICE_URL = "http://localhost:8083"
$env:QR_TOKEN_SECRET = "dev-only-change-me"
$env:QR_TOKEN_TTL_SECONDS = "30"
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Expected gateway route in local dev:

- Traefik forwards `/api/qr/**` to `http://host.docker.internal:8001`
- attendance-service must be running on `http://localhost:8083`
- auth-service must be running because `/api/qr/**` uses forward-auth
