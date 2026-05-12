package ma.eniad.userservice.service.student;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

import java.util.HashSet;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.student.StudentRepository;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentMapper studentMapper;

    @InjectMocks
    private StudentService studentService;

    @Test
    void create_addsDefaultsAndReturnsResponse() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@example.com");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setRoles(new HashSet<>());

        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
                .email("student@example.com")
                .numApogee("A123")
                .roles(new HashSet<>(List.of(Role.STUDENT)))
                .build();

        when(userRepository.existsByEmail("student@example.com")).thenReturn(false);
        when(studentRepository.existsByNumApogee("A123")).thenReturn(false);
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
        request.setEmail("student@example.com");

        when(userRepository.existsByEmail("student@example.com")).thenReturn(true);

        assertThatThrownBy(() -> studentService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email already exists");
    }

    @Test
    void create_throwsWhenNumApogeeExists() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@example.com");
        request.setNumApogee("A123");

        when(userRepository.existsByEmail("student@example.com")).thenReturn(false);
        when(studentRepository.existsByNumApogee("A123")).thenReturn(true);

        assertThatThrownBy(() -> studentService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("NumApogee already exists");
    }

    @Test
    void create_throwsWhenSaveViolatesConstraint() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@example.com");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setRoles(new HashSet<>());

        when(userRepository.existsByEmail("student@example.com")).thenReturn(false);
        when(studentRepository.existsByNumApogee("A123")).thenReturn(false);
        when(studentMapper.toEntity(request)).thenReturn(student);
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));

        assertThatThrownBy(() -> studentService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email or numApogee already exists");
    }

    @Test
    void update_throwsWhenSaveViolatesConstraint() {
        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@example.com");
        request.setNumApogee("A123");

        Student student = new Student();
        student.setEmail("student@example.com");
        student.setNumApogee("A123");

        when(studentRepository.findById(1L)).thenReturn(java.util.Optional.of(student));
        when(studentRepository.save(student)).thenThrow(new DataIntegrityViolationException("constraint"));
        doNothing().when(studentMapper).updateEntity(request, student);

        assertThatThrownBy(() -> studentService.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email or numApogee already exists");
    }
}
