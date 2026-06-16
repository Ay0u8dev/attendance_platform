# StudentImportController API Documentation

## 1. Module Overview

`StudentImportController` exposes the Excel import API for students.

It allows an admin to upload an `.xlsx` file containing student identity information and enrollment information. The backend validates rows, creates or updates students, creates inscriptions, and returns a detailed import report.

Base URL:

```text
/users/student/import
```

This endpoint requires `ADMIN`.

---

## 2. Backend Flow

```text
Angular file upload
  |
  v
StudentImportController
  |
  v
StudentImportService
  |
  v
StudentExcelParser + StudentExcelRowValidator
  |
  v
StudentRepository / Structure repositories / StudentInscriptionRepository
  |
  v
Database
  |
  v
StudentImportResultDTO
```

The controller only receives the multipart file and delegates to `StudentImportService`.

The service:

- Validates the file.
- Parses the first Excel sheet.
- Normalizes row values.
- Validates required fields and email domain.
- Detects duplicate emails and Apogee numbers inside the file.
- Loads existing students, academic years, formations, and groupes.
- Creates new students.
- Updates names for existing students when needed.
- Creates inscriptions when relationships are valid.
- Returns a report with counters, errors, warnings, and changes.

---

## 3. API Endpoints

| Method | URL | Role | Description |
| --- | --- | --- | --- |
| `POST` | `/users/student/import` | `ADMIN` | Import students and inscriptions from Excel |

### Import Students

| Item | Value |
| --- | --- |
| Method | `POST` |
| URL | `/users/student/import` |
| Content type | `multipart/form-data` |
| Request part | `file` |
| Response body | `StudentImportResultDTO` |
| Success status | `200 OK` |

Angular example:

```ts
const formData = new FormData();
formData.append('file', selectedFile);

this.http.post<StudentImportResultDTO>('/users/student/import', formData);
```

Expected Excel columns:

| Column index | Field | Example |
| --- | --- | --- |
| 0 | `firstName` | `Sara` |
| 1 | `lastName` | `Alaoui` |
| 2 | `email` | `student@ump.ac.ma` |
| 3 | `numApogee` | `A123456` |
| 4 | `academicYear` | `2025/2026` |
| 5 | `formationName` | `GI1` |
| 6 | `groupeCode` | `GI1-A` |

The parser skips the first row as a header. Data starts from Excel row 2.

---

## 4. Request DTOs

### Multipart Request

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `file` | multipart file | yes | Non-empty `.xlsx`, max 10 MB | `students.xlsx` |

### StudentExcelRowDTO

| Field | Type | Required | Validation | Example |
| --- | --- | --- | --- | --- |
| `rowNumber` | number | generated | Excel row number | `2` |
| `firstName` | string | yes | Not blank, max 100 chars | `Sara` |
| `lastName` | string | yes | Not blank, max 100 chars | `Alaoui` |
| `email` | string | yes | Valid email, max 254 chars, allowed domain | `student@ump.ac.ma` |
| `numApogee` | string | yes | Not blank, max 30 chars | `A123456` |
| `academicYear` | string | yes | Must match existing academic year name | `2025/2026` |
| `formationName` | string | yes | Must match formation in selected academic year | `GI1` |
| `groupeCode` | string | yes | Must match groupe name/code and belong to formation | `GI1-A` |

---

## 5. Response DTOs

### StudentImportResultDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `fileName` | string | Uploaded file name | `students.xlsx` |
| `importedAt` | string | Import timestamp | `2026-06-16T12:00:00` |
| `totalRows` | number | Parsed non-empty data rows | `30` |
| `successfulRows` | number | Rows not marked as failed | `27` |
| `createdStudents` | number | New students created | `10` |
| `updatedStudents` | number | Existing students updated | `4` |
| `createdInscriptions` | number | New inscriptions created | `24` |
| `duplicateInscriptions` | number | Existing or repeated enrollments skipped | `3` |
| `failedRows` | number | Rows with errors | `3` |
| `missingAcademicYears` | number | Missing academic year references | `1` |
| `missingFormations` | number | Missing formation references | `1` |
| `missingGroups` | number | Missing groupe references | `1` |
| `processingTimeMs` | number | Processing time | `328` |
| `status` | string | `SUCCESS`, `PARTIAL`, or `FAILED` | `PARTIAL` |
| `changes` | array | `StudentChangeDTO` entries | See below |
| `errors` | array | `RowErrorDTO` entries | See below |
| `warnings` | string array | Non-blocking warnings | `["Row 8 -> Student already enrolled for this academic year."]` |

### StudentChangeDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `rowNumber` | number | Excel row number | `2` |
| `apogee` | string | Apogee number | `A123456` |
| `email` | string | Email | `student@ump.ac.ma` |
| `action` | string | `CREATED`, `UPDATED`, or `SKIPPED` | `CREATED` |
| `changes` | string array | Human-readable change details | `["Created student"]` |

### RowErrorDTO

| Field | Type | Meaning | Example |
| --- | --- | --- | --- |
| `rowNumber` | number | Excel row number | `5` |
| `field` | string | Field with issue | `email` |
| `message` | string | Error message | `Invalid email format` |

---

## 6. Business Rules

- Only `.xlsx` files are accepted.
- File size must be 10 MB or less.
- Empty rows are skipped by the parser.
- Values are normalized before validation:
  - Email is trimmed and lowercased.
  - Apogee number is trimmed.
  - Names, academic year, formation, and groupe are trimmed.
- Duplicate emails inside the file are row errors.
- Duplicate Apogee numbers inside the file are row errors.
- A new student is created when both email and Apogee are unknown.
- An existing student is updated only when email and Apogee match the same student.
- If email and Apogee belong to different students, the row fails.
- If email exists but Apogee does not match that student, the row fails.
- If Apogee exists but email does not match that student, the row fails.
- Academic year must exist.
- Formation must exist and belong to the selected academic year.
- Groupe must exist and belong to the selected formation.
- Duplicate inscriptions are skipped with warnings.
- New students receive role `STUDENT`, `enabled = true`, and `firstLogin = true`.

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
| `numApogee` | Required | `Apogee number is required` |
| `numApogee` | Max 30 chars | `Apogee number exceeds 30 characters` |

---

## 8. Error Handling

File-level errors return HTTP `400` with the global error body:

```json
{
  "status": 400,
  "message": "Only .xlsx files are allowed",
  "timestamp": "2026-06-16T12:34:56.789",
  "path": "/users/student/import"
}
```

Row-level errors do not fail the HTTP request. They are returned inside `StudentImportResultDTO.errors`.

| Error type | Where returned | Frontend handling |
| --- | --- | --- |
| Invalid file | HTTP `400` body | Show upload error |
| Invalid row | `errors[]` | Show row-level table |
| Duplicate inscription | `warnings[]` | Show warning, not fatal error |
| Partial import | `status = PARTIAL` | Show success with issues |
| Full import failure | `status = FAILED` | Show all row errors |

---

## 11. Example Responses

### Successful Import

```json
{
  "fileName": "students.xlsx",
  "importedAt": "2026-06-16T12:00:00",
  "totalRows": 2,
  "successfulRows": 2,
  "createdStudents": 2,
  "updatedStudents": 0,
  "createdInscriptions": 2,
  "duplicateInscriptions": 0,
  "failedRows": 0,
  "missingAcademicYears": 0,
  "missingFormations": 0,
  "missingGroups": 0,
  "processingTimeMs": 180,
  "status": "SUCCESS",
  "changes": [
    {
      "rowNumber": 2,
      "apogee": "A123456",
      "email": "student@ump.ac.ma",
      "action": "CREATED",
      "changes": ["Created student"]
    }
  ],
  "errors": [],
  "warnings": []
}
```

### Partial Import

```json
{
  "fileName": "students.xlsx",
  "totalRows": 3,
  "successfulRows": 2,
  "createdStudents": 1,
  "updatedStudents": 1,
  "createdInscriptions": 1,
  "duplicateInscriptions": 1,
  "failedRows": 1,
  "missingAcademicYears": 0,
  "missingFormations": 0,
  "missingGroups": 1,
  "processingTimeMs": 245,
  "status": "PARTIAL",
  "changes": [],
  "errors": [
    {
      "rowNumber": 4,
      "field": "groupeCode",
      "message": "Groupe not found."
    }
  ],
  "warnings": [
    "Row 3 -> Student already enrolled for this academic year."
  ]
}
```

---

## 12. Edge Cases

- `status = PARTIAL` still means the HTTP call succeeded.
- Row numbers are Excel row numbers.
- Duplicate inscription is a warning, not a row failure.
- A row can create/update a student but fail later during enrollment validation.
- Same formation name can exist in different academic years; backend resolves by formation name plus academic year.
- `formationName` found in another academic year returns `Formation does not belong to specified academic year.`
- `groupeCode` must belong to the resolved formation.
- Frontend should display `errors` and `warnings` separately.
- Frontend should not retry the whole file blindly after a partial import, because some rows may already have been applied.
