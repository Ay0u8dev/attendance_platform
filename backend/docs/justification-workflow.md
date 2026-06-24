# Canonical Justification Workflow

## Ownership

`justification-service` is the only service that owns justification lifecycle data.
It persists one `justifications` table and one status enum:

- `PENDING`
- `APPROVED`
- `REJECTED`

`attendance-service` remains the owner of attendance sessions and records. It
exposes trusted internal endpoints so `justification-service` can resolve the
exact absence and mark an approved absence as `JUSTIFIED`.

The previous `attendance_justifications` table is migrated on startup. Rows are
copied with `(session_id, student_id)` deduplication, verified, and the legacy
table is removed only when every distinct legacy absence has a canonical row.

## Browser API

All browser requests continue through the gateway:

- `GET /api/justifications/admin?status=PENDING`
- `GET /api/justifications/teacher?status=PENDING`
- `GET /api/justifications/student?status=PENDING`
- `GET /api/justifications/{id}`
- `POST /api/justifications/student`
- `PATCH /api/justifications/{id}/decision`

The decision request contains only:

```json
{
  "status": "APPROVED",
  "comment": "Optional decision comment"
}
```

Reviewer identity and role are read from the trusted ForwardAuth headers. They
must never be accepted from the browser request body.

## Authorization

- Admin users can list and decide every justification.
- Teachers can list and decide only justifications whose attendance session is
  owned by that teacher.
- Students can list their own justifications and submit against their own
  absent attendance record.

The backend enforces these rules even when a caller sends requests outside the
frontend.

## Decision Rules

Only a `PENDING` justification can be decided.

Approval:

1. Lock the justification row for the decision.
2. Resolve and validate the related attendance record and session owner.
3. Store `APPROVED`, reviewer id, reviewer role, comment, and decision time.
4. Call the trusted attendance endpoint.
5. Change the related attendance record from `ABSENT` to `JUSTIFIED`.
6. Recalculate persisted session counts.

Rejection:

1. Lock the justification row for the decision.
2. Store `REJECTED` and the audit metadata.
3. Leave the attendance record as `ABSENT`.

Approved or rejected rows cannot be processed a second time. Attendance
justification is idempotent if the record is already `JUSTIFIED`.

## Internal Attendance API

These routes are service-to-service routes and therefore do not contain the
gateway `/api` prefix:

- `GET /attendance/internal/sessions/{sessionId}/students/{studentId}/justification-context`
- `PATCH /attendance/internal/sessions/{sessionId}/students/{studentId}/justify`

They require `X-Request-Source: justification-service`.

## Frontend Integration

Admin and Teacher pages share:

- `core/justifications/justification.model.ts`
- `core/justifications/justification.service.ts`

The former Admin-only model and service were removed. Both dashboards now read
pending counts from the canonical role-scoped API.
