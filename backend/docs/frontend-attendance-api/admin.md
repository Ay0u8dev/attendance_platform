# Admin API

Base path:

- `/api/attendance/admin`

## `GET /api/attendance/admin/sessions`

Purpose:

- Return paged session history across the whole platform.

Query params:

- `teacherId` optional
- `groupId` optional
- `status` optional
- `dateFrom` optional ISO date
- `dateTo` optional ISO date
- `page` optional, default `0`
- `size` optional, default `20`
- `sort` optional

Success response:

```json
{
  "items": [
    {
      "sessionId": 5,
      "teacherFullName": "Ayoub Elebbar",
      "courseLabel": "Distributed Systems",
      "roomLabel": "Room B12",
      "groupIds": [1, 2],
      "status": "FINALIZED",
      "startedAt": "2026-04-28T12:00:00",
      "endedAt": "2026-04-28T12:30:00",
      "presentCount": 32,
      "absentCount": 10,
      "unknownCount": 0
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

Common errors:

- `403` caller is not an admin

## `GET /api/attendance/admin/sessions/{sessionId}`

Purpose:

- Return full session detail for any session.

Success response:

- Same shape as teacher `GET /api/attendance/sessions/{sessionId}`

Common errors:

- `403` caller is not an admin
- `404` session not found

## `GET /api/attendance/admin/overview`

Purpose:

- Return aggregate attendance dashboard metrics for a date range.

Query params:

- `dateFrom` optional ISO date-time
- `dateTo` optional ISO date-time

Success response:

```json
{
  "totalSessions": 120,
  "activeSessions": 3,
  "finalizedSessions": 117,
  "totalPresentMarks": 3800,
  "totalAbsentMarks": 640,
  "attendanceRate": 85.59
}
```

Common errors:

- `403` caller is not an admin
