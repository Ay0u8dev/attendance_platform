package ma.eniad.userservice.controller.inscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import ma.eniad.userservice.controller.inscription.StudentInscriptionController;
import ma.eniad.userservice.dto.inscription.StudentInscriptionRequestDTO;
import ma.eniad.userservice.dto.inscription.StudentInscriptionResponseDTO;
import ma.eniad.userservice.service.inscription.StudentInscriptionService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class StudentInscriptionControllerTest {

    private StudentInscriptionController controller;

    @Mock
    private StudentInscriptionService inscriptionService;

    @BeforeEach
    void setUp() {
        controller = new StudentInscriptionController(inscriptionService);
    }

    @Test
    void createReturnsCreated() {
        StudentInscriptionResponseDTO response = StudentInscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.createInscription(any(StudentInscriptionRequestDTO.class))).thenReturn(response);

        StudentInscriptionRequestDTO request = new StudentInscriptionRequestDTO();
        request.setStudentId(1L);
        request.setFormationId(2L);
        request.setGroupeId(3L);
        request.setAcademicYearId(4L);

        ResponseEntity<StudentInscriptionResponseDTO> result = controller.createInscription(request);

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isSameAs(response);
    }

    @Test
    void getInscriptionByIdReturnsOk() {
        StudentInscriptionResponseDTO response = StudentInscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.getInscriptionById(10L)).thenReturn(response);

        ResponseEntity<StudentInscriptionResponseDTO> result = controller.getInscriptionById(10L);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(response);
        verify(inscriptionService).getInscriptionById(10L);
    }

    @Test
    void getAllInscriptionsReturnsOk() {
        StudentInscriptionResponseDTO response = StudentInscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.getAllInscriptions()).thenReturn(List.of(response));

        ResponseEntity<List<StudentInscriptionResponseDTO>> result = controller.getAllInscriptions();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).containsExactly(response);
        verify(inscriptionService).getAllInscriptions();
    }

    @Test
    void updateReturnsOk() {
        StudentInscriptionResponseDTO response = StudentInscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.updateInscription(any(Long.class), any(StudentInscriptionRequestDTO.class)))
                .thenReturn(response);

        StudentInscriptionRequestDTO request = new StudentInscriptionRequestDTO();
        request.setStudentId(1L);
        request.setFormationId(2L);
        request.setGroupeId(3L);
        request.setAcademicYearId(4L);

        ResponseEntity<StudentInscriptionResponseDTO> result = controller.updateInscription(10L, request);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(response);
        verify(inscriptionService).updateInscription(10L, request);
    }

    @Test
    void deleteReturnsNoContent() {
        doNothing().when(inscriptionService).deleteInscription(10L);

        ResponseEntity<Void> result = controller.deleteInscription(10L);

        assertThat(result.getStatusCode().value()).isEqualTo(204);
        verify(inscriptionService).deleteInscription(10L);
    }
}
