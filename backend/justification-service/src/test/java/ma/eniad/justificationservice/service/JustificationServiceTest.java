package ma.eniad.justificationservice.service;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.springframework.web.server.ResponseStatusException;

import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.repository.JustificationRepository;

class JustificationServiceTest {

    private JustificationRepository repository;
    private JustificationService justificationService;

    @BeforeEach
    void setUp() {
        repository = mock(JustificationRepository.class);
        justificationService = new JustificationService(repository, null);
    }

    @Test
    void submitStoresDocumentUrlAsProvided() {
        String documentUrl = "https://pub-example.r2.dev/justifications/ceebfcf0-4a33-4d09-ae13-3a95a63400a6.pdf";
        SubmitJustificationRequest request = new SubmitJustificationRequest(
                123L,
                456L,
                "Student Name",
                "STU001",
                "Math",
                LocalDateTime.now(),
                "Illness",
                documentUrl
        );

        when(repository.existsBySessionIdAndStudentId(123L, 456L)).thenReturn(false);
        when(repository.save(Mockito.any(Justification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Justification justification = justificationService.submit(request);

        assertThat(justification.getDocumentUrl()).isEqualTo(documentUrl);
    }

    @Test
    void submitRejectsDuplicateJustification() {
        SubmitJustificationRequest request = new SubmitJustificationRequest(
                123L,
                456L,
                "Student Name",
                "STU001",
                "Math",
                LocalDateTime.now(),
                "Illness",
                "justifications/123.pdf"
        );

        when(repository.existsBySessionIdAndStudentId(123L, 456L)).thenReturn(true);

        assertThatThrownBy(() -> justificationService.submit(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("A justification already exists for this absence");
    }
}
