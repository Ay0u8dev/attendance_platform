package ma.eniad.userservice.controller.inscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import ma.eniad.userservice.dto.inscription.TeacherAssignmentRequestDTO;
import ma.eniad.userservice.dto.inscription.TeacherAssignmentResponseDTO;
import ma.eniad.userservice.service.inscription.TeacherAssignmentService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class TeacherAssignmentControllerTest {

    private TeacherAssignmentController controller;

    @Mock
    private TeacherAssignmentService service;

    @BeforeEach
    void setUp() {
        controller = new TeacherAssignmentController(service);
    }

    @Test
    void createReturnsCreated() {
        TeacherAssignmentRequestDTO request = request();
        TeacherAssignmentResponseDTO response = response(10L);

        when(service.create(any(TeacherAssignmentRequestDTO.class))).thenReturn(response);

        ResponseEntity<TeacherAssignmentResponseDTO> result = controller.create(request);

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isSameAs(response);
        verify(service).create(request);
    }

    @Test
    void getAllReturnsOk() {
        TeacherAssignmentResponseDTO response = response(10L);

        when(service.getAll()).thenReturn(List.of(response));

        ResponseEntity<List<TeacherAssignmentResponseDTO>> result = controller.getAll();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).containsExactly(response);
        verify(service).getAll();
    }

    @Test
    void getByIdReturnsOk() {
        TeacherAssignmentResponseDTO response = response(10L);

        when(service.getById(10L)).thenReturn(response);

        ResponseEntity<TeacherAssignmentResponseDTO> result = controller.getById(10L);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(response);
        verify(service).getById(10L);
    }

    @Test
    void updateReturnsOk() {
        TeacherAssignmentRequestDTO request = request();
        TeacherAssignmentResponseDTO response = response(10L);

        when(service.update(any(Long.class), any(TeacherAssignmentRequestDTO.class))).thenReturn(response);

        ResponseEntity<TeacherAssignmentResponseDTO> result = controller.update(10L, request);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(response);
        verify(service).update(10L, request);
    }

    @Test
    void deleteReturnsNoContent() {
        doNothing().when(service).delete(10L);

        ResponseEntity<Void> result = controller.delete(10L);

        assertThat(result.getStatusCode().value()).isEqualTo(204);
        verify(service).delete(10L);
    }

    private static TeacherAssignmentRequestDTO request() {
        TeacherAssignmentRequestDTO request = new TeacherAssignmentRequestDTO();
        request.setTeacherId(1L);
        request.setAcademicYearId(2L);
        request.setFormationId(3L);
        request.setGroupeId(4L);
        request.setModuleId(5L);
        return request;
    }

    private static TeacherAssignmentResponseDTO response(Long id) {
        return TeacherAssignmentResponseDTO.builder()
                .id(id)
                .teacherId(1L)
                .academicYearId(2L)
                .formationId(3L)
                .groupeId(4L)
                .moduleId(5L)
                .build();
    }
}
