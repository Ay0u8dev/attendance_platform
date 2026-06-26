# Excel Import Rules

This document describes the Admin Excel import behavior for students and teachers.

Browser uploads must use the gateway `/api` routes:

- Student import: `POST /api/users/student/import`
- Teacher import: `POST /api/users/teacher/import`

Only `.xlsx` files are accepted. The first row is treated as the header. Data starts on Excel row 2.

## Student Import

Student import creates or updates a student account and creates a student inscription when the row is valid.

### Required Columns

Use this header:

```csv
firstName,lastName,email,numApogee,academicYear,formationName,groupeCode
```

All fields are required:

- `firstName`
- `lastName`
- `email`
- `numApogee`
- `academicYear`
- `formationName`
- `groupeCode`

### Valid Row Behavior

If the student identity and academic references are valid:

- create the student if email and Apogee are new
- update first and/or last name if the same student already exists
- create an inscription for the selected academic year, formation, and group

Example:

```csv
firstName,lastName,email,numApogee,academicYear,formationName,groupeCode
Sara,Alaoui,sara.import@ump.ac.ma,A9001,2025/2026,GI1,GI1-A
```

Expected result:

- student created
- inscription created
- no warning
- no error

### Student Identity Rules

Email and `numApogee` identify the same student together.

Rows are rejected when:

- email exists but `numApogee` belongs to another student
- `numApogee` exists but email belongs to another student
- email belongs to one student and `numApogee` belongs to a different student
- email belongs to a non-student user

The import must not guess or merge identities.

### Academic Rules

Rows are rejected when:

- academic year does not exist
- formation does not exist
- group does not exist
- formation does not belong to the selected academic year
- group does not belong to the selected formation

If an academic reference is invalid, the student is not created and no inscription is created.

### Warning Rules

Warnings are not errors. Rows with warnings can still be processed.

Warnings happen when:

- existing student first name changes
- existing student last name changes
- existing student first and last name change
- inscription already exists in the database
- exact duplicate inscription appears inside the same Excel file

Duplicate inscriptions are skipped and counted in `duplicatesSkipped`.

### Student Example With Mixed Cases

Adjust `academicYear`, `formationName`, and `groupeCode` to values that exist in your Structure page.

```csv
firstName,lastName,email,numApogee,academicYear,formationName,groupeCode
Sara,Alaoui,sara.import1@ump.ac.ma,A9001,2025/2026,GI1,GI1-A
Sara,Alaoui,sara.import1@ump.ac.ma,A9001,2025/2026,GI1,GI1-B
Sara,Updated,sara.import1@ump.ac.ma,A9001,2025/2026,GI1,GI1-C
Omar,Naciri,omar.import1@ump.ac.ma,A9002,2025/2026,GI1,GI1-A
Omar,Naciri,omar.import1@ump.ac.ma,A9002,2025/2026,GI1,GI1-A
Bad,Email,student..bad@ump.ac.ma,A9003,2025/2026,GI1,GI1-A
Missing,Apogee,missing.apogee@ump.ac.ma,,2025/2026,GI1,GI1-A
Missing,Year,missing.year@ump.ac.ma,A9004,2099/2100,GI1,GI1-A
Missing,Formation,missing.formation@ump.ac.ma,A9005,2025/2026,UNKNOWN,GI1-A
Missing,Group,missing.group@ump.ac.ma,A9006,2025/2026,GI1,UNKNOWN
Wrong,Domain,wrong.domain@gmail.com,A9007,2025/2026,GI1,GI1-A
```

Expected behavior:

- Rows 2 to 5: valid inserts or updates depending on existing data.
- Row 6: duplicate inscription warning if row 5 already planned the same inscription.
- Rows 7 to 12: rejected rows. No student and no inscription are created for those rows.

## Teacher Import

Teacher import creates or updates a teacher account and creates a teacher assignment when the row is valid.

### Required Columns

Use this header:

```csv
firstName,lastName,email,academicYear,formationName,groupeCode,moduleCode
```

All fields are required:

- `firstName`
- `lastName`
- `email`
- `academicYear`
- `formationName`
- `groupeCode`
- `moduleCode`

### Valid Row Behavior

If the teacher identity and academic references are valid:

- create the teacher if email is new
- update first and/or last name if the same teacher already exists
- create an assignment for the selected academic year, formation, group, and module

