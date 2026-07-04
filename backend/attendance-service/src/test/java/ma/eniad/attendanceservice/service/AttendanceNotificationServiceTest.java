package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.NotificationRequestedEvent;
import ma.eniad.attendanceservice.dto.StudentRosterDto;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;
import ma.eniad.attendanceservice.entity.enums.NotificationChannel;
import ma.eniad.attendanceservice.messaging.NotificationEventPublisher;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;

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

    private NotificationEventPublisher notificationEventPublisher;
    private AttendanceRecordRepository attendanceRecordRepository;
    private AttendanceNotificationService attendanceNotificationService;

    @BeforeEach
    void setUp() {
        notificationEventPublisher = mock(NotificationEventPublisher.class);
        attendanceRecordRepository = mock(AttendanceRecordRepository.class);
        attendanceNotificationService = new AttendanceNotificationService(notificationEventPublisher, attendanceRecordRepository);
    }

    @Test
    void notifySessionStartedSendsOneNotificationPerRosterStudent() {
        AttendanceSession session = baseSession();

        attendanceNotificationService.notifySessionStarted(session, List.of(
                rosterStudent(10L, "Aya", "Bennani", "aya@ump.ac.ma", "A001"),
                rosterStudent(11L, "Yassine", "Fassi", "yassine@ump.ac.ma", "A002")
        ));

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher, org.mockito.Mockito.times(2)).publish(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(NotificationRequestedEvent::type)
                .containsOnly("ATTENDANCE_SESSION_STARTED");
        assertThat(captor.getAllValues())
                .allSatisfy(event -> assertThat(event.channels())
                        .containsExactlyInAnyOrder(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL));
    }

    @Test
    void notifyFinalizedStudentStatusesUsesPersistedFinalRecords() {
        AttendanceSession session = baseSession();
        session.setEndedAt(LocalDateTime.of(2026, 4, 28, 12, 45));

        attendanceNotificationService.notifyFinalizedStudentStatuses(session, List.of(
                baseRecord(10L, AttendanceStudentStatus.PRESENT),
                baseRecord(11L, AttendanceStudentStatus.ABSENT)
        ));

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher, org.mockito.Mockito.times(2)).publish(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(NotificationRequestedEvent::type)
                .containsExactly("ATTENDANCE_STATUS_CONFIRMED", "ABSENCE_RECORDED");
        assertThat(captor.getAllValues())
                .extracting(NotificationRequestedEvent::recipientUserId)
                .containsExactly(10L, 11L);
        assertThat(captor.getAllValues().get(0).severity()).isEqualTo("SUCCESS");
        assertThat(captor.getAllValues().get(1).severity()).isEqualTo("WARNING");
        assertThat(captor.getAllValues().get(0).metadataJson()).contains("\"status\":\"PRESENT\"");
        assertThat(captor.getAllValues().get(1).metadataJson()).contains("\"status\":\"ABSENT\"");
    }

    @Test
    void notifyFinalizedStudentStatusesPublishesThresholdWarningWhenAbsencesExceedThree() {
        AttendanceSession session = baseSession();
        session.setEndedAt(LocalDateTime.of(2026, 4, 28, 12, 45));
        AttendanceRecord absent = baseRecord(11L, AttendanceStudentStatus.ABSENT);
        org.mockito.Mockito.when(attendanceRecordRepository.countFinalizedAbsencesForStudentAndCourse(11L, "Distributed Systems"))
                .thenReturn(4L);

        attendanceNotificationService.notifyFinalizedStudentStatuses(session, List.of(absent));

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher, org.mockito.Mockito.times(2)).publish(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(NotificationRequestedEvent::type)
                .containsExactly("ABSENCE_RECORDED", "ABSENCE_THRESHOLD_EXCEEDED");
        assertThat(captor.getAllValues().get(1).metadataJson()).contains("\"absenceCount\":4");
        assertThat(captor.getAllValues().get(1).channels())
                .containsExactlyInAnyOrder(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL);
    }

    @Test
    void notifySessionFinalizedSendsSummaryToTeacher() {
        AttendanceSession session = baseSession();
        session.setTeacherId(77L);
        session.setPresentCount(2);
        session.setAbsentCount(1);
        session.setUnknownCount(0);

        attendanceNotificationService.notifySessionFinalized(session);

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher).publish(captor.capture());
        assertThat(captor.getValue().recipientUserId()).isEqualTo(77L);
        assertThat(captor.getValue().recipientRole()).isEqualTo("TEACHER");
        assertThat(captor.getValue().type()).isEqualTo("ATTENDANCE_SESSION_FINALIZED");
        assertThat(captor.getValue().severity()).isEqualTo("SUCCESS");
    }

    @Test
    void notificationClientFailuresAreNonBlocking() {
        doThrow(new RuntimeException("notification-service down"))
                .when(notificationEventPublisher)
                .publish(any());

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
                .firstName("Aya")
                .lastName("Bennani")
                .email("aya@ump.ac.ma")
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
