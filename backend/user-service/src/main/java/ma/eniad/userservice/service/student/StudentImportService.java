package ma.eniad.userservice.service.student;

import ma.eniad.userservice.dto.excel.RowErrorDTO;
import ma.eniad.userservice.dto.student.StudentChangeDTO;
import ma.eniad.userservice.dto.student.StudentExcelRowDTO;
import ma.eniad.userservice.dto.student.StudentImportResultDTO;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.exception.InvalidExcelFileException;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.utils.excel.student.StudentExcelRowValidator;
import ma.eniad.userservice.utils.excel.student.StudentExcelParser;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import ma.eniad.userservice.entity.enums.Role;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class StudentImportService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    private final StudentExcelParser parser;
    private final StudentExcelRowValidator validator;
    private final StudentMapper mapper;

    private final StudentRepository studentRepository;

    @Transactional
    public StudentImportResultDTO importFromExcel(MultipartFile file) {
        validateFile(file);
        
        List<StudentExcelRowDTO> rows = parser.parse(file);

        List<RowErrorDTO> errors = new ArrayList<>();
        List<StudentChangeDTO> changes = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        /*
         * Keeps track of rows that contain errors.
         * Key = row number in excel
         */
        Map<Integer, List<RowErrorDTO>> rowErrors = new HashMap<>();

        /*
         * Detect duplicates INSIDE the uploaded excel file
         */
        Set<String> seenEmails = new HashSet<>();
        Set<String> seenApogees = new HashSet<>();

        /*
         * STEP 1
         * Validate each row
         */
        for (StudentExcelRowDTO row : rows) {

            List<RowErrorDTO> validationErrors =
                validator.validate(row);

            if (!validationErrors.isEmpty()) {

                errors.addAll(validationErrors);

                rowErrors.put(
                    row.getRowNumber(),
                    validationErrors
                );

                continue;
            }

            /*
             * Duplicate email inside excel file
             */
            String normalizedEmail = normalizeEmail(row.getEmail());
            if (!seenEmails.add(normalizedEmail)) {

                RowErrorDTO error = buildError(
                    row,
                    "email",
                    "Duplicate email inside file"
                );

                errors.add(error);

                rowErrors
                    .computeIfAbsent(
                        row.getRowNumber(),
                        key -> new ArrayList<>()
                    )
                    .add(error);
            }

            /*
             * Duplicate apogee inside excel file
             */
            String normalizedApogee = normalizeApogee(row.getNumApogee());
            if (!seenApogees.add(normalizedApogee)) {

                RowErrorDTO error = buildError(
                    row,
                    "numApogee",
                    "Duplicate apogee inside file"
                );

                errors.add(error);

                rowErrors
                    .computeIfAbsent(
                        row.getRowNumber(),
                        key -> new ArrayList<>()
                    )
                    .add(error);
            }
        }

        int createdStudents = 0;
        int updatedStudents = 0;

        List<Student> studentsToCreate = new ArrayList<>();
        List<Student> studentsToUpdate = new ArrayList<>();

        /*
         * STEP 2
         * Apply import rules per valid row
         */
        for (StudentExcelRowDTO row : rows) {

            if (rowErrors.containsKey(row.getRowNumber())) {
                continue;
            }

            normalizeRow(row);

            String email = row.getEmail();
            String apogee = row.getNumApogee();

            Optional<Student> studentByEmail =
                studentRepository.findByEmailIgnoreCase(email);

            Optional<Student> studentByApogee =
                studentRepository.findByNumApogee(apogee);

            if (studentByEmail.isEmpty() && studentByApogee.isEmpty()) {
                Student student = mapToStudent(row);

                studentsToCreate.add(student);
                createdStudents++;

                changes.add(buildChange(
                    row,
                    "CREATED",
                    List.of("Created student")
                ));

                continue;
            }

            if (studentByEmail.isPresent()
                && studentByApogee.isPresent()
                && studentByEmail.get().getId().equals(studentByApogee.get().getId())) {

                Student student = studentByEmail.get();
                List<String> nameChanges = applyNameUpdates(student, row);

                if (!nameChanges.isEmpty()) {
                    studentsToUpdate.add(student);
                    updatedStudents++;

                    changes.add(buildChange(
                        row,
                        "UPDATED",
                        nameChanges
                    ));
                } else {
                    changes.add(buildChange(
                        row,
                        "SKIPPED",
                        List.of("No changes detected")
                    ));
                }

                continue;
            }

            if (studentByEmail.isPresent() && studentByApogee.isPresent()) {
                addRowError(
                    row,
                    "row",
                    "Email and apogee belong to different students",
                    errors,
                    rowErrors
                );
                continue;
            }

            if (studentByEmail.isPresent()) {
                addRowError(
                    row,
                    "email",
                    "Email already exists with a different apogee",
                    errors,
                    rowErrors
                );
                continue;
            }

            if (studentByApogee.isPresent()) {
                addRowError(
                    row,
                    "numApogee",
                    "Apogee already exists with a different email",
                    errors,
                    rowErrors
                );
                continue;
            }

            addRowError(
                row,
                "row",
                "Unable to import row",
                errors,
                rowErrors
            );
        }

        /*
         * STEP 3
         * Persist changes
         */
        if (!studentsToCreate.isEmpty()) {
            studentRepository.saveAll(studentsToCreate);
        }

        if (!studentsToUpdate.isEmpty()) {
            studentRepository.saveAll(studentsToUpdate);
        }

        int failedRows = rowErrors.size();

        /*
         * STEP 4
         * Return import summary
         */
        return StudentImportResultDTO.builder()
            .fileName(file.getOriginalFilename())
            .importedAt(LocalDateTime.now())
            .totalRows(rows.size())
            .createdStudents(createdStudents)
            .updatedStudents(updatedStudents)
            .failedRows(failedRows)
            .status(resolveStatus(createdStudents, updatedStudents, failedRows))
            .changes(changes)
            .errors(errors)
            .warnings(warnings)
            .build();
    }

    private Student mapToStudent(
        StudentExcelRowDTO row
    ) {
        normalizeRow(row);

        Student student =
            mapper.toEntity(row);

        student.setRoles(
            new HashSet<>(Set.of(Role.STUDENT))
        );

        student.setEnabled(true);

        student.setFirstLogin(true);

        return student;
    }

    private void normalizeRow(StudentExcelRowDTO row) {
        String email = row.getEmail();
        if (email != null) {
            row.setEmail(normalizeEmail(email));
        }

        String numApogee = row.getNumApogee();
        if (numApogee != null) {
            row.setNumApogee(normalizeApogee(numApogee));
        }

        String firstName = row.getFirstName();
        if (firstName != null) {
            row.setFirstName(firstName.trim());
        }

        String lastName = row.getLastName();
        if (lastName != null) {
            row.setLastName(lastName.trim());
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String normalizeApogee(String numApogee) {
        return numApogee == null ? null : numApogee.trim();
    }

    private List<String> applyNameUpdates(
        Student student,
        StudentExcelRowDTO row
    ) {
        List<String> changes = new ArrayList<>();

        String newFirstName = row.getFirstName();
        String newLastName = row.getLastName();

        if (newFirstName != null && !newFirstName.equals(student.getFirstName())) {
            changes.add(buildChangeDetail("firstName", student.getFirstName(), newFirstName));
            student.setFirstName(newFirstName);
        }

        if (newLastName != null && !newLastName.equals(student.getLastName())) {
            changes.add(buildChangeDetail("lastName", student.getLastName(), newLastName));
            student.setLastName(newLastName);
        }

        return changes;
    }

    private String buildChangeDetail(String field, String oldValue, String newValue) {
        String safeOldValue = oldValue == null ? "" : oldValue;
        String safeNewValue = newValue == null ? "" : newValue;
        return field + ": '" + safeOldValue + "' -> '" + safeNewValue + "'";
    }

    private StudentChangeDTO buildChange(
        StudentExcelRowDTO row,
        String action,
        List<String> changes
    ) {
        return StudentChangeDTO.builder()
            .rowNumber(row.getRowNumber())
            .apogee(row.getNumApogee())
            .email(row.getEmail())
            .action(action)
            .changes(changes)
            .build();
    }

    private void addRowError(
        StudentExcelRowDTO row,
        String field,
        String message,
        List<RowErrorDTO> errors,
        Map<Integer, List<RowErrorDTO>> rowErrors
    ) {
        RowErrorDTO error = buildError(row, field, message);

        errors.add(error);

        rowErrors
            .computeIfAbsent(row.getRowNumber(), key -> new ArrayList<>())
            .add(error);
    }

    private String resolveStatus(
        int createdStudents,
        int updatedStudents,
        int failedRows
    ) {
        if (failedRows == 0) {
            return "SUCCESS";
        }

        if (createdStudents == 0 && updatedStudents == 0) {
            return "FAILED";
        }

        return "PARTIAL";
    }

    private RowErrorDTO buildError(
        StudentExcelRowDTO row,
        String field,
        String message
    ) {

        return RowErrorDTO.builder()
            .rowNumber(row.getRowNumber())
            .field(field)
            .message(message)
            .build();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidExcelFileException("Excel file is empty");
        }

        String filename = file.getOriginalFilename();

        if (filename == null || !filename.endsWith(".xlsx")) {
            throw new InvalidExcelFileException("Only .xlsx files are allowed");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidExcelFileException("File size exceeds 10MB");
        }
    }
}

