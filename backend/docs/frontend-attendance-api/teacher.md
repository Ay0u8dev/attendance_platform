# Teacher API

Base path:

- `/api/attendance`

## `POST /api/attendance/sessions`

Purpose:

- Start one active attendance session for the current teacher.
- Initialize the live roster in Redis.
- The session is method-neutral; students can self-mark by QR or face, and teachers can manually override rows.

Request body:

```json
{
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086"
}
```

Success response:

```json
{
  "sessionId": 5,
  "teacherId": 77,
  "teacherFullName": "Ayoub Elebbar",
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086",
  "startedAt": "2026-04-28T12:00:00",
  "endsAt": "2026-04-28T12:30:00",
  "status": "ACTIVE",
  "studentCount": 42
}
```

Common errors:

- `400` invalid payload
- `403` caller is not a teacher
- `409` teacher already has an active session

## `GET /api/attendance/sessions/{sessionId}`

Purpose:

- Hydrate the teacher session screen after refresh or reconnect.
- Return live state while active.
- Return persisted final state after finalization.

Success response:

```json
{
  "sessionId": 5,
  "teacherId": 77,
  "teacherFullName": "Ayoub Elebbar",
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086",
  "startedAt": "2026-04-28T12:00:00",
  "endsAt": "2026-04-28T12:30:00",
  "endedAt": null,
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
      "pfpUrl": "https://cdn.example.com/profiles/12.jpg",
      "numApogee": "22012345",
      "status": "PRESENT",
      "markMethod": "QR_CODE",
      "markedAt": "2026-04-28T12:01:00"
    }
  ]
}
```

Nullable student fields:

- `markMethod`
- `markedAt`

Active vs finalized behavior:

- `ACTIVE`: backed by Redis live state
- `FINALIZED`: backed by persisted DB state

Common errors:

- `403` caller is not the owning teacher
- `404` session not found

## `GET /api/attendance/sessions`

Purpose:

- Return the current teacher's session history.

Query params:

- `status` optional
- `dateFrom` optional ISO date
- `dateTo` optional ISO date
- `page` optional, default `0`
- `size` optional, default `20`
- `sort` optional, Spring format like `startedAt,desc`

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

## `GET /api/attendance/sessions/active`

Purpose:

- Return the current teacher's active session.

Success response:

- Same shape as `GET /api/attendance/sessions/{sessionId}`

Common errors:

- `403` caller is not a teacher
- `404` no active session exists

## `POST /api/attendance/sessions/{sessionId}/attendance`

Purpose:

- Let the teacher manually set a student to `PRESENT` or `ABSENT`.

Request body:

```json
{
  "studentId": 12,
  "status": "ABSENT"
}
```

Success response:

```json
{
  "sessionId": 5,
  "studentId": 12,
  "status": "ABSENT",
  "markMethod": "MANUAL",
  "markedAt": "2026-04-28T12:05:00",
  "presentCount": 10,
  "absentCount": 1,
  "unknownCount": 31
}
```

Rules:

- manual updates are allowed for every active session
- teacher manual updates are the correction path after student self-marking
- QR/face validation data such as `deviceId` and GPS is transient and is not persisted or returned

Common errors:

- `400` invalid payload
- `403` caller is not the session owner teacher
- `404` session or student not found
- `409` session is not active

## `POST /api/attendance/sessions/{sessionId}/end`

Purpose:

- Finalize the session.
- Convert remaining `UNKNOWN` students to `ABSENT`.
- Persist final attendance records.

Success response:

- Same shape as `GET /api/attendance/sessions/{sessionId}`
- `status = FINALIZED`
- `unknownCount = 0`

Common errors:

- `403` caller is not the session owner teacher
- `404` session not found
- `409` session already finalized

## Student self-mark flow notes

- QR and face are student-phone flows in a method-neutral active session.
- `qr-service` and `face-service` validate method-specific proof, then call `attendance-service` internally.
- Attendance-service is the final authority for roster membership, active session state, and device uniqueness.
