package ma.eniad.userservice.service.teacher;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.excel.RowErrorDTO;
import ma.eniad.userservice.dto.teacher.TeacherChangeDTO;
import ma.eniad.userservice.dto.teacher.TeacherExcelRowDTO;
import ma.eniad.userservice.dto.teacher.TeacherImportResultDTO;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.TeacherAssignment;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.entity.structure.Module;
import ma.eniad.userservice.exception.InvalidExcelFileException;
import ma.eniad.userservice.mapper.inscription.TeacherAssignmentMapper;
import ma.eniad.userservice.mapper.teacher.TeacherMapper;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.TeacherAssignmentRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.repository.structure.ModuleRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.utils.excel.teacher.TeacherExcelParser;
import ma.eniad.userservice.utils.excel.teacher.TeacherExcelRowValidator;

@Service
@RequiredArgsConstructor
public class TeacherImportService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    private final TeacherExcelParser parser;
    private final TeacherExcelRowValidator validator;
    private final TeacherMapper teacherMapper;
    private final TeacherAssignmentMapper assignmentMapper;
    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final AnneeUniversitaireRepository yearRepository;
    private final FormationRepository formationRepository;
    private final GroupeRepository groupeRepository;
    private final ModuleRepository moduleRepository;
    private final TeacherAssignmentRepository assignmentRepository;

    @Transactional
    public TeacherImportResultDTO importFromExcel(MultipartFile file) {
        validateFile(file);
        long startedAt = System.currentTimeMillis();

        List<TeacherExcelRowDTO> rows = parser.parse(file);
        List<RowErrorDTO> errors = new ArrayList<>();
        List<TeacherChangeDTO> changes = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Set<Integer> failedRowNumbers = new HashSet<>();

        for (TeacherExcelRowDTO row : rows) {
            normalizeRow(row);
            for (RowErrorDTO error : validator.validate(row)) {
                errors.add(error);
                failedRowNumbers.add(row.getRowNumber());
            }
        }

        List<TeacherExcelRowDTO> validRows = rows.stream()
            .filter(row -> !failedRowNumbers.contains(row.getRowNumber()))
            .toList();

        LookupData lookups = loadLookups(validRows);
        Set<String> nonTeacherEmails = lookups.usersByEmail.keySet().stream()
            .filter(email -> !lookups.teachersByEmail.containsKey(email))
            .collect(Collectors.toSet());

        List<Teacher> teachersToCreate = new ArrayList<>();
        List<Teacher> teachersToUpdate = new ArrayList<>();
        List<ResolvedRow> resolvedRows = new ArrayList<>();

        Counters counters = new Counters();
        for (TeacherExcelRowDTO row : validRows) {
            if (nonTeacherEmails.contains(row.getEmail())) {
                addError(row, "email", "Email belongs to a non-teacher user.", errors, failedRowNumbers);
                counters.nonTeacherEmailConflicts++;
                continue;
            }

            ResolvedStructure structure = resolveStructure(row, lookups, errors, failedRowNumbers, counters);
            if (structure == null) {
                continue;
            }

            Teacher teacher = lookups.teachersByEmail.get(row.getEmail());
            if (teacher == null) {
                teacher = mapToTeacher(row);
                lookups.teachersByEmail.put(row.getEmail(), teacher);
                teachersToCreate.add(teacher);
                counters.createdTeachers++;
                changes.add(change(row, "TEACHER", row.getEmail(), "CREATED", List.of("Created teacher")));
            } else {
                List<String> nameChanges = applyNameUpdates(teacher, row);
                if (!nameChanges.isEmpty()) {
                    if (teacher.getId() != null && !teachersToUpdate.contains(teacher)) {
                        teachersToUpdate.add(teacher);
                        counters.updatedTeachers++;
                    }
                    warnings.add(rowWarning(row, "Teacher information updated."));
                    changes.add(change(row, "TEACHER", row.getEmail(), "UPDATED", nameChanges));
                }
            }

            resolvedRows.add(new ResolvedRow(row, teacher, structure));
        }

        if (!teachersToCreate.isEmpty()) {
            teacherRepository.saveAll(teachersToCreate);
        }
        if (!teachersToUpdate.isEmpty()) {
            teacherRepository.saveAll(teachersToUpdate);
        }

        Set<String> existingAssignmentKeys = loadExistingAssignmentKeys(resolvedRows);
        Set<String> assignmentsSeenInFile = new HashSet<>();
        List<TeacherAssignment> assignmentsToCreate = new ArrayList<>();

        for (ResolvedRow resolved : resolvedRows) {
            String key = assignmentKey(resolved);
            if (!assignmentsSeenInFile.add(key)) {
                counters.duplicateAssignmentsInsideFile++;
                warnings.add(rowWarning(resolved.row, "Duplicate assignment inside file."));
                changes.add(assignmentChange(resolved, "SKIPPED", "Duplicate assignment inside file."));
                continue;
            }
            if (existingAssignmentKeys.contains(key)) {
                counters.duplicateAssignments++;
                warnings.add(rowWarning(resolved.row, "Teacher assignment already exists."));
                changes.add(assignmentChange(resolved, "SKIPPED", "Teacher assignment already exists."));
                continue;
            }

            assignmentsToCreate.add(assignmentMapper.toEntity(
                resolved.teacher,
                resolved.structure.year,
                resolved.structure.formation,
                resolved.structure.groupe,
                resolved.structure.module
            ));
            counters.createdAssignments++;
            changes.add(assignmentChange(resolved, "ASSIGNMENT_CREATED", "Created teacher assignment."));
        }

        if (!assignmentsToCreate.isEmpty()) {
            assignmentRepository.saveAll(assignmentsToCreate);
        }

        int failedRows = failedRowNumbers.size();
        int successfulRows = rows.size() - failedRows;
        return TeacherImportResultDTO.builder()
            .fileName(file.getOriginalFilename())
            .importedAt(LocalDateTime.now())
            .processingTimeMs(System.currentTimeMillis() - startedAt)
            .totalRows(rows.size())
            .successfulRows(successfulRows)
            .failedRows(failedRows)
            .createdTeachers(counters.createdTeachers)
            .updatedTeachers(counters.updatedTeachers)
            .createdAssignments(counters.createdAssignments)
            .duplicateAssignments(counters.duplicateAssignments)
            .duplicateAssignmentsInsideFile(counters.duplicateAssignmentsInsideFile)
            .teachersCreated(counters.createdTeachers)
            .teachersUpdated(counters.updatedTeachers)
            .assignmentsCreated(counters.createdAssignments)
            .rowsRejected(failedRows)
            .duplicatesSkipped(counters.duplicateAssignments + counters.duplicateAssignmentsInsideFile)
            .warningsCount(warnings.size())
            .errorsCount(errors.size())
            .missingAcademicYears(counters.missingAcademicYears)
            .missingFormations(counters.missingFormations)
            .missingGroups(counters.missingGroups)
            .missingModules(counters.missingModules)
            .nonTeacherEmailConflicts(counters.nonTeacherEmailConflicts)
            .status(resolveStatus(successfulRows, failedRows))
            .errors(errors)
            .changes(changes)
            .warnings(warnings)
            .build();
    }

    private LookupData loadLookups(List<TeacherExcelRowDTO> rows) {
        Set<String> emails = values(rows, TeacherExcelRowDTO::getEmail);
        Set<String> yearNames = values(rows, TeacherExcelRowDTO::getAcademicYear);
        Set<String> formationNames = values(rows, TeacherExcelRowDTO::getFormationName);
        Set<String> groupeCodes = values(rows, TeacherExcelRowDTO::getGroupeCode);
        Set<String> moduleCodes = values(rows, TeacherExcelRowDTO::getModuleCode);

        Map<String, Teacher> teachers = teacherRepository.findByNormalizedEmailIn(emails).stream()
            .collect(Collectors.toMap(teacher -> normalizeEmail(teacher.getEmail()), Function.identity()));
        Map<String, User> users = userRepository.findByNormalizedEmailIn(emails).stream()
            .collect(Collectors.toMap(user -> normalizeEmail(user.getEmail()), Function.identity()));
        Map<String, AnneeUniversitaire> years = yearRepository.findByNameIn(yearNames).stream()
            .collect(Collectors.toMap(AnneeUniversitaire::getName, Function.identity()));
        Map<String, List<Formation>> formations = formationRepository.findByNameIn(formationNames).stream()
            .collect(Collectors.groupingBy(Formation::getName));
        Map<String, List<Groupe>> groupes = groupeRepository.findByNameIn(groupeCodes).stream()
            .collect(Collectors.groupingBy(Groupe::getName));
        Map<String, List<Module>> modules = moduleRepository.findByCodeIn(moduleCodes).stream()
            .collect(Collectors.groupingBy(Module::getCode));
        return new LookupData(teachers, users, years, formations, groupes, modules);
    }

    private ResolvedStructure resolveStructure(TeacherExcelRowDTO row,
                                               LookupData data,
                                               List<RowErrorDTO> errors,
                                               Set<Integer> failedRows,
                                               Counters counters) {
        AnneeUniversitaire year = data.yearsByName.get(row.getAcademicYear());
        if (year == null) {
            addError(row, "academicYear", "Academic year not found.", errors, failedRows);
            counters.missingAcademicYears++;
            return null;
        }

        List<Formation> formationCandidates = data.formationsByName.get(row.getFormationName());
        if (formationCandidates == null || formationCandidates.isEmpty()) {
            addError(row, "formationName", "Formation not found.", errors, failedRows);
            counters.missingFormations++;
            return null;
        }
        Formation formation = formationCandidates.stream()
            .filter(candidate -> candidate.getAnneeUniversitaire().getId().equals(year.getId()))
            .findFirst()
            .orElse(null);
        if (formation == null) {
            addError(row, "formationName", "Formation does not belong to specified academic year.", errors, failedRows);
            return null;
        }

        List<Groupe> groupeCandidates = data.groupesByCode.get(row.getGroupeCode());
        Groupe groupe = resolveGroupe(groupeCandidates, formation);
        if (groupe == null) {
            if (groupeCandidates == null || groupeCandidates.isEmpty()) {
                addError(row, "groupeCode", "Groupe not found.", errors, failedRows);
                counters.missingGroups++;
            } else {
                addError(row, "groupeCode", "Groupe does not belong to specified formation.", errors, failedRows);
            }
            return null;
        }

        List<Module> moduleCandidates = data.modulesByCode.get(row.getModuleCode());
        Module module = resolveModule(moduleCandidates, formation);
        if (module == null) {
            if (moduleCandidates == null || moduleCandidates.isEmpty()) {
                addError(row, "moduleCode", "Module not found.", errors, failedRows);
                counters.missingModules++;
            } else {
                addError(row, "moduleCode", "Module does not belong to specified formation.", errors, failedRows);
            }
            return null;
        }
        return new ResolvedStructure(year, formation, groupe, module);
    }

    private Groupe resolveGroupe(List<Groupe> candidates, Formation formation) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
            .filter(candidate -> candidate.getFormation() != null)
            .filter(candidate -> candidate.getFormation().getId().equals(formation.getId()))
            .findFirst()
            .orElse(null);
    }

    private Module resolveModule(List<Module> candidates, Formation formation) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
            .filter(candidate -> candidate.getFormation() != null)
            .filter(candidate -> candidate.getFormation().getId().equals(formation.getId()))
            .findFirst()
            .orElse(null);
    }

    private Set<String> loadExistingAssignmentKeys(List<ResolvedRow> rows) {
        Set<Long> teacherIds = ids(rows, row -> row.teacher.getId());
        Set<Long> yearIds = ids(rows, row -> row.structure.year.getId());
        Set<Long> formationIds = ids(rows, row -> row.structure.formation.getId());
        Set<Long> groupeIds = ids(rows, row -> row.structure.groupe.getId());
        Set<Long> moduleIds = ids(rows, row -> row.structure.module.getId());
        if (teacherIds.isEmpty() || yearIds.isEmpty() || formationIds.isEmpty()
            || groupeIds.isEmpty() || moduleIds.isEmpty()) {
            return Set.of();
        }
        return assignmentRepository.findExistingAssignmentKeys(
            teacherIds, yearIds, formationIds, groupeIds, moduleIds
        ).stream().map(this::assignmentKey).collect(Collectors.toSet());
    }

    private <T> Set<Long> ids(List<ResolvedRow> rows, Function<ResolvedRow, Long> extractor) {
        return rows.stream().map(extractor).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
    }

    private Set<String> values(List<TeacherExcelRowDTO> rows, Function<TeacherExcelRowDTO, String> extractor) {
        return rows.stream().map(extractor).collect(Collectors.toSet());
    }

    private String assignmentKey(ResolvedRow row) {
        return assignmentKey(new Object[] {
            row.teacher.getId(),
            row.structure.year.getId(),
            row.structure.formation.getId(),
            row.structure.groupe.getId(),
            row.structure.module.getId()
        });
    }

    private String assignmentKey(Object[] values) {
        return java.util.Arrays.stream(values).map(String::valueOf).collect(Collectors.joining(":"));
    }

    private Teacher mapToTeacher(TeacherExcelRowDTO row) {
        Teacher teacher = teacherMapper.toEntity(row);
        teacher.setRoles(new HashSet<>(Set.of(Role.TEACHER)));
        teacher.setEnabled(true);
        teacher.setFirstLogin(true);
        return teacher;
    }

    private List<String> applyNameUpdates(Teacher teacher, TeacherExcelRowDTO row) {
        List<String> updates = new ArrayList<>();
        if (!row.getFirstName().equals(teacher.getFirstName())) {
            updates.add(detail("firstName", teacher.getFirstName(), row.getFirstName()));
            teacher.setFirstName(row.getFirstName());
        }
        if (!row.getLastName().equals(teacher.getLastName())) {
            updates.add(detail("lastName", teacher.getLastName(), row.getLastName()));
            teacher.setLastName(row.getLastName());
        }
        return updates;
    }

    private String detail(String field, String oldValue, String newValue) {
        return field + ": '" + (oldValue == null ? "" : oldValue) + "' -> '" + newValue + "'";
    }

    private TeacherChangeDTO assignmentChange(ResolvedRow row, String action, String detail) {
        String identifier = row.row.getEmail() + " | " + row.row.getAcademicYear() + " | "
            + row.row.getFormationName() + " | " + row.row.getGroupeCode() + " | " + row.row.getModuleCode();
        return change(row.row, "ASSIGNMENT", identifier, action, List.of(detail));
    }

    private TeacherChangeDTO change(TeacherExcelRowDTO row,
                                    String entityType,
                                    String identifier,
                                    String action,
                                    List<String> details) {
        return TeacherChangeDTO.builder()
            .rowNumber(row.getRowNumber())
            .entityType(entityType)
            .identifier(identifier)
            .action(action)
            .changes(details)
            .build();
    }

    private void addError(TeacherExcelRowDTO row,
                          String field,
                          String message,
                          List<RowErrorDTO> errors,
                          Set<Integer> failedRows) {
        errors.add(RowErrorDTO.builder().rowNumber(row.getRowNumber()).field(field).message(message).build());
        failedRows.add(row.getRowNumber());
    }

    private String rowWarning(TeacherExcelRowDTO row, String message) {
        return "Row " + row.getRowNumber() + " -> " + message;
    }

    private void normalizeRow(TeacherExcelRowDTO row) {
        row.setEmail(normalizeEmail(row.getEmail()));
        row.setFirstName(normalize(row.getFirstName()));
        row.setLastName(normalize(row.getLastName()));
        row.setAcademicYear(normalize(row.getAcademicYear()));
        row.setFormationName(normalize(row.getFormationName()));
        row.setGroupeCode(normalize(row.getGroupeCode()));
        row.setModuleCode(normalize(row.getModuleCode()));
    }

    private String normalizeEmail(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private String resolveStatus(int successfulRows, int failedRows) {
        if (failedRows == 0) {
            return "SUCCESS";
        }
        return successfulRows == 0 ? "FAILED" : "PARTIAL";
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidExcelFileException("Excel file is empty");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx")) {
            throw new InvalidExcelFileException("Only .xlsx files are allowed");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidExcelFileException("File size exceeds 10MB");
        }
    }

    @RequiredArgsConstructor
    private static final class LookupData {
        private final Map<String, Teacher> teachersByEmail;
        private final Map<String, User> usersByEmail;
        private final Map<String, AnneeUniversitaire> yearsByName;
        private final Map<String, List<Formation>> formationsByName;
        private final Map<String, List<Groupe>> groupesByCode;
        private final Map<String, List<Module>> modulesByCode;
    }

    @RequiredArgsConstructor
    private static final class ResolvedStructure {
        private final AnneeUniversitaire year;
        private final Formation formation;
        private final Groupe groupe;
        private final Module module;
    }

    @RequiredArgsConstructor
    private static final class ResolvedRow {
        private final TeacherExcelRowDTO row;
        private final Teacher teacher;
        private final ResolvedStructure structure;
    }

    private static final class Counters {
        private int createdTeachers;
        private int updatedTeachers;
        private int createdAssignments;
        private int duplicateAssignments;
        private int duplicateAssignmentsInsideFile;
        private int missingAcademicYears;
        private int missingFormations;
        private int missingGroups;
        private int missingModules;
        private int nonTeacherEmailConflicts;
    }
}
