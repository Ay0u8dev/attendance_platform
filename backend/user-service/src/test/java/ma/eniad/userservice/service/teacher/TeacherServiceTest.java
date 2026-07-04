package ma.eniad.userservice.service.teacher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.HashSet;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.TeacherAssignment;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.entity.structure.Module;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.InvalidDomainException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.repository.inscription.TeacherAssignmentRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.service.UserContext;
import ma.eniad.userservice.mapper.teacher.TeacherMapper;
import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherProfileDto;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;



@ExtendWith(MockitoExtension.class)
class TeacherServiceTest {
    @Mock
    private TeacherRepository teacherRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeacherAssignmentRepository assignmentRepository;

    @Mock
    private TeacherMapper teacherMapper;

    @InjectMocks
    private TeacherService teacherService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(teacherService, "allowedDomain", "ump.ac.ma");
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void create_addsDefaultsAndReturnsResponse() {
        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@ump.ac.ma");

        Teacher teacher = new Teacher();
        teacher.setRoles(new HashSet<>());

        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("teacher@ump.ac.ma")
                .roles(new HashSet<>(List.of(Role.TEACHER)))
                .build();

        when(teacherMapper.toEntity(request)).thenReturn(teacher);
        when(teacherRepository.save(teacher)).thenReturn(teacher);
        when(teacherMapper.toResponse(teacher)).thenReturn(response);

        TeacherResponseDTO result = teacherService.create(request);

        assertThat(result).isEqualTo(response);
        assertThat(teacher.getRoles()).contains(Role.TEACHER);
        assertThat(teacher.isEnabled()).isTrue();
        assertThat(teacher.isFirstLogin()).isTrue();
    }

    @Test
    void create_normalizesEmailBeforeSaving() {
        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("  TEACHER@UMP.AC.MA ");

        Teacher teacher = new Teacher();

        when(teacherMapper.toEntity(request)).thenReturn(teacher);
        when(teacherRepository.save(teacher)).thenReturn(teacher);
        when(teacherMapper.toResponse(teacher)).thenReturn(TeacherResponseDTO.builder().build());

        teacherService.create(request);

        assertThat(request.getEmail()).isEqualTo("teacher@ump.ac.ma");
        assertThat(teacher.getRoles()).containsExactly(Role.TEACHER);
        assertThat(teacher.isEnabled()).isTrue();
        assertThat(teacher.isFirstLogin()).isTrue();
    }

    @Test
    void create_throwsWhenEmailDomainIsNotAllowed() {
        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@example.com");

        assertThatThrownBy(() -> teacherService.create(request))
                .isInstanceOf(InvalidDomainException.class)
                .hasMessage("Email must be in the @ump.ac.ma domain");
    }

