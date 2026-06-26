package ma.eniad.userservice.service.student;

import java.util.HashSet;
import java.time.LocalDateTime;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import ma.eniad.userservice.dto.student.StudentProfileDto;
import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.InvalidDomainException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.service.UserContext;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentInscriptionRepository inscriptionRepository;

    @Mock
    private AnneeUniversitaireRepository anneeUniversitaireRepository;

    @Mock
    private StudentMapper studentMapper;

    @InjectMocks
    private StudentService studentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(studentService, "allowedDomain", "ump.ac.ma");
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void create_addsDefaultsAndReturnsResponse() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setRoles(new HashSet<>());

        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
            .email("student@ump.ac.ma")
                .numApogee("A123")
                .roles(new HashSet<>(List.of(Role.STUDENT)))
                .build();

        when(studentMapper.toEntity(request)).thenReturn(student);
        when(studentRepository.save(student)).thenReturn(student);
        when(studentMapper.toResponse(student)).thenReturn(response);

        StudentResponseDTO result = studentService.create(request);

        assertThat(result).isEqualTo(response);
        assertThat(student.getRoles()).contains(Role.STUDENT);
        assertThat(student.isEnabled()).isTrue();
        assertThat(student.isFirstLogin()).isTrue();
    }

    @Test
    void create_normalizesEmailAndApogeeBeforeSaving() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("  STUDENT@UMP.AC.MA ");
        request.setNumApogee(" A123 ");

        Student student = new Student();

        when(studentMapper.toEntity(request)).thenReturn(student);
        when(studentRepository.save(student)).thenReturn(student);
        when(studentMapper.toResponse(student)).thenReturn(StudentResponseDTO.builder().build());

        studentService.create(request);

        assertThat(request.getEmail()).isEqualTo("student@ump.ac.ma");
        assertThat(request.getNumApogee()).isEqualTo("A123");
        assertThat(student.getRoles()).containsExactly(Role.STUDENT);
    }

    @Test
    void create_throwsWhenEmailDomainIsNotAllowed() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@example.com");

        assertThatThrownBy(() -> studentService.create(request))
            .isInstanceOf(InvalidDomainException.class)
            .hasMessage("Email must be in the @ump.ac.ma domain");
    }

    @Test
    void create_throwsWhenEmailExists() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");

        Student student = new Student();
        student.setRoles(new HashSet<>());

        when(studentMapper.toEntity(request)).thenReturn(student);
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));
        when(userRepository.existsByEmail("student@ump.ac.ma")).thenReturn(true);

        assertThatThrownBy(() -> studentService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email already exists");
    }

    @Test
    void create_throwsWhenNumApogeeExists() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setRoles(new HashSet<>());

        when(studentMapper.toEntity(request)).thenReturn(student);
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));
        when(userRepository.existsByEmail("student@ump.ac.ma")).thenReturn(false);
        when(studentRepository.existsByNumApogee("A123")).thenReturn(true);

        assertThatThrownBy(() -> studentService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("NumApogee already exists");
    }

    @Test
    void create_throwsWhenSaveViolatesConstraint() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setRoles(new HashSet<>());

        when(studentMapper.toEntity(request)).thenReturn(student);
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));

        assertThatThrownBy(() -> studentService.create(request))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void update_updatesStudentAndReturnsResponse() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("updated@ump.ac.ma");
        request.setNumApogee("B456");

        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setNumApogee("A123");

        Student updatedStudent = new Student();
        updatedStudent.setId(1L);
        updatedStudent.setEmail("updated@ump.ac.ma");
        updatedStudent.setNumApogee("B456");

        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
                .email("updated@ump.ac.ma")
                .numApogee("B456")
                .build();

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        doAnswer(invocation -> {
            StudentRequestDTO incoming = invocation.getArgument(0);
            Student target = invocation.getArgument(1);
            target.setEmail(incoming.getEmail());
            target.setNumApogee(incoming.getNumApogee());
            return null;
        }).when(studentMapper).updateEntity(request, student);
        when(studentRepository.save(student)).thenReturn(updatedStudent);
        when(studentMapper.toResponse(updatedStudent)).thenReturn(response);

        StudentResponseDTO result = studentService.update(1L, request);

        assertThat(result).isEqualTo(response);
        verify(studentRepository).findById(1L);
        verify(studentMapper).updateEntity(request, student);
        verify(studentRepository).save(student);
    }

    @Test
    void update_throwsWhenSaveViolatesConstraint() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setEmail("student@ump.ac.ma");
        student.setNumApogee("A123");

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));
        doNothing().when(studentMapper).updateEntity(request, student);

        assertThatThrownBy(() -> studentService.update(1L, request))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void update_throwsWhenStudentNotFound() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");
        request.setNumApogee("A123");

        when(studentRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.update(1L, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Student not found");
    }

    @Test
    void getById_returnsMappedStudent() {
        Student student = new Student();
        StudentResponseDTO response = StudentResponseDTO.builder().id(1L).build();

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(studentMapper.toResponse(student)).thenReturn(response);

        assertThat(studentService.getById(1L)).isSameAs(response);
    }

    @Test
    void getById_throwsWhenStudentNotFound() {
        when(studentRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.getById(1L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Student not found");
    }

    @Test
    void getAll_returnsMappedStudents() {
        Student first = new Student();
        Student second = new Student();
        StudentResponseDTO firstResponse = StudentResponseDTO.builder().id(1L).build();
        StudentResponseDTO secondResponse = StudentResponseDTO.builder().id(2L).build();

        when(studentRepository.findAll()).thenReturn(List.of(first, second));
        when(studentMapper.toResponse(first)).thenReturn(firstResponse);
        when(studentMapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(studentService.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void getCurrentProfile_includesActiveEnrollmentDetails() {
        UserContext.setCurrentUser("1", "student@ump.ac.ma", Set.of("STUDENT"));

        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setFirstName("Sara");
        student.setLastName("Alaoui");
        student.setPfpUrl("https://example.com/pfp.png");
        student.setNumApogee("A123");
        LocalDateTime faceEnrolledAt = LocalDateTime.of(2026, 6, 22, 10, 30);
        student.setFaceEnrolledAt(faceEnrolledAt);

        AnneeUniversitaire activeYear = AnneeUniversitaire.builder().id(4L).name("2025/2026").build();
        Cycle cycle = Cycle.builder().name("Ingenieur").build();
        Filiere filiere = Filiere.builder().code("GI").build();
        Formation formation = Formation.builder().id(2L).cycle(cycle).filiere(filiere).build();
        Groupe groupe = Groupe.builder().id(3L).name("GI-1").formation(formation).build();
        Inscription inscription = new Inscription();
        inscription.setGroupe(groupe);

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(anneeUniversitaireRepository.findByActiveTrue()).thenReturn(List.of(activeYear));
        when(inscriptionRepository.findActiveByStudentIdAndYearId(1L, 4L)).thenReturn(Optional.of(inscription));

        assertThat(studentService.getCurrentProfile())
            .extracting("id", "email", "firstName", "lastName", "pfpUrl", "numApogee", "academicYear", "cycle", "groupe", "filiere", "faceEnrolled", "faceEnrolledAt")
            .containsExactly(1L, "student@ump.ac.ma", "Sara", "Alaoui", "https://example.com/pfp.png", "A123", "2025/2026", "Ingenieur", "GI-1", "GI", true, faceEnrolledAt);
    }

    @Test
    void getCurrentProfile_throwsWhenUserContextIsMissing() {
        assertThatThrownBy(() -> studentService.getCurrentProfile())
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
            .hasMessageContaining("Missing user context");
    }

    @Test
    void updateCurrentProfilePhoto_updatesOnlyCurrentStudentPhotoUrl() throws Exception {
        UserContext.setCurrentUser("1", "student@ump.ac.ma", Set.of("STUDENT"));
        Path storageDir = Files.createTempDirectory("student-profile-photos");
        ReflectionTestUtils.setField(studentService, "profilePhotoStorageDir", storageDir.toString());
        ReflectionTestUtils.setField(studentService, "profilePhotoPublicPath", "/api/users/public/profile-photos");

        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setFirstName("Sara");
        student.setLastName("Alaoui");
        student.setNumApogee("A123");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                new byte[] {1, 2, 3}
        );

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(studentRepository.save(student)).thenReturn(student);
        when(anneeUniversitaireRepository.findByActiveTrue()).thenReturn(List.of());

        StudentProfileDto profile = studentService.updateCurrentProfilePhoto(file);

        assertThat(student.getPfpUrl()).startsWith("/api/users/public/profile-photos/student-1-");
        assertThat(student.getPfpUrl()).endsWith(".png");
        assertThat(profile.getPfpUrl()).isEqualTo(student.getPfpUrl());
        try (Stream<Path> files = Files.list(storageDir)) {
            assertThat(files).hasSize(1);
        }
        verify(studentRepository).save(student);
    }

    @Test
    void updateCurrentProfilePhoto_deletesPreviousStoredProfilePhoto() throws Exception {
        UserContext.setCurrentUser("1", "student@ump.ac.ma", Set.of("STUDENT"));
        Path storageDir = Files.createTempDirectory("student-profile-photos");
        Path oldPhoto = storageDir.resolve("student-1-old.png");
        Files.write(oldPhoto, new byte[] {9, 9, 9});
        ReflectionTestUtils.setField(studentService, "profilePhotoStorageDir", storageDir.toString());
        ReflectionTestUtils.setField(studentService, "profilePhotoPublicPath", "/api/users/public/profile-photos");

        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setFirstName("Sara");
        student.setLastName("Alaoui");
        student.setNumApogee("A123");
        student.setPfpUrl("/api/users/public/profile-photos/student-1-old.png");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                new byte[] {1, 2, 3}
        );

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(studentRepository.save(student)).thenReturn(student);
        when(anneeUniversitaireRepository.findByActiveTrue()).thenReturn(List.of());

        studentService.updateCurrentProfilePhoto(file);

        assertThat(oldPhoto).doesNotExist();
        try (Stream<Path> files = Files.list(storageDir)) {
            assertThat(files).hasSize(1);
        }
    }

    @Test
    void updateCurrentProfilePhoto_doesNotDeleteExternalProfilePhotoUrl() throws Exception {
        UserContext.setCurrentUser("1", "student@ump.ac.ma", Set.of("STUDENT"));
        Path storageDir = Files.createTempDirectory("student-profile-photos");
        ReflectionTestUtils.setField(studentService, "profilePhotoStorageDir", storageDir.toString());
        ReflectionTestUtils.setField(studentService, "profilePhotoPublicPath", "/api/users/public/profile-photos");

        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setFirstName("Sara");
        student.setLastName("Alaoui");
        student.setNumApogee("A123");
        student.setPfpUrl("https://example.com/avatar.png");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                new byte[] {1, 2, 3}
        );

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(studentRepository.save(student)).thenReturn(student);
        when(anneeUniversitaireRepository.findByActiveTrue()).thenReturn(List.of());

        studentService.updateCurrentProfilePhoto(file);

        try (Stream<Path> files = Files.list(storageDir)) {
            assertThat(files).hasSize(1);
        }
    }

    @Test
    void update_throwsWhenEmailExists() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setNumApogee("A123");

        User existingUser = new User();
        existingUser.setId(2L);

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        doNothing().when(studentMapper).updateEntity(request, student);
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));
        when(userRepository.findByEmail("student@ump.ac.ma")).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> studentService.update(1L, request))
            .isInstanceOf(DuplicateResourceException.class)
            .hasMessage("Email already exists");
    }

    @Test
    void update_throwsWhenNumApogeeExists() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@ump.ac.ma");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setNumApogee("A123");

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        doNothing().when(studentMapper).updateEntity(request, student);
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));
        when(studentRepository.existsByNumApogeeAndIdNot("A123", 1L)).thenReturn(true);

        assertThatThrownBy(() -> studentService.update(1L, request))
            .isInstanceOf(DuplicateResourceException.class)
            .hasMessage("NumApogee already exists");
    }

    @Test
    void delete_deletesStudent() {
        Student student = new Student();
        student.setId(1L);

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        doNothing().when(studentRepository).delete(student);

        studentService.delete(1L);
        verify(studentRepository).delete(student);
    }

    @Test
    void delete_throwsWhenStudentNotFound() {
        when(studentRepository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> studentService.delete(1L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Student not found");
    }

    @Test
    void delete_throwsWhenDeleteViolatesConstraint() {
        Student student = new Student();
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        doThrow(new DataIntegrityViolationException("constraint")).when(studentRepository).delete(student);
        assertThatThrownBy(() -> studentService.delete(1L))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}