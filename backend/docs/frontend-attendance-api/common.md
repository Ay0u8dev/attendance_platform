# Common

## Authentication

- Teacher routes require a gateway-authenticated request with role `TEACHER`.
- Admin routes require a gateway-authenticated request with role `ADMIN`.
- Student routes require a gateway-authenticated request with role `STUDENT`.
- Teacher routes are ownership-checked on the backend.

## Enums

### Mark method

- `QR_CODE`
- `FACE_ID`
- `MANUAL`

Attendance sessions are method-neutral. `QR_CODE`, `FACE_ID`, and `MANUAL` describe how a student row was marked, not the session mode.

### Attendance status

- `UNKNOWN`
- `PRESENT`
- `ABSENT`

## Error reality

Most attendance-service application errors are returned as structured JSON. Some cross-service auth failures can still surface less-consistent error messages because the wider backend is not fully standardized yet.
