# StudentInscriptionController API Documentation

## 1. Module Overview

`StudentInscriptionController` manages student academic inscriptions.

It allows admins to:

- Create a student inscription.
- List all inscriptions.
- Read an inscription by ID.
- Update an inscription.
- Delete an inscription.

Base URL:

```text
/users/student/inscription
```

Create, update, and delete require `ADMIN`.

---

## 2. Backend Flow

```text
Angular UI
  |
  v
StudentInscriptionController
  |
  v
StudentInscriptionService
  |
  v
StudentRepository / FormationRepository / GroupeRepository / AnneeUniversitaireRepository
  |
  v
StudentInscriptionRepository
  |
  v
Database
```

The controller receives IDs from the frontend. The service loads each referenced entity, validates business rules, then saves or updates an `Inscription`.

---

## 3. API Endpoints

| Method | URL | Role | Description |
| --- | --- | --- | --- |
| `POST` | `/users/student/inscription` | `ADMIN` | Create inscription |
| `GET` | `/users/student/inscription` | Not annotated | Get all inscriptions |
| `GET` | `/users/student/inscription/{id}` | Not annotated | Get inscription by ID |
| `PUT` | `/users/student/inscription/{id}` | `ADMIN` | Update inscription |
| `DELETE` | `/users/student/inscription/{id}` | `ADMIN` | Delete inscription |

### Create Inscription

| Item | Value |
| --- | --- |
| Method | `POST` |
| URL | `/users/student/inscription` |
| Request body | `StudentInscriptionRequestDTO` |
| Response body | `StudentInscriptionResponseDTO` |
| Success status | `201 Created` |

Example request:

```json
{
  "studentId": 1,
  "formationId": 10,
  "groupeId": 25,
  "academicYearId": 3
}
```

### Get All Inscriptions

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/student/inscription` |
| Response body | Array of `StudentInscriptionResponseDTO` |
| Success status | `200 OK` |

### Get Inscription By ID

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/student/inscription/{id}` |
| Response body | `StudentInscriptionResponseDTO` |
| Success status | `200 OK` |

### Update Inscription

| Item | Value |
| --- | --- |
| Method | `PUT` |
| URL | `/users/student/inscription/{id}` |
| Request body | `StudentInscriptionRequestDTO` |
| Response body | `StudentInscriptionResponseDTO` |
| Success status | `200 OK` |

Frontend notes:

- Send all four IDs.
- Duplicate enrollment check is skipped only when student and academic year remain unchanged.

### Delete Inscription

| Item | Value |
| --- | --- |
| Method | `DELETE` |
| URL | `/users/student/inscription/{id}` |
| Response body | Empty |
| Success status | `204 No Content` |

---

## 4. Request DTOs

### StudentInscriptionRequestDTO

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `studentId` | number | yes | Not null | `1` |
| `formationId` | number | yes | Not null | `10` |
| `groupeId` | number | yes | Not null | `25` |
| `academicYearId` | number | yes | Not null | `3` |

---

## 5. Response DTOs

### StudentInscriptionResponseDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `id` | number | Inscription ID | `15` |
| `studentId` | number | Student ID | `1` |
| `studentFirstName` | string | Student first name | `Sara` |
| `studentLastName` | string | Student last name | `Alaoui` |
| `formationId` | number | Formation ID | `10` |
| `formationName` | string | Formation name | `GI1` |
| `groupeId` | number | Groupe ID | `25` |
| `groupeName` | string | Groupe name | `GI1-A` |
| `academicYearId` | number | Academic year ID | `3` |
| `academicYearName` | string | Academic year name | `2025/2026` |

---

## 6. Business Rules

- The referenced student must exist.
- The referenced formation must exist.
- The referenced groupe must exist.
- The referenced academic year must exist.
- A student cannot be enrolled more than once in the same academic year.
- The selected groupe must belong to the selected formation.
- On update, duplicate enrollment is checked if student or academic year changes.

Important integration note:

- The service currently validates `groupe -> formation`.
- It does not explicitly validate `formation -> academicYear`.
- The frontend should load formations by selected academic year and groupes by selected formation to avoid inconsistent IDs.

---

## 7. Validation Rules

| Field | Rule |
| --- | --- |
| `studentId` | Required, must reference existing student |
| `formationId` | Required, must reference existing formation |
| `groupeId` | Required, must reference existing groupe |
| `academicYearId` | Required, must reference existing academic year |

Relationship validation:

| Relationship | Rule |
| --- | --- |
| Student + academic year | Must be unique |
| Groupe + formation | Groupe must belong to formation |

---

## 8. Error Handling

Error body shape:

```json
{
  "status": 404,
  "message": "Inscription not found",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/student/inscription/99"
}
```

| Status | When | Message | Frontend handling |
| --- | --- | --- | --- |
| `400` | Missing required ID | `studentId: must not be null` | Highlight missing field |
| `404` | Student missing | `Student not found` | Refresh student list |
| `404` | Formation missing | `Formation not found` | Refresh formation list |
| `404` | Groupe missing | `Groupe not found` | Refresh groupe list |
| `404` | Academic year missing | `Academic year not found` | Refresh academic year list |
| `404` | Inscription missing | `Inscription not found` | Show not-found state |
| `409` | Duplicate enrollment | `Student is already enrolled in an academic year` | Prevent duplicate enrollment |
| `500` | Invalid groupe/formation relationship currently thrown as `IllegalArgumentException` | Generic server error | Frontend should prevent this by filtering groupes by formation |

Note: `IllegalArgumentException` is not handled specifically by the global exception handler, so `Groupe does not belong to the formation` may currently be returned as a generic `500`.

---

## 11. Example Responses

### Create Inscription Success

```json
{
  "id": 15,
  "studentId": 1,
  "studentFirstName": "Sara",
  "studentLastName": "Alaoui",
  "formationId": 10,
  "formationName": "GI1",
  "groupeId": 25,
  "groupeName": "GI1-A",
  "academicYearId": 3,
  "academicYearName": "2025/2026"
}
```

### Duplicate Enrollment Error

```json
{
  "status": 409,
  "message": "Student is already enrolled in an academic year",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/student/inscription"
}
```

### Not Found Error

```json
{
  "status": 404,
  "message": "Student not found",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/student/inscription"
}
```

---

## 12. Edge Cases

- A student can have only one inscription per academic year according to service logic.
- Database uniqueness is different: `student_id + groupe_id + annee_univ_id`. The service rule is stricter.
- Updating an inscription to another student/year can trigger duplicate enrollment.
- Updating only formation or groupe for the same student/year does not call duplicate enrollment check.
- Groupe must belong to formation.
- Formation should belong to the selected academic year, but this is not currently enforced in `StudentInscriptionService`.
- Frontend should filter dependent dropdowns:
  - Select academic year.
  - Load formations for that year.
  - Load groupes for selected formation.
- Read endpoints are not annotated with `@RequireRole`; global security may still restrict them.
