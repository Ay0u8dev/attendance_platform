# Student API

Base path:

- `/api/attendance/student`

Student routes expose only the authenticated student's own finalized records.

## `GET /api/attendance/student/sessions`

Purpose:

- Return the authenticated student's finalized attendance history.

Query params:

- `status` optional
- `dateFrom` optional ISO date-time
- `dateTo` optional ISO date-time
- `page` optional, default `0`
- `size` optional, default `20`
- `sort` optional

Success response:

```json
{
  "content": [
    {
      "sessionId": 5,
      "courseLabel": "Distributed Systems",
      "roomLabel": "Room B12",
      "groupId": 1,
      "method": "QR_CODE",
      "status": "PRESENT",
      "startedAt": "2026-04-28T12:00:00",
      "endedAt": "2026-04-28T12:30:00",
      "markedAt": "2026-04-28T12:01:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "last": true
}
```

Common errors:

- `403` caller is not a student

## `GET /api/attendance/student/sessions/{sessionId}`

Purpose:

- Return only the authenticated student's own attendance record for one finalized session.

Success response:

```json
{
  "sessionId": 5,
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "groupId": 1,
  "method": "QR_CODE",
  "status": "PRESENT",
  "startedAt": "2026-04-28T12:00:00",
  "endedAt": "2026-04-28T12:30:00",
  "markedAt": "2026-04-28T12:01:00",
  "markMethod": "QR_CODE",
  "deviceId": "scanner-entrance-01",
  "markedGpsLat": "34.6820",
  "markedGpsLon": "-1.9091"
}
```

Common errors:

- `403` caller is not a student
- `404` session record not found for this student

## `GET /api/attendance/student/overview`

Purpose:

- Return the authenticated student's attendance totals.

Success response:

```json
{
  "totalSessions": 24,
  "presentCount": 20,
  "absentCount": 4,
  "attendanceRate": 83.33
}
```

Common errors:

- `403` caller is not a student
