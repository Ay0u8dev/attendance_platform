package ma.eniad.userservice.controller.student;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import ma.eniad.userservice.dto.student.StudentProfileDto;
import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.service.student.StudentService;

@ExtendWith(MockitoExtension.class)
class StudentControllerTest {

        private StudentController controller;

        @Mock
        private StudentService studentService;

        @BeforeEach
        void setUp() {
                controller = new StudentController(studentService);
        }

    @Test
    void create_returnsCreated() throws Exception {
        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
                .email("student@example.com")
                .numApogee("A123")
                .roles(Set.of(Role.STUDENT))
                .build();

        when(studentService.create(any(StudentRequestDTO.class))).thenReturn(response);

        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@example.com");
        request.setNumApogee("A123");

        ResponseEntity<StudentResponseDTO> result = controller.create(request);

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isEqualTo(response);
    }

    @Test
    void getAll_returnsList() throws Exception {
        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
                .email("student@example.com")
                .numApogee("A123")
                .roles(Set.of(Role.STUDENT))
                .build();

        when(studentService.getAll()).thenReturn(List.of(response));

        ResponseEntity<List<StudentResponseDTO>> result = controller.getAll();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).containsExactly(response);
        verify(studentService).getAll();
    }

    @Test
    void getProfile_returnsOk() {
        StudentProfileDto profile = StudentProfileDto.builder()
                .id(1L)
                .email("student@example.com")
                .firstName("Sara")
                .lastName("Alaoui")
                .numApogee("A123")
                .filiere("GI")
                .groupe("GI-1")
                .build();

        when(studentService.getCurrentProfile()).thenReturn(profile);

        ResponseEntity<StudentProfileDto> result = controller.getProfile();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(profile);
        verify(studentService).getCurrentProfile();
    }

    @Test
    void getById_returnsOk() {
        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
                .email("student@example.com")
                .numApogee("A123")
                .roles(Set.of(Role.STUDENT))
                .build();

        when(studentService.getById(1L)).thenReturn(response);

        ResponseEntity<StudentResponseDTO> result = controller.getById(1L);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(response);
        verify(studentService).getById(1L);
    }

    @Test
    void update_returnsOk() throws Exception {
        StudentResponseDTO response = StudentResponseDTO.builder()
                .id(1L)
                .email("student@example.com")
                .numApogee("A123")
                .roles(Set.of(Role.STUDENT))
                .build();

        when(studentService.update(any(Long.class), any(StudentRequestDTO.class))).thenReturn(response);

        StudentRequestDTO request = new StudentRequestDTO();
        request.setEmail("student@example.com");
        request.setNumApogee("A123");

        ResponseEntity<StudentResponseDTO> result = controller.update(1L, request);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isEqualTo(response);
        verify(studentService).update(1L, request);
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        doNothing().when(studentService).delete(1L);

        ResponseEntity<Void> result = controller.delete(1L);

        assertThat(result.getStatusCode().value()).isEqualTo(204);
        verify(studentService).delete(1L);
    }
}