# Attendance Workflow E2E Test Requests

This document contains the sequence of requests to test the full attendance workflow.

## Pre-requisites
- Services running: `traefik`, `auth-service`, `user-service`, `attendance-service`.
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
    "method": "QR_CODE",
    "gpsLat": "34.6894",
    "gpsLon": "-1.9123"
}
```
*Response will contain `id` (e.g., `1`).*

For `FACE_ID`, use `"method": "FACE_ID"` and keep the same session creation payload. The teacher device becomes the scanner, and later marks come from `face-service`.

---

## 3. WebSocket Connection (Teacher Dashboard)
Connect to WebSocket to receive real-time updates.

**URL:** `ws://localhost/attendance/ws` (or `http://localhost/attendance/ws` if using SockJS)

**Headers:**
- `Authorization: Bearer {{TEACHER_TOKEN}}`

**Subscribe to:**
- `/topic/attendance.sessions.1` (Replace `1` with the actual `sessionId`)

---

## 4. Student: Simulate QR Scan (Internal API)
Since Postman can't scan a QR code, we simulate the `qr-service` calling the `attendance-service` internal endpoint.

```http
POST http://localhost/api/attendance/internal/sessions/1/attendance
X-Request-Source: qr-service
Content-Type: application/json

{
    "studentId": 6,
    "method": "QR_CODE",
    "deviceId": "device-uuid-123",
    "gpsLat": "34.6894",
    "gpsLon": "-1.9123"
}
```
*Note: Student1 ID is likely `6` based on the seeder order. Verify in `user-db`.*
*After this request, the Teacher's WebSocket should receive an `ATTENDANCE_UPDATED` event.*

### 4.b Face Session Internal Mark Simulation

`FACE_ID` is teacher-operated now. The teacher web client talks to `face-service`, then `face-service` calls `attendance-service` after a successful face match.

```http
POST http://localhost/api/attendance/internal/sessions/1/attendance
X-Request-Source: face-service
Content-Type: application/json

{
    "studentId": 6,
    "method": "FACE_ID",
    "deviceId": null,
    "gpsLat": null,
    "gpsLon": null
}
```

Expected result:

- student becomes `PRESENT`
- `markMethod = FACE_ID`
- `deviceId`, `markedGpsLat`, and `markedGpsLon` stay `null`
- QR device-binding rules do not apply

---

## 5. Teacher: Manual Attendance Update
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

## 6. Student: Check Status
The student verifies their attendance status for the session.

```http
GET http://localhost/api/attendance/student/sessions/1
Authorization: Bearer {{STUDENT_TOKEN}}
```
*Note: This will return a 404 until the session is finalized (ended).*

To check active session records (not yet finalized) if implemented, but currently the `AttendanceStudentController` only returns records for finalized sessions.

---

## 7. Teacher: End Session
Teacher finalizes the session.

```http
POST http://localhost/api/attendance/sessions/1/end
Authorization: Bearer {{TEACHER_TOKEN}}
```
*This will trigger the `AttendanceFinalizationService` to save all records to the DB and broadcast a `SESSION_FINALIZED` event.*

---

## 8. Admin: Overview
Admin checks the global attendance stats.

```http
GET http://localhost/api/attendance/admin/overview
Authorization: Bearer {{ADMIN_TOKEN}}
```
