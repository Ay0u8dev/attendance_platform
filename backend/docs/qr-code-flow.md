# QR Code Flow

This document describes the implemented QR attendance path. QR-service validates QR proof; attendance-service remains the attendance authority.

## Configuration

QR-service reads:

- `ATTENDANCE_SERVICE_URL`, default `http://localhost:8083`
- `QR_TOKEN_SECRET`, default `dev-only-change-me`
- `QR_TOKEN_TTL_SECONDS`, default `30`

Attendance-service reads:

- `attendance.self-mark.max-distance-meters`, defaulting through config to `100`

## QR Payload Format

The QR payload is an opaque base64url string. Clients must not parse it.

Internally, qr-service signs:

- version: `AQR1`
- session id
- issued-at epoch seconds
- expires-at epoch seconds
- random nonce
- HMAC-SHA256 signature over the body

Validation checks:

- base64url decoding succeeds
- payload length matches the expected body plus signature length
- HMAC signature matches `QR_TOKEN_SECRET`
- version is supported
- expiry is not in the past

Do not put student identity into the QR payload. Student identity comes from the authenticated JWT on `/api/qr/student/scan`.

## Teacher Payload Generation

Frontend calls:

```http
POST /api/qr/teacher/sessions/{sessionId}/payload
Authorization: Bearer <teacher-jwt>
Content-Type: application/json
```

QR-service receives forwarded identity headers from Traefik:

- `X-User-Id`
- `X-User-Roles`
- `X-User-Email`

QR-service then:

1. Requires `TEACHER`.
2. Calls attendance-service `GET /attendance/sessions/{sessionId}` with forwarded identity headers.
3. Requires the session to be teacher-owned and `ACTIVE`.
4. Generates a signed payload.
5. Returns the payload and expiry metadata.

Response:

```json
{
  "sessionId": 5,
  "payload": "<opaque-signed-qr-payload>",
  "expiresAt": "2026-06-01T18:00:30Z",
  "refreshAfterSeconds": 30
}
```

The QR display should refresh before or at `refreshAfterSeconds`. A stale code is expected to fail with `410`.

## Student Scan

Frontend calls:

```http
POST /api/qr/student/scan
Authorization: Bearer <student-jwt>
Content-Type: application/json

{
  "payload": "<opaque-signed-qr-payload>",
  "deviceId": "browser-device-uuid",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086"
}
```

QR-service:

1. Requires `STUDENT`.
2. Verifies the QR payload.
3. Reads `studentId` from `X-User-Id`.
4. Calls attendance-service internally:

   ```http
   POST /attendance/internal/sessions/{sessionId}/attendance
   X-Request-Source: qr-service
   Content-Type: application/json

   {
     "studentId": 12,
     "method": "QR_CODE",
     "deviceId": "browser-device-uuid",
     "gpsLat": "34.6814",
     "gpsLon": "-1.9086"
   }
   ```

5. Returns the attendance-service response to the frontend.

## Attendance-Service Enforcement

Attendance-service rejects the internal QR mark when:

- `X-Request-Source` is missing or not `qr-service`
- `method` is not `QR_CODE`
- session is missing or not active
- student is not in the live roster
- student is already `PRESENT` or `ABSENT`
- `deviceId` is blank
- GPS fields are blank or invalid
- student GPS is too far from the teacher session GPS
- another student already used the device in this session
- the student is already bound to another device in this session

On success, attendance-service:

- marks the student `PRESENT`
- stores `markMethod = QR_CODE`
- stores transient `deviceId`, `gpsLat`, and `gpsLon` in live Redis state
- updates live counts
- broadcasts `ATTENDANCE_UPDATED`

The transient QR device and GPS data are not written to finalized attendance records.

## Browser Responsibilities

- Generate or persist a stable browser/device id for the attendance attempt.
- Request GPS permission before scan submission.
- Send GPS coordinates as strings matching the backend DTO shape.
- Handle:
  - `400` invalid QR
  - `403` too far or forbidden role
  - `409` already marked/device conflict/session state conflict
  - `410` expired QR

## Security Notes

- The QR payload proves only that a student scanned a fresh code for a session. It does not prove the student's identity.
- Student identity comes from the JWT and forwarded `X-User-Id`.
- GPS and device checks reduce casual sharing but are not a complete anti-fraud system.
- `QR_TOKEN_SECRET` must be changed outside development.

