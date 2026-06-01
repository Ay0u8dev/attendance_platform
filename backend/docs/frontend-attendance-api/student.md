# Student API

Base path:

- `/api/attendance/student`

Student routes expose only the authenticated student's own finalized records.

## `GET /api/attendance/student/sessions`

Purpose:

- Return the authenticated student's finalized attendance history.

Query params:

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
      "groupIds": [1],
      "sessionStatus": "FINALIZED",
      "startedAt": "2026-04-28T12:00:00",
      "endedAt": "2026-04-28T12:30:00",
      "attendanceStatus": "PRESENT",
      "markMethod": "QR_CODE",
      "markedAt": "2026-04-28T12:01:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
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
  "teacherFullName": "Ayoub Elebbar",
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "groupIds": [1],
  "sessionStatus": "FINALIZED",
  "startedAt": "2026-04-28T12:00:00",
  "endsAt": "2026-04-28T12:30:00",
  "endedAt": "2026-04-28T12:30:00",
  "studentId": 12,
  "groupId": 1,
  "firstName": "Aya",
  "lastName": "Bennani",
  "email": "aya.bennani@ump.ac.ma",
  "pfpUrl": "https://cdn.example.com/profiles/12.jpg",
  "numApogee": "22012345",
  "attendanceStatus": "PRESENT",
  "markMethod": "QR_CODE",
  "markedAt": "2026-04-28T12:01:00"
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
  "presents": 20,
  "absences": 4,
  "attendanceRate": 83.33
}
```

Common errors:

- `403` caller is not a student
