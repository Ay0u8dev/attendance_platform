package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AdminOverviewResponse;
import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.dto.StudentRosterDto;
import ma.eniad.attendanceservice.dto.StudentActiveAttendanceSessionResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceSessionDetailResponse;
import ma.eniad.attendanceservice.dto.TeacherAttendanceReportResponse;
import ma.eniad.attendanceservice.client.UserServiceClient;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceQueryServiceTest {

    private AttendanceSessionRepository attendanceSessionRepository;
    private AttendanceRecordRepository attendanceRecordRepository;
    private AttendanceSessionReadService attendanceSessionReadService;
    private LiveAttendanceSessionStore liveAttendanceSessionStore;
    private UserServiceClient userServiceClient;
    private AttendanceQueryService attendanceQueryService;

    @BeforeEach
    void setUp() {
        attendanceSessionRepository = mock(AttendanceSessionRepository.class);
        attendanceRecordRepository = mock(AttendanceRecordRepository.class);
        attendanceSessionReadService = mock(AttendanceSessionReadService.class);
        liveAttendanceSessionStore = mock(LiveAttendanceSessionStore.class);
        userServiceClient = mock(UserServiceClient.class);
        attendanceQueryService = new AttendanceQueryService(
                attendanceSessionRepository,
                attendanceRecordRepository,
                attendanceSessionReadService,
                liveAttendanceSessionStore,
                userServiceClient
        );
    }

    @Test
    void teacherHistoryUsesRedisCountsForActiveSessionsAndSnapshotsForFinalizedSessions() {
        AttendanceSession activeSession = baseSession(100L, AttendanceSessionStatus.ACTIVE);
        activeSession.setPresentCount(0);
        activeSession.setAbsentCount(0);
        activeSession.setUnknownCount(2);

        AttendanceSession finalizedSession = baseSession(101L, AttendanceSessionStatus.FINALIZED);
        finalizedSession.setEndedAt(LocalDateTime.of(2026, 4, 28, 12, 30));
        finalizedSession.setPresentCount(1);
        finalizedSession.setAbsentCount(1);
        finalizedSession.setUnknownCount(0);

        when(attendanceSessionRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(activeSession, finalizedSession), PageRequest.of(0, 20), 2));
        when(liveAttendanceSessionStore.findSessionMeta(100L)).thenReturn(Optional.of(mock()));
        when(liveAttendanceSessionStore.getAttendanceCounts(100L)).thenReturn(new AttendanceCounts(1, 0, 1));

        PagedResponse<?> response = attendanceQueryService.getTeacherSessions(77L, null, null, null, PageRequest.of(0, 20));

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().getFirst().toString()).contains("teacherFullName=Ayoub Elebbar", "presentCount=1", "unknownCount=1");
        assertThat(response.items().getLast().toString()).contains("teacherFullName=Ayoub Elebbar", "presentCount=1", "absentCount=1", "unknownCount=0");
    }

    @Test
    void adminOverviewAggregatesActiveAndFinalizedSessions() {
        AttendanceSession activeSession = baseSession(100L, AttendanceSessionStatus.ACTIVE);
        AttendanceSession finalizedSession = baseSession(101L, AttendanceSessionStatus.FINALIZED);
        finalizedSession.setPresentCount(2);
        finalizedSession.setAbsentCount(1);
        finalizedSession.setUnknownCount(0);
        finalizedSession.setMethod(AttendanceSessionMethod.MANUAL);

        when(attendanceSessionRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(List.of(activeSession, finalizedSession));
        when(liveAttendanceSessionStore.findSessionMeta(100L)).thenReturn(Optional.of(mock()));
        when(liveAttendanceSessionStore.getAttendanceCounts(100L)).thenReturn(new AttendanceCounts(1, 0, 1));

        AdminOverviewResponse response = attendanceQueryService.getAdminOverview(null, null);

        assertThat(response.totalSessions()).isEqualTo(2);
        assertThat(response.activeSessions()).isEqualTo(1);
        assertThat(response.finalizedSessions()).isEqualTo(1);
        assertThat(response.totalPresentMarks()).isEqualTo(3);
        assertThat(response.totalAbsentMarks()).isEqualTo(1);
        assertThat(response.attendanceRate()).isEqualTo(0.75);
    }

    @Test
    void teacherExportReportGroupsStudentRowsByFiliereWithSessionStatusColumns() {
        AttendanceSession sessionOne = baseSession(100L, AttendanceSessionStatus.FINALIZED);
        sessionOne.setGroupIds(List.of(1L));
        sessionOne.setStartedAt(LocalDateTime.of(2026, 4, 28, 12, 0));
        AttendanceSession sessionTwo = baseSession(101L, AttendanceSessionStatus.FINALIZED);
        sessionTwo.setGroupIds(List.of(2L));
        sessionTwo.setStartedAt(LocalDateTime.of(2026, 4, 29, 12, 0));

        AttendanceRecord giRecord = AttendanceRecord.builder()
                .sessionId(100L)
                .studentId(10L)
                .groupId(1L)
                .firstName("Aya")
                .lastName("Bennani")
                .email("aya@ump.ac.ma")
                .numApogee("A001")
                .status(AttendanceStudentStatus.PRESENT)
                .build();
        AttendanceRecord idsRecord = AttendanceRecord.builder()
                .sessionId(101L)
                .studentId(11L)
                .groupId(2L)
                .firstName("Yassine")
                .lastName("Fassi")
                .email("yassine@ump.ac.ma")
                .numApogee("A002")
                .status(AttendanceStudentStatus.ABSENT)
                .build();

        when(attendanceSessionRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(List.of(sessionTwo, sessionOne));
        when(attendanceRecordRepository.findBySessionIdInOrderByStudentIdAscSessionIdAsc(List.of(100L, 101L)))
                .thenReturn(List.of(giRecord, idsRecord));
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L, 2L))).thenReturn(List.of(
                new StudentRosterDto(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", null, "A001", "GI", "GI-1"),
                new StudentRosterDto(11L, 2L, "Yassine", "Fassi", "yassine@ump.ac.ma", null, "A002", "IDS", "IDS-1")
        ));

        TeacherAttendanceReportResponse response = attendanceQueryService.getTeacherExportReport(77L, null, null, null);

        assertThat(response.filieres()).extracting("filiere").containsExactly("GI", "IDS");
        assertThat(response.filieres().getFirst().sessions()).extracting("sessionId").containsExactly(100L);
        assertThat(response.filieres().getFirst().students().getFirst().groupeName()).isEqualTo("GI-1");
        assertThat(response.filieres().getFirst().students().getFirst().statusesBySessionId())
                .containsEntry(100L, AttendanceStudentStatus.PRESENT);
        assertThat(response.filieres().getLast().sessions()).extracting("sessionId").containsExactly(101L);
        assertThat(response.filieres().getLast().students().getFirst().statusesBySessionId())
                .containsEntry(101L, AttendanceStudentStatus.ABSENT);
    }

    @Test
    void studentDetailReturnsOnlyFinalizedRecord() {
        AttendanceRecord record = AttendanceRecord.builder()
                .sessionId(100L)
                .studentId(12L)
                .groupId(1L)
                .firstName("Aya")
                .lastName("Bennani")
                .email("aya@ump.ac.ma")
                .numApogee("A001")
                .status(AttendanceStudentStatus.PRESENT)
                .markMethod(AttendanceSessionMethod.QR_CODE)
                .markedAt(LocalDateTime.of(2026, 4, 28, 12, 5))
                .build();
        AttendanceSession session = baseSession(100L, AttendanceSessionStatus.FINALIZED);
        session.setEndedAt(LocalDateTime.of(2026, 4, 28, 12, 30));

        when(attendanceRecordRepository.findBySessionIdAndStudentId(100L, 12L)).thenReturn(Optional.of(record));
        when(attendanceSessionRepository.findById(100L)).thenReturn(Optional.of(session));

        StudentAttendanceSessionDetailResponse response = attendanceQueryService.getStudentSession(12L, 100L);

        assertThat(response.sessionId()).isEqualTo(100L);
        assertThat(response.teacherFullName()).isEqualTo("Ayoub Elebbar");
        assertThat(response.studentId()).isEqualTo(12L);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.QR_CODE);
    }

    @Test
    void studentDetailRejectsActiveSession() {
        AttendanceRecord record = AttendanceRecord.builder()
                .sessionId(100L)
                .studentId(12L)
                .groupId(1L)
                .firstName("Aya")
                .lastName("Bennani")
                .email("aya@ump.ac.ma")
                .numApogee("A001")
                .status(AttendanceStudentStatus.PRESENT)
                .build();
        when(attendanceRecordRepository.findBySessionIdAndStudentId(100L, 12L)).thenReturn(Optional.of(record));
        when(attendanceSessionRepository.findById(100L)).thenReturn(Optional.of(baseSession(100L, AttendanceSessionStatus.ACTIVE)));

        assertThatThrownBy(() -> attendanceQueryService.getStudentSession(12L, 100L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void activeStudentSessionReturnsAssignedMethodNeutralSession() {
        AttendanceSession manualSession = baseSession(99L, AttendanceSessionStatus.ACTIVE);
        manualSession.setMethod(AttendanceSessionMethod.MANUAL);
        AttendanceSession qrSession = baseSession(100L, AttendanceSessionStatus.ACTIVE);

        when(attendanceSessionRepository.findAllByStatus(AttendanceSessionStatus.ACTIVE))
                .thenReturn(List.of(manualSession, qrSession));
        when(liveAttendanceSessionStore.findStudentState(100L, 12L))
                .thenReturn(Optional.of(new LiveAttendanceStudentState(
                        12L,
                        1L,
                        "Aya",
                        "Bennani",
                        "aya@ump.ac.ma",
                        null,
                        "A001",
                        "GI",
                        "GI-1",
                        AttendanceStudentStatus.UNKNOWN,
                        null,
                        null,
                        null,
                        null,
                        null
                )));

        StudentActiveAttendanceSessionResponse response = attendanceQueryService.getActiveStudentSession(12L);

        assertThat(response.sessionId()).isEqualTo(100L);
        assertThat(response.attendanceStatus()).isEqualTo(AttendanceStudentStatus.UNKNOWN);
    }

    @Test
    void activeStudentSessionReturnsNotFoundForManualOnlyOrUnassignedSessions() {
        AttendanceSession manualSession = baseSession(99L, AttendanceSessionStatus.ACTIVE);
        manualSession.setMethod(AttendanceSessionMethod.MANUAL);
        AttendanceSession qrSession = baseSession(100L, AttendanceSessionStatus.ACTIVE);

        when(attendanceSessionRepository.findAllByStatus(AttendanceSessionStatus.ACTIVE))
                .thenReturn(List.of(manualSession, qrSession));
        when(liveAttendanceSessionStore.findStudentState(100L, 12L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attendanceQueryService.getActiveStudentSession(12L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void studentHistoryMapsStartedAtSortToSessionPath() {
        AttendanceRecord record = AttendanceRecord.builder()
                .sessionId(100L)
                .studentId(12L)
                .groupId(1L)
                .firstName("Aya")
                .lastName("Bennani")
                .email("aya@ump.ac.ma")
                .numApogee("A001")
                .status(AttendanceStudentStatus.PRESENT)
                .markMethod(AttendanceSessionMethod.QR_CODE)
                .markedAt(LocalDateTime.of(2026, 4, 28, 12, 5))
                .build();
        AttendanceSession session = baseSession(100L, AttendanceSessionStatus.FINALIZED);
        session.setEndedAt(LocalDateTime.of(2026, 4, 28, 12, 30));

        when(attendanceRecordRepository.findStudentHistory(
                eq(12L),
                eq(false),
                eq(null),
                eq(false),
                eq(null),
                eq(false),
                eq(null),
                any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(record), PageRequest.of(0, 20), 1));
        when(attendanceSessionRepository.findAllById(List.of(100L))).thenReturn(List.of(session));

        attendanceQueryService.getStudentSessions(
                12L,
                null,
                null,
                null,
                PageRequest.of(0, 20, Sort.by(Sort.Order.desc("startedAt")))
        );

        verify(attendanceRecordRepository).findStudentHistory(
                eq(12L),
                eq(false),
                eq(null),
                eq(false),
                eq(null),
                eq(false),
                eq(null),
                eq(PageRequest.of(0, 20, Sort.by(Sort.Order.desc("session.startedAt"))))
        );
    }

    private AttendanceSession baseSession(Long id, AttendanceSessionStatus status) {
        return AttendanceSession.builder()
                .id(id)
                .teacherId(77L)
                .teacherFullName("Ayoub Elebbar")
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
}
