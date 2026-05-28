package ma.eniad.userservice.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import ma.eniad.userservice.controller.inscription.InscriptionController;
import ma.eniad.userservice.dto.inscription.InscriptionRequestDTO;
import ma.eniad.userservice.dto.inscription.InscriptionResponseDTO;
import ma.eniad.userservice.service.inscription.InscriptionService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class InscriptionControllerTest {

    private InscriptionController controller;

    @Mock
    private InscriptionService inscriptionService;

    @BeforeEach
    void setUp() {
        controller = new InscriptionController(inscriptionService);
    }

    @Test
    void createReturnsCreated() {
        InscriptionResponseDTO response = InscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.createInscription(any(InscriptionRequestDTO.class))).thenReturn(response);

        InscriptionRequestDTO request = new InscriptionRequestDTO();
        request.setStudentId(1L);
        request.setFormationId(2L);
        request.setGroupeId(3L);
        request.setAcademicYearId(4L);

        ResponseEntity<InscriptionResponseDTO> result = controller.createInscription(request);

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isSameAs(response);
    }

    @Test
    void getInscriptionByIdReturnsOk() {
        InscriptionResponseDTO response = InscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.getInscriptionById(10L)).thenReturn(response);

        ResponseEntity<InscriptionResponseDTO> result = controller.getInscriptionById(10L);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(response);
        verify(inscriptionService).getInscriptionById(10L);
    }

    @Test
    void getAllInscriptionsReturnsOk() {
        InscriptionResponseDTO response = InscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.getAllInscriptions()).thenReturn(List.of(response));

        ResponseEntity<List<InscriptionResponseDTO>> result = controller.getAllInscriptions();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).containsExactly(response);
        verify(inscriptionService).getAllInscriptions();
    }

    @Test
    void updateReturnsOk() {
        InscriptionResponseDTO response = InscriptionResponseDTO.builder()
                .id(10L)
                .studentId(1L)
                .formationId(2L)
                .groupeId(3L)
                .academicYearId(4L)
                .build();

        when(inscriptionService.updateInscription(any(Long.class), any(InscriptionRequestDTO.class)))
                .thenReturn(response);

        InscriptionRequestDTO request = new InscriptionRequestDTO();
        request.setStudentId(1L);
        request.setFormationId(2L);
        request.setGroupeId(3L);
        request.setAcademicYearId(4L);

        ResponseEntity<InscriptionResponseDTO> result = controller.updateInscription(10L, request);

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
