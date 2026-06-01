package ma.eniad.userservice.service.student;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GroupeRepository groupeRepository;

    @Mock
    private StudentMapper studentMapper;

    @InjectMocks
    private StudentService studentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(studentService, "allowedDomain", "ump.ac.ma");
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
    void getByGroupeId_returnsStudentsInGroupe() {
        Student student = new Student();
        student.setId(1L);
        student.setEmail("student@ump.ac.ma");
        student.setNumApogee("A123");

        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
                .email("student@ump.ac.ma")
                .numApogee("A123")
                .build();

        when(groupeRepository.existsById(10L)).thenReturn(true);
        when(studentRepository.findByGroupeId(10L)).thenReturn(List.of(student));
        when(studentMapper.toResponse(student)).thenReturn(response);

        List<StudentResponseDTO> result = studentService.getByGroupeId(10L);

        assertThat(result).containsExactly(response);
        verify(groupeRepository).existsById(10L);
        verify(studentRepository).findByGroupeId(10L);
    }

    @Test
    void getByGroupeId_throwsWhenGroupeNotFound() {
        when(groupeRepository.existsById(10L)).thenReturn(false);

        assertThatThrownBy(() -> studentService.getByGroupeId(10L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Groupe not found");
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
