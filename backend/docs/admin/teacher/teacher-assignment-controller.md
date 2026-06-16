# TeacherAssignmentController API Documentation

## 1. Module Overview

`TeacherAssignmentController` manages teacher assignments to academic structures.

It allows admins to assign a teacher to:

- An academic year.
- A formation.
- A groupe.
- A module.

Base URL:

```text
users/teacher/assignments
```

Create, update, and delete require `ADMIN`.

---

## 2. Backend Flow

```text
Angular UI
  |
  v
TeacherAssignmentController
  |
  v
TeacherAssignmentService
  |
  v
TeacherRepository / AcademicYearRepository / FormationRepository / GroupeRepository / ModuleRepository
  |
  v
TeacherAssignmentRepository
  |
  v
Database
```

The controller receives IDs from the frontend. The service loads each referenced entity, validates relationships, checks duplicates, and saves a `TeacherAssignment`.

---

## 3. API Endpoints

| Method | URL | Role | Description |
| --- | --- | --- | --- |
| `POST` | `/users/teacher/assignments` | `ADMIN` | Create teacher assignment |
| `GET` | `/users/teacher/assignments` | Not annotated | Get all teacher assignments |
| `GET` | `/users/teacher/assignments/{id}` | Not annotated | Get assignment by ID |
| `PUT` | `/users/teacher/assignments/{id}` | `ADMIN` | Update assignment |
| `DELETE` | `/users/teacher/assignments/{id}` | `ADMIN` | Delete assignment |

### Create Assignment

| Item | Value |
| --- | --- |
| Method | `POST` |
| URL | `/users/teacher/assignments` |
| Request body | `TeacherAssignmentRequestDTO` |
| Response body | `TeacherAssignmentResponseDTO` |
| Success status | `201 Created` |

Example request:

```json
{
  "teacherId": 7,
  "academicYearId": 3,
  "formationId": 10,
  "groupeId": 25,
  "moduleId": 40
}
```

