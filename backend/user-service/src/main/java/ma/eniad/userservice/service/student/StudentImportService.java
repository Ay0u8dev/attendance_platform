package ma.eniad.userservice.service.student;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.excel.RowErrorDTO;
import ma.eniad.userservice.dto.student.StudentChangeDTO;
import ma.eniad.userservice.dto.student.StudentExcelRowDTO;
import ma.eniad.userservice.dto.student.StudentImportResultDTO;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.exception.InvalidExcelFileException;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.utils.excel.student.StudentExcelParser;
import ma.eniad.userservice.utils.excel.student.StudentExcelRowValidator;

@Service
@RequiredArgsConstructor
@Transactional
public class StudentImportService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    private final StudentExcelParser parser;
    private final StudentExcelRowValidator validator;
    private final StudentMapper mapper;

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AnneeUniversitaireRepository anneeUniversitaireRepository;
    private final FormationRepository formationRepository;
    private final GroupeRepository groupeRepository;
    private final StudentInscriptionRepository inscriptionRepository;

    @Transactional
    public StudentImportResultDTO importFromExcel(MultipartFile file) {
        validateFile(file);

        long startedAt = System.currentTimeMillis();

        List<StudentExcelRowDTO> rows = parser.parse(file);
        List<RowErrorDTO> errors = new ArrayList<>();
        List<StudentChangeDTO> changes = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Map<Integer, List<RowErrorDTO>> rowErrors = new HashMap<>();

        Set<String> seenEmails = new HashSet<>();
        Set<String> seenApogees = new HashSet<>();

        for (StudentExcelRowDTO row : rows) {
            normalizeRow(row);

            List<RowErrorDTO> validationErrors = validator.validate(row);
            if (!validationErrors.isEmpty()) {
                addValidationErrors(validationErrors, errors, rowErrors);
                continue;
            }

            String normalizedEmail = row.getEmail();
            if (!seenEmails.add(normalizedEmail)) {
                addRowError(row, "email", "Duplicate email inside file", errors, rowErrors);
            }

            String normalizedApogee = row.getNumApogee();
            if (!seenApogees.add(normalizedApogee)) {
                addRowError(row, "numApogee", "Duplicate apogee inside file", errors, rowErrors);
            }
        }

        List<StudentExcelRowDTO> validRows = rows.stream()
            .filter(row -> !rowErrors.containsKey(row.getRowNumber()))
            .toList();

        Set<String> emails = new HashSet<>();
        Set<String> apogees = new HashSet<>();
        Set<String> academicYears = new HashSet<>();
        Set<String> formationNames = new HashSet<>();
        Set<String> groupeCodes = new HashSet<>();

        for (StudentExcelRowDTO row : validRows) {
            emails.add(row.getEmail());
            apogees.add(row.getNumApogee());
            academicYears.add(row.getAcademicYear());
            formationNames.add(row.getFormationName());
            groupeCodes.add(row.getGroupeCode());
        }

        Map<String, Student> studentsByEmail = new HashMap<>();
        if (!emails.isEmpty()) {
            for (Student student : studentRepository.findByEmailIn(emails)) {
                studentsByEmail.put(normalizeEmail(student.getEmail()), student);
            }
        }

        Map<String, User> usersByEmail = new HashMap<>();
        if (!emails.isEmpty()) {
            for (User user : userRepository.findByNormalizedEmailIn(emails)) {
                usersByEmail.put(normalizeEmail(user.getEmail()), user);
            }
        }

        Set<String> nonStudentEmails = usersByEmail.keySet().stream()
            .filter(email -> !studentsByEmail.containsKey(email))
            .collect(Collectors.toSet());

        Map<String, Student> studentsByApogee = new HashMap<>();
        if (!apogees.isEmpty()) {
            for (Student student : studentRepository.findByNumApogeeIn(apogees)) {
                studentsByApogee.put(normalizeApogee(student.getNumApogee()), student);
            }
        }

        Map<String, AnneeUniversitaire> yearsByName = new HashMap<>();
        if (!academicYears.isEmpty()) {
            for (AnneeUniversitaire year : anneeUniversitaireRepository.findByNameIn(academicYears)) {
                yearsByName.put(year.getName(), year);
            }
        }

        Map<String, List<Formation>> formationsByName = new HashMap<>();
        if (!formationNames.isEmpty()) {
            formationsByName = formationRepository.findByNameIn(formationNames).stream()
                .collect(Collectors.groupingBy(Formation::getName));
        }

        Map<String, Groupe> groupesByCode = new HashMap<>();
        if (!groupeCodes.isEmpty()) {
            for (Groupe groupe : groupeRepository.findByNameIn(groupeCodes)) {
                groupesByCode.put(groupe.getName(), groupe);
            }
        }

        Set<Long> studentIds = new HashSet<>();
        for (Student student : studentsByEmail.values()) {
            studentIds.add(student.getId());
        }
        for (Student student : studentsByApogee.values()) {
            studentIds.add(student.getId());
        }

        Set<Long> yearIds = new HashSet<>();
        for (AnneeUniversitaire year : yearsByName.values()) {
            yearIds.add(year.getId());
        }

        Set<String> existingEnrollmentKeys = new HashSet<>();
        if (!studentIds.isEmpty() && !yearIds.isEmpty()) {
            for (Object[] pair : inscriptionRepository.findExistingStudentYearPairs(studentIds, yearIds)) {
                Long studentId = (Long) pair[0];
                Long yearId = (Long) pair[1];
                existingEnrollmentKeys.add(studentId + ":" + yearId);
            }
        }

        List<Student> studentsToCreate = new ArrayList<>();
        List<Student> studentsToUpdate = new ArrayList<>();
        List<Inscription> inscriptionsToCreate = new ArrayList<>();
        Set<String> plannedEnrollmentKeys = new HashSet<>();

        int createdStudents = 0;
        int updatedStudents = 0;
        int createdInscriptions = 0;
        int duplicateInscriptions = 0;
        int missingAcademicYears = 0;
        int missingFormations = 0;
        int missingGroups = 0;

        for (StudentExcelRowDTO row : validRows) {
            if (nonStudentEmails.contains(row.getEmail())) {
                addRowError(row, "email", "Email belongs to a non-student user.", errors, rowErrors);
                continue;
            }

            Student student = studentsByEmail.get(row.getEmail());
            Student studentByApogee = studentsByApogee.get(row.getNumApogee());

            Student resolvedStudent;
            if (student == null && studentByApogee == null) {
                resolvedStudent = mapToStudent(row);
                studentsToCreate.add(resolvedStudent);
                createdStudents++;
                changes.add(buildChange(row, "CREATED", List.of("Created student")));
            } else if (student != null && studentByApogee != null) {
                if (student.getId().equals(studentByApogee.getId())) {
                    resolvedStudent = student;
                    List<String> nameChanges = applyNameUpdates(resolvedStudent, row);
                    if (!nameChanges.isEmpty()) {
                        updatedStudents++;
                        studentsToUpdate.add(resolvedStudent);
                        warnings.add(buildRowWarning(row, "Student information updated."));
                        changes.add(buildChange(row, "UPDATED", nameChanges));
                    } else {
                        changes.add(buildChange(row, "SKIPPED", List.of("Student information already up to date.")));
                    }                } else {
                    addRowError(row, "row", "Email and NumApogee belong to different students.", errors, rowErrors);
                    continue;
                }
            } else if (student != null) {
                addRowError(row, "email", "Email matches existing student, but NumApogee does not match that student's NumApogee.", errors, rowErrors);
                continue;
            } else {
                addRowError(row, "numApogee", "NumApogee matches existing student, but email does not match that student's email.", errors, rowErrors);
                continue;
            }

            AnneeUniversitaire year = yearsByName.get(row.getAcademicYear());
            if (year == null) {
                addRowError(row, "academicYear", "Academic year not found.", errors, rowErrors);
                missingAcademicYears++;
                continue;
            }

            List<Formation> formationCandidates = formationsByName.get(row.getFormationName());
            Formation formation = resolveFormation(formationCandidates, year);
            if (formation == null) {
                if (formationCandidates == null || formationCandidates.isEmpty()) {
                    addRowError(row, "formationName", "Formation not found.", errors, rowErrors);
                    missingFormations++;
                } else {
                    addRowError(
                        row,
                        "formationName",
                        "Formation does not belong to specified academic year.",
                        errors,
                        rowErrors
                    );
                }
                continue;
            }

            Groupe groupe = groupesByCode.get(row.getGroupeCode());
            if (groupe == null) {
                addRowError(row, "groupeCode", "Groupe not found.", errors, rowErrors);
                missingGroups++;
                continue;
            }

            if (!groupe.getFormation().getId().equals(formation.getId())) {
                addRowError(
                    row,
                    "groupeCode",
                    "Groupe does not belong to specified formation.",
                    errors,
                    rowErrors
                );
                continue;
            }

            String enrollmentKey = buildEnrollmentKey(resolvedStudent, year);
            if (existingEnrollmentKeys.contains(enrollmentKey) || !plannedEnrollmentKeys.add(enrollmentKey)) {
                duplicateInscriptions++;
                warnings.add(buildRowWarning(row, "Student already enrolled for this academic year."));
                continue;
            }

            Inscription inscription = new Inscription();
            inscription.setStudent(resolvedStudent);
            inscription.setAnneeUniversitaire(year);
            inscription.setFormation(formation);
            inscription.setGroupe(groupe);
            inscriptionsToCreate.add(inscription);
        }

        if (!studentsToCreate.isEmpty()) {
            studentRepository.saveAll(studentsToCreate);
        }

        if (!studentsToUpdate.isEmpty()) {
            studentRepository.saveAll(studentsToUpdate);
        }

        if (!inscriptionsToCreate.isEmpty()) {
            inscriptionRepository.saveAll(inscriptionsToCreate);
            createdInscriptions = inscriptionsToCreate.size();
        }

        int failedRows = rowErrors.size();
        int successfulRows = rows.size() - failedRows;

        return StudentImportResultDTO.builder()
            .fileName(file.getOriginalFilename())
            .importedAt(LocalDateTime.now())
            .totalRows(rows.size())
            .successfulRows(successfulRows)
            .createdStudents(createdStudents)
            .updatedStudents(updatedStudents)
            .createdInscriptions(createdInscriptions)
            .duplicateInscriptions(duplicateInscriptions)
            .failedRows(failedRows)
            .missingAcademicYears(missingAcademicYears)
            .missingFormations(missingFormations)
            .missingGroups(missingGroups)
            .processingTimeMs(System.currentTimeMillis() - startedAt)
            .status(resolveStatus(successfulRows, failedRows))
            .changes(changes)
            .errors(errors)
            .warnings(warnings)
            .build();
    }

    private Student mapToStudent(StudentExcelRowDTO row) {
        Student student = mapper.toEntity(row);
        student.setRoles(new HashSet<>(Set.of(Role.STUDENT)));
        student.setEnabled(true);
        student.setFirstLogin(true);
        return student;
    }

    private Formation resolveFormation(List<Formation> candidates, AnneeUniversitaire year) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
            .filter(candidate -> candidate.getAnneeUniversitaire() != null)
            .filter(candidate -> candidate.getAnneeUniversitaire().getId().equals(year.getId()))
            .findFirst()
            .orElse(null);
    }

    private void normalizeRow(StudentExcelRowDTO row) {
        row.setEmail(normalizeEmail(row.getEmail()));
        row.setNumApogee(normalizeApogee(row.getNumApogee()));
        row.setFirstName(normalizeValue(row.getFirstName()));
        row.setLastName(normalizeValue(row.getLastName()));
        row.setAcademicYear(normalizeValue(row.getAcademicYear()));
        row.setFormationName(normalizeValue(row.getFormationName()));
        row.setGroupeCode(normalizeValue(row.getGroupeCode()));
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String normalizeApogee(String numApogee) {
        return numApogee == null ? null : numApogee.trim();
    }

    private String normalizeValue(String value) {
        return value == null ? null : value.trim();
    }

    private List<String> applyNameUpdates(Student student, StudentExcelRowDTO row) {
        List<String> changes = new ArrayList<>();

        if (row.getFirstName() != null && !row.getFirstName().equals(student.getFirstName())) {
            changes.add(buildChangeDetail("firstName", student.getFirstName(), row.getFirstName()));
            student.setFirstName(row.getFirstName());
        }

        if (row.getLastName() != null && !row.getLastName().equals(student.getLastName())) {
            changes.add(buildChangeDetail("lastName", student.getLastName(), row.getLastName()));
            student.setLastName(row.getLastName());
        }

        return changes;
    }

    private String buildChangeDetail(String field, String oldValue, String newValue) {
        String safeOldValue = oldValue == null ? "" : oldValue;
        String safeNewValue = newValue == null ? "" : newValue;
        return field + ": '" + safeOldValue + "' -> '" + safeNewValue + "'";
    }

    private StudentChangeDTO buildChange(StudentExcelRowDTO row, String action, List<String> changes) {
        return StudentChangeDTO.builder()
            .rowNumber(row.getRowNumber())
            .apogee(row.getNumApogee())
            .email(row.getEmail())
            .action(action)
            .changes(changes)
            .build();
    }

    private String buildEnrollmentKey(Student student, AnneeUniversitaire year) {
        if (student.getId() != null) {
            return student.getId() + ":" + year.getId();
        }
        return student.getEmail() + "|" + student.getNumApogee() + ":" + year.getId();
    }

    private void addValidationErrors(List<RowErrorDTO> validationErrors,
                                     List<RowErrorDTO> errors,
                                     Map<Integer, List<RowErrorDTO>> rowErrors) {
        for (RowErrorDTO validationError : validationErrors) {
            errors.add(validationError);
            rowErrors.computeIfAbsent(validationError.getRowNumber(), key -> new ArrayList<>()).add(validationError);
        }
    }

    private void addRowError(StudentExcelRowDTO row,
                             String field,
                             String message,
                             List<RowErrorDTO> errors,
                             Map<Integer, List<RowErrorDTO>> rowErrors) {
        RowErrorDTO error = buildError(row, field, message);
        errors.add(error);
        rowErrors.computeIfAbsent(row.getRowNumber(), key -> new ArrayList<>()).add(error);
    }

    private String buildRowWarning(StudentExcelRowDTO row, String message) {
        return "Row " + row.getRowNumber() + " -> " + message;
    }

    private String resolveStatus(int successfulRows, int failedRows) {
        if (failedRows == 0) {
            return "SUCCESS";
        }
        if (successfulRows == 0) {
            return "FAILED";
        }
        return "PARTIAL";
    }

    private RowErrorDTO buildError(StudentExcelRowDTO row, String field, String message) {
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
