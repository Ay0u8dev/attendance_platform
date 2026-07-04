package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.client.NotificationServiceClient;
import ma.eniad.attendanceservice.dto.CreateNotificationRequest;
import ma.eniad.attendanceservice.dto.StudentRosterDto;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AttendanceNotificationServiceTest {

    private NotificationServiceClient notificationServiceClient;
    private AttendanceNotificationService attendanceNotificationService;

    @BeforeEach
    void setUp() {
        notificationServiceClient = mock(NotificationServiceClient.class);
        attendanceNotificationService = new AttendanceNotificationService(notificationServiceClient);
    }

    @Test
    void notifySessionStartedSendsOneNotificationPerRosterStudent() {
        AttendanceSession session = baseSession();

        attendanceNotificationService.notifySessionStarted(session, List.of(
                rosterStudent(10L, "Aya", "Bennani", "aya@ump.ac.ma", "A001"),
                rosterStudent(11L, "Yassine", "Fassi", "yassine@ump.ac.ma", "A002")
        ));

        ArgumentCaptor<CreateNotificationRequest> captor = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationServiceClient, org.mockito.Mockito.times(2)).createNotification(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(CreateNotificationRequest::type)
                .containsOnly("ATTENDANCE_SESSION_STARTED");
    }

    @Test
    void notifyFinalizedStudentStatusesUsesPersistedFinalRecords() {
        AttendanceSession session = baseSession();
        session.setEndedAt(LocalDateTime.of(2026, 4, 28, 12, 45));

        attendanceNotificationService.notifyFinalizedStudentStatuses(session, List.of(
                baseRecord(10L, AttendanceStudentStatus.PRESENT),
                baseRecord(11L, AttendanceStudentStatus.ABSENT)
        ));

        ArgumentCaptor<CreateNotificationRequest> captor = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationServiceClient, org.mockito.Mockito.times(2)).createNotification(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(CreateNotificationRequest::type)
                .containsExactly("ATTENDANCE_STATUS_CONFIRMED", "ABSENCE_RECORDED");
        assertThat(captor.getAllValues())
                .extracting(CreateNotificationRequest::recipientUserId)
                .containsExactly(10L, 11L);
        assertThat(captor.getAllValues().get(0).severity()).isEqualTo("SUCCESS");
        assertThat(captor.getAllValues().get(1).severity()).isEqualTo("WARNING");
        assertThat(captor.getAllValues().get(0).metadataJson()).contains("\"status\":\"PRESENT\"");
        assertThat(captor.getAllValues().get(1).metadataJson()).contains("\"status\":\"ABSENT\"");
    }

    @Test
    void notifySessionFinalizedSendsSummaryToTeacher() {
        AttendanceSession session = baseSession();
        session.setTeacherId(77L);
        session.setPresentCount(2);
        session.setAbsentCount(1);
        session.setUnknownCount(0);

        attendanceNotificationService.notifySessionFinalized(session);

        ArgumentCaptor<CreateNotificationRequest> captor = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationServiceClient).createNotification(captor.capture());
        assertThat(captor.getValue().recipientUserId()).isEqualTo(77L);
        assertThat(captor.getValue().recipientRole()).isEqualTo("TEACHER");
        assertThat(captor.getValue().type()).isEqualTo("ATTENDANCE_SESSION_FINALIZED");
        assertThat(captor.getValue().severity()).isEqualTo("SUCCESS");
    }

    @Test
    void notificationClientFailuresAreNonBlocking() {
        doThrow(new RuntimeException("notification-service down"))
                .when(notificationServiceClient)
                .createNotification(any());

        assertThatNoException().isThrownBy(() ->
                attendanceNotificationService.notifyFinalizedStudentStatuses(baseSession(), List.of(
                        baseRecord(11L, AttendanceStudentStatus.ABSENT)
                ))
        );
    }

    private AttendanceSession baseSession() {
        return AttendanceSession.builder()
                .id(100L)
                .teacherId(77L)
                .teacherFullName("Mariam Fahim")
                .courseLabel("Distributed Systems")
                .roomLabel("Room B12")
                .startedAt(LocalDateTime.of(2026, 4, 28, 12, 0))
                .build();
    }

    private AttendanceRecord baseRecord(Long studentId, AttendanceStudentStatus status) {
        return AttendanceRecord.builder()
                .sessionId(100L)
                .studentId(studentId)
                .status(status)
                .build();
    }

    private StudentRosterDto rosterStudent(Long studentId,
                                           String firstName,
                                           String lastName,
                                           String email,
                                           String numApogee) {
        return new StudentRosterDto(
                studentId,
                1L,
                firstName,
                lastName,
                email,
                null,
                numApogee,
                "Computer Science",
                "G1"
        );
    }
}
