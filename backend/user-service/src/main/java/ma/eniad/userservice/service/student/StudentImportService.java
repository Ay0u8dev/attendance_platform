package ma.eniad.userservice.service.student;

import ma.eniad.userservice.dto.student.excel.RowErrorDTO;
import ma.eniad.userservice.dto.student.excel.StudentExcelRowDTO;

import ma.eniad.userservice.dto.student.excel.StudentImportResultDTO;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.exception.InvalidExcelFileException;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.utils.excel.ExcelRowValidator;
import ma.eniad.userservice.utils.excel.StudentExcelParser;

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
public class StudentImportService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    private final StudentExcelParser parser;
    private final ExcelRowValidator validator;
    private final StudentMapper mapper;

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    @Transactional
    public StudentImportResultDTO importFromExcel(MultipartFile file) {
        validateFile(file);
        
        List<StudentExcelRowDTO> rows = parser.parse(file);

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

            /*
             * Duplicate apogee inside excel file
             */
            String normalizedApogee = row.getNumApogee().trim();
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

        /*
         * STEP 2
         * Collect rows without validation errors
         */
        List<StudentExcelRowDTO> validRows =
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

        Set<String> apogees =
            validRows.stream()
                .map(row ->
                    row.getNumApogee().trim()
                )
                .collect(HashSet::new, HashSet::add, HashSet::addAll);

        Set<String> existingEmails =
            userRepository.findExistingEmails(emails);

        Set<String> existingApogees =
            studentRepository.findExistingApogees(apogees);

        /*
         * STEP 4
         * Mark DB duplicates as errors
         */
        for (StudentExcelRowDTO row : validRows) {

            String normalizedEmail =
                row.getEmail()
                    .trim()
                    .toLowerCase();

            String normalizedApogee =
                row.getNumApogee()
                    .trim();

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

            if (existingApogees.contains(normalizedApogee)) {

                RowErrorDTO error = buildError(
                    row,
                    "numApogee",
                    "Apogee already exists"
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
        List<StudentExcelRowDTO> rowsToImport =
            rows.stream()
                .filter(row ->
                    !rowErrors.containsKey(
                        row.getRowNumber()
                    )
                )
                .toList();

        /*
         * STEP 6
         * Map rows to Student entities
         */
        List<Student> students =
            rowsToImport.stream()
                .map(this::mapToStudent)
                .toList();

        /*
         * STEP 7
         * Save all valid students
         */
        if (!students.isEmpty()) {
            studentRepository.saveAll(students);
        }

        /*
         * STEP 8
         * Return import summary
         */
        return StudentImportResultDTO.builder()
            .totalRows(rows.size())
            .importedRows(students.size())
            .failedRows(
                rows.size() - students.size()
            )
            .errors(errors)
            .build();
    }

    private Student mapToStudent(
        StudentExcelRowDTO row
    ) {

        String email = row.getEmail();
        if (email != null) {
            row.setEmail(email.trim().toLowerCase());
        }

        String numApogee = row.getNumApogee();
        if (numApogee != null) {
            row.setNumApogee(numApogee.trim());
        }

        Student student =
            mapper.toEntity(row);

        student.setRoles(
            new HashSet<>(Set.of(Role.STUDENT))
        );

        student.setEnabled(true);

        student.setFirstLogin(true);

        return student;
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

