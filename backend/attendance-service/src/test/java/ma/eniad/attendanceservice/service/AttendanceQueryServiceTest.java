package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AdminOverviewResponse;
import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceSessionDetailResponse;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
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
    private AttendanceQueryService attendanceQueryService;

    @BeforeEach
    void setUp() {
        attendanceSessionRepository = mock(AttendanceSessionRepository.class);
        attendanceRecordRepository = mock(AttendanceRecordRepository.class);
        attendanceSessionReadService = mock(AttendanceSessionReadService.class);
        liveAttendanceSessionStore = mock(LiveAttendanceSessionStore.class);
        attendanceQueryService = new AttendanceQueryService(
                attendanceSessionRepository,
                attendanceRecordRepository,
                attendanceSessionReadService,
                liveAttendanceSessionStore
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
        assertThat(response.methodBreakdown().manualSessions()).isEqualTo(1);
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
                .deviceId("phone-10")
                .markedGpsLat("34.6820")
                .markedGpsLon("-1.9091")
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
        assertThat(response.markedGpsLat()).isEqualTo("34.6820");
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
