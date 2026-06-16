package ma.eniad.userservice.service.teacher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;

import ma.eniad.userservice.dto.excel.RowErrorDTO;
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

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TeacherImportServiceTest {
    @Mock private TeacherExcelParser parser;
    @Mock private TeacherExcelRowValidator validator;
    @Mock private TeacherMapper teacherMapper;
    @Mock private TeacherAssignmentMapper assignmentMapper;
    @Mock private TeacherRepository teacherRepository;
    @Mock private UserRepository userRepository;
    @Mock private AnneeUniversitaireRepository yearRepository;
    @Mock private FormationRepository formationRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private ModuleRepository moduleRepository;
    @Mock private TeacherAssignmentRepository assignmentRepository;

    @InjectMocks
    private TeacherImportService service;

    private final MockMultipartFile file =
        new MockMultipartFile("file", "teachers.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[] {1});

    private AnneeUniversitaire year;
    private Formation formation;
    private Groupe groupeA;
    private Groupe groupeB;
    private Module module;

    @BeforeEach
    void setUp() {
        year = mock(AnneeUniversitaire.class);
        formation = mock(Formation.class);
        groupeA = mock(Groupe.class);
        groupeB = mock(Groupe.class);
        module = mock(Module.class);

        when(year.getId()).thenReturn(10L);
        when(year.getName()).thenReturn("2025/2026");
        when(formation.getId()).thenReturn(20L);
        when(formation.getName()).thenReturn("GI1");
        when(formation.getAnneeUniversitaire()).thenReturn(year);
        when(groupeA.getId()).thenReturn(30L);
        when(groupeA.getName()).thenReturn("GI1-A");
        when(groupeA.getFormation()).thenReturn(formation);
        when(groupeB.getId()).thenReturn(31L);
        when(groupeB.getName()).thenReturn("GI1-B");
        when(groupeB.getFormation()).thenReturn(formation);
        when(module.getId()).thenReturn(40L);
        when(module.getCode()).thenReturn("JAVA");
        when(module.getFormation()).thenReturn(formation);
    }

    @Test
    void createsOneTeacherAndMultipleAssignmentsForRepeatedEmail() {
        TeacherExcelRowDTO first = row(2, "GI1-A");
        TeacherExcelRowDTO second = row(3, "GI1-B");
        Teacher newTeacher = new Teacher();
        newTeacher.setEmail("ahmed@ump.ac.ma");

        when(parser.parse(file)).thenReturn(List.of(first, second));
        when(validator.validate(any())).thenReturn(List.of());
        stubLookups(List.of(groupeA, groupeB));
        when(teacherMapper.toEntity(any(TeacherExcelRowDTO.class))).thenReturn(newTeacher);
        when(teacherRepository.saveAll(any())).thenAnswer(invocation -> {
            newTeacher.setId(1L);
            return invocation.getArgument(0);
        });
        when(assignmentMapper.toEntity(any(), any(), any(), any(), any()))
            .thenAnswer(invocation -> new TeacherAssignment());

        TeacherImportResultDTO result = service.importFromExcel(file);

        assertThat(result.getCreatedTeachers()).isEqualTo(1);
        assertThat(result.getCreatedAssignments()).isEqualTo(2);
        assertThat(result.getSuccessfulRows()).isEqualTo(2);
        assertThat(result.getFailedRows()).isZero();
        assertThat(newTeacher.getRoles()).containsExactly(Role.TEACHER);
        assertThat(newTeacher.isEnabled()).isTrue();
        assertThat(newTeacher.isFirstLogin()).isTrue();
        verify(teacherRepository).saveAll(any());
        verify(assignmentRepository).saveAll(any());
    }

    @Test
    void reportsDuplicateAssignmentInsideFileAndPersistsItOnce() {
        TeacherExcelRowDTO first = row(2, "GI1-A");
        TeacherExcelRowDTO duplicate = row(3, "GI1-A");
        Teacher existingTeacher = new Teacher();
        existingTeacher.setId(1L);
        existingTeacher.setEmail("ahmed@ump.ac.ma");
        existingTeacher.setFirstName("Ahmed");
        existingTeacher.setLastName("El Amrani");

        when(parser.parse(file)).thenReturn(List.of(first, duplicate));
        when(validator.validate(any())).thenReturn(List.of());
        stubLookups(List.of(groupeA));
        when(teacherRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of(existingTeacher));
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of(existingTeacher));
        when(assignmentMapper.toEntity(any(), any(), any(), any(), any()))
            .thenReturn(new TeacherAssignment());

        TeacherImportResultDTO result = service.importFromExcel(file);

        assertThat(result.getCreatedAssignments()).isEqualTo(1);
        assertThat(result.getDuplicateAssignmentsInsideFile()).isEqualTo(1);
        assertThat(result.getWarnings()).anyMatch(message -> message.contains("Duplicate assignment inside file"));
        verify(assignmentRepository).saveAll(any());
    }

    @Test
    void rejectsEmailOwnedByNonTeacherUser() {
        TeacherExcelRowDTO row = row(2, "GI1-A");
        User existingUser = new User();
        existingUser.setEmail("ahmed@ump.ac.ma");

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(any())).thenReturn(List.of());
        stubLookups(List.of(groupeA));
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of(existingUser));

        TeacherImportResultDTO result = service.importFromExcel(file);

        assertThat(result.getNonTeacherEmailConflicts()).isEqualTo(1);
        assertThat(result.getFailedRows()).isEqualTo(1);
        assertThat(result.getErrors()).anyMatch(error -> error.getMessage().equals("Email belongs to a non-teacher user."));
        verify(teacherRepository, never()).saveAll(any());
        verify(assignmentRepository, never()).saveAll(any());
    }

    @Test
    void rejectsValidationErrorsAndDoesNotPersist() {
        TeacherExcelRowDTO row = row(2, "GI1-A");
        RowErrorDTO error = RowErrorDTO.builder()
            .rowNumber(2)
            .field("email")
            .message("Invalid email format")
            .build();

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of(error));

        TeacherImportResultDTO result = service.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getSuccessfulRows()).isZero();
        assertThat(result.getFailedRows()).isEqualTo(1);
        assertThat(result.getErrors()).containsExactly(error);
        verify(teacherRepository, never()).saveAll(any());
        verify(assignmentRepository, never()).saveAll(any());
    }

    @Test
    void reportsMissingModule() {
        TeacherExcelRowDTO row = row(2, "GI1-A");
        Teacher teacher = new Teacher();

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of());
        when(teacherRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of());
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of());
        when(yearRepository.findByNameIn(anySet())).thenReturn(List.of(year));
        when(formationRepository.findByNameIn(anySet())).thenReturn(List.of(formation));
        when(groupeRepository.findByNameIn(anySet())).thenReturn(List.of(groupeA));
        when(moduleRepository.findByCodeIn(anySet())).thenReturn(List.of());
        when(teacherMapper.toEntity(row)).thenReturn(teacher);

        TeacherImportResultDTO result = service.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getMissingModules()).isEqualTo(1);
        assertThat(result.getErrors())
            .singleElement()
            .satisfies(error -> {
                assertThat(error.getField()).isEqualTo("moduleCode");
                assertThat(error.getMessage()).isEqualTo("Module not found.");
            });
        verify(teacherRepository).saveAll(any());
        verify(assignmentRepository, never()).saveAll(any());
    }

    @Test
    void skipsExistingAssignment() {
        TeacherExcelRowDTO row = row(2, "GI1-A");
        Teacher existingTeacher = new Teacher();
        existingTeacher.setId(1L);
        existingTeacher.setEmail("ahmed@ump.ac.ma");
        existingTeacher.setFirstName("Ahmed");
        existingTeacher.setLastName("El Amrani");

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of());
        stubLookups(List.of(groupeA));
        when(teacherRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of(existingTeacher));
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of(existingTeacher));
        when(assignmentRepository.findExistingAssignmentKeys(anySet(), anySet(), anySet(), anySet(), anySet()))
            .thenReturn(List.<Object[]>of(new Object[] {1L, 10L, 20L, 30L, 40L}));

        TeacherImportResultDTO result = service.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(result.getCreatedAssignments()).isZero();
        assertThat(result.getDuplicateAssignments()).isEqualTo(1);
        assertThat(result.getWarnings()).containsExactly("Row 2 -> Teacher assignment already exists.");
        verify(assignmentRepository, never()).saveAll(any());
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile(
            "file",
            "teachers.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            new byte[0]
        );

        assertThatThrownBy(() -> service.importFromExcel(emptyFile))
            .isInstanceOf(InvalidExcelFileException.class)
            .hasMessage("Excel file is empty");
    }

    @Test
    void rejectsNonXlsxFile() {
        MockMultipartFile csvFile = new MockMultipartFile("file", "teachers.csv", "text/csv", new byte[] {1});

        assertThatThrownBy(() -> service.importFromExcel(csvFile))
            .isInstanceOf(InvalidExcelFileException.class)
            .hasMessage("Only .xlsx files are allowed");
    }

    private TeacherExcelRowDTO row(int rowNumber, String groupCode) {
        return TeacherExcelRowDTO.builder()
            .rowNumber(rowNumber)
            .firstName("Ahmed")
            .lastName("El Amrani")
            .email("ahmed@ump.ac.ma")
            .academicYear("2025/2026")
            .formationName("GI1")
            .groupeCode(groupCode)
            .moduleCode("JAVA")
            .build();
    }

    private void stubLookups(List<Groupe> groups) {
        when(teacherRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of());
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of());
        when(yearRepository.findByNameIn(anySet())).thenReturn(List.of(year));
        when(formationRepository.findByNameIn(anySet())).thenReturn(List.of(formation));
        when(groupeRepository.findByNameIn(anySet())).thenReturn(groups);
        when(moduleRepository.findByCodeIn(anySet())).thenReturn(List.of(module));
        when(assignmentRepository.findExistingAssignmentKeys(anySet(), anySet(), anySet(), anySet(), anySet()))
            .thenReturn(List.of());
    }
}
