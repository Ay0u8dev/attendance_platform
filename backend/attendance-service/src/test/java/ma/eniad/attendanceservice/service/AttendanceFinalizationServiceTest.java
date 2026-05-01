package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.config.AttendanceSessionProperties;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceFinalizationServiceTest {

    private AttendanceSessionRepository attendanceSessionRepository;
    private AttendanceRecordRepository attendanceRecordRepository;
    private LiveAttendanceSessionStore liveAttendanceSessionStore;
    private AttendanceSessionReadService attendanceSessionReadService;
    private SimpMessagingTemplate messagingTemplate;
    private AttendanceFinalizationService attendanceFinalizationService;

    @BeforeEach
    void setUp() {
        attendanceSessionRepository = mock(AttendanceSessionRepository.class);
        attendanceRecordRepository = mock(AttendanceRecordRepository.class);
        liveAttendanceSessionStore = mock(LiveAttendanceSessionStore.class);
        attendanceSessionReadService = mock(AttendanceSessionReadService.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        attendanceFinalizationService = new AttendanceFinalizationService(
                attendanceSessionRepository,
                attendanceRecordRepository,
                liveAttendanceSessionStore,
                attendanceSessionReadService,
                new AttendanceSessionProperties(Duration.ofMinutes(30), Duration.ofHours(1), Duration.ofMinutes(1)),
                messagingTemplate
        );
    }

    @Test
    void finalizeSessionPersistsResolvedAttendanceAndReturnsReadModel() {
        AttendanceSession session = baseSession(AttendanceSessionStatus.ACTIVE);
        when(attendanceSessionRepository.findByIdAndTeacherId(100L, 77L)).thenReturn(Optional.of(session));
        when(liveAttendanceSessionStore.findSessionMeta(100L)).thenReturn(Optional.of(baseMeta(AttendanceSessionStatus.ACTIVE)));
        when(liveAttendanceSessionStore.findAllStudentStates(100L)).thenReturn(List.of(
                new LiveAttendanceStudentState(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "A001",
                        AttendanceStudentStatus.PRESENT, LocalDateTime.of(2026, 4, 28, 12, 5),
                        AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091"),
                new LiveAttendanceStudentState(11L, 1L, "Yassine", "Fassi", "yassine@ump.ac.ma", "A002",
                        AttendanceStudentStatus.UNKNOWN, null, null, null, null, null)
        ));
        doNothing().when(attendanceRecordRepository).deleteBySessionId(100L);
        when(attendanceRecordRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AttendanceSessionDetailsResponse finalizedResponse = new AttendanceSessionDetailsResponse(
                100L, 77L, List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                session.getStartedAt(), session.getEndsAt(), session.getEndsAt(), AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.FINALIZED,
                1, 1, 0, List.of()
        );
        when(attendanceSessionReadService.getSession(100L, 77L)).thenReturn(finalizedResponse);

        AttendanceSessionDetailsResponse response = attendanceFinalizationService.finalizeSession(100L, 77L);

        assertThat(response.status()).isEqualTo(AttendanceSessionStatus.FINALIZED);
        assertThat(session.getStatus()).isEqualTo(AttendanceSessionStatus.FINALIZED);

        ArgumentCaptor<List<AttendanceRecord>> recordsCaptor = ArgumentCaptor.forClass(List.class);
        verify(attendanceRecordRepository).saveAll(recordsCaptor.capture());
        List<AttendanceRecord> records = recordsCaptor.getValue();
        assertThat(records).hasSize(2);
        AttendanceRecord presentRecord = records.getFirst();
        AttendanceRecord absentRecord = records.getLast();
        assertThat(presentRecord.getFirstName()).isEqualTo("Aya");
        assertThat(presentRecord.getMarkedGpsLat()).isEqualTo("34.6820");
        assertThat(absentRecord.getStatus()).isEqualTo(AttendanceStudentStatus.ABSENT);
        assertThat(absentRecord.getMarkMethod()).isNull();
        assertThat(absentRecord.getMarkedGpsLat()).isNull();

        ArgumentCaptor<LiveAttendanceSessionMeta> metaCaptor = ArgumentCaptor.forClass(LiveAttendanceSessionMeta.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LiveAttendanceStudentState>> studentsCaptor = ArgumentCaptor.forClass((Class<List<LiveAttendanceStudentState>>) (Class<?>) List.class);
        verify(liveAttendanceSessionStore).finalizeSession(metaCaptor.capture(), studentsCaptor.capture(), eq(Duration.ofHours(1)));
        assertThat(metaCaptor.getValue().status()).isEqualTo(AttendanceSessionStatus.FINALIZED);
        assertThat(studentsCaptor.getValue().getLast().status()).isEqualTo(AttendanceStudentStatus.ABSENT);

        verify(messagingTemplate).convertAndSend(eq("/topic/attendance.sessions.100"), isA(Object.class));
    }

    @Test
    void finalizeSessionRejectsAlreadyFinalizedSession() {
        when(attendanceSessionRepository.findByIdAndTeacherId(100L, 77L))
                .thenReturn(Optional.of(baseSession(AttendanceSessionStatus.FINALIZED)));

        assertThatThrownBy(() -> attendanceFinalizationService.finalizeSession(100L, 77L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(attendanceRecordRepository, never()).saveAll(any());
    }

    @Test
    void finalizeExpiredSessionsUsesSameFinalizationPath() {
        AttendanceSession session = baseSession(AttendanceSessionStatus.ACTIVE);
        when(attendanceSessionRepository.findAllByStatusAndEndsAtLessThanEqual(eq(AttendanceSessionStatus.ACTIVE), any()))
                .thenReturn(List.of(session));
        when(attendanceSessionRepository.findById(100L)).thenReturn(Optional.of(session));
        when(liveAttendanceSessionStore.findSessionMeta(100L)).thenReturn(Optional.of(baseMeta(AttendanceSessionStatus.ACTIVE)));
        when(liveAttendanceSessionStore.findAllStudentStates(100L)).thenReturn(List.of(
                new LiveAttendanceStudentState(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "A001",
                        AttendanceStudentStatus.UNKNOWN, null, null, null, null, null)
        ));
        doNothing().when(attendanceRecordRepository).deleteBySessionId(100L);
        when(attendanceRecordRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        attendanceFinalizationService.finalizeExpiredSessions();

        assertThat(session.getStatus()).isEqualTo(AttendanceSessionStatus.FINALIZED);
        verify(attendanceRecordRepository).saveAll(any());
        verify(liveAttendanceSessionStore).finalizeSession(any(), any(), eq(Duration.ofHours(1)));
    }

    private AttendanceSession baseSession(AttendanceSessionStatus status) {
        return AttendanceSession.builder()
                .id(100L)
                .teacherId(77L)
                .groupIds(List.of(1L))
                .courseLabel("Distributed Systems")
                .roomLabel("Room B12")
                .gpsLat("34.6814")
                .gpsLon("-1.9086")
                .startedAt(LocalDateTime.of(2026, 4, 28, 12, 0))
                .endsAt(LocalDateTime.of(2026, 4, 28, 12, 30))
                .method(AttendanceSessionMethod.QR_CODE)
                .status(status)
                .build();
    }

    private LiveAttendanceSessionMeta baseMeta(AttendanceSessionStatus status) {
        return new LiveAttendanceSessionMeta(
                100L, 77L, List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30),
                AttendanceSessionMethod.QR_CODE, status
        );
    }
}