### Get All Assignments

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/teacher/assignments` |
| Response body | Array of `TeacherAssignmentResponseDTO` |
| Success status | `200 OK` |

### Get Assignment By ID

| Item | Value |
| --- | --- |
| Method | `GET` |
| URL | `/users/teacher/assignments/{id}` |
| Response body | `TeacherAssignmentResponseDTO` |
| Success status | `200 OK` |

### Update Assignment

| Item | Value |
| --- | --- |
| Method | `PUT` |
| URL | `/users/teacher/assignments/{id}` |
| Request body | `TeacherAssignmentRequestDTO` |
| Response body | `TeacherAssignmentResponseDTO` |
| Success status | `200 OK` |

Frontend notes:

- Send all five IDs.
- The service checks duplicates excluding the current assignment ID.

### Delete Assignment

| Item | Value |
| --- | --- |
| Method | `DELETE` |
| URL | `/users/teacher/assignments/{id}` |
| Response body | Empty |
| Success status | `204 No Content` |

---

## 4. Request DTOs

### TeacherAssignmentRequestDTO

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `teacherId` | number | yes | Not null, positive, must reference existing teacher | `7` |
| `academicYearId` | number | yes | Not null, positive, must reference existing academic year | `3` |
| `formationId` | number | yes | Not null, positive, must reference existing formation | `10` |
| `groupeId` | number | yes | Not null, positive, must reference existing groupe | `25` |
| `moduleId` | number | yes | Not null, positive, must reference existing module | `40` |

---

## 5. Response DTOs

### TeacherAssignmentResponseDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `id` | number | Assignment ID | `100` |
| `teacherId` | number | Teacher ID | `7` |
| `teacherEmail` | string | Teacher email | `teacher@ump.ac.ma` |
| `teacherFirstName` | string | Teacher first name | `Ahmed` |
| `teacherLastName` | string | Teacher last name | `El Amrani` |
| `academicYearId` | number | Academic year ID | `3` |
| `academicYearName` | string | Academic year name | `2025/2026` |
| `formationId` | number | Formation ID | `10` |
| `formationName` | string | Formation name | `GI1` |
| `groupeId` | number | Groupe ID | `25` |
| `groupeName` | string | Groupe name | `GI1-A` |
| `moduleId` | number | Module ID | `40` |
| `moduleCode` | string | Module code | `JAVA` |
| `moduleName` | string | Module name | `Java Programming` |

---

## 6. Business Rules

- Teacher must exist.
- Academic year must exist.
- Formation must exist.
- Groupe must exist.
- Module must exist.
- Formation must belong to the selected academic year.
- Groupe must belong to the selected formation.
- Module must belong to the selected formation.
- The combination `teacherId + academicYearId + formationId + groupeId + moduleId` must be unique.
- The database entity also declares a unique constraint on `teacher_id, academic_year_id, formation_id, groupe_id, module_id`.

---

## 7. Validation Rules

| Field | Rule |
| --- | --- |
| `teacherId` | Required, positive |
| `academicYearId` | Required, positive |
| `formationId` | Required, positive |
| `groupeId` | Required, positive |
| `moduleId` | Required, positive |

Relationship validation:

| Relationship | Rule |
| --- | --- |
| Formation + academic year | Formation must belong to selected academic year |
| Groupe + formation | Groupe must belong to selected formation |
| Module + formation | Module must belong to selected formation |
| Assignment combination | Must be unique |

---

## 8. Error Handling

Error body shape:

```json
{
  "status": 409,
  "message": "Teacher assignment already exists for the selected teacher, academic year, formation, groupe and module",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/teacher/assignments"
}
```

| Status | When | Message | Frontend handling |
| --- | --- | --- | --- |
| `400` | Missing/invalid ID | `teacherId: must not be null` or `teacherId: must be greater than 0` | Highlight field |
| `400` | Formation/year mismatch | `Formation does not belong to the selected academic year` | Refresh dependent dropdowns |
| `400` | Groupe/formation mismatch | `Groupe does not belong to the selected formation` | Filter groupes by formation |
| `400` | Module/formation mismatch | `Module does not belong to the selected formation` | Filter modules by formation |
| `404` | Teacher missing | `Teacher not found with id: 7` | Refresh teacher list |
| `404` | Academic year missing | `Academic year not found with id: 3` | Refresh academic years |
| `404` | Formation missing | `Formation not found with id: 10` | Refresh formations |
| `404` | Groupe missing | `Groupe not found with id: 25` | Refresh groupes |
| `404` | Module missing | `Module not found with id: 40` | Refresh modules |
| `404` | Assignment missing | `Teacher assignment not found with id: 100` | Show not-found state |
| `409` | Duplicate assignment | `Teacher assignment already exists for the selected teacher, academic year, formation, groupe and module` | Prevent duplicate save |

---

## 11. Example Responses

### Create Assignment Success

```json
{
  "id": 100,
  "teacherId": 7,
  "teacherEmail": "teacher@ump.ac.ma",
  "teacherFirstName": "Ahmed",
  "teacherLastName": "El Amrani",
  "academicYearId": 3,
  "academicYearName": "2025/2026",
  "formationId": 10,
  "formationName": "GI1",
  "groupeId": 25,
  "groupeName": "GI1-A",
  "moduleId": 40,
  "moduleCode": "JAVA",
  "moduleName": "Java Programming"
}
```

### Duplicate Assignment Error

```json
{
  "status": 409,
  "message": "Teacher assignment already exists for the selected teacher, academic year, formation, groupe and module",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/teacher/assignments"
}
```

### Invalid Relationship Error

```json
{
  "status": 400,
  "message": "Module does not belong to the selected formation",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/teacher/assignments"
}
```

---

## 12. Edge Cases

- Duplicate assignment is checked in service before save.
- Database also has a unique constraint for the assignment combination, protecting against concurrent duplicate inserts when schema is generated/applied from JPA.
- Frontend should filter dependent dropdowns:
  - Select academic year.
  - Load formations for that year.
  - Load groupes and modules for selected formation.
- Updating an assignment to the same values is allowed because duplicate check excludes the current assignment ID.
- Updating an assignment to a combination used by another assignment returns `409`.
- Read endpoints are not annotated with `@RequireRole`; global security may still restrict them.
