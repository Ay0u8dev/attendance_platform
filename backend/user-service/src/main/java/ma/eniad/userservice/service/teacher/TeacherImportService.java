package ma.eniad.userservice.service.teacher;

import ma.eniad.userservice.dto.RowErrorDTO;
import ma.eniad.userservice.dto.teacher.excel.TeacherExcelRowDTO;

import ma.eniad.userservice.dto.teacher.excel.TeacherImportResultDTO;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.mapper.teacher.TeacherMapper;
import ma.eniad.userservice.exception.InvalidExcelFileException;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.utils.excel.teacher.TeacherExcelParser;
import ma.eniad.userservice.utils.excel.teacher.TeacherExcelRowValidator;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
    private final UserRepository userRepository;

    @Transactional
    public TeacherImportResultDTO importFromExcel(MultipartFile file) {
        validateFile(file);
        
        List<TeacherExcelRowDTO> rows = parser.parse(file);

        List<RowErrorDTO> errors = new ArrayList<>();


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
            String normalizedEmail = row.getEmail().trim().toLowerCase();
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

        /*
         * STEP 2
         * Collect rows without validation errors
         */
        List<TeacherExcelRowDTO> validRows =
            rows.stream()
                .filter(row ->
                    !rowErrors.containsKey(
                        row.getRowNumber()
                    )
                )
                .toList();

        /*
         * STEP 3
         * Check duplicates in database
         */
        Set<String> emails =
            validRows.stream()
                .map(row ->
                    row.getEmail()
                        .trim()
                        .toLowerCase()
                )
                .collect(HashSet::new, HashSet::add, HashSet::addAll);

        Set<String> existingEmails =
            userRepository.findExistingEmails(emails);

        /*
         * STEP 4
         * Mark DB duplicates as errors
         */
        for (TeacherExcelRowDTO row : validRows) {

            String normalizedEmail =
                row.getEmail()
                    .trim()
                    .toLowerCase();

            if (existingEmails.contains(normalizedEmail)) {

                RowErrorDTO error = buildError(
                    row,
                    "email",
                    "Email already exists"
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

        /*
         * STEP 5
         * Keep only rows without ANY error
         */
        List<TeacherExcelRowDTO> rowsToImport =
            rows.stream()
                .filter(row ->
                    !rowErrors.containsKey(
                        row.getRowNumber()
                    )
                )
                .toList();

        /*
         * STEP 6
         * Map rows to Teacher entities
         */
        List<Teacher> teachers =
            rowsToImport.stream()
                .map(this::mapToTeacher)
                .toList();

        /*
         * STEP 7
         * Save all valid teachers
         */
        if (!teachers.isEmpty()) {
            teacherRepository.saveAll(teachers);
        }

        /*
         * STEP 8
         * Return import summary
         */
        return TeacherImportResultDTO.builder()
            .totalRows(rows.size())
            .importedRows(teachers.size())
            .failedRows(
                rows.size() - teachers.size()
            )
            .errors(errors)
            .build();
    }

    private Teacher mapToTeacher(
        TeacherExcelRowDTO row
    ) {

        String email = row.getEmail();
        if (email != null) {
            row.setEmail(email.trim().toLowerCase());
        }

        Teacher teacher =
            mapper.toEntity(row);

        teacher.setRoles(
            new HashSet<>(Set.of(Role.TEACHER))
        );

        teacher.setEnabled(true);

        teacher.setFirstLogin(true);

        return teacher;
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