    @Test
    void create_throwsWhenEmailExists() {
        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@ump.ac.ma");

        Teacher teacher = new Teacher();
        teacher.setRoles(new HashSet<>());

        when(teacherMapper.toEntity(request)).thenReturn(teacher);
        when(teacherRepository.save(teacher)).thenThrow(new DataIntegrityViolationException("constraint"));
        when(userRepository.existsByEmail("teacher@ump.ac.ma")).thenReturn(true);

        assertThatThrownBy(() -> teacherService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Email already exists");
    }

    @Test
    void create_throwsWhenSaveViolatesConstraint() {
        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@ump.ac.ma");

        Teacher teacher = new Teacher();
        teacher.setRoles(new HashSet<>());

        when(teacherMapper.toEntity(request)).thenReturn(teacher);
        when(teacherRepository.save(teacher)).thenThrow(new DataIntegrityViolationException("constraint"));
        when(userRepository.existsByEmail("teacher@ump.ac.ma")).thenReturn(false);

        assertThatThrownBy(() -> teacherService.create(request))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void getById_returnsMappedTeacher() {
        Teacher teacher = new Teacher();
        TeacherResponseDTO response = TeacherResponseDTO.builder().id(1L).build();

        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        when(teacherMapper.toResponse(teacher)).thenReturn(response);

        assertThat(teacherService.getById(1L)).isSameAs(response);
    }

    @Test
    void getById_throwsWhenTeacherNotFound() {
        when(teacherRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> teacherService.getById(1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Teacher not found");
    }

    @Test
    void getAll_returnsMappedTeachers() {
        Teacher first = new Teacher();
        Teacher second = new Teacher();
        TeacherResponseDTO firstResponse = TeacherResponseDTO.builder().id(1L).build();
        TeacherResponseDTO secondResponse = TeacherResponseDTO.builder().id(2L).build();

        when(teacherRepository.findAll()).thenReturn(List.of(first, second));
        when(teacherMapper.toResponse(first)).thenReturn(firstResponse);
        when(teacherMapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(teacherService.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void getCurrentProfile_includesTeacherAssignmentsSummary() {
        UserContext.setCurrentUser("1", "teacher@ump.ac.ma", Set.of("TEACHER"));

        Teacher teacher = new Teacher();
        teacher.setId(1L);
        teacher.setEmail("teacher@ump.ac.ma");
        teacher.setFirstName("Ahmed");
        teacher.setLastName("Bennani");
        teacher.setPfpUrl("https://example.com/teacher.png");
        teacher.setEnabled(true);
        teacher.setFirstLogin(false);
        LocalDateTime createdAt = LocalDateTime.of(2026, 1, 10, 9, 0);
        teacher.setCreatedAt(createdAt);

        Filiere filiere = Filiere.builder().code("GI").name("Genie Informatique").build();
        Formation formation = Formation.builder().name("GI-1").filiere(filiere).build();
        Groupe groupe = Groupe.builder().name("GI-1-A").formation(formation).build();
        Module module = Module.builder().name("Advanced Web Development").code("AWD").formation(formation).build();
        TeacherAssignment assignment = new TeacherAssignment();
        assignment.setTeacher(teacher);
        assignment.setFormation(formation);
        assignment.setGroupe(groupe);
        assignment.setModule(module);

        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        when(assignmentRepository.findByTeacherId(1L)).thenReturn(List.of(assignment));

        TeacherProfileDto profile = teacherService.getCurrentProfile();

        assertThat(profile)
                .extracting("id", "email", "firstName", "lastName", "pfpUrl", "enabled", "firstLogin", "createdAt", "moduleCount", "groupCount", "formationCount")
                .containsExactly(1L, "teacher@ump.ac.ma", "Ahmed", "Bennani", "https://example.com/teacher.png", true, false, createdAt, 1, 1, 1);
        assertThat(profile.getModules()).containsExactly("Advanced Web Development");
        assertThat(profile.getGroupes()).containsExactly("GI-1-A");
        assertThat(profile.getFormations()).containsExactly("GI-1");
        assertThat(profile.getFilieres()).containsExactly("GI");
    }

    @Test
    void getCurrentProfile_throwsWhenUserContextIsMissing() {
        assertThatThrownBy(() -> teacherService.getCurrentProfile())
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Missing user context");
    }

    @Test
    void updateCurrentProfilePhoto_updatesOnlyCurrentTeacherPhotoUrl() {
        UserContext.setCurrentUser("1", "teacher@ump.ac.ma", Set.of("TEACHER"));

        Teacher teacher = new Teacher();
        teacher.setId(1L);
        teacher.setEmail("teacher@ump.ac.ma");

        String newUrl = "https://example.com/avatar.png";

        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        when(teacherRepository.save(teacher)).thenReturn(teacher);
        when(assignmentRepository.findByTeacherId(1L)).thenReturn(List.of());

        assertThat(teacherService.updateCurrentProfilePhoto(newUrl).getPfpUrl()).isEqualTo(newUrl);
        assertThat(teacher.getPfpUrl()).isEqualTo(newUrl);
        verify(teacherRepository).save(teacher);
    }

    @Test
    void update_returnsUpdatesTeacherAndReturnsResponse() {
        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("updated@ump.ac.ma");

        Teacher teacher = new Teacher();
        teacher.setId(1L);
        teacher.setEmail("teacher@ump.ac.ma");
        teacher.setRoles(new HashSet<>());

        Teacher updatedTeacher = new Teacher();
        updatedTeacher.setId(1L);
        updatedTeacher.setEmail("updated@ump.ac.ma");
        updatedTeacher.setRoles(new HashSet<>());

        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("updated@ump.ac.ma")
                .roles(new HashSet<>(List.of(Role.TEACHER)))
                .build();

        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        doAnswer(invocation -> {
            TeacherRequestDTO incoming = invocation.getArgument(0);
            Teacher target = invocation.getArgument(1);
            target.setEmail(incoming.getEmail());
            return null;
        }).when(teacherMapper).updateEntity(request, teacher);
        when(teacherRepository.save(any(Teacher.class))).thenReturn(updatedTeacher);
        when(teacherMapper.toResponse(updatedTeacher)).thenReturn(response);

        TeacherResponseDTO result = teacherService.update(1L, request);

        assertThat(result).isEqualTo(response);
        verify(teacherRepository).findById(1L);
        verify(teacherMapper).updateEntity(request, teacher);
        verify(teacherRepository).save(teacher);
        verify(teacherMapper).toResponse(updatedTeacher);
    }

    @Test
    void update_throwsWhenTeacherNotFound() {
        when(teacherRepository.findById(1L)).thenReturn(Optional.empty());  // teacher not found

        assertThatThrownBy(() -> teacherService.update(1L, new TeacherRequestDTO()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Teacher not found");
    }

    @Test
    void update_throwsWhenSaveViolatesConstraint() {
        when(teacherRepository.findById(1L)).thenReturn(Optional.of(new Teacher()));  // teacher found
        doThrow(new DataIntegrityViolationException("constraint")).when(teacherRepository).save(any(Teacher.class));

        assertThatThrownBy(() -> teacherService.update(1L, new TeacherRequestDTO()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void update_throwsWhenEmailExistsForAnotherUser() {
        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@ump.ac.ma");

        Teacher teacher = new Teacher();
        teacher.setId(1L);

        User existingUser = new User();
        existingUser.setId(2L);

        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        doNothing().when(teacherMapper).updateEntity(request, teacher);
        when(teacherRepository.save(teacher)).thenThrow(new DataIntegrityViolationException("constraint"));
        when(userRepository.findByEmail("teacher@ump.ac.ma")).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> teacherService.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Email already exists");
    }

    @Test
    void delete_deletesTeacher() {
        Teacher teacher = new Teacher();
        teacher.setId(1L);
        
        // Add this line so the service "finds" the teacher before deleting
        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        doNothing().when(teacherRepository).delete(teacher);

        teacherService.delete(1L);

        verify(teacherRepository).delete(teacher);
    }

    @Test
    void delete_throwsWhenTeacherNotFound() {
        when(teacherRepository.findById(1L)).thenReturn(Optional.empty());  // teacher not found

        assertThatThrownBy(() -> teacherService.delete(1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Teacher not found");
    }

    @Test
    void delete_throwsWhenDeleteViolatesConstraint() {
        // Stub the find so it passes the "exists" check
        Teacher teacher = new Teacher();
        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        
        // Stub the delete to throw the error
        doThrow(new DataIntegrityViolationException("constraint")).when(teacherRepository).delete(teacher);

        assertThatThrownBy(() -> teacherService.delete(1L))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
