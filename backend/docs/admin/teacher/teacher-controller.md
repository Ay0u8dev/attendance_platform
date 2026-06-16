# TeacherController API Documentation

## 1. Module Overview

`TeacherController` exposes the main teacher account management API.

It is responsible for:

- Creating teacher accounts.
- Listing teachers.
- Reading one teacher by ID.
- Updating teacher account data.
- Deleting teachers.

Base URL:

```text
/users/teacher
```

Admin-only operations use `@RequireRole({"ADMIN"})`.

---

## 2. Backend Flow

```text
Angular UI
  |
  v
TeacherController
  |
  v
TeacherService
  |
  v
TeacherRepository / UserRepository
  |
  v
Database
```

At controller level, Spring receives JSON requests and validates `TeacherRequestDTO` with `@Valid`.

At service level, the backend:

- Normalizes email.
- Validates email domain.
- Assigns teacher defaults.
- Detects duplicate email.
- Maps teacher entities to response DTOs.

---

## 3. API Endpoints

| Method | URL | Role | Description |
| --- | --- | --- | --- |
| `POST` | `/users/teacher` | `ADMIN` | Create a teacher |
| `GET` | `/users/teacher` | `ADMIN` | Get all teachers |
| `GET` | `/users/teacher/{id}` | Not annotated | Get teacher by ID |
| `PUT` | `/users/teacher/{id}` | `ADMIN` | Update teacher |
| `DELETE` | `/users/teacher/{id}` | `ADMIN` | Delete teacher |

### Create Teacher

| Item | Value |
| --- | --- |
| Method | `POST` |
| URL | `/users/teacher` |
| Request body | `TeacherRequestDTO` |
| Response body | `TeacherResponseDTO` |
| Success status | `201 Created` |

Example request:

```json
{
  "email": "teacher@ump.ac.ma",
  "firstName": "Ahmed",
  "lastName": "El Amrani",
  "pfpUrl": "https://cdn.example.com/teachers/ahmed.png"
}
```

Frontend notes:

- Email is trimmed and lowercased.
- The backend automatically assigns role `TEACHER`.
- The backend sets `enabled = true` and `firstLogin = true`.

### Get All Teachers

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/teacher` |
| Role | `ADMIN` |
| Response body | Array of `TeacherResponseDTO` |
| Success status | `200 OK` |

### Get Teacher By ID

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/teacher/{id}` |
| Response body | `TeacherResponseDTO` |
| Success status | `200 OK` |

### Update Teacher

| Item | Value |
| --- | --- |
| Method | `PUT` |
| URL | `/users/teacher/{id}` |
| Role | `ADMIN` |
| Request body | `TeacherRequestDTO` |
| Response body | `TeacherResponseDTO` |
| Success status | `200 OK` |

Frontend notes:

- Send the full teacher DTO, not only changed fields.
- Email is normalized before saving.
- Duplicate email returns a conflict error.

### Delete Teacher

| Item | Value |
| --- | --- |
| Method | `DELETE` |
| URL | `/users/teacher/{id}` |
| Role | `ADMIN` |
| Response body | Empty |
| Success status | `204 No Content` |

---

## 4. Request DTOs

### TeacherRequestDTO

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `email` | string | yes | Valid email, max 254 chars, must use configured allowed domain | `teacher@ump.ac.ma` |
| `firstName` | string | yes | Not blank, max 100 chars | `Ahmed` |
| `lastName` | string | yes | Not blank, max 100 chars | `El Amrani` |
| `pfpUrl` | string | no | Valid URL if provided, max 512 chars | `https://cdn.example.com/teachers/ahmed.png` |

---

## 5. Response DTOs

### TeacherResponseDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `id` | number | Teacher user ID | `7` |
| `email` | string | Normalized email | `teacher@ump.ac.ma` |
| `firstName` | string | First name | `Ahmed` |
| `lastName` | string | Last name | `El Amrani` |
| `pfpUrl` | string/null | Profile picture URL | `https://cdn.example.com/teachers/ahmed.png` |
| `roles` | string array | User roles | `["TEACHER"]` |
| `enabled` | boolean | Account enabled status | `true` |
| `firstLogin` | boolean | Whether first-login flow is pending | `true` |
| `createdAt` | string | Creation timestamp | `2026-06-16T10:15:30` |
| `updatedAt` | string | Last update timestamp | `2026-06-16T11:20:00` |

---

## 6. Business Rules

- Email is trimmed and lowercased.
- Email must belong to configured `app.allowed-domain`.
- Email must be unique across users.
- Created teachers receive role `TEACHER`.
- Created teachers are enabled by default.
- Created teachers have `firstLogin = true`.
- Updating a teacher can trigger duplicate email validation.
- Deleting a teacher removes the teacher entity if no database constraints prevent it.

---

## 7. Validation Rules

| Field | Rule |
| --- | --- |
| `email` | Required, valid email, max 254 chars, allowed domain |
| `firstName` | Required, max 100 chars |
| `lastName` | Required, max 100 chars |
| `pfpUrl` | Optional, valid URL, max 512 chars |

---

## 8. Error Handling

Error body shape:

```json
{
  "status": 409,
  "message": "Email already exists",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/teacher"
}
```

| Status | When | Message | Frontend handling |
| --- | --- | --- | --- |
| `400` | Validation fails | `email: Email must be valid` | Show field validation |
| `400` | Invalid email domain | `Email must be in the @ump.ac.ma domain` | Ask for institutional email |
| `404` | Teacher does not exist | `Teacher not found` | Show not-found state |
| `409` | Email duplicate | `Email already exists` | Mark email as duplicate |
| `500` | Delete blocked or unexpected runtime error | `Une erreur serveur inattendue s'est produite` | Show generic error |

---

## 11. Example Responses

### Create Teacher Success

```json
{
  "id": 7,
  "email": "teacher@ump.ac.ma",
  "firstName": "Ahmed",
  "lastName": "El Amrani",
  "pfpUrl": "https://cdn.example.com/teachers/ahmed.png",
  "roles": ["TEACHER"],
  "enabled": true,
  "firstLogin": true,
  "createdAt": "2026-06-16T10:15:30",
  "updatedAt": "2026-06-16T10:15:30"
}
```

### Duplicate Email Error

```json
{
  "status": 409,
  "message": "Email already exists",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/teacher"
}
```

---

## 12. Edge Cases

- Email comparison is effectively case-insensitive because emails are normalized.
- Duplicate email can conflict with any user type, not only teachers.
- Delete can fail if the teacher is referenced by assignments or other database relationships.
- `GET /users/teacher/{id}` is not annotated with `@RequireRole`; global security may still restrict it.
- The controller path is `/users/teacher`, while teacher import uses `/api/teachers/import`.
