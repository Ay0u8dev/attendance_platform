package ma.eniad.userservice.service.student;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
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
        when(studentRepository.save(student))
            .thenThrow(new DataIntegrityViolationException("constraint", new RuntimeException("email")));

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
        when(studentRepository.save(student))
            .thenThrow(new DataIntegrityViolationException("constraint", new RuntimeException("num_apogee")));

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
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email or numApogee already exists");
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
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email or numApogee already exists");
    }
}
