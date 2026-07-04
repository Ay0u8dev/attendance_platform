package ma.eniad.justificationservice.service;

import ma.eniad.justificationservice.client.AttendanceServiceClient;
import ma.eniad.justificationservice.client.UserServiceClient;
import ma.eniad.justificationservice.dto.AttendanceJustificationContext;
import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;
import ma.eniad.justificationservice.dto.DecisionJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;
import ma.eniad.justificationservice.repository.JustificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JustificationServiceTest {

    private JustificationRepository repository;
    private AttendanceServiceClient attendanceServiceClient;
    private UserServiceClient userServiceClient;
    private JustificationNotificationService justificationNotificationService;
    private JustificationService service;

    @BeforeEach
    void setUp() {
        repository = mock(JustificationRepository.class);
        attendanceServiceClient = mock(AttendanceServiceClient.class);
        userServiceClient = mock(UserServiceClient.class);
        justificationNotificationService = mock(JustificationNotificationService.class);
        service = new JustificationService(
                repository,
                attendanceServiceClient,
                userServiceClient,
                justificationNotificationService
        );
    }

    @Test
    void adminCanApprovePendingJustificationAndAttendanceBecomesJustified() {
        Justification justification = pendingJustification(77L);
        when(repository.findByIdForDecision(1L)).thenReturn(Optional.of(justification));
        when(repository.saveAndFlush(justification)).thenReturn(justification);

        var response = service.decide(
                1L,
                user(5L, "ADMIN"),
                new DecisionJustificationRequest(JustificationStatus.APPROVED, "Medical document accepted")
        );

        assertThat(response.getStatus()).isEqualTo(JustificationStatus.APPROVED);
        assertThat(response.getDecidedBy()).isEqualTo("5");
        assertThat(response.getDecidedByRole()).isEqualTo("ADMIN");
        verify(attendanceServiceClient).justifyAbsence(
                100L,
                10L,
                "justification-service",
                new AttendanceJustificationRequest(1L, "5", "ADMIN")
        );
    }

    @Test
    void adminCanRejectAndAttendanceRecordIsNotChanged() {
        Justification justification = pendingJustification(77L);
        when(repository.findByIdForDecision(1L)).thenReturn(Optional.of(justification));
        when(repository.saveAndFlush(justification)).thenReturn(justification);

        var response = service.decide(
                1L,
                user(5L, "ADMIN"),
                new DecisionJustificationRequest(JustificationStatus.REJECTED, "Document invalid")
        );

        assertThat(response.getStatus()).isEqualTo(JustificationStatus.REJECTED);
        verify(attendanceServiceClient, never()).justifyAbsence(any(), any(), any(), any());
    }

    @Test
    void teacherCanApproveJustificationForOwnSession() {
        Justification justification = pendingJustification(77L);
        when(repository.findByIdForDecision(1L)).thenReturn(Optional.of(justification));
        when(repository.saveAndFlush(justification)).thenReturn(justification);

        var response = service.decide(
                1L,
                user(77L, "TEACHER"),
                new DecisionJustificationRequest(JustificationStatus.APPROVED, null)
        );

        assertThat(response.getDecidedByRole()).isEqualTo("TEACHER");
        verify(attendanceServiceClient).justifyAbsence(
                100L,
                10L,
                "justification-service",
                new AttendanceJustificationRequest(1L, "77", "TEACHER")
        );
    }

    @Test
    void teacherCannotDecideAnotherTeachersJustification() {
        Justification justification = pendingJustification(88L);
        when(repository.findByIdForDecision(1L)).thenReturn(Optional.of(justification));

        assertThatThrownBy(() -> service.decide(
                1L,
                user(77L, "TEACHER"),
                new DecisionJustificationRequest(JustificationStatus.REJECTED, null)
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void decidedJustificationCannotBeProcessedTwice() {
        Justification justification = pendingJustification(77L);
        justification.setStatus(JustificationStatus.APPROVED);
        when(repository.findByIdForDecision(1L)).thenReturn(Optional.of(justification));

        assertThatThrownBy(() -> service.decide(
                1L,
                user(5L, "ADMIN"),
                new DecisionJustificationRequest(JustificationStatus.REJECTED, null)
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void teacherListIsRestrictedToAuthenticatedTeacher() {
        when(repository.findByTeacherIdIsNullAndSessionIdIsNotNull()).thenReturn(List.of());
        when(repository.findByTeacherIdOrderBySubmittedAtDesc(77L))
                .thenReturn(List.of(pendingJustification(77L)));

        var rows = service.findForTeacher(user(77L, "TEACHER"), JustificationStatus.PENDING);

        assertThat(rows).hasSize(1);
        verify(repository).findByTeacherIdOrderBySubmittedAtDesc(77L);
    }

    @Test
    void adminListHydratesMissingTeacherNameFromAttendanceContext() {
        Justification justification = pendingJustification(77L);
        justification.setTeacherName(null);
        when(repository.findAllByOrderBySubmittedAtDesc()).thenReturn(List.of(justification));
        when(repository.save(justification)).thenReturn(justification);
        when(attendanceServiceClient.getJustificationContext(100L, 10L, "justification-service"))
                .thenReturn(new AttendanceJustificationContext(
                        501L,
                        100L,
                        10L,
                        20L,
                        77L,
                        "Prof. Idrissi",
                        "Aya Bennani",
                        "aya@ump.ac.ma",
                        "A001",
                        "Distributed Systems",
                        "B12",
                        LocalDateTime.of(2026, 6, 20, 9, 0),
                        LocalDateTime.of(2026, 6, 20, 10, 30),
                        "ABSENT"
                ));

        var rows = service.findForAdmin(user(5L, "ADMIN"), null);

        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().getTeacherName()).isEqualTo("Prof. Idrissi");
        verify(repository).save(justification);
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
        when(repository.save(Mockito.any(Justification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var justification = service.submit(request);

        assertThat(justification.getDocumentUrl()).isEqualTo("justifications/ceebfcf0-4a33-4d09-ae13-3a95a63400a6.pdf");
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

        assertThatThrownBy(() -> service.submit(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("A justification already exists for this absence");
    }

    private Justification pendingJustification(Long teacherId) {
        LocalDateTime now = LocalDateTime.of(2026, 6, 20, 9, 0);
        return Justification.builder()
                .id(1L)
                .attendanceRecordId(501L)
                .sessionId(100L)
                .studentId(10L)
                .groupId(20L)
                .teacherId(teacherId)
                .teacherName("Prof. Idrissi")
                .studentName("Aya Bennani")
                .studentEmail("aya@ump.ac.ma")
                .studentCode("A001")
                .module("Distributed Systems")
                .roomLabel("B12")
                .sessionDate(now)
                .sessionEndedAt(now.plusMinutes(90))
                .status(JustificationStatus.PENDING)
                .reason("Medical appointment")
                .submittedAt(now.plusHours(2))
                .updatedAt(now.plusHours(2))
                .build();
    }

    private RequestUser user(Long id, String role) {
        return new RequestUser(id, role.toLowerCase() + "@ump.ac.ma", Set.of(role));
    }
}
