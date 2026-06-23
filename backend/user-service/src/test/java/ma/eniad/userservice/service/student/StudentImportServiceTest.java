package ma.eniad.userservice.service.student;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import ma.eniad.userservice.dto.excel.RowErrorDTO;
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

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class StudentImportServiceTest {

    @Mock
    private StudentExcelParser parser;

    @Mock
    private StudentExcelRowValidator validator;

    @Mock
    private StudentMapper mapper;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AnneeUniversitaireRepository anneeUniversitaireRepository;

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private GroupeRepository groupeRepository;

    @Mock
    private StudentInscriptionRepository inscriptionRepository;

    @InjectMocks
    private StudentImportService importService;

    @Test
    void importFromExcel_createsStudentAndInscriptionForValidRow() {
        MockMultipartFile file = excelFile();
        StudentExcelRowDTO row = row(2, " Sara ", " Alaoui ", " SARA@UMP.AC.MA ", " A123 ", " 2025/2026 ", " GI ", " GI-1 ");
        Student mappedStudent = new Student();
        AnneeUniversitaire year = AnneeUniversitaire.builder().id(1L).name("2025/2026").build();
        Formation formation = Formation.builder().id(2L).name("GI").anneeUniversitaire(year).build();
        Groupe groupe = Groupe.builder().id(3L).name("GI-1").formation(formation).build();

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of());
        when(studentRepository.findByEmailIn(anySet())).thenReturn(List.of());
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of());
        when(studentRepository.findByNumApogeeIn(anySet())).thenReturn(List.of());
        when(anneeUniversitaireRepository.findByNameIn(anySet())).thenReturn(List.of(year));
        when(formationRepository.findByNameIn(anySet())).thenReturn(List.of(formation));
        when(groupeRepository.findByNameIn(anySet())).thenReturn(List.of(groupe));
        when(mapper.toEntity(row)).thenReturn(mappedStudent);

        StudentImportResultDTO result = importService.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(result.getTotalRows()).isEqualTo(1);
        assertThat(result.getSuccessfulRows()).isEqualTo(1);
        assertThat(result.getCreatedStudents()).isEqualTo(1);
        assertThat(result.getCreatedInscriptions()).isEqualTo(1);
        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getChanges()).extracting("action").containsExactly("CREATED");
        assertThat(row.getEmail()).isEqualTo("sara@ump.ac.ma");
        assertThat(row.getNumApogee()).isEqualTo("A123");
        assertThat(mappedStudent.getRoles()).containsExactly(Role.STUDENT);
        assertThat(mappedStudent.isEnabled()).isTrue();
        assertThat(mappedStudent.isFirstLogin()).isTrue();

        ArgumentCaptor<List<Inscription>> inscriptionsCaptor = ArgumentCaptor.forClass(List.class);
        verify(inscriptionRepository).saveAll(inscriptionsCaptor.capture());
        assertThat(inscriptionsCaptor.getValue())
            .singleElement()
            .satisfies(inscription -> {
                assertThat(inscription.getStudent()).isSameAs(mappedStudent);
                assertThat(inscription.getAnneeUniversitaire()).isSameAs(year);
                assertThat(inscription.getFormation()).isSameAs(formation);
                assertThat(inscription.getGroupe()).isSameAs(groupe);
            });
    }

    @Test
    void importFromExcel_rejectsValidationErrorsAndDoesNotPersist() {
        MockMultipartFile file = excelFile();
        StudentExcelRowDTO row = row(2, "", "Alaoui", "sara@ump.ac.ma", "A123", "2025/2026", "GI", "GI-1");
        RowErrorDTO error = RowErrorDTO.builder()
                .rowNumber(2)
                .field("firstName")
                .message("First name is required")
                .build();

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of(error));

        StudentImportResultDTO result = importService.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getSuccessfulRows()).isZero();
        assertThat(result.getFailedRows()).isEqualTo(1);
        assertThat(result.getErrors()).containsExactly(error);
        verify(studentRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(inscriptionRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void importFromExcel_rejectsMissingAcademicYearBeforeCreatingStudent() {
        MockMultipartFile file = excelFile();
        StudentExcelRowDTO row = row(2, "Sara", "Alaoui", "sara@ump.ac.ma", "A123", "2099/2100", "GI", "GI-1");

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of());
        when(studentRepository.findByEmailIn(anySet())).thenReturn(List.of());
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of());
        when(studentRepository.findByNumApogeeIn(anySet())).thenReturn(List.of());
        when(anneeUniversitaireRepository.findByNameIn(anySet())).thenReturn(List.of());
        when(formationRepository.findByNameIn(anySet())).thenReturn(List.of());
        when(groupeRepository.findByNameIn(anySet())).thenReturn(List.of());

        StudentImportResultDTO result = importService.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getCreatedStudents()).isZero();
        assertThat(result.getCreatedInscriptions()).isZero();
        assertThat(result.getErrors())
            .singleElement()
            .satisfies(error -> {
                assertThat(error.getField()).isEqualTo("academicYear");
                assertThat(error.getMessage()).isEqualTo("Academic year not found.");
            });
        verify(mapper, never()).toEntity(row);
        verify(studentRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(inscriptionRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void importFromExcel_rejectsEmailUsedWithDifferentApogeeInsideFile() {
        MockMultipartFile file = excelFile();
        StudentExcelRowDTO first = row(2, "Sara", "Alaoui", "same@ump.ac.ma", "A123", "2025/2026", "GI", "GI-1");
        StudentExcelRowDTO second = row(3, "Yassine", "Amrani", "SAME@UMP.AC.MA", "B456", "2025/2026", "GI", "GI-1");

        when(parser.parse(file)).thenReturn(List.of(first, second));
        when(validator.validate(first)).thenReturn(List.of());
        when(validator.validate(second)).thenReturn(List.of());
        AnneeUniversitaire year = AnneeUniversitaire.builder().id(1L).name("2025/2026").build();
        Formation formation = Formation.builder().id(2L).name("GI").anneeUniversitaire(year).build();
        Groupe groupe = Groupe.builder().id(3L).name("GI-1").formation(formation).build();
        Student mappedStudent = new Student();
        when(studentRepository.findByEmailIn(anySet())).thenReturn(List.of());
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of());
        when(studentRepository.findByNumApogeeIn(anySet())).thenReturn(List.of());
        when(anneeUniversitaireRepository.findByNameIn(anySet())).thenReturn(List.of(year));
        when(formationRepository.findByNameIn(anySet())).thenReturn(List.of(formation));
        when(groupeRepository.findByNameIn(anySet())).thenReturn(List.of(groupe));
        when(mapper.toEntity(first)).thenReturn(mappedStudent);

        StudentImportResultDTO result = importService.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("PARTIAL");
        assertThat(result.getFailedRows()).isEqualTo(1);
        assertThat(result.getErrors())
            .singleElement()
            .satisfies(error -> {
                assertThat(error.getRowNumber()).isEqualTo(3);
                assertThat(error.getField()).isEqualTo("email");
                assertThat(error.getMessage()).isEqualTo("Email is used with another NumApogee inside the file.");
            });
    }

    @Test
    void importFromExcel_updatesExistingStudentAndSkipsExistingEnrollment() {
        MockMultipartFile file = excelFile();
        StudentExcelRowDTO row = row(2, "Sara", "Updated", "sara@ump.ac.ma", "A123", "2025/2026", "GI", "GI-1");
        Student existingStudent = Student.builder()
                .id(10L)
                .email("sara@ump.ac.ma")
                .numApogee("A123")
                .firstName("Sara")
                .lastName("Old")
                .build();
        AnneeUniversitaire year = AnneeUniversitaire.builder().id(1L).name("2025/2026").build();
        Formation formation = Formation.builder().id(2L).name("GI").anneeUniversitaire(year).build();
        Groupe groupe = Groupe.builder().id(3L).name("GI-1").formation(formation).build();

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of());
        when(studentRepository.findByEmailIn(anySet())).thenReturn(List.of(existingStudent));
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of(existingStudent));
        when(studentRepository.findByNumApogeeIn(anySet())).thenReturn(List.of(existingStudent));
        when(anneeUniversitaireRepository.findByNameIn(anySet())).thenReturn(List.of(year));
        when(formationRepository.findByNameIn(anySet())).thenReturn(List.of(formation));
        when(groupeRepository.findByNameIn(anySet())).thenReturn(List.of(groupe));
        when(inscriptionRepository.findExistingEnrollmentKeys(anySet(), anySet(), anySet(), anySet()))
                .thenReturn(List.<Object[]>of(new Object[] {10L, 1L, 2L, 3L}));

        StudentImportResultDTO result = importService.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(result.getUpdatedStudents()).isEqualTo(1);
        assertThat(result.getDuplicateInscriptions()).isEqualTo(1);
        assertThat(result.getCreatedInscriptions()).isZero();
        assertThat(existingStudent.getLastName()).isEqualTo("Updated");
        assertThat(result.getWarnings()).containsExactly(
                "Row 2 -> Student information updated.",
                "Row 2 -> Student inscription already exists for this academic year, formation and group."
        );
        verify(studentRepository).saveAll(List.of(existingStudent));
        verify(inscriptionRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void importFromExcel_rejectsEmailOwnedByNonStudentUser() {
        MockMultipartFile file = excelFile();
        StudentExcelRowDTO row = row(2, "Sara", "Alaoui", "admin@ump.ac.ma", "A123", "2025/2026", "GI", "GI-1");
        User existingUser = new User();
        existingUser.setEmail("admin@ump.ac.ma");

        when(parser.parse(file)).thenReturn(List.of(row));
        when(validator.validate(row)).thenReturn(List.of());
        when(studentRepository.findByEmailIn(anySet())).thenReturn(List.of());
        when(userRepository.findByNormalizedEmailIn(anySet())).thenReturn(List.of(existingUser));
        when(studentRepository.findByNumApogeeIn(anySet())).thenReturn(List.of());
        when(anneeUniversitaireRepository.findByNameIn(anySet())).thenReturn(List.of());
        when(formationRepository.findByNameIn(anySet())).thenReturn(List.of());
        when(groupeRepository.findByNameIn(anySet())).thenReturn(List.of());

        StudentImportResultDTO result = importService.importFromExcel(file);

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getFailedRows()).isEqualTo(1);
        assertThat(result.getErrors())
            .singleElement()
            .satisfies(error -> {
                assertThat(error.getRowNumber()).isEqualTo(2);
                assertThat(error.getField()).isEqualTo("email");
                assertThat(error.getMessage()).isEqualTo("Email belongs to a non-student user.");
            });
        verify(mapper, never()).toEntity(row);
        verify(studentRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(inscriptionRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void importFromExcel_rejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[0]
        );

        assertThatThrownBy(() -> importService.importFromExcel(file))
            .isInstanceOf(InvalidExcelFileException.class)
            .hasMessage("Excel file is empty");
    }

    @Test
    void importFromExcel_rejectsNonXlsxFile() {
        MockMultipartFile file = new MockMultipartFile("file", "students.csv", "text/csv", new byte[] {1});

        assertThatThrownBy(() -> importService.importFromExcel(file))
            .isInstanceOf(InvalidExcelFileException.class)
            .hasMessage("Only .xlsx files are allowed");
    }

    private static MockMultipartFile excelFile() {
        return new MockMultipartFile(
                "file",
                "students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[] {1}
        );
    }

    private static StudentExcelRowDTO row(
            int rowNumber,
            String firstName,
            String lastName,
            String email,
            String numApogee,
            String academicYear,
            String formationName,
            String groupeCode
    ) {
        return StudentExcelRowDTO.builder()
                .rowNumber(rowNumber)
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .numApogee(numApogee)
                .academicYear(academicYear)
                .formationName(formationName)
                .groupeCode(groupeCode)
                .build();
    }
}
