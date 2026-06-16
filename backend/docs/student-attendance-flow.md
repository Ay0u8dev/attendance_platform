# Student Attendance Flow

This document describes how student attendance works in the current code. It covers the implemented QR path, teacher manual corrections, and finalization.

## Actors And Owners

| Concern | Owner |
| --- | --- |
| Login and platform JWT | `auth-service` |
| Student, teacher, group, and active-year roster data | `user-service` |
| Attendance session lifecycle and attendance state | `attendance-service` |
| Signed QR proof validation | `qr-service` |
| Browser UI | `frontend/` |

## 1) Teacher Creates A Session

Frontend calls:

```http
POST /api/attendance/sessions
Authorization: Bearer <teacher-jwt>
Content-Type: application/json

{
  "groupIds": [1],
  "courseLabel": "Programmation Java",
  "roomLabel": "Amphi A",
  "gpsLat": "34.6894",
  "gpsLon": "-1.9123"
}
```

Rules:

- caller must have `TEACHER`
- a teacher may have only one active session
- `method` is not part of the request body
- `gpsLat` and `gpsLon` are required because student self-marking is distance checked

Attendance-service then:

1. Reads teacher id from `X-User-Id`.
2. Calls `GET /users/internal/teachers/{id}/identity`.
3. Calls `GET /users/internal/students/roster?groupIds=...`.
4. Saves the session header in `attendance_db`.
5. Creates Redis live state with every roster student as `UNKNOWN`.

The session auto-end time is `startedAt + attendance.session.auto-end-duration` from attendance-service config. In dev it is `PT30M`.

## 2) Student Discovers Active Attendance

Frontend calls:

```http
GET /api/attendance/student/sessions/active
Authorization: Bearer <student-jwt>
```

The student receives their own current active-session state when they belong to a live session roster.

Example:

```json
{
  "sessionId": 5,
  "teacherFullName": "Ayoub Elebbar",
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "groupIds": [1],
  "startedAt": "2026-06-01T18:00:00",
  "endsAt": "2026-06-01T18:30:00",
  "attendanceStatus": "UNKNOWN"
}
```

If there is no active session for the student, attendance-service returns `404`; frontend code treats that as "no active session".

## 3) Student Marks Present With QR

The QR flow has two public calls:

1. Teacher display gets a fresh payload from `POST /api/qr/teacher/sessions/{sessionId}/payload`.
2. Student scans it and submits `POST /api/qr/student/scan`.

Student request:

```json
{
  "payload": "<opaque-signed-qr-payload>",
  "deviceId": "browser-device-uuid",
  "gpsLat": "34.6894",
  "gpsLon": "-1.9123"
}
```

QR-service validates the payload and forwards this internal request to attendance-service:

```http
POST /attendance/internal/sessions/{sessionId}/attendance
X-Request-Source: qr-service
Content-Type: application/json

{
  "studentId": 12,
  "method": "QR_CODE",
  "deviceId": "browser-device-uuid",
  "gpsLat": "34.6894",
  "gpsLon": "-1.9123"
}
```

Attendance-service is the final authority. It checks:

- trusted request source
- method/source match
- active session state
- student exists in the live roster
- student is still `UNKNOWN`
- GPS is present and valid
- student GPS is within `attendance.self-mark.max-distance-meters` of teacher session GPS
- device is not already used by another student in the same session
- student is not already bound to another device in the same session

On success:

- live student state becomes `PRESENT`
- `markMethod` becomes `QR_CODE`
- `markedAt` is set
- Redis counts are updated
- `ATTENDANCE_UPDATED` is broadcast to `/topic/attendance.sessions.{sessionId}`

## 4) Teacher Manually Corrects Attendance

Teacher correction uses:

```http
POST /api/attendance/sessions/{sessionId}/attendance
Authorization: Bearer <teacher-jwt>
Content-Type: application/json

{
  "studentId": 12,
  "status": "ABSENT"
}
```

Rules:

- caller must be the owning teacher
- session must be active
- `status` must be `PRESENT` or `ABSENT`
- manual updates set `markMethod = MANUAL`
- manual updates broadcast `ATTENDANCE_UPDATED`

Manual correction is the current override path. There is no separate audit trail for QR-to-manual transitions in the checked-in code.

## 5) Session Finalization

Teacher finalizes manually:

```http
POST /api/attendance/sessions/{sessionId}/end
Authorization: Bearer <teacher-jwt>
```

Attendance-service also has a scheduled auto-finalizer based on `attendance.session.auto-finalize-poll-interval`.

Finalization rules:

- remaining `UNKNOWN` students become `ABSENT`
- final attendance records are written to `attendance_db`
- session status becomes `FINALIZED`
- `endedAt`, `presentCount`, `absentCount`, and `unknownCount` are stored on the session header
- finalized live state remains in Redis temporarily for `attendance.session.finalized-state-retention`
- `SESSION_FINALIZED` is broadcast

Final records persist roster snapshot fields and attendance result fields. They do not persist QR GPS, face GPS, or `deviceId`.

## 6) Student Reads Finalized Attendance

Student history:

```http
GET /api/attendance/student/sessions
Authorization: Bearer <student-jwt>
```

Student detail:

```http
GET /api/attendance/student/sessions/{sessionId}
Authorization: Bearer <student-jwt>
```

These endpoints return finalized records only. Before finalization, the student should use `/api/attendance/student/sessions/active`.

## Failure Cases That Matter

| Case | Typical status | Source |
| --- | --- | --- |
| No active session for student | `404` | attendance-service |
| Expired QR payload | `410` | qr-service |
| Invalid/tampered QR payload | `400` | qr-service |
| Student too far from teacher session GPS | `403` | attendance-service |
| Student already resolved | `409` | attendance-service |
| Device already used by another student | `409` | attendance-service |
| Teacher already has active session | `409` | attendance-service |

