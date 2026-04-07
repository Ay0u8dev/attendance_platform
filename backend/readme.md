# Attendance Platform — Microservices Architecture

Intelligent attendance management platform for ENIAD (École Nationale de l'Informatique et de l'Analyse des Données),
built on a microservices architecture with Spring Boot, FastAPI, Angular, and Flutter.

---

## Table of Contents

- [Overview](#overview)
- [Services](#services)
  - [auth-service](#auth-service)
  - [user-service](#user-service)
  - [session-service](#session-service)
  - [attendance-service](#attendance-service)
  - [qr-service](#qr-service)
  - [face-service](#face-service)
  - [justification-service](#justification-service)
  - [notification-service](#notification-service)
- [Infrastructure](#infrastructure)
  - [Traefik](#traefik)
  - [Redis](#redis)
  - [RabbitMQ](#rabbitmq)
- [Redis Key Ownership](#redis-key-ownership)
- [Inter-Service Communication](#inter-service-communication)
- [Tech Stack](#tech-stack)

---

## Overview

```
Clients (Angular / Flutter)
        │
        ▼
   Traefik :80          ← single entry point, JWT validation via ForwardAuth
        │
   ┌────┴───────────────┐──────────────────────────┐───────────────────────────┐───────────────────────────────┐
   │                    │                          │                           │                               │
auth-service     user-service               session-service             attendance-service          notification-service
                                                   │                                                 (RabbitMQ consumer)
                                                   │
                                    ┌──────────────┼
                                    │              │
                              qr-service    face-service

```

All external traffic goes through **Traefik**. Internal service-to-service calls go **directly by container name**,
bypassing the gateway.

---

## Services

---

### `auth-service`

**Technology:** Spring Boot  
**Port:** 8081  
**Database:** `users_db` (shared read with user-service)

#### Role

The only service that handles authentication and token management. Responsible for the Google SSO flow and JWT issuance.
Also exposes the `/validate` endpoint that Traefik calls via ForwardAuth before forwarding any protected request.

#### Responsibilities

- Handle Google OAuth2 callback — exchange code for user info
- Reject emails that are not `@ump.ac.ma`
- Generate signed JWTs containing `user_id`, `email`, and `role`
- Expose `GET /auth/validate` for Traefik ForwardAuth
  - Returns `200` + `X-User-Id`, `X-User-Role`, `X-User-Email` headers on valid token
  - Returns `401` on invalid or expired token

#### What it does NOT do

- User CRUD (that belongs to user-service)
- Store any session state
- Send emails or notifications

#### Key endpoints

```
POST /auth/google/callback     → exchange OAuth2 code, return JWT
GET  /auth/validate            → called by Traefik ForwardAuth only
```

---

### `user-service`

**Technology:** Spring Boot  
**Port:** 8082  
**Database:** `users_db`

#### Role

Single source of truth for all users (students, teachers, admins) and the entire pedagogical structure of ENIAD. Any
service that needs to know who a student is, which group they belong to, or which modules a teacher is assigned to —
calls this service.

#### Responsibilities

**User management (Admin)**

- CRUD for students, teachers, and admin accounts
- Bulk import of students via Excel (.xlsx) with per-row validation report
- Suspend/reactivate accounts without deleting them
- Manage student enrollment status

**Academic structure (Admin)**

- CRUD for cycles (CP1, CP2, CI1, CI2, CI3), filières (GI, IRSI, ROC, AI), groups, and modules
- Assign modules to teachers per semester
- Allow teachers to self-assign to available groups/modules
- Archive previous academic year and activate a new one
- Block deletion of entities that have existing attendance data

**Queried by other services**

- `GET /users/groups/{group_id}/students` — used by session-service and attendance-service to get the student list when
  a session starts
- `GET /users/teachers/{teacher_id}/assignments` — used by session-service to verify a teacher has the right to start a
  session for a given group/module

#### Key endpoints

```
GET    /users/students                          → paginated student list
POST   /users/students                          → create student
PUT    /users/students/{id}                     → update student
PATCH  /users/students/{id}/suspend             → suspend account
POST   /users/students/import                   → bulk Excel import
GET    /users/groups/{group_id}/students        → students in a group
GET    /users/teachers/{id}/assignments         → teacher's current assignments
GET    /academic/structure                      → full pedagogical tree
POST   /academic/modules                        → create module
PUT    /academic/teachers/{id}/assign           → assign module to teacher
```

---

### `session-service`

**Technology:** Spring Boot  
**Port:** 8083  
**Database:** `attendance_db/sessions`  
**Redis keys:** `session:active:{group_id}:{module_id}`, `session:{session_id}`

#### Role

Manages the full lifecycle of a presence session — from when the teacher starts it to when it closes. Coordinates the
other services when a session begins and flushes the final attendance state to the database when it ends.

#### Responsibilities

- Validate that the teacher is assigned to the requested group/module (calls user-service)
- Block duplicate sessions — one active session per group/module combination at a time (checked via Redis)
- Create the session record and write session data to Redis (group, module, method, GPS reference, timestamp)
- Initialize the student list in Redis with default status ABSENT for all students in the group
- Expose a WebSocket endpoint for real-time updates to the teacher's dashboard
- Handle session closure — manual by teacher or automatic after 30 minutes of inactivity
- On session close: wait until the attendance service saves the attendance records, then flush the full attendance state
  from Redis to the attendance DB, then clear Redis keys

#### Redis writes

```
SET session:active:{group_id}:{module_id}  →  session_id            TTL: 30min
SET session:{session_id}                   →  { teacher_id, group_id,
                                               module_id, method,
                                               gps_lat, gps_lng,
                                               status: ACTIVE }      TTL: 30min
SET session:{session_id}:students          →  { student_id: ABSENT,
                                               student_id: ABSENT,
                                               ... }                 TTL: 30min
```

#### Key endpoints

```
POST /sessions/start               → start a new session
GET  /sessions/{id}                → session details
POST /sessions/{id}/close          → manually close session
GET  /sessions/{id}/live           → WebSocket for real-time dashboard
GET  /sessions/history             → past sessions (teacher view)
```

---

### `attendance-service`

**Technology:** Spring Boot  
**Port:** 8084  
**Database:** `attendance_db/attendances`  
**Redis reads:** `session:{session_id}:students`

#### Role

Receives mark-present requests from qr-service and face-service, prevents double-marking, and updates student status in
Redis during the session. Also handles manual corrections by teachers after a session ends.

#### Responsibilities

- Receive `mark present` requests from qr-service and face-service
- Check in Redis whether the student is already marked present (prevent double-marking)
- Update the student's status in Redis to PRESENT
- Persist the final attendance records to the DB when called by session-service at session close
- Support manual attendance marking (teacher marks individually or uses "all present")
- Handle a posteriori corrections
- Compute absence counts per student per module
- Publish threshold events to RabbitMQ when a student hits 2 or 3 absences in a module

#### Redis reads/writes

```
# Called by qr-service or face-service
GET  session:{session_id}:students → check student current status
SET  session:{session_id}:students → update student to PRESENT
```

#### Key endpoints

```
POST /attendance/{session_id}/mark              → mark a student present
GET  /attendance/students/{id}/absences         → absence history for a student
GET  /attendance/modules/{id}/records           → attendance records for a module
PATCH /attendance/records/{id}/correct          → a posteriori correction
GET  /attendance/students/{id}/count/{module}   → absence count for threshold check
```

---

### `justification-service`

**Technology:** Spring Boot  
**Port:** 8085  
**Database:** `attendance_db/justifications`

#### Role

Owns the full justification workflow. Students submit justifications for absences, teachers and admins review them.
Publishes events to RabbitMQ to trigger notifications at each step.

#### Responsibilities

- Accept justification submissions from students (PDF or image attachment, max 5MB)
- Enforce the 7-day submission deadline after the absence date
- Allow only one active justification per absence — resubmission allowed only if rejected
- Allow teachers and admins to approve or reject with a mandatory comment on rejection
- On approval: notify attendance-service to update absence status to JUSTIFIED (absence still counts in the total)
- Publish events to RabbitMQ:
  - `justification.submitted` → notify teacher and admin
  - `justification.approved` → notify student
  - `justification.rejected` → notify student with rejection comment

#### Key endpoints

```
POST   /justifications                      → student submits justification
GET    /justifications                      → list (filtered by role)
GET    /justifications/{id}                 → detail with attachment
PATCH  /justifications/{id}/approve         → teacher/admin approves
PATCH  /justifications/{id}/reject          → teacher/admin rejects with comment
POST   /justifications/{id}/resubmit        → student resubmits after rejection
```

---

### `qr-service`

**Technology:** FastAPI (Python)  
**Port:** 5001
**Redis keys:** `qr:{session_id}`  
**Redis reads:** `session:{session_id}`

#### Role

Owns all QR code logic. Generates a signed QR token when a session starts and validates that token when a student scans.
After validation it calls attendance-service to mark the student present.

#### Responsibilities

- Generate a signed JWT token encoding `session_id`, `gps_ref`, `expires_at`
- Store the token in Redis under `qr:{session_id}`
- On student scan, validate in order:
  1. Token signature and expiry
  2. Session still ACTIVE (reads `session:{session_id}` from Redis)
  3. Student GPS within allowed radius of the session GPS reference
  4. Device (MAC address) not already used for a different student in this session
  5. Student not already marked present
- Call attendance-service to mark the student present after all checks pass
- Handle offline scan validation: verify the scan timestamp was within the session window even if the session is now
  closed

#### Redis reads/writes

```
SET qr:{session_id}  →  { token, expires_at }    TTL: session duration
GET qr:{session_id}  →  validate token on scan
GET session:{session_id}  →  check session active, read GPS reference
```

#### Key endpoints

```
POST /qr/generate     → called by session-service at session start
POST /qr/validate     → called by student app on QR scan
```

---

### `face-service`

**Technology:** FastAPI (Python)  
**Port:** 5002
**Redis keys:** `embeddings:{group_id}`  
**Redis reads:** `session:{session_id}`

#### Role

Handles everything related to facial recognition. Stores face embeddings during enrollment and performs recognition
during sessions. Uses Redis to cache group embeddings so that simultaneous student scans do not cause repeated DB hits.

#### Responsibilities

**Enrollment (Admin)**

- Accept a student photo from admin
- Extract a 128-dimension face embedding using `face_recognition`
- Store the embedding as BYTEA in the embeddings DB
- Invalidate the Redis cache for the affected group so the next session loads fresh data

**Recognition (Student self-scan)**

- Preload group embeddings into Redis when a face session starts (called by session-service)
- On student scan, validate in order:
  1. Session is ACTIVE (reads `session:{session_id}` from Redis)
  2. Student GPS within allowed radius
  3. Device not already used for a different student in this session
  4. Run `face_recognition.compare_faces` against cached group embeddings
  5. Verify the matched student ID equals the `X-User-Id` from the JWT (anti-spoofing)
- Call attendance-service to mark the student present after all checks pass

#### Redis reads/writes

```
SET embeddings:{group_id}  →  [ { student_id, embedding[] }, ... ]   TTL: 24h
GET embeddings:{group_id}  →  read on every recognition request
GET session:{session_id}   →  check session active, read GPS reference
DEL embeddings:{group_id}  →  called after enrollment to invalidate cache
```

#### Key endpoints

```
POST /face/enroll           → admin uploads student photo
POST /face/preload          → called by session-service at session start
POST /face/recognize        → called by student app for self-scan
```

---

### `notification-service`

**Technology:** Spring Boot  
**Port:** 9000  
**Database:** none — purely event-driven

#### Role

Consumes events from RabbitMQ and dispatches notifications to the right people through the right channels. No other
service calls this directly — it operates entirely off the message queue.

#### Responsibilities

- Consume RabbitMQ events and send the appropriate notification
- Support three notification channels: email, push notification (mobile), in-app notification (web)
- Query user-service for contact details (email, push token) when needed

#### Events consumed and actions taken

| Event                               | Recipient                 | Channel               |
| ----------------------------------- | ------------------------- | --------------------- |
| `attendance.absent`                 | Student                   | Email + Push          |
| `attendance.warning` (2 absences)   | Student                   | Email + Push (urgent) |
| `attendance.critical` (3+ absences) | Student + Teacher + Admin | Email + Push + In-app |
| `justification.submitted`           | Teacher + Admin           | In-app                |
| `justification.approved`            | Student                   | Email + Push          |
| `justification.rejected`            | Student                   | Email + Push          |
| `session.started` (face method)     | Students in group         | Push                  |
| `qr.sync.success` (offline sync)    | Student                   | Push                  |
| `qr.rejected.gps`                   | Student                   | In-app                |
| `qr.rejected.device`                | Student                   | In-app                |
| `face.rejected.gps`                 | Student                   | In-app                |
| `face.rejected.identity`            | Student                   | In-app                |

---

## Infrastructure

### Traefik

**Version:** v3.0  
**Ports:** 80 (traffic), 8080 (dashboard)

API gateway and reverse proxy. All external traffic enters through port 80. Traefik routes requests to the correct
service based on URL prefix and validates JWT tokens via **ForwardAuth** before forwarding any protected request.

ForwardAuth flow: before forwarding a request to any protected service, Traefik calls `GET auth-service/auth/validate`.
If the response is 200, the request is forwarded with `X-User-Id`, `X-User-Role`, and `X-User-Email` headers injected.
If 401, the request is blocked.

The `/api/auth` routes are explicitly excluded from ForwardAuth — they are the login endpoints and the user has no token
yet.

**Route prefix mapping:**

```
/api/auth/*            → auth-service:8081          (no ForwardAuth)
/api/users/*           → user-service:8082
/api/sessions/*        → session-service:8083
/api/attendance/*      → attendance-service:8084
/api/justifications/*  → justification-service:8085
/api/qr/*              → qr-service:5001
/api/face/*            → face-service:5002
/*                     → frontend:4200
```

---

### Redis

**Used as:** shared cache and coordination layer — not a database. All source-of-truth data lives in PostgreSQL.

Redis stores temporary state that needs to be fast and auto-expiring. Each key prefix is owned by exactly one service (
the writer). Other services may read but never write to another service's prefix.

Full key ownership table: see [Redis Key Ownership](#redis-key-ownership) below.

---

### RabbitMQ

**Used as:** async event bus between services.

Services publish events when something happens. notification-service consumes those events and dispatches notifications.
No service calls notification-service directly — this keeps them fully decoupled.

attendance-service also publishes threshold events that could in the future be consumed by a reporting-service or any
other interested consumer without changing the publisher.

---

## Redis Key Ownership

| Key pattern                             | TTL    | Written by                          | Read by                                      |
| --------------------------------------- | ------ | ----------------------------------- | -------------------------------------------- |
| `session:active:{group_id}:{module_id}` | 30 min | session-service                     | session-service                              |
| `session:{session_id}`                  | 30 min | session-service                     | qr-service, face-service, attendance-service |
| `session:{session_id}:students`         | 30 min | session-service, attendance-service | attendance-service, session-service          |
| `qr:{session_id}`                       | 30 min | qr-service                          | qr-service                                   |
| `embeddings:{group_id}`                 | 24 h   | face-service                        | face-service                                 |

---

## Inter-Service Communication

### External traffic (client → backend)

Always goes through Traefik on port 80. JWT is validated by ForwardAuth on every request.

### Internal traffic (service → service)

Goes directly by Docker container name, bypassing Traefik entirely. No ForwardAuth, no JWT — internal calls are trusted
within the private Docker network.

```
# Example: session-service calling user-service internally
http://user-service:8082/users/groups/{group_id}/students

# NOT via Traefik
# NOT http://localhost/api/users/groups/{group_id}/students
```
