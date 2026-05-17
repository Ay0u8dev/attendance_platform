package ma.eniad.userservice.controller.teacher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Set;

import ma.eniad.userservice.entity.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;
import ma.eniad.userservice.service.teacher.TeacherService;

@ExtendWith(MockitoExtension.class)
public class TeacherControllerTest {
    private TeacherController controller;

    @Mock
    private TeacherService teacherService;

    @BeforeEach
    void setUp() {
        controller = new TeacherController(teacherService);
    }

    @Test
    void create_returnsCreated() throws Exception {
        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("teacher@example.com")
                .roles(Set.of(Role.TEACHER))
                .build();

        when(teacherService.create(any(TeacherRequestDTO.class))).thenReturn(response);

        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@example.com");

        ResponseEntity<TeacherResponseDTO> result = controller.create(request);

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isEqualTo(response);
    }

    @Test
    void update_returnOk() throws Exception {
        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("teacher@example.com")
                .roles(Set.of(Role.TEACHER))
                .build();

        when(teacherService.update(any(Long.class), any(TeacherRequestDTO.class))).thenReturn(response);

        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@example.com");

        ResponseEntity<TeacherResponseDTO> result = controller.update(1L, request);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isEqualTo(response);
        verify(teacherService).update(1L, request);
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        doNothing().when(teacherService).delete(1L);

        ResponseEntity<Void> result = controller.delete(1L);

        assertThat(result.getStatusCode().value()).isEqualTo(204);
        verify(teacherService).delete(1L);
    }
}
