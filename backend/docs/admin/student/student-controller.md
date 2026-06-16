# StudentController API Documentation

## 1. Module Overview

`StudentController` exposes the main student account management API.

It is responsible for:

- Creating student accounts.
- Listing students.
- Reading a student by ID.
- Updating student account data.
- Deleting students.
- Returning the authenticated student's profile.

Base URL:

```text
/users/student
```

Admin-only operations use `@RequireRole({"ADMIN"})`. The profile endpoint uses `@RequireRole({"STUDENT"})`.

---

## 2. Backend Flow

```text
Angular UI
  |
  v
StudentController
  |
  v
StudentService
  |
  v
StudentRepository / UserRepository / InscriptionRepository
  |
  v
Database
```

At controller level, Spring receives the HTTP request and validates request DTOs with `@Valid`.

At service level, the backend:

- Normalizes email and Apogee number.
- Validates email domain.
- Assigns student defaults.
- Detects duplicate email or duplicate Apogee number.
- Maps entities to response DTOs.

For `/profile`, the service reads the authenticated user from `UserContext`, loads the student, then optionally enriches the response with active enrollment details.

---

## 3. API Endpoints

| Method | URL | Role | Description |
| --- | --- | --- | --- |
| `POST` | `/users/student` | `ADMIN` | Create a student |
| `GET` | `/users/student` | Not annotated | Get all students |
| `GET` | `/users/student/profile` | `STUDENT` | Get current student profile |
| `GET` | `/users/student/{id}` | Not annotated | Get student by ID |
| `PUT` | `/users/student/{id}` | `ADMIN` | Update student |
| `DELETE` | `/users/student/{id}` | `ADMIN` | Delete student |

### Create Student

| Item | Value |
| --- | --- |
| Method | `POST` |
| URL | `/users/student` |
| Request body | `StudentRequestDTO` |
| Response body | `StudentResponseDTO` |
| Success status | `201 Created` |

Example request:

```json
{
  "email": "student@ump.ac.ma",
  "firstName": "Sara",
  "lastName": "Alaoui",
  "pfpUrl": "https://cdn.example.com/students/sara.png",
  "numApogee": "A123456"
}
```

### Get All Students

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/student` |
| Response body | Array of `StudentResponseDTO` |
| Success status | `200 OK` |

### Get Current Student Profile

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/student/profile` |
| Role | `STUDENT` |
| Response body | `StudentProfileDto` |
| Success status | `200 OK` |

Frontend notes:

- This endpoint uses the authenticated user context, not a path ID.
- `groupe` and `filiere` are returned only if the student has an inscription in the active academic year.
- `filiere` can be `null`.

### Get Student By ID

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/student/{id}` |
| Response body | `StudentResponseDTO` |
| Success status | `200 OK` |

### Update Student

| Item | Value |
| --- | --- |
| Method | `PUT` |
| URL | `/users/student/{id}` |
| Role | `ADMIN` |
| Request body | `StudentRequestDTO` |
| Response body | `StudentResponseDTO` |
| Success status | `200 OK` |

Frontend notes:

- Send a full student DTO, not only changed fields.
- Email and Apogee number are normalized before save.

### Delete Student

| Item | Value |
| --- | --- |
| Method | `DELETE` |
| URL | `/users/student/{id}` |
| Role | `ADMIN` |
| Response body | Empty |
| Success status | `204 No Content` |

---

## 4. Request DTOs

### StudentRequestDTO

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `email` | string | yes | Valid email, max 254 chars, must use configured allowed domain | `student@ump.ac.ma` |
| `firstName` | string | yes | Not blank, max 100 chars | `Sara` |
| `lastName` | string | yes | Not blank, max 100 chars | `Alaoui` |
| `pfpUrl` | string | no | Valid URL if provided, max 512 chars | `https://cdn.example.com/sara.png` |
| `numApogee` | string | yes | Not blank, max 30 chars, unique | `A123456` |

---

## 5. Response DTOs

### StudentResponseDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `id` | number | Student user ID | `1` |
| `email` | string | Normalized email | `student@ump.ac.ma` |
| `firstName` | string | First name | `Sara` |
| `lastName` | string | Last name | `Alaoui` |
| `pfpUrl` | string/null | Profile picture URL | `https://cdn.example.com/sara.png` |
| `numApogee` | string | Student Apogee number | `A123456` |
| `roles` | string array | User roles | `["STUDENT"]` |
| `enabled` | boolean | Account enabled status | `true` |
| `firstLogin` | boolean | Whether first-login flow is pending | `true` |
| `createdAt` | string | Creation timestamp | `2026-06-16T10:15:30` |
| `updatedAt` | string | Last update timestamp | `2026-06-16T11:20:00` |

### StudentProfileDto

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `id` | number | Current student ID | `1` |
| `email` | string | Student email | `student@ump.ac.ma` |
| `firstName` | string | First name | `Sara` |
| `lastName` | string | Last name | `Alaoui` |
| `pfpUrl` | string/null | Profile picture URL | `https://cdn.example.com/sara.png` |
| `numApogee` | string | Apogee number | `A123456` |
| `filiere` | string/null | Filiere code from active enrollment | `GI` |
| `groupe` | string/null | Groupe name from active enrollment | `GI1-A` |

---

## 6. Business Rules

- Email is trimmed and lowercased.
- `numApogee` is trimmed.
- Email must belong to configured `app.allowed-domain`.
- Email must be unique.
- Apogee number must be unique.
- Created students receive role `STUDENT`.
- Created students are enabled by default.
- Created students have `firstLogin = true`.
- Profile enrichment depends on the first active academic year returned by the backend.
- Profile enrollment fields can be absent/null if no active year or matching inscription exists.

---

## 7. Validation Rules

| Field | Rule |
| --- | --- |
| `email` | Required, valid email, max 254 chars, allowed domain |
| `firstName` | Required, max 100 chars |
| `lastName` | Required, max 100 chars |
| `pfpUrl` | Optional, valid URL, max 512 chars |
| `numApogee` | Required, max 30 chars |

---

## 8. Error Handling

Error body shape:

```json
{
  "status": 409,
  "message": "Email already exists",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/student"
}
```

| Status | When | Message | Frontend handling |
| --- | --- | --- | --- |
| `400` | Validation fails | `email: Email must be valid` | Show field validation |
| `400` | Invalid email domain | `Email must be in the @ump.ac.ma domain` | Ask for institutional email |
| `401` | Missing user context on profile | `Missing user context` | Redirect to login |
| `401` | Invalid user ID in context | `Invalid user id` | Re-authenticate |
| `404` | Student does not exist | `Student not found` | Show not-found state |
| `409` | Email duplicate | `Email already exists` | Mark email as duplicate |
| `409` | Apogee duplicate | `NumApogee already exists` | Mark Apogee as duplicate |
| `500` | Unexpected runtime error | `Une erreur serveur inattendue s'est produite` | Show generic error |

---

## 11. Example Responses

### Create Student Success

```json
{
  "id": 1,
  "email": "student@ump.ac.ma",
  "firstName": "Sara",
  "lastName": "Alaoui",
  "pfpUrl": "https://cdn.example.com/students/sara.png",
  "numApogee": "A123456",
  "roles": ["STUDENT"],
  "enabled": true,
  "firstLogin": true,
  "createdAt": "2026-06-16T10:15:30",
  "updatedAt": "2026-06-16T10:15:30"
}
```

### Profile Success

```json
{
  "id": 1,
  "email": "student@ump.ac.ma",
  "firstName": "Sara",
  "lastName": "Alaoui",
  "pfpUrl": "https://cdn.example.com/students/sara.png",
  "numApogee": "A123456",
  "filiere": "GI",
  "groupe": "GI1-A"
}
```

### Duplicate Email Error

```json
{
  "status": 409,
  "message": "Email already exists",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/student"
}
```

---

## 12. Edge Cases

- Duplicate email returns `409`.
- Duplicate `numApogee` returns `409`.
- Email comparison is effectively case-insensitive because emails are normalized.
- Profile response may omit `filiere` and `groupe`.
- Delete can fail if database relationships prevent deleting the student.
- `GET /users/student` and `GET /users/student/{id}` are not annotated with `@RequireRole` in this controller; access may still be protected by global security filters.
