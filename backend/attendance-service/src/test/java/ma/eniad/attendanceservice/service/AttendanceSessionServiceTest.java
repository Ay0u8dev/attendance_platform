package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.client.UserServiceClient;
import ma.eniad.attendanceservice.config.AttendanceSessionProperties;
import ma.eniad.attendanceservice.dto.AttendanceSessionResponse;
import ma.eniad.attendanceservice.dto.CreateAttendanceSessionRequest;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.dto.StudentRosterDto;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceSessionServiceTest {

    private AttendanceSessionRepository attendanceSessionRepository;
    private UserServiceClient userServiceClient;
    private LiveAttendanceSessionStore liveAttendanceSessionStore;
    private AttendanceSessionService attendanceSessionService;

    @BeforeEach
    void setUp() {
        attendanceSessionRepository = mock(AttendanceSessionRepository.class);
        userServiceClient = mock(UserServiceClient.class);
        liveAttendanceSessionStore = mock(LiveAttendanceSessionStore.class);
        attendanceSessionService = new AttendanceSessionService(
                attendanceSessionRepository,
                userServiceClient,
                liveAttendanceSessionStore,
                new AttendanceSessionProperties(Duration.ofMinutes(30), Duration.ofHours(1), Duration.ofMinutes(1))
        );
        when(attendanceSessionRepository.findByTeacherIdAndStatus(77L, AttendanceSessionStatus.ACTIVE)).thenReturn(Optional.empty());
    }

    @Test
    void createSessionPersistsNormalizedDataAndInitializesLiveState() {
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L, 2L))).thenReturn(List.of(
                new StudentRosterDto(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "https://cdn.example.com/aya.jpg", "A001"),
                new StudentRosterDto(11L, 2L, "Yassine", "Fassi", "yassine@ump.ac.ma", "https://cdn.example.com/yassine.jpg", "A002")
        ));
        when(attendanceSessionRepository.saveAndFlush(any(AttendanceSession.class))).thenAnswer(invocation -> {
            AttendanceSession session = invocation.getArgument(0);
            session.setId(100L);
            return session;
        });

        AttendanceSessionResponse response = attendanceSessionService.createSession(77L, baseRequest());

        assertThat(response.sessionId()).isEqualTo(100L);
        assertThat(response.teacherId()).isEqualTo(77L);
        assertThat(response.groupIds()).containsExactly(1L, 2L);
        assertThat(response.courseLabel()).isEqualTo("Distributed Systems");
        assertThat(response.roomLabel()).isEqualTo("Room B12");
        assertThat(response.gpsLat()).isEqualTo("34.6814");
        assertThat(response.gpsLon()).isEqualTo("-1.9086");
        assertThat(response.method()).isEqualTo(AttendanceSessionMethod.QR_CODE);
        assertThat(response.status()).isEqualTo(AttendanceSessionStatus.ACTIVE);
        assertThat(response.studentCount()).isEqualTo(2);
        assertThat(Duration.between(response.startedAt(), response.endsAt())).isEqualTo(Duration.ofMinutes(30));

        ArgumentCaptor<AttendanceSession> sessionCaptor = ArgumentCaptor.forClass(AttendanceSession.class);
        verify(attendanceSessionRepository).saveAndFlush(sessionCaptor.capture());
        AttendanceSession persistedSession = sessionCaptor.getValue();
        assertThat(persistedSession.getTeacherId()).isEqualTo(77L);
        assertThat(persistedSession.getGroupIds()).containsExactly(1L, 2L);
        assertThat(persistedSession.getCourseLabel()).isEqualTo("Distributed Systems");
        assertThat(persistedSession.getRoomLabel()).isEqualTo("Room B12");
        assertThat(persistedSession.getStatus()).isEqualTo(AttendanceSessionStatus.ACTIVE);
        assertThat(persistedSession.getPresentCount()).isZero();
        assertThat(persistedSession.getAbsentCount()).isZero();
        assertThat(persistedSession.getUnknownCount()).isEqualTo(2);

        ArgumentCaptor<LiveAttendanceSessionMeta> metaCaptor = ArgumentCaptor.forClass(LiveAttendanceSessionMeta.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LiveAttendanceStudentState>> studentsCaptor = ArgumentCaptor.forClass((Class<List<LiveAttendanceStudentState>>) (Class<?>) List.class);
        verify(liveAttendanceSessionStore).initializeSession(metaCaptor.capture(), studentsCaptor.capture());
        assertThat(metaCaptor.getValue().sessionId()).isEqualTo(100L);
        assertThat(metaCaptor.getValue().teacherId()).isEqualTo(77L);
        assertThat(metaCaptor.getValue().groupIds()).containsExactly(1L, 2L);
        assertThat(metaCaptor.getValue().status()).isEqualTo(AttendanceSessionStatus.ACTIVE);
        assertThat(studentsCaptor.getValue()).hasSize(2);
        assertThat(studentsCaptor.getValue().getFirst().email()).isEqualTo("aya@ump.ac.ma");
        assertThat(studentsCaptor.getValue())
                .allMatch(student -> student.status() == AttendanceStudentStatus.UNKNOWN
                        && student.markedAt() == null
                        && student.markMethod() == null
                        && student.deviceId() == null
                        && student.markedGpsLat() == null
                        && student.markedGpsLon() == null);
    }

    @Test
    void createSessionRejectsSecondActiveSessionForTeacher() {
        AttendanceSession activeSession = AttendanceSession.builder()
                .id(99L)
                .teacherId(77L)
                .status(AttendanceSessionStatus.ACTIVE)
                .build();
        when(attendanceSessionRepository.findByTeacherIdAndStatus(77L, AttendanceSessionStatus.ACTIVE)).thenReturn(Optional.of(activeSession));
        when(liveAttendanceSessionStore.findSessionMeta(99L)).thenReturn(Optional.of(new LiveAttendanceSessionMeta(
                99L,
                77L,
                List.of(1L),
                "Distributed Systems",
                "Room B12",
                null,
                null,
                LocalDateTime.of(2026, 4, 28, 12, 0),
                LocalDateTime.of(2026, 4, 28, 12, 30),
                AttendanceSessionMethod.MANUAL,
                AttendanceSessionStatus.ACTIVE
        )));

        assertThatThrownBy(() -> attendanceSessionService.createSession(77L, baseRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(attendanceSessionRepository, never()).saveAndFlush(any());
        verify(liveAttendanceSessionStore, never()).initializeSession(any(), any());
    }

    @Test
    void createSessionFinalizesStaleActiveSessionWhenLiveStateIsMissing() {
        AttendanceSession staleSession = AttendanceSession.builder()
                .id(99L)
                .teacherId(77L)
                .startedAt(LocalDateTime.of(2026, 4, 28, 11, 0))
                .endsAt(LocalDateTime.of(2026, 4, 28, 11, 30))
                .method(AttendanceSessionMethod.MANUAL)
                .status(AttendanceSessionStatus.ACTIVE)
                .presentCount(0)
                .absentCount(0)
                .unknownCount(2)
                .build();
        when(attendanceSessionRepository.findByTeacherIdAndStatus(77L, AttendanceSessionStatus.ACTIVE)).thenReturn(Optional.of(staleSession));
        when(liveAttendanceSessionStore.findSessionMeta(99L)).thenReturn(Optional.empty());
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L, 2L))).thenReturn(List.of(
                new StudentRosterDto(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", null, "A001")
        ));
        when(attendanceSessionRepository.saveAndFlush(any(AttendanceSession.class))).thenAnswer(invocation -> {
            AttendanceSession session = invocation.getArgument(0);
            session.setId(100L);
            return session;
        });

        AttendanceSessionResponse response = attendanceSessionService.createSession(77L, baseRequest());

        assertThat(response.sessionId()).isEqualTo(100L);
        assertThat(staleSession.getStatus()).isEqualTo(AttendanceSessionStatus.FINALIZED);
        assertThat(staleSession.getEndedAt()).isNotNull();
        verify(attendanceSessionRepository).save(staleSession);
        verify(liveAttendanceSessionStore).initializeSession(any(), any());
    }

    @Test
    void createSessionPropagatesRosterLookupConflictWithoutPersistence() {
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L, 2L)))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "No active academic year found"));

        assertThatThrownBy(() -> attendanceSessionService.createSession(77L, baseRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(attendanceSessionRepository, never()).saveAndFlush(any());
        verify(liveAttendanceSessionStore, never()).initializeSession(any(), any());
    }

    @Test
    void createSessionDeletesPersistedSessionWhenLiveStoreInitializationFails() {
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L, 2L))).thenReturn(List.of(
                new StudentRosterDto(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "https://cdn.example.com/aya.jpg", "A001")
        ));
        AttendanceSession savedSession = AttendanceSession.builder()
                .id(100L)
                .teacherId(77L)
                .groupIds(List.of(1L, 2L))
                .courseLabel("Distributed Systems")
                .roomLabel("Room B12")
                .gpsLat("34.6814")
                .gpsLon("-1.9086")
                .startedAt(LocalDateTime.of(2026, 4, 28, 12, 0))
                .endsAt(LocalDateTime.of(2026, 4, 28, 12, 30))
                .method(AttendanceSessionMethod.QR_CODE)
                .status(AttendanceSessionStatus.ACTIVE)
                .presentCount(0)
                .absentCount(0)
                .unknownCount(1)
                .build();
        when(attendanceSessionRepository.saveAndFlush(any(AttendanceSession.class))).thenReturn(savedSession);
        doThrow(new RuntimeException("Redis unavailable")).when(liveAttendanceSessionStore).initializeSession(any(), any());

        assertThatThrownBy(() -> attendanceSessionService.createSession(77L, baseRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);

        verify(attendanceSessionRepository).delete(savedSession);
        verify(attendanceSessionRepository).flush();
    }

    private CreateAttendanceSessionRequest baseRequest() {
        return new CreateAttendanceSessionRequest(
                List.of(1L, 2L, 1L),
                "  Distributed Systems  ",
                "  Room B12  ",
                AttendanceSessionMethod.QR_CODE,
                " 34.6814 ",
                " -1.9086 "
        );
    }
}
