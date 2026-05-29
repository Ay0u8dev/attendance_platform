package ma.eniad.userservice.service.teacher;

import ma.eniad.userservice.dto.excel.RowErrorDTO;
import ma.eniad.userservice.dto.teacher.TeacherChangeDTO;
import ma.eniad.userservice.dto.teacher.TeacherExcelRowDTO;
import ma.eniad.userservice.dto.teacher.TeacherImportResultDTO;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.mapper.teacher.TeacherMapper;
import ma.eniad.userservice.exception.InvalidExcelFileException;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.utils.excel.teacher.TeacherExcelParser;
import ma.eniad.userservice.utils.excel.teacher.TeacherExcelRowValidator;

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
public class TeacherImportService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    private final TeacherExcelParser parser;
    private final TeacherExcelRowValidator validator;
    private final TeacherMapper mapper;

    private final TeacherRepository teacherRepository;

    @Transactional
    public TeacherImportResultDTO importFromExcel(MultipartFile file) {
        validateFile(file);
        
        List<TeacherExcelRowDTO> rows = parser.parse(file);

        List<RowErrorDTO> errors = new ArrayList<>();
        List<TeacherChangeDTO> changes = new ArrayList<>();
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
        /*
         * STEP 1
         * Validate each row
         */
        for (TeacherExcelRowDTO row : rows) {

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
        }

        int createdTeachers = 0;
        int updatedTeachers = 0;

        List<Teacher> teachersToCreate = new ArrayList<>();
        List<Teacher> teachersToUpdate = new ArrayList<>();

        /*
         * STEP 2
         * Apply import rules per valid row
         */
        for (TeacherExcelRowDTO row : rows) {

            if (rowErrors.containsKey(row.getRowNumber())) {
                continue;
            }

            normalizeRow(row);

            String email = row.getEmail();
            Optional<Teacher> teacherByEmail =
                teacherRepository.findByEmailIgnoreCase(email);

            if (teacherByEmail.isEmpty()) {
                Teacher teacher = mapToTeacher(row);

                teachersToCreate.add(teacher);
                createdTeachers++;

                changes.add(buildChange(
                    row,
                    "CREATED",
                    List.of("Created teacher")
                ));

                continue;
            }

            Teacher teacher = teacherByEmail.get();
            List<String> nameChanges = applyNameUpdates(teacher, row);

            if (!nameChanges.isEmpty()) {
                teachersToUpdate.add(teacher);
                updatedTeachers++;

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
        }

        /*
         * STEP 3
         * Persist changes
         */
        if (!teachersToCreate.isEmpty()) {
            teacherRepository.saveAll(teachersToCreate);
        }

        if (!teachersToUpdate.isEmpty()) {
            teacherRepository.saveAll(teachersToUpdate);
        }

        int failedRows = rowErrors.size();

        /*
         * STEP 4
         * Return import summary
         */
        return TeacherImportResultDTO.builder()
            .fileName(file.getOriginalFilename())
            .importedAt(LocalDateTime.now())
            .totalRows(rows.size())
            .createdTeachers(createdTeachers)
            .updatedTeachers(updatedTeachers)
            .failedRows(failedRows)
            .status(resolveStatus(createdTeachers, updatedTeachers, failedRows))
            .changes(changes)
            .errors(errors)
            .warnings(warnings)
            .build();
    }

    private Teacher mapToTeacher(
        TeacherExcelRowDTO row
    ) {
        normalizeRow(row);

        Teacher teacher =
            mapper.toEntity(row);

        teacher.setRoles(
            new HashSet<>(Set.of(Role.TEACHER))
        );

        teacher.setEnabled(true);

        teacher.setFirstLogin(true);

        return teacher;
    }

    private void normalizeRow(TeacherExcelRowDTO row) {
        row.setEmail(normalizeEmail(row.getEmail()));
        row.setFirstName(normalizeName(row.getFirstName()));
        row.setLastName(normalizeName(row.getLastName()));
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }

        return email.trim().toLowerCase();
    }

    private String normalizeName(String name) {
        if (name == null) {
            return null;
        }

        return name.trim();
    }

    private List<String> applyNameUpdates(
        Teacher teacher,
        TeacherExcelRowDTO row
    ) {
        List<String> changes = new ArrayList<>();

        String newFirstName = row.getFirstName();
        String newLastName = row.getLastName();

        if (newFirstName != null && !newFirstName.equals(teacher.getFirstName())) {
            changes.add(buildChangeDetail("firstName", teacher.getFirstName(), newFirstName));
            teacher.setFirstName(newFirstName);
        }

        if (newLastName != null && !newLastName.equals(teacher.getLastName())) {
            changes.add(buildChangeDetail("lastName", teacher.getLastName(), newLastName));
            teacher.setLastName(newLastName);
        }

        return changes;
    }

    private String buildChangeDetail(String field, String oldValue, String newValue) {
        String safeOldValue = oldValue == null ? "" : oldValue;
        String safeNewValue = newValue == null ? "" : newValue;
        return field + ": '" + safeOldValue + "' -> '" + safeNewValue + "'";
    }

    private TeacherChangeDTO buildChange(
        TeacherExcelRowDTO row,
        String action,
        List<String> changes
    ) {
        return TeacherChangeDTO.builder()
            .rowNumber(row.getRowNumber())
            .email(row.getEmail())
            .action(action)
            .changes(changes)
            .build();
    }

    private String resolveStatus(
        int createdTeachers,
        int updatedTeachers,
        int failedRows
    ) {
        if (failedRows == 0) {
            return "SUCCESS";
        }

        if (createdTeachers == 0 && updatedTeachers == 0) {
            return "FAILED";
        }

        return "PARTIAL";
    }

    private RowErrorDTO buildError(
        TeacherExcelRowDTO row,
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