Example:

```csv
firstName,lastName,email,academicYear,formationName,groupeCode,moduleCode
Ahmed,El Amrani,ahmed.import@ump.ac.ma,2025/2026,GI1,GI1-A,JAVA
```

Expected result:

- teacher created
- assignment created
- no warning
- no error

### Teacher Identity Rules

Teacher import identifies teachers by normalized email.

Rows are rejected when:

- email belongs to an existing non-teacher user
- email format is invalid
- email is outside the allowed domain

If the same teacher email appears more than once with valid academic data:

- only one teacher entity is created or updated
- names are processed in row order
- the last valid name wins
- each name change returns a warning

### Assignment Rules

Rows are rejected when:

- academic year does not exist
- formation does not exist
- group does not exist
- module does not exist
- formation does not belong to the selected academic year
- group does not belong to the selected formation
- module does not belong to the selected formation

If an academic reference is invalid, the teacher is not created or updated and no assignment is created.

### Warning Rules

Warnings are not errors. Rows with warnings can still be processed.

Warnings happen when:

- existing teacher first name changes
- existing teacher last name changes
- existing teacher first and last name change
- assignment already exists in the database
- exact duplicate assignment appears inside the same Excel file

Duplicate assignments are skipped and counted in `duplicatesSkipped`.

### Teacher Example With Mixed Cases

Adjust `academicYear`, `formationName`, `groupeCode`, and `moduleCode` to values that exist in your Structure page.

```csv
firstName,lastName,email,academicYear,formationName,groupeCode,moduleCode
Ahmed,El Amrani,ahmed.import1@ump.ac.ma,2025/2026,GI1,GI1-A,JAVA
Ahmed,El Amrani,ahmed.import1@ump.ac.ma,2025/2026,GI1,GI1-B,JAVA
Sara,Bennani,sara.teacher.import@ump.ac.ma,2025/2026,GI1,GI1-A,DB
Sara,Updated,sara.teacher.import@ump.ac.ma,2025/2026,GI1,GI1-B,DB
Omar,Naciri,omar.teacher.import@ump.ac.ma,2025/2026,GI1,GI1-A,JAVA
Omar,Naciri,omar.teacher.import@ump.ac.ma,2025/2026,GI1,GI1-A,JAVA
Bad,Email,teacher..bad@ump.ac.ma,2025/2026,GI1,GI1-A,JAVA
Missing,Year,missing.year.teacher@ump.ac.ma,2099/2100,GI1,GI1-A,JAVA
Missing,Formation,missing.formation.teacher@ump.ac.ma,2025/2026,UNKNOWN,GI1-A,JAVA
Missing,Group,missing.group.teacher@ump.ac.ma,2025/2026,GI1,UNKNOWN,JAVA
Missing,Module,missing.module.teacher@ump.ac.ma,2025/2026,GI1,GI1-A,UNKNOWN
Wrong,Domain,wrong.domain.teacher@gmail.com,2025/2026,GI1,GI1-A,JAVA
```

Expected behavior:

- Rows 2 to 5: valid teacher and assignment creation/update.
- Row 6: valid first occurrence for Omar.
- Row 7: duplicate assignment warning.
- Rows 8 to 13: rejected rows. No teacher and no assignment are created or updated for those rows.

## Email Validation

Student and teacher imports reject these email formats:

- `abc`
- `student@`
- `@test.com`
- `student..name@ump.ac.ma`
- `student name@ump.ac.ma`
- `student@ump..ac.ma`
- `student@.ump.ac.ma`
- `student.@ump.ac.ma`

Valid example:

```text
valid.u13@ump.ac.ma
```

## Import Result Fields

The frontend should display:

- `totalRows`
- `studentsCreated` / `teachersCreated`
- `studentsUpdated` / `teachersUpdated`
- `inscriptionsCreated` / `assignmentsCreated`
- `rowsRejected`
- `duplicatesSkipped`
- `warningsCount`
- `errorsCount`
- row-level `errors`
- row-level `warnings`

Status meanings:

- `SUCCESS`: no rejected rows
- `PARTIAL`: some rows succeeded and some rows failed
- `FAILED`: all rows failed

Do not show a generic success message when `errorsCount > 0` or `rowsRejected > 0`.

