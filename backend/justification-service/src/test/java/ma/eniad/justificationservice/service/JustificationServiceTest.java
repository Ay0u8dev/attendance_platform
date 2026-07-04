package ma.eniad.justificationservice.service;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.web.server.ResponseStatusException;

import ma.eniad.justificationservice.client.AttendanceServiceClient;
import ma.eniad.justificationservice.client.UserServiceClient;
import ma.eniad.justificationservice.dto.AttendanceSessionLookupResponse;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.repository.JustificationRepository;

class JustificationServiceTest {

    private JustificationRepository repository;
    private AttendanceServiceClient attendanceServiceClient;
    private UserServiceClient userServiceClient;
    private JustificationNotificationService justificationNotificationService;
    private JustificationService justificationService;

    @BeforeEach
    void setUp() {
        repository = mock(JustificationRepository.class);
        attendanceServiceClient = mock(AttendanceServiceClient.class);
        userServiceClient = mock(UserServiceClient.class);
        justificationNotificationService = mock(JustificationNotificationService.class);
        justificationService = new JustificationService(
                repository,
                attendanceServiceClient,
                userServiceClient,
                justificationNotificationService
        );
    }

    @Test
    void submitStoresDocumentUrlAsObjectKeyAndNotifiesStudentAndTeacher() {
        String documentUrl = "https://pub-example.r2.dev/justifications/ceebfcf0-4a33-4d09-ae13-3a95a63400a6.pdf";
        SubmitJustificationRequest request = new SubmitJustificationRequest(
                123L,
                456L,
                "Student Name",
                "student.name@ump.ac.ma",
                "STU001",
                null,
                null,
                null,
                "Math",
                LocalDateTime.now(),
                "Illness",
                documentUrl
        );

        when(repository.existsBySessionIdAndStudentId(123L, 456L)).thenReturn(false);
        when(repository.save(Mockito.any(Justification.class))).thenAnswer(invocation -> {
            Justification justification = invocation.getArgument(0);
            justification.setId(99L);
            return justification;
        });
        when(attendanceServiceClient.getSession(123L, "justification-service"))
                .thenReturn(new AttendanceSessionLookupResponse(
                        123L,
                        77L,
                        "Teacher Name",
                        java.util.List.of(1L),
                        "Math",
                        "Room A",
                        null,
                        null,
                        LocalDateTime.now(),
                        LocalDateTime.now().plusHours(1),
                        LocalDateTime.now().plusHours(1),
                        "FINALIZED",
                        0,
                        1,
                        0,
                        java.util.List.of()
                ));
        when(userServiceClient.getAdminIds("justification-service")).thenReturn(java.util.List.of(1L, 2L));

        Justification justification = justificationService.submit(request);

        assertThat(justification.getDocumentUrl())
                .isEqualTo("justifications/ceebfcf0-4a33-4d09-ae13-3a95a63400a6.pdf");
        verify(justificationNotificationService).notifySubmitted(justification);
        verify(justificationNotificationService).notifySubmittedForTeacher(justification, 77L);
        verify(justificationNotificationService).notifySubmittedForAdmin(justification, 1L);
        verify(justificationNotificationService).notifySubmittedForAdmin(justification, 2L);
    }

    @Test
    void submitRejectsDuplicateJustification() {
        SubmitJustificationRequest request = new SubmitJustificationRequest(
                123L,
                456L,
                "Student Name",
                "student.name@ump.ac.ma",
                "STU001",
                null,
                null,
                null,
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
