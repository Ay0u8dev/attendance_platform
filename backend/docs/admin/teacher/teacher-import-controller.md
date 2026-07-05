# TeacherImportController API Documentation

## 1. Module Overview

`TeacherImportController` exposes the Excel import API for teachers and teacher assignments.

It allows an admin to upload an `.xlsx` file containing teacher identity data and assignment data. The backend validates rows, creates or updates teachers, creates assignments, and returns a detailed import report.

Base URL:

```text
/users/teacher/import
```

This endpoint requires `ADMIN`.

---

## 2. Backend Flow

```text
Angular file upload
  |
  v
TeacherImportController
  |
  v
TeacherImportService
  |
  v
TeacherExcelParser + TeacherExcelRowValidator
  |
  v
TeacherRepository / UserRepository / Structure repositories / TeacherAssignmentRepository
  |
  v
Database
  |
  v
TeacherImportResultDTO
```

The controller receives a multipart file and delegates to `TeacherImportService`.

The service:

- Validates the file.
- Parses the first Excel sheet.
- Normalizes row values.
- Validates required teacher and assignment fields.
- Creates or updates teacher identity data.
- Validates academic year, formation, groupe, and module relationships.
- Detects duplicate assignments inside the file.
- Detects assignments already existing in the database.
- Returns an import report.

---

## 3. API Endpoints

| Method | URL | Role | Description |
| --- | --- | --- | --- |
| `POST` | `/users/teacher/import` | `ADMIN` | Import teachers and assignments from Excel |

### Import Teachers

| Item | Value |
| --- | --- |
| Method | `POST` |
| URL | `/users/teacher/import` |
| Content type | `multipart/form-data` |
| Request part | `file` |
| Response body | `TeacherImportResultDTO` |
| Success status | `200 OK` |

Angular example:

```ts
const formData = new FormData();
formData.append('file', selectedFile);

this.http.post<TeacherImportResultDTO>('/api/users/teacher/import', formData);
```

Expected Excel columns:

| Column index | Field | Example |
| --- | --- | --- |
| 0 | `firstName` | `Ahmed` |
| 1 | `lastName` | `El Amrani` |
| 2 | `email` | `teacher@ump.ac.ma` |
| 3 | `academicYear` | `2025/2026` |
| 4 | `formationName` | `GI1` |
| 5 | `groupeCode` | `GI1-A` |
| 6 | `moduleCode` | `JAVA` |

The parser skips the first row as a header. Data starts from Excel row 2.

---

## 4. Request DTOs

### Multipart Request

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `file` | multipart file | yes | Non-empty `.xlsx`, max 10 MB | `teachers.xlsx` |

### TeacherExcelRowDTO

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `rowNumber` | number | generated | Excel row number | `2` |
| `firstName` | string | yes | Not blank, max 100 chars | `Ahmed` |
| `lastName` | string | yes | Not blank, max 100 chars | `El Amrani` |
| `email` | string | yes | Valid email, max 254 chars, allowed domain | `teacher@ump.ac.ma` |
| `academicYear` | string | yes | Must match existing academic year name | `2025/2026` |
| `formationName` | string | yes | Must match formation in selected academic year | `GI1` |
| `groupeCode` | string | yes | Must match groupe and belong to formation | `GI1-A` |
| `moduleCode` | string | yes | Must match module and belong to formation | `JAVA` |

---

## 5. Response DTOs

### TeacherImportResultDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `fileName` | string | Uploaded file name | `teachers.xlsx` |
| `importedAt` | string | Import timestamp | `2026-06-16T12:00:00` |
| `processingTimeMs` | number | Processing time | `330` |
| `totalRows` | number | Parsed non-empty data rows | `20` |
| `successfulRows` | number | Rows not marked as failed | `18` |
| `failedRows` | number | Rows with errors | `2` |
| `createdTeachers` | number | New teachers created | `5` |
| `updatedTeachers` | number | Existing teachers updated | `2` |
| `createdAssignments` | number | New assignments created | `17` |
| `duplicateAssignments` | number | Assignments already existing in DB | `1` |
| `duplicateAssignmentsInsideFile` | number | Repeated assignments inside uploaded file | `1` |
| `missingAcademicYears` | number | Missing academic year references | `0` |
| `missingFormations` | number | Missing formation references | `1` |
| `missingGroups` | number | Missing groupe references | `0` |
| `missingModules` | number | Missing module references | `1` |
| `nonTeacherEmailConflicts` | number | Emails already owned by non-teacher users | `0` |
| `status` | string | `SUCCESS`, `PARTIAL`, or `FAILED` | `PARTIAL` |
| `changes` | array | `TeacherChangeDTO` entries | See below |
| `errors` | array | `RowErrorDTO` entries | See below |
| `warnings` | string array | Non-blocking warnings | `["Row 8 -> Duplicate assignment inside file."]` |

### TeacherChangeDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `rowNumber` | number | Excel row number | `2` |
| `entityType` | string | `TEACHER` or `ASSIGNMENT` | `ASSIGNMENT` |
| `identifier` | string | Email or assignment descriptor | `teacher@ump.ac.ma | 2025/2026 | GI1 | GI1-A | JAVA` |
| `action` | string | Action performed | `ASSIGNMENT_CREATED` |
| `changes` | string array | Human-readable change details | `["Created teacher assignment."]` |

### RowErrorDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `rowNumber` | number | Excel row number | `5` |
| `field` | string | Field with issue | `moduleCode` |
| `message` | string | Error message | `Module not found.` |

---

## 6. Business Rules

- Only `.xlsx` files are accepted.
- File size must be 10 MB or less.
- Values are normalized before validation:
  - Email is trimmed and lowercased.
  - Names, academic year, formation, groupe, and module are trimmed.
- Email must belong to configured allowed domain.
- If an email belongs to an existing non-teacher user, the row fails.
- If the same teacher email appears multiple times, only one teacher is created/updated.
- If the same email appears with different names in valid rows, the teacher identity is updated in row order and a warning is returned for each name change.
- Existing teacher names are updated when first or last name changed.
- New teachers receive role `TEACHER`, `enabled = true`, and `firstLogin = true`.
- Academic year must exist.
- Formation must exist and belong to selected academic year.
- Groupe must exist and belong to selected formation.
- Module must exist and belong to selected formation.
- Duplicate assignments inside the file are skipped with warnings.
- Existing assignments in database are skipped with warnings.

---

## 7. Validation Rules

### File validation

| Rule | Error message |
| --- | --- |
| File is required and non-empty | `Excel file is empty` |
| Extension must be `.xlsx` | `Only .xlsx files are allowed` |
| Size must be <= 10 MB | `File size exceeds 10MB` |
| Workbook must contain a sheet | `Excel file contains no sheets` |
| Parser must read file successfully | `Failed to parse Excel file: ...` |

### Row validation

| Field | Rule | Error message |
| --- | --- | --- |
| `firstName` | Required | `First name is required` |
| `firstName` | Max 100 chars | `First name exceeds 100 characters` |
| `lastName` | Required | `Last name is required` |
| `lastName` | Max 100 chars | `Last name exceeds 100 characters` |
| `email` | Required | `Email is required` |
| `email` | Max 254 chars | `Email exceeds 254 characters` |
| `email` | Valid format | `Invalid email format` |
| `email` | Allowed domain | `Email must be in the @<domain> domain` |
| `academicYear` | Required | `Academic year is required` |
| `formationName` | Required | `Formation is required` |
| `groupeCode` | Required | `Groupe code is required` |
| `moduleCode` | Required | `Module code is required` |

---

## 8. Error Handling

File-level errors return HTTP `400` with the global error body:

```json
{
  "status": 400,
  "message": "Only .xlsx files are allowed",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/teachers/import"
}
```

Row-level errors do not fail the HTTP request. They are returned inside `TeacherImportResultDTO.errors`.

| Error type | Where returned | Frontend handling |
| --- | --- | --- |
| Invalid file | HTTP `400` body | Show upload error |
| Invalid row | `errors[]` | Show row-level table |
| Duplicate assignment | `warnings[]` | Show warning, not fatal error |
| Partial import | `status = PARTIAL` | Show success with issues |
| Full import failure | `status = FAILED` | Show all row errors |
| Non-teacher email conflict | `errors[]` and counter | Ask admin to use another email |

---

## 11. Example Responses

### Successful Import

```json
{
  "fileName": "teachers.xlsx",
  "importedAt": "2026-06-16T12:00:00",
  "processingTimeMs": 210,
  "totalRows": 2,
  "successfulRows": 2,
  "failedRows": 0,
  "createdTeachers": 1,
  "updatedTeachers": 0,
  "createdAssignments": 2,
  "duplicateAssignments": 0,
  "duplicateAssignmentsInsideFile": 0,
  "missingAcademicYears": 0,
  "missingFormations": 0,
  "missingGroups": 0,
  "missingModules": 0,
  "nonTeacherEmailConflicts": 0,
  "status": "SUCCESS",
  "changes": [
    {
      "rowNumber": 2,
      "entityType": "TEACHER",
      "identifier": "teacher@ump.ac.ma",
      "action": "CREATED",
      "changes": ["Created teacher"]
    }
  ],
  "errors": [],
  "warnings": []
}
```

### Partial Import

```json
{
  "fileName": "teachers.xlsx",
  "totalRows": 3,
  "successfulRows": 2,
  "failedRows": 1,
  "createdTeachers": 1,
  "updatedTeachers": 1,
  "createdAssignments": 1,
  "duplicateAssignments": 1,
  "duplicateAssignmentsInsideFile": 0,
  "missingAcademicYears": 0,
  "missingFormations": 0,
  "missingGroups": 0,
  "missingModules": 1,
  "nonTeacherEmailConflicts": 0,
  "status": "PARTIAL",
  "changes": [],
  "errors": [
    {
      "rowNumber": 4,
      "field": "moduleCode",
      "message": "Module not found."
    }
  ],
  "warnings": [
    "Row 3 -> Teacher assignment already exists."
  ]
}
```

---

## 12. Edge Cases

- `status = PARTIAL` still means the HTTP call succeeded.
- Row numbers are Excel row numbers.
- Duplicate assignment is a warning, not a row failure.
- Academic relationship validation happens before teacher creation/update, so invalid year, formation, groupe, or module rows do not create or update teachers.
- Same formation name can exist in different academic years; backend resolves by formation name plus academic year.
- Groupe and module must both belong to the resolved formation.
- Same teacher email with different names is processed in row order; the last valid name wins and each name change returns a warning.
- Existing non-teacher user email is a hard row error.
- Frontend should not retry the whole file blindly after partial import, because some rows may already have been applied.
