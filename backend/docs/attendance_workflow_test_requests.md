# Attendance Workflow E2E Test Requests

This document contains the sequence of requests to test the full attendance workflow.

## Pre-requisites
- Services running: `traefik`, `auth-service`, `user-service`, `attendance-service`, `qr-service`.
- Database seeded (Admin, Teacher, Student1, Student2).
- Tokens obtained from `/api/auth/login` (simulated below).

---

## 1. Authentication
Obtain tokens for each role.

### Teacher Login
```http
POST http://localhost/api/auth/login
Content-Type: application/json

{
    "idToken": "teacher-google-id-token"
}
```
*Note: Use the email `ayoubelebbar03@gmail.com`.*

### Student Login
```http
POST http://localhost/api/auth/login
Content-Type: application/json

{
    "idToken": "student-google-id-token"
}
```
*Note: Use the email `ayoubelebbar15@gmail.com`.*

---

## 2. Teacher: Create Attendance Session
The teacher starts a session for a specific group and course.

```http
POST http://localhost/api/attendance/sessions
Authorization: Bearer {{TEACHER_TOKEN}}
Content-Type: application/json

{
    "groupIds": [1],
    "courseLabel": "Programmation Java",
    "roomLabel": "Amphi A",
    "gpsLat": "34.6894",
    "gpsLon": "-1.9123"
}
```
*Response will contain `sessionId` (e.g., `1`).*

---

## 3. WebSocket Connection (Teacher Dashboard)
Connect to WebSocket to receive real-time updates.

**URL:** `ws://localhost/api/ws/attendance/ws`

**Headers:**
- `Authorization: Bearer {{TEACHER_TOKEN}}`

**Subscribe to:**
- `/topic/attendance.sessions.1` (Replace `1` with the actual `sessionId`)

---

## 4. Teacher: Generate QR Payload
The temporary frontend page at `/attendance/qr-display` does this automatically after you paste a teacher JWT. In Postman, call QR service directly through the gateway.

```http
POST http://localhost/api/qr/teacher/sessions/1/payload
Authorization: Bearer {{TEACHER_TOKEN}}
Content-Type: application/json
```

Expected response contains `payload`, `expiresAt`, and `refreshAfterSeconds = 30`.

---

## 5. Student: Submit QR Scan
Use the fresh payload from step 4 before it expires.
GPS is required and must be close to the coordinates used by the teacher when the session was started.

```http
POST http://localhost/api/qr/student/scan
Authorization: Bearer {{STUDENT_TOKEN}}
Content-Type: application/json

{
    "payload": "{{QR_PAYLOAD}}",
    "deviceId": "face-device-uuid-456",
    "gpsLat": "34.6894",
    "gpsLon": "-1.9123"
}
```
*After this request, the Teacher's WebSocket should receive an `ATTENDANCE_UPDATED` event.*

### 5.b Face Internal Mark Simulation

Face is also a student-phone choice, but the real face service is not implemented here. For service-level testing only, simulate `face-service` calling attendance-service internally.
Face uses the same `deviceId`, GPS presence, and distance validation as QR; the face service only adds face-proof validation before making this internal call.

```http
POST http://localhost:8083/attendance/internal/sessions/1/attendance
X-Request-Source: face-service
Content-Type: application/json

{
    "studentId": 6,
    "method": "FACE_ID",
    "deviceId": "device-uuid-123",
    "gpsLat": "34.6894",
    "gpsLon": "-1.9123"
}
```

Expected result:

- student becomes `PRESENT`
- `markMethod = FACE_ID`
- `deviceId` and GPS are not persisted to finalized records

---

## 6. Teacher: Manual Attendance Update
The teacher manually marks a student as ABSENT or PRESENT.

```http
POST http://localhost/api/attendance/sessions/1/attendance
Authorization: Bearer {{TEACHER_TOKEN}}
Content-Type: application/json

{
    "studentId": 7,
    "status": "ABSENT"
}
```
*Note: Student2 ID is likely `7`.*

---

## 7. Student: Check Status
The student verifies their attendance status for the session.

```http
GET http://localhost/api/attendance/student/sessions/1
Authorization: Bearer {{STUDENT_TOKEN}}
```
*Note: This will return a 404 until the session is finalized (ended).*

To check active session status before finalization:

```http
GET http://localhost/api/attendance/student/sessions/active
Authorization: Bearer {{STUDENT_TOKEN}}
```

---

## 8. Teacher: End Session
Teacher finalizes the session.

```http
POST http://localhost/api/attendance/sessions/1/end
Authorization: Bearer {{TEACHER_TOKEN}}
```
*This will trigger the `AttendanceFinalizationService` to save all records to the DB and broadcast a `SESSION_FINALIZED` event.*

---

## 9. Admin: Overview
Admin checks the global attendance stats.

```http
GET http://localhost/api/attendance/admin/overview
Authorization: Bearer {{ADMIN_TOKEN}}
```
