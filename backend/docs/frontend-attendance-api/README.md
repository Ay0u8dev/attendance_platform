# Frontend Attendance API

These docs describe the frontend-facing attendance API as exposed through the **Traefik API gateway**, not direct service-local URLs.

Base HTTP path:

- `/api/attendance`

WebSocket handshake path:

- `/api/ws/attendance/ws`

The frontend must not call internal service routes such as `/attendance/internal/**`.

QR student self-marking is exposed through `/api/qr/**`; QR service validates the QR proof and then calls attendance-service internally.

## Docs by role

- [Common](./common.md)
- [Teacher API](./teacher.md)
- [Admin API](./admin.md)
- [Student API](./student.md)
- [WebSocket](./websocket.md)

## Important integration rule

All frontend HTTP calls go through Traefik:

- correct: `/api/attendance/sessions`
- wrong: `/attendance/sessions`

The same applies to WebSocket handshake:

- correct: `/api/ws/attendance/ws`
- wrong: `/attendance/ws`
