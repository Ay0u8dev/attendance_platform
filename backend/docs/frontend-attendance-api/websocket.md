# WebSocket

Handshake endpoint:

- `/api/ws/attendance/ws`

Protocol:

- STOMP over WebSocket

## CONNECT requirements

- `Authorization: Bearer <jwt>` native header is required on STOMP `CONNECT`
- the backend validates the token through `auth-service /auth/validate`

## Subscription topic

- `/topic/attendance.sessions.{sessionId}`

Subscription rules:

- allowed for the owning teacher of the session
- allowed for admins
- denied for students
- denied for other teachers
- denied for anonymous clients

## Event: `ATTENDANCE_UPDATED`

```json
{
  "eventType": "ATTENDANCE_UPDATED",
  "sessionId": 5,
  "studentId": 12,
  "status": "PRESENT",
  "markMethod": "QR_CODE",
  "markedAt": "2026-04-28T12:01:00",
  "presentCount": 11,
  "absentCount": 0,
  "unknownCount": 31
}
```

## Event: `SESSION_FINALIZED`

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
