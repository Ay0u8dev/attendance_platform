# Frontend Attendance API

This document is the frontend-facing contract for the currently implemented teacher attendance flow in `attendance-service`.

Base path: `/attendance`

Authentication:

- Teacher-facing routes require the normal gateway-authenticated request flow.
- The frontend does not call internal `/attendance/internal/**` routes.

## 1) Create Session

### `POST /attendance/sessions`

Purpose:

- Start one active attendance session for the current teacher.
- Initialize the live roster in Redis.

Request body:

```json
{
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086",
  "method": "QR_CODE"
}
```

Notes:

- `groupIds` must be non-empty.
- `method` is one of `QR_CODE`, `FACE_ID`, `MANUAL`.
- `gpsLat` and `gpsLon` describe the teacher/session location.

Success response:

```json
{
  "sessionId": 5,
  "teacherId": 77,
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086",
  "startedAt": "2026-04-28T12:00:00",
  "endsAt": "2026-04-28T12:30:00",
  "method": "QR_CODE",
  "status": "ACTIVE",
  "studentCount": 42
}
```

Common errors:

- `400` invalid payload
- `403` caller is not a teacher
- `409` teacher already has an active session

## 2) Get Session Details

### `GET /attendance/sessions/{sessionId}`

Purpose:

- Hydrate the session screen after refresh/reconnect.
- Return live state while active.
- Return persisted final state after finalization.

Success response:

```json
{
  "sessionId": 5,
  "teacherId": 77,
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086",
  "startedAt": "2026-04-28T12:00:00",
  "endsAt": "2026-04-28T12:30:00",
  "method": "QR_CODE",
  "status": "ACTIVE",
  "presentCount": 11,
  "absentCount": 0,
  "unknownCount": 31,
  "students": [
    {
      "studentId": 12,
      "groupId": 1,
      "firstName": "Aya",
      "lastName": "Bennani",
      "email": "aya.bennani@ump.ac.ma",
      "numApogee": "22012345",
      "status": "PRESENT",
      "markMethod": "QR_CODE",
      "deviceId": "scanner-entrance-01",
      "markedGpsLat": "34.6820",
      "markedGpsLon": "-1.9091",
      "markedAt": "2026-04-28T12:01:00"
    }
  ]
}
```

Nullable fields per student:

- `markMethod`
- `deviceId`
- `markedGpsLat`
- `markedGpsLon`
- `markedAt`

Those fields are `null` for students still `UNKNOWN`.
For manual teacher updates, GPS fields stay `null`.

Active vs finalized behavior:

- `ACTIVE`: response is backed by Redis live state.
- `FINALIZED`: response is backed by persisted DB records.
- The response shape is the same in both cases.

Common errors:

- `403` caller is not a teacher
- `404` session not found

## 3) Manual Teacher Attendance Update

### `POST /attendance/sessions/{sessionId}/attendance`

Purpose:

- Let the teacher manually set a student to `PRESENT` or `ABSENT`.

Request body:

```json
{
  "studentId": 12,
  "status": "ABSENT"
}
```

Allowed `status` values:

- `PRESENT`
- `ABSENT`

Success response:

```json
{
  "sessionId": 5,
  "studentId": 12,
  "status": "ABSENT",
  "markMethod": "MANUAL",
  "deviceId": null,
  "markedGpsLat": null,
  "markedGpsLon": null,
  "markedAt": "2026-04-28T12:05:00",
  "presentCount": 10,
  "absentCount": 1,
  "unknownCount": 31
}
```

Rules:

- manual updates are allowed even if the session method is `QR_CODE` or `FACE_ID`
- latest valid update wins during the active session

Common errors:

- `400` invalid payload
- `403` caller is not the session owner teacher
- `404` session or student not found
- `409` session is not active

## 4) End Session

### `POST /attendance/sessions/{sessionId}/end`

Purpose:

- Finalize the session.
- Convert remaining `UNKNOWN` students to `ABSENT`.
- Persist final attendance records.

Success response:

- Same shape as `GET /attendance/sessions/{sessionId}`
- `status = FINALIZED`
- `unknownCount = 0`

Finalization notes:

- QR/FACE marks keep `deviceId`, `markedGpsLat`, and `markedGpsLon`.
- Manual marks keep `markMethod = MANUAL` and GPS fields `null`.
- Students never marked during the session become `ABSENT`.

Common errors:

- `403` caller is not the session owner teacher
- `404` session not found
- `409` session already finalized

## 5) WebSocket Updates

Handshake endpoint:

- `/attendance/ws`

Teacher session topic:

- `/topic/attendance.sessions.{sessionId}`

### Event: `ATTENDANCE_UPDATED`

Payload:

```json
{
  "eventType": "ATTENDANCE_UPDATED",
  "sessionId": 5,
  "studentId": 12,
  "status": "PRESENT",
  "markMethod": "QR_CODE",
  "deviceId": "scanner-entrance-01",
  "markedGpsLat": "34.6820",
  "markedGpsLon": "-1.9091",
  "markedAt": "2026-04-28T12:01:00",
  "presentCount": 11,
  "absentCount": 0,
  "unknownCount": 31
}
```

### Event: `SESSION_FINALIZED`

Payload:

```json
{
  "eventType": "SESSION_FINALIZED",
  "sessionId": 5,
  "status": "FINALIZED",
  "presentCount": 11,
  "absentCount": 31,
  "unknownCount": 0
}
```
